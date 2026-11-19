/**
 * GymDeck WhatsApp - durable outbound queue processor.
 *
 * Jobs are persisted before any network call. A job is claimed atomically with
 * a lease so restart or overlapping worker ticks cannot send it twice. Retries
 * are attempted only for transient/rate-limit outcomes, and only while the job
 * was never accepted by OpenWA.
 */

import { and, eq, inArray, lte, isNull, or, sql, desc } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  whatsappMessageJobs,
  gymWhatsAppAccounts,
} from '../../shared/database/schema';
import { config } from '../../shared/config';
import { logger } from '../../shared/logging';
import { whatsappTransport } from './transport';
import { applyDeliveryStatus, mapProviderStatus } from './policy';
import type { MessageStatus } from './types';
import { recordWhatsAppAudit } from './audit';

const LEASE_SECONDS = 120;
const MESSAGE_EXPIRY_DAYS = 7;

export interface QueueTickResult {
  claimed: number;
  accepted: number;
  retried: number;
  failed: number;
  recovered: number;
  expired: number;
}

export class WhatsAppQueueProcessor {
  private running = false;

  /** Reset jobs abandoned by a crashed/restarted service. */
  public async recoverStale(): Promise<number> {
    const now = new Date();
    const rows = await db
      .update(whatsappMessageJobs)
      .set({
        deliveryStatus: 'QUEUED',
        processingLeaseExpiresAt: null,
        nextAttemptAt: now,
        updatedAt: now,
        failureReason: 'Recovered after the messaging service restarted mid-send.',
      })
      .where(
        and(
          eq(whatsappMessageJobs.deliveryStatus, 'PROCESSING'),
          lte(whatsappMessageJobs.processingLeaseExpiresAt, now)
        )
      )
      .returning({ id: whatsappMessageJobs.id });

    if (rows.length) {
      logger.warn(`[whatsapp] recovered ${rows.length} stale processing job(s)`);
    }
    return rows.length;
  }

