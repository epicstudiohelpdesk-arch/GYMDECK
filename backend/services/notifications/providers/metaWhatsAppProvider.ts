/**
 * GymDeck Notification Core - Meta WhatsApp Cloud API Provider
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../../../shared/database';
import { gymMembers, users } from '../../../shared/database/schema';
import { config } from '../../../shared/config';
import {
  NotificationProvider,
  DeliveryRequest,
  DeliveryResult,
  ErrorClassification,
} from './types';
import { normalizePhoneNumber, resolveWhatsAppTemplate } from './whatsappTemplates';

export class MetaWhatsAppProvider implements NotificationProvider {
  public readonly name = 'META_WHATSAPP';
  public readonly channel = 'WHATSAPP';

  public validateConfiguration(): { valid: boolean; reason?: string } {
    if (config.NOTIFICATION_PROVIDER_MODE === 'live') {
      if (!config.WHATSAPP_PHONE_NUMBER_ID) {
        return { valid: false, reason: 'WHATSAPP_PHONE_NUMBER_ID is missing' };
      }
      if (!config.WHATSAPP_ACCESS_TOKEN) {
        return { valid: false, reason: 'WHATSAPP_ACCESS_TOKEN is missing' };
      }
    }
    return { valid: true };
  }

  public classifyError(error: any): ErrorClassification {
    const code = Number(error?.code || error?.error?.code || 0);
    const msg = String(error?.message || error?.error?.message || error || '').toUpperCase();

    if (code === 131030 || code === 131026 || msg.includes('NOT_OPTED_IN') || msg.includes('INVALID_PHONE')) {
      return 'INVALID_RECIPIENT';
    }
    if (code === 132001 || code === 132000 || msg.includes('TEMPLATE')) {
      return 'INVALID_TEMPLATE';
    }
    if (code === 130429 || code === 80007 || msg.includes('RATE_LIMIT') || code === 429) {
      return 'RATE_LIMITED';
    }
    if (code === 190 || code === 100 || code === 401 || msg.includes('UNAUTHORIZED') || msg.includes('AUTH')) {
      return 'AUTHENTICATION_FAILURE';
    }
    if (msg.includes('TIMEOUT') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT')) {
      return 'TIMEOUT';
    }
    if (code >= 500 || msg.includes('SERVICE_UNAVAILABLE') || msg.includes('503')) {
      return 'PROVIDER_UNAVAILABLE';
    }
    return 'TRANSIENT';
  }

  public async send(request: DeliveryRequest): Promise<DeliveryResult> {
    // 1. Resolve Authoritative Recipient Phone from Database
    let rawPhone: string | null = null;

    if (request.recipientType === 'MEMBER') {
      const member = (
        await db
          .select({ phone: gymMembers.phone })
          .from(gymMembers)
          .where(and(eq(gymMembers.id, request.recipientId), eq(gymMembers.gymId, request.gymId)))
          .limit(1)
      )[0];
      rawPhone = member?.phone || null;
    } else {
      const user = (
        await db
          .select({ phone: users.phoneNumber })
          .from(users)
          .where(and(eq(users.id, request.recipientId), eq(users.gymId, request.gymId)))
          .limit(1)
      )[0];
      rawPhone = user?.phone || null;
    }

    if (!rawPhone || rawPhone.trim().length < 7) {
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        errorClassification: 'INVALID_RECIPIENT',
        errorCode: 'MISSING_RECIPIENT_PHONE',
        errorMessage: 'Authoritative recipient record does not contain a valid phone number.',
      };
    }

    const normalizedPhone = normalizePhoneNumber(rawPhone);
    if (!normalizedPhone || normalizedPhone.length < 8) {
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        errorClassification: 'INVALID_RECIPIENT',
        errorCode: 'INVALID_PHONE_FORMAT',
        errorMessage: 'Recipient phone number could not be normalized to international E.164 standard.',
      };
    }

    // 2. Resolve WhatsApp Template Definition & Variables
    const template = resolveWhatsAppTemplate(
      request.type,
      request.title,
      request.body,
      request.payload
    );

    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'template',
      template: {
        name: template.templateName,
        language: {
          code: template.languageCode,
        },
        components: [
          {
            type: 'body',
            parameters: template.parameters,
          },
        ],
      },
    };

    // 3. Dispatch to Meta WhatsApp Gateway in Live Mode
    if (config.NOTIFICATION_PROVIDER_MODE === 'live') {
      try {
        const url = `${config.WHATSAPP_API_URL}/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
            'X-GymDeck-Delivery-Id': request.deliveryId,
          },
          body: JSON.stringify(messagePayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const resData: any = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errorObj = resData?.error || {};
          const classification = this.classifyError(errorObj);
          const isRetryable = classification === 'RATE_LIMITED' || classification === 'TRANSIENT' || classification === 'PROVIDER_UNAVAILABLE';

          return {
            success: false,
            provider: this.name,
            status: isRetryable ? 'RETRYING' : 'FAILED',
            errorClassification: classification,
            errorCode: String(errorObj.code || response.status),
            errorMessage: errorObj.message || `Meta WhatsApp API error (HTTP ${response.status})`,
            retryAfterSeconds: classification === 'RATE_LIMITED' ? 60 : undefined,
          };
        }

        const messageId = resData?.messages?.[0]?.id || `wamid.${request.deliveryId}`;

        return {
          success: true,
          provider: this.name,
          status: 'SENT', // SENT means accepted by WhatsApp cloud, delivery is confirmed via webhook
          providerMessageId: messageId,
          metadata: { wamid: messageId, template: template.templateName },
        };
      } catch (err: any) {
        const classification = this.classifyError(err);
        return {
          success: false,
          provider: this.name,
          status: 'RETRYING',
          errorClassification: classification,
          errorCode: err?.name || 'NETWORK_ERROR',
          errorMessage: err?.message || 'Failed to reach Meta WhatsApp API',
          retryAfterSeconds: 30,
        };
      }
    }

    // 4. Sandbox / Test Mode Handler
    if (rawPhone.includes('000000') || rawPhone.includes('invalid')) {
      return {
        success: false,
        provider: this.name,
        status: 'FAILED',
        errorClassification: 'INVALID_RECIPIENT',
        errorCode: '131030',
        errorMessage: 'Recipient is not opted in or phone number is invalid on WhatsApp network.',
      };
    }

    if (rawPhone.includes('999999')) {
      return {
        success: false,
        provider: this.name,
        status: 'RETRYING',
        errorClassification: 'RATE_LIMITED',
        errorCode: '130429',
        errorMessage: 'Rate limit hit on WhatsApp Cloud API endpoint.',
        retryAfterSeconds: 60,
      };
    }

    const deterministicWamid = `wamid.HBgM${request.deliveryId.replace(/-/g, '').substring(0, 16)}AAPQAwA=`;

    return {
      success: true,
      provider: this.name,
      status: 'SENT',
      providerMessageId: deterministicWamid,
      metadata: { simulated: true, wamid: deterministicWamid, template: template.templateName },
    };
  }
}

export const metaWhatsAppProvider = new MetaWhatsAppProvider();
export default metaWhatsAppProvider;
