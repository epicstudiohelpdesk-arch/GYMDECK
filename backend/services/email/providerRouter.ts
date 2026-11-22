/**
 * Provider-neutral dispatch router.
 * Dispatches email batches to the appropriate provider (Postal or Brevo)
 * and accurately propagates execution outcomes to the delivery worker.
 */

import { db } from '../../shared/database';
import { emailMessages, emailDispatchAttempts, emailOutbox } from '../../shared/database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { config } from '../../shared/config';
import { brevoAdapter } from './providers';
import { postalClient } from './providers';

export type DeliveryProvider = 'postal' | 'brevo';

export interface DeliverySendInput {
  gymId: string;
  emailMessageId: string;
  outboxId?: string;
  provider?: DeliveryProvider;
  to: string[];
  htmlContent: string;
  textContent?: string;
  subject?: string;
  replyTo?: string;
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

function resolveSender(dtoSenderName?: string | null, dtoSenderEmail?: string | null) {
  return {
    name: dtoSenderName?.trim() || 'GymDeck',
    email: dtoSenderEmail?.trim() || 'notifications@mail.epic-studio.in',
  };
}

export class ProviderRouter {
  /**
   * Determine the pinned provider for an outbox job by querying prior attempt records
   * and the outbox row itself.
   */
  public async getProviderForOutbox(jobId: string): Promise<DeliveryProvider | null> {
    const prior = await db
      .select({ provider: emailDispatchAttempts.provider })
      .from(emailDispatchAttempts)
      .where(eq(emailDispatchAttempts.outboxId, jobId))
      .orderBy(desc(emailDispatchAttempts.attemptNumber))
      .limit(1);

    if (prior.length > 0 && prior[0]?.provider) {
      return prior[0].provider.toLowerCase() as DeliveryProvider;
    }

    const outbox = await db
      .select({ provider: emailOutbox.provider })
      .from(emailOutbox)
      .where(eq(emailOutbox.id, jobId))
      .limit(1);

    if (outbox.length > 0 && outbox[0]?.provider) {
      return outbox[0].provider.toLowerCase() as DeliveryProvider;
    }

    return null;
  }

  /**
   * Dispatch a batch through the pinned provider, preserving immutable provider identity
   * and propagating actual provider results without masking failures.
   */
  public async dispatch(
    input: DeliverySendInput
  ): Promise<{ ok: boolean; result: any }> {
    const { gymId, emailMessageId, to, htmlContent, textContent, batchIndex, recipientBatchIds, outboxId } = input;

    const [message] = await db
      .select()
      .from(emailMessages)
      .where(and(eq(emailMessages.id, emailMessageId), eq(emailMessages.gymId, gymId)))
      .limit(1);

    if (!message) {
      throw new ProviderDisambiguationError('Parent message not found');
    }

    const sender = resolveSender(
      input.senderName || message.senderDisplayName,
      input.senderEmail || message.fromAddress
    );

    // Resolve provider:
    // 1. Explicitly pinned in dispatch input
    // 2. Resolved from previous attempts / outbox snapshot
    // 3. Current system configuration (only for new jobs without an established pin)
    let provider: DeliveryProvider;
    if (input.provider) {
      provider = input.provider;
    } else if (outboxId) {
      const pinned = await this.getProviderForOutbox(outboxId);
      provider = pinned || (config.EMAIL_DELIVERY_PROVIDER === 'brevo' ? 'brevo' : 'postal');
    } else {
      provider = config.EMAIL_DELIVERY_PROVIDER === 'brevo' ? 'brevo' : 'postal';
    }

    if (provider !== 'postal' && provider !== 'brevo') {
      throw new ProviderDisambiguationError(`Unknown delivery provider: ${provider}`);
    }

    const effectiveSubject = input.subject || message.subject;
    const effectiveReplyTo = input.replyTo || message.replyToAddress || undefined;

    if (provider === 'brevo') {
      const result = await brevoAdapter.send(to, htmlContent, textContent, {
        recipientBatchCount: batchIndex + 1,
        recipientBatchIds,
        replyTo: effectiveReplyTo,
        subject: effectiveSubject,
        senderName: sender.name,
        senderEmail: sender.email,
      });
      // Propagate the actual adapter success or failure
      return { ok: result.ok, result };
    }

    // Postal provider path
    try {
      const postalResult = await postalClient.sendMessage({
        to,
        from: `${sender.name} <${sender.email}>`,
        replyTo: effectiveReplyTo,
        subject: effectiveSubject,
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

      const isSuccess = postalResult.status === 'success';

      return {
        ok: isSuccess,
        result: {
          ok: isSuccess,
          acceptedRecipients: isSuccess ? acceptedRecipients : [],
          rejectedRecipients: isSuccess ? [] : to.map((email) => ({ email, status: 'refused' })),
          ambiguousRecipients: [],
          errorMessage: isSuccess ? undefined : (postalResult.message || 'Postal send failed'),
          provider: 'postal',
          providerMessageId: postalResult.data?.message_id,
          providerResponse: postalResult.data,
          httpStatus: postalResult.httpStatus || 200,
        },
      };
    } catch (postalErr: any) {
      const isAmbiguous = Boolean(postalErr?.isAmbiguous);
      return {
        ok: false,
        result: {
          ok: false,
          acceptedRecipients: [],
          rejectedRecipients: !isAmbiguous ? to.map((email) => ({ email, status: 'refused', error: postalErr?.message })) : [],
          ambiguousRecipients: isAmbiguous ? to.map((email) => ({ email, status: 'ambiguous', error: postalErr?.message })) : [],
          errorMessage: postalErr?.message || 'Postal connection error',
          provider: 'postal',
          providerMessageId: undefined,
          providerResponse: null,
          httpStatus: postalErr?.httpStatus || 500,
          isAmbiguous,
          code: postalErr?.code || 'POSTAL_ERROR',
        },
      };
    }
  }
}

export const providerRouter = new ProviderRouter();
