/** Provider-neutral adapter for Brevo. */
import { config } from '../../../shared/config';
import { brevoClient } from './brevoClient';


export type Provider = 'postal' | 'brevo';

export interface ProviderSendOptions {
  recipientBatchCount: number;
  recipientBatchIds: string[];
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
}

export class BrevoAdapter {
  public async send(
    to: string[],
    htmlContent: string,
    textContent?: string,
    options: ProviderSendOptions = { recipientBatchCount: 1, recipientBatchIds: [] },
  ): Promise<ProviderSendResult> {
    if (config.BREVO_DELIVERY_MODE === 'mock') {
      const acceptedCount = Math.max(0, to.length - 1);
      const accepted = to.slice(0, acceptedCount).map((email, index) => ({
        email,
        status: 'accepted',
        id: `mock_brevo_${index + 1}`,
        token: `tok_bot_${Date.now()}_${index}`,
      }));
      return {
        ok: true,
        acceptedRecipients: accepted,
        rejectedRecipients: [],
        ambiguousRecipients: [],
        provider: 'brevo',
        providerMessageId: `mock_brevo_${Date.now()}_batch_${options.recipientBatchCount}`,
      };
    }

    const recipients = to.map((email) => ({ email }));

    let httpStatus: number | undefined;
    let responseBody: any;
    let error: unknown;

    try {
      responseBody = await brevoClient.send({
        to: recipients,
        subject: 'GymDeck Notification',
        htmlContent,
        textContent,
        sender: {
          name: 'GymDeck',
          email: config.BREVO_SENDER_EMAIL || 'notifications@mail.epic-studio.in',
        },
      });
      httpStatus = 201;
    } catch (err) {
      error = err;
      const apiError = err as { httpStatus?: number };
      httpStatus = apiError.httpStatus || httpStatus || 500;
      responseBody = (err as any)?.response?.body ?? null;
    }

    if (error || !responseBody) {
      return {
        ok: false,
        acceptedRecipients: [],
        rejectedRecipients: [],
        ambiguousRecipients: to.map((email) => ({
          email,
          status: 'refused',
          error: error ? (error as Error).message : 'No provider response',
        })),
        errorMessage: error ? (error as Error).message : 'No provider response',
        providerMessageId: undefined,
        providerResponse: null,
        provider: 'brevo',
      };
    }

    const data = responseBody.data ?? responseBody;
    const messageId = responseBody.messageId || data?.messageId;

    const acceptedSet = new Set<string>();
    const acceptedRecipients: ProviderSendResult['acceptedRecipients'] = [];
    const rejectedRecipients: ProviderSendResult['rejectedRecipients'] = [];
    const ambiguousRecipients: ProviderSendResult['ambiguousRecipients'] = [];

    if (httpStatus >= 500 || (data?.Reject && data.Reject.length > 0)) {
      return {
        ok: false,
        acceptedRecipients: [],
        rejectedRecipients: to.map((email) => ({ email, status: 'refused', id: messageId })),
        ambiguousRecipients: [],
        errorMessage: 'Provider rejected the message',
        provider: 'brevo',
        providerMessageId: messageId,
        providerResponse: responseBody,
      };
    }

    const record = (email: string, status: string, extra?: any) => {
      if (acceptedSet.has(email)) return;
      acceptedSet.add(email);
      acceptedRecipients.push({ email, status, ...extra });
    };

    if (data?.Accept && Array.isArray(data.Accept)) {
      for (const email of data.Accept) {
        record(email, 'accepted', { id: messageId });
      }
    } else {
      for (const email of to) record(email, 'accepted', { id: messageId });
    }

    if (data?.Reject && Array.isArray(data.Reject)) {
      for (const email of data.Reject) {
        rejectedRecipients.push({ email, status: 'refused', id: messageId });
      }
    }

    if (data?.Neutral && Array.isArray(data.Neutral)) {
      for (const email of data.Neutral) {
        ambiguousRecipients.push({ email, status: 'neutral', id: messageId });
      }
    }

    const ok = ambiguousRecipients.length === 0 && rejectedRecipients.length === 0;
    return {
      ok,
      acceptedRecipients,
      rejectedRecipients,
      ambiguousRecipients,
      errorMessage: ok ? undefined : 'Partial acceptance or ambiguity detected',
      provider: 'brevo',
      providerMessageId: messageId,
      providerResponse: responseBody,
    };
  }
}

export const brevoAdapter = new BrevoAdapter();
