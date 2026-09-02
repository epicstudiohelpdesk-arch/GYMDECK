/**
 * GymDeck Notification Core - External Provider Router & Delivery Dispatcher
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../../../shared/database';
import {
  notifications,
  notificationDeliveries,
  devicePushTokens,
  auditLogs,
} from '../../../shared/database/schema';
import { NotificationProvider, DeliveryRequest, DeliveryResult } from './types';
import { expoPushProvider } from './expoPushProvider';
import { metaWhatsAppProvider } from './metaWhatsAppProvider';

export class ProviderRouter {
  private providers: Map<string, NotificationProvider> = new Map();

  constructor() {
    this.registerProvider(expoPushProvider);
    this.registerProvider(metaWhatsAppProvider);
  }

  public registerProvider(provider: NotificationProvider): void {
    this.providers.set(provider.channel, provider);
  }

  public getProvider(channel: string): NotificationProvider | undefined {
    return this.providers.get(channel);
  }

  /**
   * Dispatch a claimed delivery record to the appropriate external provider
   */
  public async dispatchDelivery(delivery: any): Promise<DeliveryResult> {
    const channel = delivery.channel;
    const provider = this.getProvider(channel);

    if (!provider) {
      const failedResult: DeliveryResult = {
        success: false,
        provider: 'MOCK_PROVIDER',
        status: 'FAILED',
        errorClassification: 'PERMANENT',
        errorCode: 'UNSUPPORTED_CHANNEL',
        errorMessage: `No external provider configured for channel: ${channel}`,
      };
      await this.applyDeliveryResult(delivery, failedResult);
      return failedResult;
    }

    // 1. Fetch parent notification record
    const notif = (
      await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, delivery.notification_id || delivery.notificationId))
        .limit(1)
    )[0];

    if (!notif) {
      const missingNotifResult: DeliveryResult = {
        success: false,
        provider: provider.name,
        status: 'FAILED',
        errorClassification: 'PERMANENT',
        errorCode: 'NOTIFICATION_NOT_FOUND',
        errorMessage: 'Parent notification entity could not be found.',
      };
      await this.applyDeliveryResult(delivery, missingNotifResult);
      return missingNotifResult;
    }

    // 2. Build DeliveryRequest
    const deliveryId = delivery.id;
    const deliveryRequest: DeliveryRequest = {
      deliveryId,
      notificationId: notif.id,
      gymId: notif.gymId,
      channel: delivery.channel,
      recipientType: notif.recipientType as any,
      recipientId: notif.recipientId,
      title: notif.title,
      body: notif.body,
      category: notif.category,
      type: notif.type,
      payload: notif.payload ? JSON.parse(notif.payload) : null,
      priority: (notif.priority as any) || 'NORMAL',
      attemptCount: Number(delivery.attempt_count || delivery.attemptCount || 1),
      idempotencyKey: `gd_delivery_${deliveryId}`,
    };

    // 3. Execute Provider Send
    let result: DeliveryResult;
    try {
      result = await provider.send(deliveryRequest);
    } catch (err: any) {
      const classification = provider.classifyError(err);
      result = {
        success: false,
        provider: provider.name,
        status: 'RETRYING',
        errorClassification: classification,
        errorCode: err?.name || 'PROVIDER_EXECUTION_ERROR',
        errorMessage: err?.message || 'Unexpected error during provider execution',
      };
    }

    // 4. Update Delivery Record State
    await this.applyDeliveryResult(delivery, result);

    // 5. Handle Token Deactivation Side-Effects
    if (result.shouldDeactivateTokens && result.shouldDeactivateTokens.length > 0) {
      await this.deactivatePushTokens(
        notif.gymId,
        notif.recipientType as any,
        notif.recipientId,
        result.shouldDeactivateTokens
      );
    }

    return result;
  }

  /**
   * Persist provider outcome, schedule exponential backoff retries, or terminate
   */
  private async applyDeliveryResult(delivery: any, result: DeliveryResult): Promise<void> {
    const deliveryId = delivery.id;
    const currentAttempt = Number(delivery.attempt_count || delivery.attemptCount || 1);
    const maxAttempts = Number(delivery.max_attempts || delivery.maxAttempts || 3);
    const now = new Date();

    let finalStatus = result.status;
    let nextAttemptAt: Date | null = null;

    if (result.status === 'RETRYING') {
      if (currentAttempt >= maxAttempts) {
        finalStatus = 'FAILED';
      } else {
        // Exponential backoff: attempt 1 -> 30s, attempt 2 -> 120s, attempt 3 -> 600s + jitter
        const baseSeconds = result.retryAfterSeconds || Math.min(600, 30 * Math.pow(4, currentAttempt - 1));
        const jitter = Math.floor(Math.random() * 5); // 0-5s jitter
        nextAttemptAt = new Date(now.getTime() + (baseSeconds + jitter) * 1000);
      }
    }

    await db
      .update(notificationDeliveries)
      .set({
        provider: result.provider,
        status: finalStatus,
        providerMessageId: result.providerMessageId || delivery.provider_message_id || null,
        errorCode: result.errorCode || null,
        errorClassification: result.errorClassification || null,
        failureReason: result.errorMessage || null,
        lastAttemptAt: now,
        deliveredAt: finalStatus === 'DELIVERED' ? now : undefined,
        nextAttemptAt,
        updatedAt: now,
      })
      .where(eq(notificationDeliveries.id, deliveryId));
  }

  /**
   * Deactivate invalid/unregistered push tokens and record audit trail
   */
  private async deactivatePushTokens(
    gymId: string,
    recipientType: 'MEMBER' | 'USER',
    recipientId: string,
    tokens: string[]
  ): Promise<void> {
    for (const token of tokens) {
      await db
        .update(devicePushTokens)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(devicePushTokens.gymId, gymId),
            eq(devicePushTokens.recipientType, recipientType),
            eq(devicePushTokens.recipientId, recipientId),
            eq(devicePushTokens.pushToken, token)
          )
        );
    }

    await db.insert(auditLogs).values({
      gymId,
      actorType: 'SYSTEM',
      action: 'PUSH_TOKEN_DEACTIVATED',
      resource: 'device_push_tokens',
      resourceId: recipientId,
      metadata: JSON.stringify({
        recipientType,
        recipientId,
        deactivatedCount: tokens.length,
        reason: 'DeviceNotRegistered',
      }),
    });
  }
}

export const providerRouter = new ProviderRouter();
export default providerRouter;
