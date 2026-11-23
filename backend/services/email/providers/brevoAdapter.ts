/**
 * Provider-neutral adapter for Brevo.
 * Translates application email requests to Brevo transactional API calls
 * and maps provider outcomes to unified delivery results.
 */

import { createHash } from 'node:crypto';
import { config } from '../../../shared/config';
import { brevoClient, BrevoApiError } from './brevoClient';

export type Provider = 'postal' | 'brevo';

export interface ProviderSendOptions {
  recipientBatchCount: number;
  recipientBatchIds: string[];
  replyTo?: string;
  subject?: string;
  senderName?: string;
  senderEmail?: string;
}

export interface ProviderSendResult {
  ok: boolean;
  acceptedRecipients: Array<{ email: string; status: string; id?: string; token?: string }>;
  rejectedRecipients: Array<{ email: string; status: string; id?: string; token?: string }>;
  ambiguousRecipients: Array<{ email: string; status: string; id?: string; token?: string }>;
  errorMessage?: string;
  provider: Provider;
  providerMessageId?: string;
  providerResponse?: any;
  httpStatus?: number;
  isAmbiguous?: boolean;
  code?: string;
}

export class BrevoAdapter {
  public async send(
    to: string[],
    htmlContent: string,
    textContent?: string,
    _options: ProviderSendOptions = { recipientBatchCount: 1, recipientBatchIds: [] }
  ): Promise<ProviderSendResult> {
    if (config.BREVO_DELIVERY_MODE === 'mock') {
      const mockId = `<mock_brevo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@mail.epic-studio.in>`;
      const accepted = to.map((email) => ({
        email,
        status: 'accepted',
        id: mockId,
        token: `tok_${Date.now()}`,
      }));
      return {
        ok: true,
        acceptedRecipients: accepted,
        rejectedRecipients: [],
        ambiguousRecipients: [],
        provider: 'brevo',
        providerMessageId: mockId,
        providerResponse: { messageId: mockId },
        httpStatus: 201,
      };
    }

    let response: any;
    try {
      response = await brevoClient.send({
        to: to.map((email) => ({ email })),
        subject: _options.subject || 'GymDeck Notification',
        htmlContent,
        textContent,
        replyTo: _options.replyTo,
        // Stable per (batch, recipients, subject) so a retry of an ambiguous
        // outcome cannot create a duplicate send.
        headers: {
          'idempotency-key': createHash('sha256')
            .update([...(_options.recipientBatchIds || []), ...to, _options.subject || ''].join('|'))
            .digest('hex'),
        },
        sender: {
          name: _options.senderName || config.BREVO_SENDER_NAME || 'GymDeck',
          email: _options.senderEmail || config.BREVO_SENDER_EMAIL || 'notifications@mail.epic-studio.in',
        },
      });
    } catch (err: any) {
      const isBrevoError = err instanceof BrevoApiError;
      const isAmbiguous = isBrevoError ? err.isAmbiguous : true;
      const httpStatus = isBrevoError ? err.httpStatus : 500;
      const code = isBrevoError ? err.code : 'UNKNOWN_ERROR';
      const errMsg = err?.message || 'Brevo dispatch failed';

      return {
        ok: false,
        acceptedRecipients: [],
        rejectedRecipients: !isAmbiguous
          ? to.map((email) => ({ email, status: 'refused', error: errMsg }))
          : [],
        ambiguousRecipients: isAmbiguous
          ? to.map((email) => ({ email, status: 'ambiguous', error: errMsg }))
          : [],
        errorMessage: errMsg,
        provider: 'brevo',
        providerMessageId: undefined,
        providerResponse: isBrevoError ? err.responseBody : null,
        httpStatus,
        isAmbiguous,
        code,
      };
    }

    // Response succeeded with 2xx. Validate messageId existence.
    const messageId = response.messageId || response.data?.messageId;
    if (!messageId || typeof messageId !== 'string' || messageId.trim().length === 0) {
      return {
        ok: false,
        acceptedRecipients: [],
        rejectedRecipients: [],
        ambiguousRecipients: to.map((email) => ({
          email,
          status: 'ambiguous',
          error: 'Brevo returned HTTP 2xx but response body lacked a valid messageId',
        })),
        errorMessage: 'Brevo returned HTTP 2xx but response body lacked a valid messageId',
        provider: 'brevo',
        providerMessageId: undefined,
        providerResponse: response.data,
        httpStatus: response.httpStatus || 200,
        isAmbiguous: true,
        code: 'MISSING_PROVIDER_MESSAGE_ID',
      };
    }

    const data = response.data || {};
    const acceptedRecipients: ProviderSendResult['acceptedRecipients'] = [];
    const rejectedRecipients: ProviderSendResult['rejectedRecipients'] = [];
    const ambiguousRecipients: ProviderSendResult['ambiguousRecipients'] = [];

    // Check for explicit per-recipient rejection arrays from Brevo
    if (Array.isArray(data.Reject) && data.Reject.length > 0) {
      for (const email of data.Reject) {
        rejectedRecipients.push({ email, status: 'refused', id: messageId });
      }
    }
    if (Array.isArray(data.Neutral) && data.Neutral.length > 0) {
      for (const email of data.Neutral) {
        ambiguousRecipients.push({ email, status: 'neutral', id: messageId });
      }
    }

    const rejectedSet = new Set(rejectedRecipients.map((r) => r.email.toLowerCase()));
    const neutralSet = new Set(ambiguousRecipients.map((r) => r.email.toLowerCase()));

    for (const email of to) {
      if (!rejectedSet.has(email.toLowerCase()) && !neutralSet.has(email.toLowerCase())) {
        acceptedRecipients.push({ email, status: 'accepted', id: messageId });
      }
    }

    const ok = acceptedRecipients.length > 0 && rejectedRecipients.length === 0 && ambiguousRecipients.length === 0;

    return {
      ok,
      acceptedRecipients,
      rejectedRecipients,
      ambiguousRecipients,
      errorMessage: ok ? undefined : 'Partial recipient acceptance or ambiguity detected from Brevo',
      provider: 'brevo',
      providerMessageId: messageId,
      providerResponse: response.data,
      httpStatus: response.httpStatus || 201,
      isAmbiguous: ambiguousRecipients.length > 0,
    };
  }
}

export const brevoAdapter = new BrevoAdapter();
