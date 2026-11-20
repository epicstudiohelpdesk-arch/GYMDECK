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

import { eq, sql } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  emailRecipients,
  emailMessages,
  emailSuppressions,
  emailDeliveryEvents,
} from '../../shared/database/schema';
import { logger } from '../../shared/logging';

export interface PostalWebhookPayload {
  event: 'MessageSent' | 'MessageDelivered' | 'MessageFailed' | 'MessageBounced';
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
    const providerMessageId = eventData.message?.id ? String(eventData.message.id) : null;
    const recipientEmail = eventData.message?.to;

    if (!providerMessageId && !recipientEmail) {
      logger.warn('[postalWebhook] Webhook missing message id and recipient email', { uuid });
      return;
    }

    // 1. Locate recipient record via provider message ID
    let recipients = await db
      .select()
      .from(emailRecipients)
      .where(eq(emailRecipients.providerMessageId, providerMessageId || ''))
      .limit(1);

    if (recipients.length === 0 && recipientEmail) {
      // Fallback matching by recipient email if message was recently queued
      recipients = await db
        .select()
        .from(emailRecipients)
        .where(eq(emailRecipients.recipientEmail, recipientEmail.toLowerCase()))
        .orderBy(sql`${emailRecipients.createdAt} DESC`)
        .limit(1);
    }

    if (recipients.length === 0) {
      logger.warn('[postalWebhook] No matching email recipient for event', {
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

    // 2. Prevent replay attacks / event duplication via unique event ID
    try {
      await db.insert(emailDeliveryEvents).values({
        gymId,
        emailMessageId: messageId,
        emailRecipientId: recipient.id,
        providerEventId: uuid || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        eventType: event,
        eventTimestamp: eventDate,
        details: eventData.details || eventData.output || null,
        rawPayload: payload as any,
      });
    } catch (err: any) {
      // Duplicate event (already processed)
      logger.info('[postalWebhook] Duplicate webhook event skipped', { uuid });
      return;
    }

    // 3. Update recipient status & parent counters
    switch (event) {
      case 'MessageDelivered':
        await db
          .update(emailRecipients)
          .set({
            deliveryStatus: 'DELIVERED',
            deliveredAt: eventDate,
            updatedAt: new Date(),
          })
          .where(eq(emailRecipients.id, recipient.id));

        await db
          .update(emailMessages)
          .set({
            deliveredCount: sql`${emailMessages.deliveredCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(emailMessages.id, messageId));
        break;

      case 'MessageBounced':
        await db
          .update(emailRecipients)
          .set({
            deliveryStatus: 'BOUNCED',
            bouncedAt: eventDate,
            failureReason: eventData.details || 'Remote server bounced delivery',
            updatedAt: new Date(),
          })
          .where(eq(emailRecipients.id, recipient.id));

        await db
          .update(emailMessages)
          .set({
            bouncedCount: sql`${emailMessages.bouncedCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(emailMessages.id, messageId));

        // Register in suppression list
        await db
          .insert(emailSuppressions)
          .values({
            gymId,
            emailAddress: recipient.recipientEmail.toLowerCase(),
            suppressionReason: 'HARD_BOUNCE',
            source: 'POSTAL_BOUNCE_WEBHOOK',
          })
          .onConflictDoNothing();
        break;

      case 'MessageFailed':
        await db
          .update(emailRecipients)
          .set({
            deliveryStatus: 'FAILED',
            failureReason: eventData.details || 'Postal delivery failure',
            updatedAt: new Date(),
          })
          .where(eq(emailRecipients.id, recipient.id));

        await db
          .update(emailMessages)
          .set({
            failedCount: sql`${emailMessages.failedCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(emailMessages.id, messageId));
        break;

      case 'MessageSent':
      default:
        await db
          .update(emailRecipients)
          .set({
            deliveryStatus: 'SENT',
            updatedAt: new Date(),
          })
          .where(eq(emailRecipients.id, recipient.id));
        break;
    }
  }
}

export const postalWebhookService = new PostalWebhookService();
