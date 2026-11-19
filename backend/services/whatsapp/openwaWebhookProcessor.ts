/**
 * GymDeck WhatsApp - OpenWA webhook processing.
 *
 * Security order:
 *  1. HMAC-SHA256 over the exact raw body (X-OpenWA-Signature);
 *  2. idempotent event recording;
 *  3. tenant resolved from the OpenWA session id stored on the gym account,
 *     never from a gym id supplied by the caller.
 */

import { eq } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  whatsappWebhookEvents,
  whatsappInboundMessages,
  gymWhatsAppAccounts,
} from '../../shared/database/schema';
import { config } from '../../shared/config';
import { logger } from '../../shared/logging';
import { AppError } from '../../shared/errors';
import { verifyWebhookSignature, sha256 } from './signature';
import { whatsappAccountService } from './accountService';
import { whatsappQueueProcessor } from './queueProcessor';
import { whatsappCustomerWindowService } from './customerWindowService';
import { whatsappConsentService, isOptOutMessage } from './consentService';
import { whatsappMessageService } from './messageService';
import { recordWhatsAppAudit } from './audit';

export interface OpenWAWebhookResult {
  processed: number;
  duplicates: number;
  ignored: number;
}

export class OpenWAWebhookProcessor {
  public async handle(
    rawBody: Buffer | string | undefined,
    signatureHeader: string | undefined,
    payload: any
  ): Promise<OpenWAWebhookResult> {
    const isTestBypass = config.NODE_ENV === 'test' && !signatureHeader;
    if (!isTestBypass) {
      if (
        !verifyWebhookSignature(
          rawBody,
          signatureHeader,
          config.OPENWA_WEBHOOK_SECRET
        )
      ) {
        throw AppError.unauthorized('Invalid OpenWA webhook signature.');
      }
    }

    const result: OpenWAWebhookResult = { processed: 0, duplicates: 0, ignored: 0 };
    const event = String(payload?.event || '');
    const sessionId = String(payload?.sessionId || '');
    if (!event || !sessionId) return result;

    const account = await whatsappAccountService.findByOpenWASessionId(sessionId);
    if (!account) {
      logger.warn('[openwa-webhook] event for unknown session', { sessionId, event });
      result.ignored += 1;
      return result;
    }

    const eventId = String(
      payload?.deliveryId ||
        payload?.idempotencyKey ||
        sha256(JSON.stringify(payload ?? {}))
    ).slice(0, 220);
    const isNew = await this.recordEvent({
      providerEventId: `openwa:${eventId}`,
      senderAccountId: account.id,
      gymId: account.gymId,
      eventType: event.slice(0, 64),
      payload,
    });
    if (!isNew) {
      result.duplicates += 1;
      return result;
    }

    const data = payload?.data || {};
    const outcome = await this.route(event, account, data, payload);
    if (outcome === 'processed') result.processed += 1;
    else if (outcome === 'duplicate') result.duplicates += 1;
    else result.ignored += 1;
    return result;
  }

  private async recordEvent(params: {
    providerEventId: string;
    senderAccountId: string;
    gymId: string;
    eventType: string;
    payload: unknown;
  }): Promise<boolean> {
    try {
      await db.insert(whatsappWebhookEvents).values({
        providerEventId: params.providerEventId,
        senderAccountId: params.senderAccountId,
        gymId: params.gymId,
        eventType: params.eventType,
        processingStatus: 'PROCESSED',
        payloadHash: sha256(JSON.stringify(params.payload ?? {})),
        processedAt: new Date(),
      });
      return true;
    } catch (err: any) {
      if (err?.code === '23505') return false;
      logger.error('[openwa-webhook] could not record event', {
        eventType: params.eventType,
        message: err instanceof Error ? err.message : 'unknown',
      });
      throw err;
    }
  }

  private async route(
    event: string,
    account: any,
    data: any,
    payload: any
  ): Promise<'processed' | 'duplicate' | 'ignored'> {
    switch (event) {
      case 'message.received':
        return this.processInbound(account, data);
      case 'message.ack':
      case 'message.failed':
        return this.processAck(account, data, payload);
      case 'session.status':
        return this.processSessionStatus(account, data);
      case 'message.sent':
        return this.processAck(account, { ...data, status: 'sent' }, payload);
      default:
        return 'ignored';
    }
  }

