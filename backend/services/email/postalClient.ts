/**
 * Postal HTTP API Client & Delivery Result Types
 *
 * Implements Postal v1 Legacy API (/api/v1/send/message)
 * authenticated via X-Server-API-Key.
 */

import { config } from '../../shared/config';
import { logger } from '../../shared/logging';

export interface PostalSendParams {
  to: string[];
  cc?: string[];
  bcc?: string[];
  from: string;
  sender?: string;
  subject: string;
  replyTo?: string;
  plainBody?: string;
  htmlBody: string;
  tag?: string;
  customHeaders?: Record<string, string>;
  attachments?: Array<{
    name: string;
    contentType: string;
    data: string; // base64
  }>;
}

export interface PostalRecipientResult {
  id: number;
  token: string;
}

export interface PostalSendResponse {
  status: 'success' | 'error';
  time?: number;
  flags?: Record<string, any>;
  data?: {
    message_id: string;
    messages: Record<string, PostalRecipientResult>;
  };
  details?: string;
  message?: string;
}

export class PostalClient {
  private baseUrl: string;
  private serverApiKey: string;

  constructor() {
    this.baseUrl = config.POSTAL_API_URL.replace(/\/$/, '');
    this.serverApiKey = config.POSTAL_SERVER_API_KEY || '';
  }

  public async sendMessage(params: PostalSendParams): Promise<PostalSendResponse> {
    // If in mock delivery mode, simulate instantaneous acceptance
    if (config.POSTAL_DELIVERY_MODE === 'mock') {
      logger.info('[postalClient] Mock send email dispatch', {
        toCount: params.to.length,
        subject: params.subject,
        from: params.from,
      });

      const messages: Record<string, PostalRecipientResult> = {};
      const fakeMsgId = `mock_msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      params.to.forEach((email, idx) => {
        messages[email] = {
          id: 100000 + idx,
          token: `tok_${Math.random().toString(36).slice(2, 10)}`,
        };
      });

      return {
        status: 'success',
        time: 0.05,
        data: {
          message_id: fakeMsgId,
          messages,
        },
      };
    }

    const payload = {
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      from: params.from,
      sender: params.sender,
      subject: params.subject,
      reply_to: params.replyTo,
      plain_body: params.plainBody,
      html_body: params.htmlBody,
      tag: params.tag,
      headers: params.customHeaders,
      attachments: params.attachments?.map((att) => ({
        name: att.name,
        content_type: att.contentType,
        data: att.data,
      })),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(`${this.baseUrl}/send/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Server-API-Key': this.serverApiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const json = (await response.json()) as PostalSendResponse;
      if (json.status !== 'success') {
        throw new Error(json.message || json.details || 'Postal send request failed');
      }
      return json;
    } catch (err: any) {
      logger.error('[postalClient] Error sending message to Postal', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const postalClient = new PostalClient();