  private async expireStaleJobs(): Promise<number> {
    const cutoff = new Date(Date.now() - MESSAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const rows = await db
      .update(whatsappMessageJobs)
      .set({
        deliveryStatus: 'FAILED',
        failureCode: 'EXPIRED',
        failureReason: 'The scheduled send expired before it could be delivered.',
        failedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(whatsappMessageJobs.deliveryStatus, 'QUEUED'),
          lte(whatsappMessageJobs.createdAt, cutoff)
        )
      )
      .returning({ id: whatsappMessageJobs.id, gymId: whatsappMessageJobs.gymId });

    for (const row of rows) {
      await recordWhatsAppAudit({
        gymId: row.gymId,
        action: 'WHATSAPP_MESSAGE_EXPIRED',
        targetId: row.id,
      });
    }
    return rows.length;
  }

  /** One worker tick. Safe to call on an interval or from tests. */
  public async tick(batchSize: number = config.WHATSAPP_QUEUE_BATCH_SIZE): Promise<QueueTickResult> {
    const result: QueueTickResult = {
      claimed: 0,
      accepted: 0,
      retried: 0,
      failed: 0,
      recovered: 0,
      expired: 0,
    };

    if (this.running) return result;
    this.running = true;

    try {
      result.recovered = await this.recoverStale();
      result.expired = await this.expireStaleJobs();

      const now = new Date();
      const due = await db
        .select({ id: whatsappMessageJobs.id })
        .from(whatsappMessageJobs)
        .where(
          and(
            eq(whatsappMessageJobs.deliveryStatus, 'QUEUED'),
            or(
              isNull(whatsappMessageJobs.nextAttemptAt),
              lte(whatsappMessageJobs.nextAttemptAt, now)
            ),
            or(
              isNull(whatsappMessageJobs.scheduledAt),
              lte(whatsappMessageJobs.scheduledAt, now)
            )
          )
        )
        .orderBy(whatsappMessageJobs.createdAt)
        .limit(Math.max(1, batchSize));

      for (const candidate of due) {
        const claimed = await this.claim(candidate.id);
        if (!claimed) continue;
        result.claimed += 1;

        const outcome = await this.deliver(claimed);
        if (outcome === 'ACCEPTED') result.accepted += 1;
        else if (outcome === 'RETRYING') result.retried += 1;
        else result.failed += 1;
      }

      return result;
    } finally {
      this.running = false;
    }
  }

  private async claim(jobId: string): Promise<any | null> {
    const now = new Date();
    const lease = new Date(now.getTime() + LEASE_SECONDS * 1000);

    const rows = await db
      .update(whatsappMessageJobs)
      .set({
        deliveryStatus: 'PROCESSING',
        attemptCount: sql`${whatsappMessageJobs.attemptCount} + 1`,
        processingLeaseExpiresAt: lease,
        updatedAt: now,
      })
      .where(
        and(
          eq(whatsappMessageJobs.id, jobId),
          eq(whatsappMessageJobs.deliveryStatus, 'QUEUED')
        )
      )
      .returning();

    return rows[0] ?? null;
  }

  private backoffSeconds(attempt: number, retryAfter: number | null): number {
    if (retryAfter) return retryAfter;
    const base = Math.min(3600, 60 * Math.pow(4, Math.max(0, attempt - 1)));
    return base + Math.floor(Math.random() * 15);
  }

  private async deliver(job: any): Promise<'ACCEPTED' | 'RETRYING' | 'FAILED'> {
    const fail = async (
      code: string,
      reason: string,
      retryable: boolean,
      retryAfterSeconds: number | null
    ): Promise<'RETRYING' | 'FAILED'> => {
      const now = new Date();
      const attempt = Number(job.attemptCount || 1);
      const maxAttempts = Number(job.maxAttempts || 3);

      if (retryable && attempt < maxAttempts) {
        const nextAttemptAt = new Date(
          now.getTime() + this.backoffSeconds(attempt, retryAfterSeconds) * 1000
        );
        await db
          .update(whatsappMessageJobs)
          .set({
            deliveryStatus: 'QUEUED',
            failureCode: code,
            failureReason: reason.slice(0, 500),
            nextAttemptAt,
            processingLeaseExpiresAt: null,
            updatedAt: now,
          })
          .where(eq(whatsappMessageJobs.id, job.id));
        return 'RETRYING';
      }

      await db
        .update(whatsappMessageJobs)
        .set({
          deliveryStatus: 'FAILED',
          failureCode: code,
          failureReason: reason.slice(0, 500),
          failedAt: now,
          processingLeaseExpiresAt: null,
          updatedAt: now,
        })
        .where(eq(whatsappMessageJobs.id, job.id));

      await recordWhatsAppAudit({
        gymId: job.gymId,
        action: 'WHATSAPP_MESSAGE_FAILED',
        targetId: job.id,
        metadata: { code, attempts: attempt },
      });
      return 'FAILED';
    };

    // Account must still belong to the same gym. Never trust the job's account blindly.
    const accounts = await db
      .select()
      .from(gymWhatsAppAccounts)
      .where(
        and(
          eq(gymWhatsAppAccounts.id, job.senderAccountId),
          eq(gymWhatsAppAccounts.gymId, job.gymId)
        )
      )
      .limit(1);
    const account = accounts[0];

    if (!account) {
      return fail('ACCOUNT_NOT_CONNECTED', 'The WhatsApp sender account no longer exists.', false, null);
    }
    if (account.connectionStatus !== 'CONNECTED' || !account.openwaSessionId) {
      return fail(
        'ACCOUNT_NOT_CONNECTED',
        'The WhatsApp account is not linked to an active OpenWA session.',
        false,
        null
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(job.messagePayload);
    } catch {
      return fail('INVALID_PAYLOAD', 'The stored message payload is unreadable.', false, null);
    }

    const outboundAccount = {
      id: account.id,
      gymId: account.gymId,
      openwaSessionId: account.openwaSessionId,
    };

    const renderedBody = String(
      payload.body || payload.preview || job.renderedPreview || ''
    );

    const result =
      payload.type === 'TEXT'
        ? await whatsappTransport.sendText({
            account: outboundAccount,
            to: job.recipientNumber,
            body: renderedBody,
            jobId: job.id,
          })
        : await whatsappTransport.sendTemplate({
            account: outboundAccount,
            to: job.recipientNumber,
            body: String(payload.preview || job.renderedPreview || ''),
            templateName: String(payload.templateName || ''),
            language: String(payload.language || 'en'),
            parameters: Array.isArray(payload.parameters)
              ? payload.parameters.map((value: unknown) => String(value))
              : [],
            jobId: job.id,
          });

    if (!result.ok || !result.accepted) {
      if (result.errorClass === 'AUTHENTICATION') {
        await db
          .update(gymWhatsAppAccounts)
          .set({
            connectionStatus: 'REAUTHORIZATION_REQUIRED',
            statusReason: 'The OpenWA session is no longer available. Reconnect WhatsApp.',
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(gymWhatsAppAccounts.id, account.id),
              eq(gymWhatsAppAccounts.gymId, job.gymId)
            )
          );
      }
      return fail(
        result.errorClass || 'TRANSIENT',
        result.errorMessage || 'WhatsApp delivery failed.',
        result.retryable,
        result.retryAfterSeconds
      );
    }

    const now = new Date();
    await db
      .update(whatsappMessageJobs)
      .set({
        deliveryStatus: 'ACCEPTED',
        metaMessageId: result.providerMessageId,
        failureCode: null,
        failureReason: null,
        submittedAt: now,
        processingLeaseExpiresAt: null,
        nextAttemptAt: null,
        updatedAt: now,
      })
      .where(eq(whatsappMessageJobs.id, job.id));

    await recordWhatsAppAudit({
      gymId: job.gymId,
      action: 'WHATSAPP_MESSAGE_ACCEPTED',
      targetId: job.id,
      metadata: {
        provider: 'OPENWA',
        attempt: job.attemptCount,
      },
    });

    return 'ACCEPTED';
  }

  /**
   * Apply a webhook status to a job. Returns the new status, or null when the
   * event is a duplicate/out-of-order downgrade.
   */
  public async applyWebhookStatus(
    metaMessageId: string,
    metaStatus: string,
    error?: { code?: string; message?: string } | null,
    eventTime?: Date
  ): Promise<{ jobId: string; gymId: string; status: MessageStatus } | null> {
    const incoming = mapProviderStatus(metaStatus);
    if (!incoming) return null;

    const rows = await db
      .select()
      .from(whatsappMessageJobs)
      .where(eq(whatsappMessageJobs.metaMessageId, metaMessageId))
      .orderBy(desc(whatsappMessageJobs.createdAt))
      .limit(1);

    const job = rows[0];
    if (!job) return null;

    const current = job.deliveryStatus as MessageStatus;
    const next = applyDeliveryStatus(current, incoming);
    if (!next) return null;

    const now = new Date();
    const at = eventTime ?? now;
    const set: Record<string, unknown> = {
      deliveryStatus: next,
      updatedAt: now,
    };

    if (next === 'DELIVERED') set.deliveredAt = at;
    if (next === 'READ') {
      set.readAt = at;
      if (!job.deliveredAt) set.deliveredAt = at;
    }
    if (next === 'FAILED') {
      set.failedAt = at;
      set.failureCode = error?.code ? String(error.code) : 'DELIVERY_FAILED';
      set.failureReason = error?.message ? String(error.message).slice(0, 500) : null;
    }

    await db
      .update(whatsappMessageJobs)
      .set(set)
      .where(
        and(
          eq(whatsappMessageJobs.id, job.id),
          eq(whatsappMessageJobs.gymId, job.gymId)
        )
      );

    return { jobId: job.id, gymId: job.gymId, status: next };
  }

  /** Startup reconciliation: jobs that were accepted but never got webhooks. */
  public async acceptedWithoutReceiptOlderThan(hours: number): Promise<number> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const rows = await db
      .select({ id: whatsappMessageJobs.id })
      .from(whatsappMessageJobs)
      .where(
        and(
          inArray(whatsappMessageJobs.deliveryStatus, ['ACCEPTED', 'SENT']),
          lte(whatsappMessageJobs.submittedAt, cutoff)
        )
      );
    return rows.length;
  }
}

export const whatsappQueueProcessor = new WhatsAppQueueProcessor();
export default whatsappQueueProcessor;