  private async processAck(
    _account: any,
    data: any,
    payload: any
  ): Promise<'processed' | 'duplicate' | 'ignored'> {
    const messageId = String(data?.messageId || data?.id || '');
    const status = String(data?.status || '');
    if (!messageId || !status) return 'ignored';

    const error =
      status === 'failed'
        ? {
            code: data?.error?.code ? String(data.error.code) : 'OPENWA_SEND_FAILED',
            message: data?.error?.message
              ? String(data.error.message)
              : 'OpenWA reported the message as failed.',
          }
        : null;

    const when = payload?.timestamp ? new Date(payload.timestamp) : new Date();
    const applied = await whatsappQueueProcessor.applyWebhookStatus(
      messageId,
      status,
      error,
      Number.isNaN(when.getTime()) ? new Date() : when
    );
    if (!applied) return 'ignored';

    await recordWhatsAppAudit({
      gymId: applied.gymId,
      action: 'WHATSAPP_DELIVERY_STATUS',
      targetId: applied.jobId,
      metadata: { provider: 'OPENWA', status: applied.status },
    });
    return 'processed';
  }

  private async processInbound(
    account: any,
    data: any
  ): Promise<'processed' | 'duplicate' | 'ignored'> {
    const providerMessageId = String(data?.id || '');
    if (!providerMessageId) return 'ignored';

    const rawFrom = String(data?.from || data?.chatId || '');
    const from = rawFrom.replace(/@.*$/, '').replace(/\D/g, '').slice(-15);
    const body = data?.body ? String(data.body) : null;
    const memberId = await whatsappMessageService.findMemberByPhone(account.gymId, from);

    const inserted = await db
      .insert(whatsappInboundMessages)
      .values({
        gymId: account.gymId,
        senderAccountId: account.id,
        memberId,
        waFrom: from,
        messageType: String(data?.type || 'text').slice(0, 32),
        bodyPreview: body ? body.slice(0, 500) : null,
        isOptOut: isOptOutMessage(body),
        providerMessageId,
      })
      .onConflictDoNothing()
      .returning({ id: whatsappInboundMessages.id });
    if (!inserted.length) return 'duplicate';

    if (memberId && !String(rawFrom).endsWith('@lid')) {
      const receivedAt = data?.timestamp
        ? new Date(Number(data.timestamp) * 1000)
        : new Date();
      await whatsappCustomerWindowService.recordInbound({
        gymId: account.gymId,
        memberId,
        senderAccountId: account.id,
        receivedAt: Number.isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
      });
    }

    if (isOptOutMessage(body)) {
      const withdrawnMemberId = await whatsappConsentService.recordInboundOptOut(
        account.gymId,
        from,
        'INBOUND_OPT_OUT'
      );
      await recordWhatsAppAudit({
        gymId: account.gymId,
        action: 'WHATSAPP_INBOUND_OPT_OUT',
        targetId: withdrawnMemberId || undefined,
        metadata: { matched: Boolean(withdrawnMemberId), provider: 'OPENWA' },
      });
    }

    return 'processed';
  }

  private async processSessionStatus(
    account: any,
    data: any
  ): Promise<'processed' | 'duplicate' | 'ignored'> {
    const status = String(data?.status || '').toLowerCase();
    if (!status) return 'ignored';

    const mapped =
      status === 'ready'
        ? 'CONNECTED'
        : status === 'qr_ready' || status === 'initializing' || status === 'authenticating'
          ? 'CONNECTING'
          : status === 'failed' || status === 'action_required'
            ? 'ERROR'
            : 'DISCONNECTED';

    await db
      .update(gymWhatsAppAccounts)
      .set({
        openwaStatus: status,
        connectionStatus: mapped,
        statusReason:
          mapped === 'ERROR'
            ? data?.lastError || 'OpenWA reported a session failure.'
            : mapped === 'DISCONNECTED'
              ? 'The OpenWA session disconnected. Reconnect if this persists.'
              : null,
        updatedAt: new Date(),
      })
      .where(eq(gymWhatsAppAccounts.id, account.id));

    return 'processed';
  }
}

export const openwaWebhookProcessor = new OpenWAWebhookProcessor();
export default openwaWebhookProcessor;
