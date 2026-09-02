/**
 * GymDeck Notification Core - Expo Push Notification Provider
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../../../shared/database';
import { devicePushTokens } from '../../../shared/database/schema';
import { config } from '../../../shared/config';
import {
  NotificationProvider,
  DeliveryRequest,
  DeliveryResult,
  ErrorClassification,
} from './types';

export class ExpoPushProvider implements NotificationProvider {
  public readonly name = 'EXPO_PUSH';
  public readonly channel = 'PUSH';

  public validateConfiguration(): { valid: boolean; reason?: string } {
    if (config.NOTIFICATION_PROVIDER_MODE === 'live' && !config.EXPO_PUSH_API_URL) {
      return { valid: false, reason: 'EXPO_PUSH_API_URL is missing' };
    }
    return { valid: true };
  }

  public classifyError(error: any): ErrorClassification {
    const errorStr = String(error?.code || error?.message || error || '').toUpperCase();
    if (errorStr.includes('DEVICENOTREGISTERED') || errorStr.includes('INVALID_TOKEN')) {
      return 'INVALID_TOKEN';
    }
    if (errorStr.includes('MESSAGETOOLARGE') || errorStr.includes('MESSAGETOOBIG')) {
      return 'PERMANENT';
    }
    if (errorStr.includes('RATELIMIT') || errorStr.includes('MESSAGERATEEXCEEDED') || errorStr.includes('429')) {
      return 'RATE_LIMITED';
    }
    if (errorStr.includes('AUTH') || errorStr.includes('UNAUTHORIZED') || errorStr.includes('401')) {
      return 'AUTHENTICATION_FAILURE';
    }
    if (errorStr.includes('TIMEOUT') || errorStr.includes('ECONNRESET') || errorStr.includes('ETIMEDOUT')) {
      return 'TIMEOUT';
    }
    if (errorStr.includes('UNAVAILABLE') || errorStr.includes('503') || errorStr.includes('502')) {
      return 'PROVIDER_UNAVAILABLE';
    }
    return 'UNKNOWN';
  }

  public async send(request: DeliveryRequest): Promise<DeliveryResult> {
    // 1. Resolve active push tokens for recipient
    const activeTokens = await db
      .select()
      .from(devicePushTokens)
      .where(
        and(
          eq(devicePushTokens.gymId, request.gymId),
          eq(devicePushTokens.recipientType, request.recipientType),
          eq(devicePushTokens.recipientId, request.recipientId),
          eq(devicePushTokens.isActive, true)
        )
      );

    if (activeTokens.length === 0) {
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        errorClassification: 'INVALID_TOKEN',
        errorCode: 'NO_ACTIVE_TOKENS',
        errorMessage: 'No active device push tokens registered for recipient.',
      };
    }

    // 2. Format Push Message Payload
    const tokenStrings = activeTokens.map((t) => t.pushToken);
    const pushMessage = {
      to: tokenStrings.length === 1 ? tokenStrings[0] : tokenStrings,
      title: request.title,
      body: request.body,
      data: {
        notificationId: request.notificationId,
        category: request.category,
        type: request.type,
        ...(request.payload || {}),
      },
      priority: request.priority === 'URGENT' || request.priority === 'HIGH' ? 'high' : 'default',
      sound: 'default',
      _displayInForeground: true,
    };

    // 3. Dispatch to Provider Gateway
    if (config.NOTIFICATION_PROVIDER_MODE === 'live') {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        };
        if (config.EXPO_ACCESS_TOKEN) {
          headers.Authorization = `Bearer ${config.EXPO_ACCESS_TOKEN}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(config.EXPO_PUSH_API_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(pushMessage),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const status = response.status;
          const errorData: any = await response.json().catch(() => ({}));
          const errorClassification = this.classifyError({ code: status, ...errorData });

          return {
            success: false,
            provider: this.name,
            status: errorClassification === 'RATE_LIMITED' || errorClassification === 'TRANSIENT' ? 'RETRYING' : 'FAILED',
            errorClassification,
            errorCode: String(status),
            errorMessage: `Expo push gateway responded with HTTP ${status}`,
            retryAfterSeconds: errorClassification === 'RATE_LIMITED' ? 30 : undefined,
          };
        }

        const resData: any = await response.json();
        const ticket = Array.isArray(resData?.data) ? resData.data[0] : resData?.data;

        if (ticket?.status === 'error') {
          const classification = this.classifyError({ code: ticket.details?.error || ticket.message });
          const isDeactivated = ticket.details?.error === 'DeviceNotRegistered';

          return {
            success: false,
            provider: this.name,
            status: classification === 'RATE_LIMITED' || classification === 'TRANSIENT' ? 'RETRYING' : 'FAILED',
            errorClassification: classification,
            errorCode: ticket.details?.error || 'EXPO_ERROR',
            errorMessage: ticket.message || 'Push delivery rejected by Expo gateway',
            shouldDeactivateTokens: isDeactivated ? tokenStrings : undefined,
          };
        }

        return {
          success: true,
          provider: this.name,
          status: 'SENT',
          providerMessageId: ticket?.id || `expo_ticket_${request.deliveryId}`,
          metadata: { ticketId: ticket?.id, tokensCount: tokenStrings.length },
        };
      } catch (err: any) {
        const classification = this.classifyError(err);
        return {
          success: false,
          provider: this.name,
          status: 'RETRYING',
          errorClassification: classification,
          errorCode: err?.name || 'NETWORK_ERROR',
          errorMessage: err?.message || 'Failed to reach Expo push gateway',
          retryAfterSeconds: 15,
        };
      }
    }

    // 4. Sandbox / Test Mode Handler (Deterministic validation & ticket simulation)
    // Check if any token is simulated as invalid in testing
    const invalidTokenFound = tokenStrings.find((t) => t.includes('invalid') || t.includes('unregistered'));
    if (invalidTokenFound) {
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        errorClassification: 'INVALID_TOKEN',
        errorCode: 'DeviceNotRegistered',
        errorMessage: 'The device token is no longer registered with the push notification service.',
        shouldDeactivateTokens: [invalidTokenFound],
      };
    }

    const rateLimitTokenFound = tokenStrings.find((t) => t.includes('rate_limit'));
    if (rateLimitTokenFound) {
      return {
        success: false,
        provider: this.name,
        status: 'RETRYING',
        errorClassification: 'RATE_LIMITED',
        errorCode: 'MessageRateExceeded',
        errorMessage: 'Rate limit exceeded on provider gateway.',
        retryAfterSeconds: 30,
      };
    }

    return {
      success: true,
      provider: this.name,
      status: 'SENT',
      providerMessageId: `expo_ticket_${request.deliveryId}`,
      metadata: { simulated: true, tokenCount: tokenStrings.length },
    };
  }
}

export const expoPushProvider = new ExpoPushProvider();
export default expoPushProvider;
