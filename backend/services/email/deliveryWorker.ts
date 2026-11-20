/**
 * GymDeck Email Delivery Worker
 *
 * Durable background queue consumer:
 *  - Locks pending email_outbox jobs
 *  - Resolves batch recipients
 *  - Enforces suppression lists (bounces / opt-outs)
 *  - Performs Postal submission
 *  - Updates recipient statuses and commits quota
 */

import { eq, and, sql, lte, inArray } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  emailOutbox,
  emailMessages,
  emailRecipients,
  emailSuppressions,
} from '../../shared/database/schema';
import { postalClient } from './postalClient';
import { emailQuotaService } from './quotaService';
import { logger } from '../../shared/logging';
import { config } from '../../shared/config';

let workerTimer: NodeJS.Timeout | null = null;
let isProcessing = false;

export async function processOutboxJobs(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const now = new Date();
    const workerId = `worker_${process.pid}_${Math.random().toString(36).slice(2, 6)}`;

    // 1. Lock a batch of pending jobs
    const pendingJobs = await db
      .update(emailOutbox)
      .set({
        jobStatus: 'PROCESSING',
        lockedAt: now,
        lockedBy: workerId,
        updatedAt: now,
      })
      .where(
        and(
          inArray(emailOutbox.jobStatus, ['PENDING']),
          lte(emailOutbox.nextAttemptAt, now)
        )
      )
      .returning();

    for (const job of pendingJobs) {
      await processSingleJob(job);
    }
  } catch (err: any) {
    logger.error('[emailWorker] Error during outbox sweep', {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    isProcessing = false;
  }
}

async function processSingleJob(job: any): Promise<void> {
  const { id: jobId, gymId, emailMessageId } = job;

  try {
    // 1. Load message
    const msgRows = await db
      .select()
      .from(emailMessages)
      .where(and(eq(emailMessages.id, emailMessageId), eq(emailMessages.gymId, gymId)))
      .limit(1);

    if (msgRows.length === 0) {
      // Message missing, mark failed
      await db
        .update(emailOutbox)
        .set({ jobStatus: 'FAILED', lastError: 'Parent email message not found', completedAt: new Date() })
        .where(eq(emailOutbox.id, jobId));
      return;
    }

    const message = msgRows[0];
    if (!message) return;

    // 2. Fetch pending recipients for this message
    const recipients = await db
      .select()
      .from(emailRecipients)
      .where(
        and(
          eq(emailRecipients.emailMessageId, emailMessageId),
          eq(emailRecipients.gymId, gymId),
          eq(emailRecipients.deliveryStatus, 'QUEUED')
        )
      )
      .limit(config.EMAIL_BATCH_SIZE || 25);

    if (recipients.length === 0) {
      // All recipients processed
      await db
        .update(emailMessages)
        .set({ status: 'COMPLETED', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(emailMessages.id, emailMessageId));

      await db
        .update(emailOutbox)
        .set({ jobStatus: 'COMPLETED', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(emailOutbox.id, jobId));
      return;
    }

    // 3. Check suppressions
    const emailList = recipients.map((r) => r.recipientEmail.toLowerCase());
    const suppressions = await db
      .select()
      .from(emailSuppressions)
      .where(inArray(emailSuppressions.emailAddress, emailList));

    const suppressedSet = new Set(suppressions.map((s) => s.emailAddress.toLowerCase()));

    const activeRecipients = recipients.filter((r) => !suppressedSet.has(r.recipientEmail.toLowerCase()));
    const skippedRecipients = recipients.filter((r) => suppressedSet.has(r.recipientEmail.toLowerCase()));

    // Mark suppressed
    for (const skipped of skippedRecipients) {
      await db
        .update(emailRecipients)
        .set({
          deliveryStatus: 'SUPPRESSED',
          failureReason: 'Address suppressed due to previous bounce or opt-out',
          updatedAt: new Date(),
        })
        .where(eq(emailRecipients.id, skipped.id));
    }

    if (activeRecipients.length > 0) {
      // 4. Submit to Postal
      const sendResult = await postalClient.sendMessage({
        to: activeRecipients.map((r) => r.recipientEmail),
        from: `${message.senderDisplayName || 'GymDeck'} <${message.fromAddress}>`,
        replyTo: message.replyToAddress || undefined,
        subject: message.subject,
        htmlBody: message.bodyHtml,
        plainBody: message.bodyText || undefined,
        tag: `gym_${gymId}`,
        customHeaders: {
          'X-GymDeck-Tenant': gymId,
          'X-GymDeck-Message-Id': emailMessageId,
        },
      });

      const providerData = sendResult.data;
      const providerMessages = providerData?.messages || {};

      for (const rec of activeRecipients) {
        const pMsg = providerMessages[rec.recipientEmail];
        await db
          .update(emailRecipients)
          .set({
            deliveryStatus: 'SENT',
            providerMessageId: pMsg ? String(pMsg.id) : providerData?.message_id,
            providerToken: pMsg ? pMsg.token : undefined,
            attempts: rec.attempts + 1,
            lastAttemptAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(emailRecipients.id, rec.id));
      }

      // Update message counts & billing
      const billingPeriod = emailQuotaService.getCurrentBillingPeriod(message.createdAt);
      await emailQuotaService.commitQuota(gymId, billingPeriod, activeRecipients.length, activeRecipients.length);

      await db
        .update(emailMessages)
        .set({
          status: 'SENDING',
          updatedAt: new Date(),
        })
        .where(eq(emailMessages.id, emailMessageId));
    }

    // 5. Check if more recipients remain
    const remainingCountRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailRecipients)
      .where(
        and(
          eq(emailRecipients.emailMessageId, emailMessageId),
          eq(emailRecipients.gymId, gymId),
          eq(emailRecipients.deliveryStatus, 'QUEUED')
        )
      );

    const remaining = Number(remainingCountRows[0]?.count || 0);

    if (remaining === 0) {
      await db
        .update(emailMessages)
        .set({ status: 'COMPLETED', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(emailMessages.id, emailMessageId));

      await db
        .update(emailOutbox)
        .set({ jobStatus: 'COMPLETED', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(emailOutbox.id, jobId));
    } else {
      // Re-queue next slice immediately
      await db
        .update(emailOutbox)
        .set({
          jobStatus: 'PENDING',
          nextAttemptAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(emailOutbox.id, jobId));
    }
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.warn('[emailWorker] Delivery error for outbox job', { jobId, error: errorMsg });

    const newAttempts = job.attempts + 1;
    const isTerminal = newAttempts >= (job.maxAttempts || 5);

    // Exponential backoff with jitter: 2^attempts * 10 seconds
    const backoffSec = Math.min(1800, Math.pow(2, newAttempts) * 10 + Math.floor(Math.random() * 5));
    const nextAttempt = new Date(Date.now() + backoffSec * 1000);

    await db
      .update(emailOutbox)
      .set({
        jobStatus: isTerminal ? 'FAILED' : 'PENDING',
        attempts: newAttempts,
        nextAttemptAt: nextAttempt,
        lastError: errorMsg,
        completedAt: isTerminal ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(emailOutbox.id, jobId));

    if (isTerminal) {
      await db
        .update(emailMessages)
        .set({ status: 'FAILED', updatedAt: new Date() })
        .where(eq(emailMessages.id, emailMessageId));
    }
  }
}

export function startEmailWorker(): void {
  if (workerTimer) return;
  const interval = config.EMAIL_WORKER_INTERVAL_MS || 5000;
  workerTimer = setInterval(processOutboxJobs, interval);
  logger.info('[emailWorker] Email delivery background worker started', { intervalMs: interval });
}

export function stopEmailWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
    logger.info('[emailWorker] Email delivery background worker stopped');
  }
}
