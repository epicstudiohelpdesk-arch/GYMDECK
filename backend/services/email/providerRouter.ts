/** Provider-neutral dispatch router. Selects provider on enqueue and snapshots it for retries. */
import { db } from '../../shared/database';
import { emailMessages, emailDispatchAttempts } from '../../shared/database/schema';
import { eq, and } from 'drizzle-orm';
import { config } from '../../shared/config';

import { brevoAdapter } from './providers';
import { postalClient } from './providers';

export type DeliveryProvider = 'postal' | 'brevo';

export interface DeliverySendInput {
  gymId: string;
  emailMessageId: string;
  to: string[];
  htmlContent: string;
  textContent?: string;
  senderName?: string;
  senderEmail?: string;
  batchIndex: number;
  recipientBatchIds: string[];
}

export class ProviderDisambiguationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderDisambiguationError';
  }
}

function resolveSender(dtoSenderName?: string, dtoSenderEmail?: string) {
  return {
    name: dtoSenderName?.trim() || 'GymDeck',
    email: dtoSenderEmail?.trim() || 'notifications@mail.epic-studio.in',
  };
}

export class ProviderRouter {
  public async getProviderForOutbox(jobId: string): Promise<DeliveryProvider | null> {
    const [attempt] = await db
      .select({
        provider: emailDispatchAttempts.provider,
        providerMessageId: emailDispatchAttempts.providerMessageId,
        providerResponse: emailDispatchAttempts.providerResponse,
      })
      .from(emailDispatchAttempts)
      .where(eq(emailDispatchAttempts.outboxId, jobId))
      .limit(1);

    if (!attempt || attempt.provider === null || attempt.provider === undefined) return null;
    return attempt.provider as DeliveryProvider;
  }

  public async dispatch(
    input: DeliverySendInput,
  ): Promise<{ ok: boolean; result: any }> {
    const { gymId, emailMessageId, to, htmlContent, textContent, batchIndex, recipientBatchIds } = input;

    const [message] = await db
      .select()
      .from(emailMessages)
      .where(and(eq(emailMessages.id, emailMessageId), eq(emailMessages.gymId, gymId)))
      .limit(1);

    if (!message) {
      throw new ProviderDisambiguationError('Parent message not found');
    }

    const sender = resolveSender(
      String(input.senderName || message.senderDisplayName),
      String(input.senderEmail || message.fromAddress),
    );

    let provider = config.EMAIL_DELIVERY_PROVIDER;
    if (provider === undefined) provider = 'postal';
    if (provider !== 'postal' && provider !== 'brevo') {
      throw new ProviderDisambiguationError(`Unknown delivery provider: ${provider}`);
    }

    if (provider === 'brevo') {
      const result = await brevoAdapter.send(to, htmlContent, textContent, {
        recipientBatchCount: batchIndex + 1,
        recipientBatchIds,
      });
      return { ok: true, result };
    }

    const postalResult = await postalClient.sendMessage({
      to,
      from: `${sender.name} <${sender.email}>`,
      subject: message.subject,
      htmlBody: htmlContent,
      plainBody: textContent,
      tag: `gym_${gymId}`,
      customHeaders: {
        'X-GymDeck-Tenant': gymId,
        'X-GymDeck-Message-Id': emailMessageId,
        'X-GymDeck-Attempt-Id': String(batchIndex),
      },
    });

    const messages = postalResult.data?.messages || {};
    const acceptedRecipients = to.map((email) => {
      const pMsg = messages[email] || { id: Date.now(), token: email };
      return { email, id: String(pMsg.id), token: String(pMsg.token) };
    });

    return {
      ok: true,
      result: {
        ok: true,
        acceptedRecipients,
        rejectedRecipients: [],
        ambiguousRecipients: [],
        provider: 'postal',
        providerMessageId: postalResult.data?.message_id,
        providerResponse: postalResult.data,
      },
    };
  }
}

export const providerRouter = new ProviderRouter();
