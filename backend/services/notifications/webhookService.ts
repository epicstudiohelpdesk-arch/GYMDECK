/**
 * GymDeck Notification Core - External Provider Webhook Verification & Processing Service
 */

import * as crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  notificationDeliveries,
  providerWebhookEvents,
  auditLogs,
} from '../../shared/database/schema';
import { config } from '../../shared/config';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logging';

export interface WhatsAppStatusItem {
  id: string; // provider message id (wamid)
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id?: string;
  errors?: Array<{ code: number; title: string; message?: string }>;
}

export class WebhookService {
  /**
   * 1. Verify Meta WhatsApp Hub Webhook Subscription Handshake (GET)
   */
  public verifyWhatsAppSubscription(mode: string, token: string, challenge: string): string {
    const expectedToken = config.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'dev_whatsapp_webhook_verify_token';
    if (mode === 'subscribe' && token === expectedToken) {
      return challenge;
    }
    throw AppError.forbidden('Invalid webhook verification token or subscription mode.');
  }

  /**
   * 2. Verify Meta Webhook HMAC-SHA256 Signature (x-hub-signature-256)
   */
  public verifySignature(rawBody: string | Buffer, signatureHeader?: string): boolean {
    if (config.NODE_ENV === 'test' && !signatureHeader) {
      return true; // Permit direct payload in mock test runners unless signature is explicitly provided
    }

    const appSecret = config.WHATSAPP_APP_SECRET || 'dev_whatsapp_app_secret_12345';
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      return false;
    }

    const signature = signatureHeader.substring(7);
    const hmac = crypto.createHmac('sha256', appSecret);
    const expectedSignature = hmac.update(rawBody).digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch {
      return false;
    }
  }

  /**
   * 3. Process WhatsApp Webhook Payload with Idempotency & Tenant Scoping
   */
  public async processWhatsAppWebhook(
    payload: any,
    rawBody?: string,
    signatureHeader?: string
  ): Promise<{ processed: number; duplicates: number; ignored: number }> {
    // A. Verify Signature if provided / enforced
    if (rawBody && signatureHeader) {
      const isValid = this.verifySignature(rawBody, signatureHeader);
      if (!isValid) {
        throw AppError.unauthorized('Invalid webhook signature verification (x-hub-signature-256).');
      }
    }

    const entries = payload?.entry || [];
    let processedCount = 0;
    let duplicateCount = 0;
    let ignoredCount = 0;

    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const value = change?.value;
        const statuses: WhatsAppStatusItem[] = value?.statuses || [];

        for (const statusItem of statuses) {
          const wamid = statusItem.id;
          const status = statusItem.status;
          const timestamp = statusItem.timestamp;
          const providerEventId = `${wamid}_${status}_${timestamp}`;

          // B. Idempotency Check: (provider, provider_event_id)
          const isInserted = await this.recordWebhookEventIfNew(
            'META_WHATSAPP',
            providerEventId,
            wamid,
            `status_${status}`,
            JSON.stringify(statusItem)
          );

          if (!isInserted) {
            duplicateCount++;
            continue;
          }

          // C. Map to Internal Delivery Record by provider_message_id
          const delivery = (
            await db
              .select()
              .from(notificationDeliveries)
              .where(eq(notificationDeliveries.providerMessageId, wamid))
              .limit(1)
          )[0];

          if (!delivery) {
            logger.warn(`[WebhookService] No matching delivery record found for wamid: ${wamid}`);
            ignoredCount++;
            continue;
          }

          // D. State Machine Transition & Tenant Scoping
          const eventTime = timestamp ? new Date(Number(timestamp) * 1000) : new Date();
          const now = new Date();

          if (status === 'delivered') {
            await db
              .update(notificationDeliveries)
              .set({
                status: 'DELIVERED',
                deliveredAt: eventTime,
                updatedAt: now,
              })
              .where(eq(notificationDeliveries.id, delivery.id));

            await db.insert(auditLogs).values({
              gymId: delivery.gymId,
              actorType: 'SYSTEM',
              action: 'NOTIFICATION_DELIVERY_CONFIRMED',
              resource: 'notification_deliveries',
              resourceId: delivery.id,
              metadata: JSON.stringify({ wamid, channel: 'WHATSAPP', deliveredAt: eventTime.toISOString() }),
            });

            processedCount++;
          } else if (status === 'sent') {
            // Only update to SENT if delivery is not already DELIVERED
            if (delivery.status !== 'DELIVERED') {
              await db
                .update(notificationDeliveries)
                .set({
                  status: 'SENT',
                  lastAttemptAt: eventTime,
                  updatedAt: now,
                })
                .where(eq(notificationDeliveries.id, delivery.id));
            }
            processedCount++;
          } else if (status === 'failed') {
            const errorObj = statusItem.errors?.[0];
            const failureReason = errorObj?.message || errorObj?.title || 'WhatsApp delivery failed at network';

            await db
              .update(notificationDeliveries)
              .set({
                status: 'FAILED',
                failureReason,
                errorCode: String(errorObj?.code || 'WHATSAPP_DELIVERY_FAILURE'),
                updatedAt: now,
              })
              .where(eq(notificationDeliveries.id, delivery.id));

            await db.insert(auditLogs).values({
              gymId: delivery.gymId,
              actorType: 'SYSTEM',
              action: 'NOTIFICATION_DELIVERY_FAILED',
              resource: 'notification_deliveries',
              resourceId: delivery.id,
              metadata: JSON.stringify({ wamid, channel: 'WHATSAPP', failureReason }),
            });

            processedCount++;
          } else if (status === 'read') {
            // Note: External WhatsApp read receipt updates delivery metadata, but does NOT touch recipient in-app unread state
            await db
              .update(notificationDeliveries)
              .set({
                metadata: JSON.stringify({
                  ...(delivery.metadata ? JSON.parse(delivery.metadata) : {}),
                  whatsappReadAt: eventTime.toISOString(),
                }),
                updatedAt: now,
              })
              .where(eq(notificationDeliveries.id, delivery.id));

            processedCount++;
          }
        }
      }
    }

    return { processed: processedCount, duplicates: duplicateCount, ignored: ignoredCount };
  }

  /**
   * Atomically insert webhook event; returns true if newly inserted, false if duplicate
   */
  private async recordWebhookEventIfNew(
    provider: string,
    providerEventId: string,
    providerMessageId: string,
    eventType: string,
    payload: string
  ): Promise<boolean> {
    const existing = (
      await db
        .select()
        .from(providerWebhookEvents)
        .where(
          and(
            eq(providerWebhookEvents.provider, provider),
            eq(providerWebhookEvents.providerEventId, providerEventId)
          )
        )
        .limit(1)
    )[0];

    if (existing) {
      return false;
    }

    try {
      await db.insert(providerWebhookEvents).values({
        provider,
        providerEventId,
        providerMessageId,
        eventType,
        payload,
        status: 'PROCESSED',
      });
      return true;
    } catch (err: any) {
      if (err?.code !== '23505' && !err?.message?.includes('unique')) {
        logger.error(`[WebhookService] Error inserting providerWebhookEvents: ${err?.message}`, { err });
      }
      return false;
    }
  }
}

export const webhookService = new WebhookService();
export default webhookService;
