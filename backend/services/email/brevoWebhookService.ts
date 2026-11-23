/**
 * Brevo Webhook Event Processor
 *
 * Implements authenticated, idempotent webhook ingestion for Brevo transactional events:
 *  - delivered
 *  - hard_bounce / soft_bounce / blocked / invalid_email
 *  - spam / complaint
 *  - request / sent
 *  - opened / click
 *
 * Enforces:
 *  - Constant-time secret token verification (crypto.timingSafeEqual)
 *  - Deterministic event deduplication via providerEventId unique constraint
 *  - Multi-recipient resolution via composite (providerMessageId + recipientEmail)
 *  - Out-of-order state transition protection (terminal states preserved)
 *  - Automatic bounce and complaint address suppression
 *  - Dead-letter event quarantine for unresolvable or malformed payloads
 *  - Tenant isolation (gymId scoping)
 */

import crypto from 'crypto';
import { and, eq, sql } from 'drizzle-orm';
import { Request } from 'express';
import { db } from '../../shared/database';
import {
  emailRecipients,
  emailMessages,
  emailDeliveryEvents,
  emailWebhookQuarantine,
} from '../../shared/database/schema';
import { config } from '../../shared/config';
import { logger } from '../../shared/logging';
import { addEmailSuppressionTx } from './suppressionService';

export interface BrevoWebhookPayload {
  event:
    | 'delivered'
    | 'request'
    | 'hard_bounce'
    | 'soft_bounce'
    | 'blocked'
    | 'invalid_email'
    | 'spam'
    | 'complaint'
    | 'opened'
    | 'click'
    | 'deferred'
    | string;
  email: string;
  'message-id'?: string;
  messageId?: string;
  id?: number | string;
  date?: string;
  ts?: number;
  ts_event?: number;
  ts_epoch?: number;
  subject?: string;
  tag?: string;
  tags?: string[];
  reason?: string;
}

/**
 * Constant-time comparison of incoming secret against configured secret.
 */
function constantTimeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Verify incoming Brevo webhook authentication.
 *
 * Checks configured BREVO_WEBHOOK_SECRET against supported authentication headers:
 *  1. 'Authorization: Bearer <token>' header (Brevo native webhook Bearer auth)
 *  2. 'X-Webhook-Secret' or 'X-Sib-Webhook-Token' header (Brevo configured custom headers)
 *
 * Query-string secret parameters (?secret=) are strictly disallowed to prevent secret leakage
 * in access logs, proxies, and browser histories.
 *
 * Constant-time comparison is enforced via crypto.timingSafeEqual.
 * Webhook secrets or authorization headers are never logged.
 */
export function verifyBrevoWebhookAuth(req: Request): { valid: boolean; reason?: string } {
  const configuredSecret = config.BREVO_WEBHOOK_SECRET || process.env.BREVO_WEBHOOK_SECRET;

  // In production or staging, a configured secret is required.
  if (!configuredSecret) {
    if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') {
      return { valid: true };
    }
    return { valid: false, reason: 'BREVO_WEBHOOK_SECRET is not configured; Brevo webhook processing is disabled.' };
  }

  // Extract secret exclusively from supported HTTP request headers
  const authHeader = req.headers['authorization'];
  const bearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : undefined;

  const incomingSecret =
    bearerToken ||
    (req.headers['x-webhook-secret'] as string) ||
    (req.headers['x-sib-webhook-token'] as string);

  if (!incomingSecret) {
    return { valid: false, reason: 'Missing supported Brevo webhook authentication header (Authorization Bearer or X-Webhook-Secret).' };
  }

  if (!constantTimeCompare(incomingSecret, configuredSecret)) {
    return { valid: false, reason: 'Invalid Brevo webhook authentication credential.' };
  }

  return { valid: true };
}

/** Pure helpers (exported for regression tests; no database or network). */
export function normalizeBrevoPayloads(payload: BrevoWebhookPayload | BrevoWebhookPayload[]): BrevoWebhookPayload[] {
  return Array.isArray(payload) ? payload : [payload];
}

export function brevoEventFingerprint(
  providerMessageId: string,
  recipientEmail: string,
  event: string,
  eventDate: Date
): string {
  return crypto
    .createHash('sha256')
    .update(`brevo_${providerMessageId}_${recipientEmail.toLowerCase()}_${event}_${eventDate.getTime()}`)
    .digest('hex')
    .slice(0, 64);
}

