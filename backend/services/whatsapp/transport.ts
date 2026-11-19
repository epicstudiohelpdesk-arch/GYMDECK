/**
 * GymDeck WhatsApp - outbound transport.
 *
 * Delivery is performed by the bundled OpenWA gateway over its authenticated
 * REST API. GymDeck does not talk to Meta, browsers, or WhatsApp directly.
 */

import { openwaClient } from './openwaClient';

export interface OutboundAccount {
  id: string;
  gymId: string;
  openwaSessionId: string | null;
}

export interface SendTextInput {
  account: OutboundAccount;
  to: string;
  body: string;
  jobId: string;
}

export interface SendTemplateInput {
  account: OutboundAccount;
  to: string;
  body: string;
  templateName: string;
  language: string;
  parameters: string[];
  jobId: string;
}

export type SendErrorClass =
  | 'TRANSIENT'
  | 'RATE_LIMITED'
  | 'INVALID_RECIPIENT'
  | 'INVALID_TEMPLATE'
  | 'AUTHENTICATION'
  | 'PERMANENT';

export interface SendResult {
  ok: boolean;
  accepted: boolean;
  simulated: boolean;
  providerMessageId: string | null;
  errorClass: SendErrorClass | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryable: boolean;
  retryAfterSeconds: number | null;
}

function missingSession(): SendResult {
  return {
    ok: false,
    accepted: false,
    simulated: false,
    providerMessageId: null,
    errorClass: 'AUTHENTICATION',
    errorCode: 'OPENWA_SESSION_MISSING',
    errorMessage: 'This gym has no linked OpenWA WhatsApp session. Reconnect WhatsApp.',
    retryable: false,
    retryAfterSeconds: null,
  };
}

export const whatsappTransport = {
  async sendText(input: SendTextInput): Promise<SendResult> {
    if (!input.account.openwaSessionId) return missingSession();

    const result = await openwaClient.sendText(
      input.account.openwaSessionId,
      input.to,
      input.body,
      input.jobId
    );

    return { ...result, simulated: false };
  },

  /**
   * OpenWA has no Meta template approval. GymDeck renders its saved template
   * locally and sends the resulting text, so the recipient receives exactly the
   * preview the owner approved in the Hub.
   */
  async sendTemplate(input: SendTemplateInput): Promise<SendResult> {
    if (!input.account.openwaSessionId) return missingSession();

    if (!input.body.trim()) {
      return {
        ok: false,
        accepted: false,
        simulated: false,
        providerMessageId: null,
        errorClass: 'INVALID_TEMPLATE',
        errorCode: 'EMPTY_TEMPLATE_BODY',
        errorMessage: 'The saved template rendered an empty message.',
        retryable: false,
        retryAfterSeconds: null,
      };
    }

    const result = await openwaClient.sendText(
      input.account.openwaSessionId,
      input.to,
      input.body,
      input.jobId
    );

    return { ...result, simulated: false };
  },
};
