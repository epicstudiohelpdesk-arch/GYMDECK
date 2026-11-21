/**
 * Postal Webhook Event Processor
 *
 * Handles incoming Postal webhook callbacks:
 *  - MessageSent
 *  - MessageDelivered
 *  - MessageFailed
 *  - MessageBounced
 *
 * Updates recipient states, registers bounces in suppression list,
 * and maintains delivery audit telemetry.
 */

import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  emailRecipients,
  emailMessages,
  emailSuppressions,
  emailDeliveryEvents,
  emailWebhookQuarantine,
} from '../../shared/database/schema';
import { logger } from '../../shared/logging';

export interface PostalWebhookPayload {
  event:
    | 'MessageSent'
    | 'MessageDelayed'
    | 'MessageDeliveryFailed'
    | 'MessageHeld'
    | 'MessageBounced'
    | 'MessageLoaded'
    | 'MessageLinkClicked'
    | 'MessageDelivered'
    | string;
  timestamp: number;
  payload: {
    message?: {
      id: number;
      token: string;
      to: string;
      status: string;
    };
    status?: string;
    details?: string;
    output?: string;
    bounce?: {
      id: number;
      server_id: number;
    };
  };
  uuid: string;
}

export class PostalWebhookService {
  public async handleWebhook(payload: PostalWebhookPayload): Promise<void> {
    const { event, timestamp, payload: eventData, uuid } = payload;

    // Validate provider event UUID per Postal v3.4.0 WebhookRequest contract
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid || typeof uuid !== 'string' || !UUID_REGEX.test(uuid)) {
      const reason = !uuid ? 'Missing provider event UUID' : 'Malformed non-standard event UUID';
      logger.warn('[postalWebhook] Quarantining webhook event: ' + reason, {
        uuid: uuid || null,
        event,
      });

      // Persist unprocessable event to operational quarantine table for auditing & manual recovery
      await db.insert(emailWebhookQuarantine).values({
        eventType: event || 'UNKNOWN',
        rawPayload: payload as any,
        quarantineReason: reason,
      }).catch((qErr) => {
        logger.error('[postalWebhook] Failed to insert into quarantine table', { error: qErr });
      });

      return;
    }

    const messageObj = eventData.message || (eventData as any).original_message;
    // Reject missing, non-numeric, or malformed provider IDs explicitly per Postal v3.4.0 contract
    const rawId = messageObj?.id;
    const isValidNumericId = typeof rawId === 'number' ? !isNaN(rawId) && rawId > 0 : (typeof rawId === 'string' && /^\d+$/.test(rawId));
    const providerMessageId = isValidNumericId ? String(rawId) : null;
    const recipientEmail = messageObj?.to;

    if (!providerMessageId) {
      logger.warn('[postalWebhook] Malformed or missing Postal v3.4.0 provider message ID. Fallback by email rejected for security.', {
        uuid,
        rawId,
        recipientEmail,
      });
      return;
    }

    // 1. Locate recipient record strictly via composite provider message ID and provider instance ID to guarantee tenant & instance isolation
    const configuredProviderInstance = process.env.POSTAL_INSTANCE_ID || 'default';
    const recipients = await db
      .select()
      .from(emailRecipients)
      .where(
        and(
          eq(emailRecipients.providerMessageId, providerMessageId),
          eq(emailRecipients.providerInstanceId, configuredProviderInstance)
        )
      )
      .limit(1);

    if (recipients.length === 0) {
      logger.warn('[postalWebhook] No matching email recipient for verified provider message id', {
        event,
        providerMessageId,
        recipientEmail,
      });
      return;
    }

    const recipient = recipients[0];
    if (!recipient) return;
    const gymId = recipient.gymId;
    const messageId = recipient.emailMessageId;
    const eventDate = new Date(timestamp ? timestamp * 1000 : Date.now());

    // 2. Execute deduplication and delivery state transitions in a single atomic PostgreSQL transaction
    await db.transaction(async (tx) => {
      // Step A: Attempt event insertion with unique providerEventId
      const insertedEvents = await tx
        .insert(emailDeliveryEvents)
        .values({
          gymId,
          emailMessageId: messageId,
          emailRecipientId: recipient.id,
          providerEventId: uuid,
          eventType: event,
          eventTimestamp: eventDate,
          details: eventData.details || eventData.output || null,
          rawPayload: payload as any,
        })
        .onConflictDoNothing()
        .returning({ id: emailDeliveryEvents.id });

      // If nothing was inserted, it's a duplicate event (already processed) -> abort transaction early with no-op
      if (insertedEvents.length === 0) {
        logger.info('[postalWebhook] Duplicate webhook event skipped via transaction gate', { uuid });
        return;
      }

      // Step B: Update recipient status & parent counters atomically
      // Grounded in Postal v3.4.0 (WebhookEvent::EVENTS & delivery.rb):
      // - MessageSent: Remote MTA accepted the message. Recipient becomes SENT / DELIVERED.
      // - MessageDelayed: SoftFail / greylisting / retry pending.
      // - MessageDeliveryFailed: HardFail. Recipient becomes FAILED.
      // - MessageBounced: Remote bounce received. Recipient becomes BOUNCED, added to suppressions.
      // - MessageHeld: Held due to spam score or server threshold.
      // - MessageLoaded / MessageLinkClicked: Tracking telemetry.
      switch (event) {
        case 'MessageSent':
        case 'MessageDelivered':
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
          break;

        case 'MessageBounced':
          await tx
            .update(emailRecipients)
            .set({
              deliveryStatus: 'BOUNCED',
              bouncedAt: eventDate,
              failureReason: eventData.details || eventData.output || 'Remote server bounced delivery',
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

          // Register in suppression list
          await tx
            .insert(emailSuppressions)
            .values({
              gymId,
              emailAddress: recipient.recipientEmail.toLowerCase(),
              suppressionReason: 'HARD_BOUNCE',
              source: 'POSTAL_BOUNCE_WEBHOOK',
            })
            .onConflictDoNothing();
          break;

        case 'MessageDeliveryFailed':
        case 'MessageFailed':
          await tx
            .update(emailRecipients)
            .set({
              deliveryStatus: 'FAILED',
              failureReason: eventData.details || eventData.output || 'Postal delivery failure',
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
          break;

        case 'MessageDelayed':
          logger.info('[postalWebhook] Message delivery delayed by remote MTA (SoftFail/Greylist)', {
            providerMessageId,
            details: eventData.details || eventData.output,
          });
          break;

        case 'MessageHeld':
          logger.warn('[postalWebhook] Message held by Postal server', {
            providerMessageId,
            details: eventData.details,
          });
          break;

        case 'MessageLoaded':
        case 'MessageLinkClicked':
          // Open/click telemetry safely recorded in emailDeliveryEvents
          logger.debug('[postalWebhook] Interaction event received', { event, providerMessageId });
          break;

        default:
          logger.info('[postalWebhook] Unhandled Postal event safely recorded in delivery audit', { event });
          break;
      }
    });
  }
}

export const postalWebhookService = new PostalWebhookService();