export class BrevoWebhookService {
  public async handleWebhook(payload: BrevoWebhookPayload | BrevoWebhookPayload[]): Promise<void> {
    for (const item of normalizeBrevoPayloads(payload)) {
      await this.processSingle(item);
    }
  }

  private async processSingle(payload: BrevoWebhookPayload): Promise<void> {
    const event = payload?.event;
    const recipientEmail = payload?.email?.trim();
    const rawMessageId = payload?.['message-id'] || payload?.messageId;
    const providerMessageId = rawMessageId ? String(rawMessageId).trim() : null;

    // Validate required fields
    if (!event || !recipientEmail || !providerMessageId) {
      const reason = !event
        ? 'Missing event type'
        : !recipientEmail
          ? 'Missing recipient email'
          : 'Missing provider message-id';

      logger.warn('[BrevoWebhook] Quarantining malformed webhook event: ' + reason, {
        event: event || 'UNKNOWN',
        hasEmail: Boolean(recipientEmail),
        hasMessageId: Boolean(providerMessageId),
      });

      await db
        .insert(emailWebhookQuarantine)
        .values({
          eventType: event || 'UNKNOWN',
          rawPayload: payload as any,
          quarantineReason: reason,
        })
        .catch((qErr) => {
          logger.error('[BrevoWebhook] Failed to insert malformed event into quarantine', {
            error: qErr instanceof Error ? qErr.message : String(qErr),
          });
        });

      return;
    }

    // Resolve recipient strictly by composite (providerMessageId + recipientEmail)
    // NEVER use LIMIT 1 without email to prevent corrupting multi-recipient batches
    const recipients = await db
      .select()
      .from(emailRecipients)
      .where(
        and(
          eq(emailRecipients.providerMessageId, providerMessageId),
          sql`lower(${emailRecipients.recipientEmail}) = lower(${recipientEmail})`
        )
      )
      .limit(1);

    if (recipients.length === 0) {
      logger.warn('[BrevoWebhook] No matching email recipient for Brevo provider message id and email', {
        event,
        providerMessageId,
        recipientEmail,
      });

      await db
        .insert(emailWebhookQuarantine)
        .values({
          eventType: event,
          rawPayload: payload as any,
          quarantineReason: `No matching recipient found for messageId: ${providerMessageId} and email: ${recipientEmail}`,
        })
        .catch(() => {});

      return;
    }

    const recipient = recipients[0];
    if (!recipient) return;

    const gymId = recipient.gymId;
    const messageId = recipient.emailMessageId;

    // Resolve timestamp
    let eventDate = new Date();
    if (payload.ts_epoch) {
      eventDate = new Date(payload.ts_epoch);
    } else if (payload.ts || payload.ts_event) {
      eventDate = new Date((payload.ts || payload.ts_event!) * 1000);
    } else if (payload.date) {
      const parsed = new Date(payload.date);
      if (!isNaN(parsed.getTime())) eventDate = parsed;
    }

    // Deterministic event fingerprint / UUID for deduplication
    // Brevo's top-level `id` is the webhook configuration id, not an event id,
    // so it must never be used as a dedupe key (it would collapse distinct events).
    const eventFingerprint = brevoEventFingerprint(providerMessageId, recipientEmail, event, eventDate);

    await db.transaction(async (tx) => {
      // Step A: Deduplication via unique providerEventId in emailDeliveryEvents
      const inserted = await tx
        .insert(emailDeliveryEvents)
        .values({
          gymId,
          emailMessageId: messageId,
          emailRecipientId: recipient.id,
          providerEventId: eventFingerprint,
          provider: 'BREVO',
          providerInstanceId: config.POSTAL_INSTANCE_ID || 'default',
          eventType: event,
          eventTimestamp: eventDate,
          details: payload.reason || payload.subject || null,
          rawPayload: {
            event: payload.event,
            email: payload.email,
            'message-id': providerMessageId,
            date: payload.date,
            reason: payload.reason,
          } as any,
        })
        .onConflictDoNothing()
        .returning({ id: emailDeliveryEvents.id });

      // Duplicate event: exit transaction cleanly with no-op
      if (inserted.length === 0) {
        logger.info('[BrevoWebhook] Duplicate webhook event skipped via deduplication gate', {
          eventFingerprint,
          event,
        });
        return;
      }

      // Step B: Out-of-order safe state transitions
      const currentStatus = recipient.deliveryStatus;

      switch (event.toLowerCase()) {
        case 'delivered': {
          // If already delivered or terminal bounce, do not overwrite bounce
          if (currentStatus !== 'DELIVERED' && currentStatus !== 'BOUNCED') {
            await tx
              .update(emailRecipients)
              .set({
                deliveryStatus: 'DELIVERED',
                deliveredAt: eventDate,
                updatedAt: new Date(),
              })
              .where(eq(emailRecipients.id, recipient.id));

            await tx
              .update(emailMessages)
              .set({
                deliveredCount: sql`${emailMessages.deliveredCount} + 1`,
                updatedAt: new Date(),
              })
              .where(eq(emailMessages.id, messageId));
          }
          break;
        }

        case 'soft_bounce': {
          // Soft bounce is a transient delivery failure (e.g., mailbox full, greylisting).
          // Recipient status becomes FAILED for this dispatch, but recipient is NOT permanently suppressed.
          if (currentStatus !== 'DELIVERED' && currentStatus !== 'BOUNCED') {
            await tx
              .update(emailRecipients)
              .set({
                deliveryStatus: 'FAILED',
                failureReason: payload.reason ? `Soft bounce: ${payload.reason}` : 'Soft bounce: temporary mailbox or remote server issue',
                updatedAt: new Date(),
              })
              .where(eq(emailRecipients.id, recipient.id));

            await tx
              .update(emailMessages)
              .set({
                failedCount: sql`${emailMessages.failedCount} + 1`,
                updatedAt: new Date(),
              })
              .where(eq(emailMessages.id, messageId));
          }
          break;
        }

        case 'hard_bounce':
        case 'blocked':
        case 'invalid_email': {
          // Permanent failure: mark BOUNCED and register address in permanent suppression list
          if (currentStatus !== 'BOUNCED') {
            await tx
              .update(emailRecipients)
              .set({
                deliveryStatus: 'BOUNCED',
                bouncedAt: eventDate,
                failureReason: payload.reason || `Brevo permanent bounce: ${event}`,
                updatedAt: new Date(),
              })
              .where(eq(emailRecipients.id, recipient.id));

            await tx
              .update(emailMessages)
              .set({
                bouncedCount: sql`${emailMessages.bouncedCount} + 1`,
                updatedAt: new Date(),
              })
              .where(eq(emailMessages.id, messageId));
          }

          // Register in suppression list permanently
          await addEmailSuppressionTx(tx, {
            gymId,
            emailAddress: recipient.recipientEmail,
            suppressionReason: event.toLowerCase() === 'hard_bounce' ? 'HARD_BOUNCE' : 'INVALID_ADDRESS',
            source: 'BREVO_BOUNCE_WEBHOOK',
          });
          break;
        }

        case 'spam':
        case 'complaint': {
          if (currentStatus !== 'BOUNCED') {
            await tx
              .update(emailRecipients)
              .set({
                deliveryStatus: 'BOUNCED',
                bouncedAt: eventDate,
                failureReason: payload.reason || 'Spam complaint registered via Brevo',
                updatedAt: new Date(),
              })
              .where(eq(emailRecipients.id, recipient.id));

            await tx
              .update(emailMessages)
              .set({
                bouncedCount: sql`${emailMessages.bouncedCount} + 1`,
                updatedAt: new Date(),
              })
              .where(eq(emailMessages.id, messageId));
          }

          await addEmailSuppressionTx(tx, {
            gymId,
            emailAddress: recipient.recipientEmail,
            suppressionReason: 'SPAM_COMPLAINT',
            source: 'BREVO_COMPLAINT_WEBHOOK',
          });
          break;
        }

        case 'request':
        case 'sent': {
          // Out-of-order check: only upgrade QUEUED -> SENT, never downgrade DELIVERED/BOUNCED
          if (currentStatus === 'QUEUED') {
            await tx
              .update(emailRecipients)
              .set({
                deliveryStatus: 'SENT',
                lastAttemptAt: eventDate,
                updatedAt: new Date(),
              })
              .where(eq(emailRecipients.id, recipient.id));
          }
          break;
        }

        case 'opened':
        case 'click':
        case 'deferred':
        default: {
          logger.debug('[BrevoWebhook] Interaction/status event recorded in delivery telemetry', {
            event,
            providerMessageId,
          });
          break;
        }
      }
    });
  }
}

export const brevoWebhookService = new BrevoWebhookService();
