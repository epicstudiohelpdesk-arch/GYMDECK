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
    message_id?: string;
    messages?: Record<string, PostalRecipientResult>;
    code?: string;
    message?: string;
  };
  details?: string;
  message?: string;
  httpStatus?: number;
  rawError?: any;
}

export type PostalErrorCategory = 
  | 'CLIENT_REJECTED'        // HTTP 400, 422, unauthenticated sender, invalid parameters
  | 'AUTH_FAILED'            // HTTP 401, 403, invalid server API key
  | 'RATE_LIMITED'           // HTTP 429
  | 'SERVER_ERROR'           // HTTP 500, 502, 503, 504
  | 'CONNECTION_FAILED'      // ECONNREFUSED, ENOTFOUND, TLS error before transmission
  | 'AMBIGUOUS_TIMEOUT';     // ETIMEDOUT, socket hang up after transmission started

export class PostalApiError extends Error {
  public readonly httpStatus?: number;
  public readonly code?: string;
  public readonly category: PostalErrorCategory;
  public readonly retryAfterSeconds?: number;
  public readonly isAmbiguous: boolean;

  constructor(
    message: string,
    options: {
      httpStatus?: number;
      code?: string;
      category: PostalErrorCategory;
      retryAfterSeconds?: number;
      isAmbiguous?: boolean;
    }
  ) {
    super(message);
    this.name = 'PostalApiError';
    this.httpStatus = options.httpStatus;
    this.code = options.code;
    this.category = options.category;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.isAmbiguous = options.isAmbiguous ?? false;
  }
}

export interface PostalMessageDetails {
  id: number;
  token: string;
  status?: {
    status: string;
    last_delivery_attempt?: number;
    held?: boolean;
    hold_expiry?: number;
  };
  details?: {
    rcpt_to: string;
    mail_from: string;
    subject: string;
    message_id: string;
    timestamp: number;
    tag?: string;
  };
}

export class PostalClient {
  private baseUrl: string;
  private serverApiKey: string;

  constructor() {
    this.baseUrl = config.POSTAL_API_URL.replace(/\/$/, '');
    this.serverApiKey = config.POSTAL_SERVER_API_KEY || '';
  }

  /**
   * Look up an existing message by its integer Postal message ID
   * Endpoint: /api/v1/messages/message (supported by app/controllers/legacy_api/messages_controller.rb)
   */
  public async getMessage(id: number | string): Promise<PostalMessageDetails | null> {
    if (config.POSTAL_DELIVERY_MODE === 'mock') {
      return {
        id: Number(id),
        token: `mock_tok_${id}`,
        status: { status: 'Sent' },
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${this.baseUrl}/messages/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Server-API-Key': this.serverApiKey,
          'Host': 'localhost:5000',
        },
        body: JSON.stringify({
          id: Number(id),
          _expansions: ['status', 'details'],
        }),
        signal: controller.signal,
      });

      if (response.status === 404) return null;
      const json: any = await response.json();
      if (json.status === 'success' && json.data) {
        return json.data as PostalMessageDetails;
      }
      return null;
    } catch (err) {
      logger.warn('[postalClient] Failed to query message status', { id, err });
      return null;
    } finally {
      clearTimeout(timeout);
    }
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

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/send/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Server-API-Key': this.serverApiKey,
          'Host': 'localhost:5000',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (networkErr: any) {
      const isAbort = networkErr.name === 'AbortError';
      const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
      
      // Classify network errors:
      // AbortError indicates 20s timeout where request might have reached Postal (Ambiguous)
      // ECONNREFUSED / ENOTFOUND indicates server was never reached (Connection Failed)
      if (isAbort) {
        throw new PostalApiError(`Postal request timed out: ${msg}`, {
          category: 'AMBIGUOUS_TIMEOUT',
          isAmbiguous: true,
        });
      }

      throw new PostalApiError(`Failed to connect to Postal: ${msg}`, {
        category: 'CONNECTION_FAILED',
        isAmbiguous: false,
      });
    } finally {
      clearTimeout(timeout);
    }

    let json: PostalSendResponse;
    try {
      json = (await response.json()) as PostalSendResponse;
    } catch (parseErr: any) {
      throw new PostalApiError('Invalid or incomplete JSON response from Postal', {
        httpStatus: response.status,
        category: response.status >= 500 ? 'SERVER_ERROR' : 'AMBIGUOUS_TIMEOUT',
        isAmbiguous: response.status >= 200 && response.status < 300,
      });
    }

    if (json.status !== 'success' || response.status >= 400) {
      const status = response.status;
      const code = json.data?.code || (json as any).code;
      const errorMsg = json.data?.message || json.message || json.details || 'Postal send request failed';
      
      let category: PostalErrorCategory = 'CLIENT_REJECTED';
      let retryAfterSeconds: number | undefined;

      if (status === 401 || status === 403 || code === 'InvalidServerAPIKey' || code === 'AccessDenied') {
        category = 'AUTH_FAILED';
      } else if (status === 429 || code === 'RateLimitExceeded') {
        category = 'RATE_LIMITED';
        const retryHeader = response.headers.get('retry-after');
        if (retryHeader) {
          retryAfterSeconds = parseInt(retryHeader, 10) || 60;
        }
      } else if (status >= 500 || status === 408) {
        category = 'SERVER_ERROR';
      }

      // CRITICAL DELIVERABILITY SAFETY RULE:
      // If HTTP 5xx, 408, or 429 is returned from upstream, or if an reverse proxy/edge gateway
      // emits 429/5xx, transmission may have already reached the application layer or Puma backlog.
      // Furthermore, Postal's legacy API controller does not have a native rate-limiter, meaning any
      // HTTP 429 originates from an intermediate reverse proxy (e.g. Nginx, Cloudflare) whose boundary
      // relative to request buffer processing and upstream persistence cannot be proven without probe.
      // Therefore, HTTP 5xx, 408, and 429 MUST be treated as ambiguous (isAmbiguous = true).
      // Only pure client-side parameter errors (400, 422) or authentication errors (401, 403) have proven non-acceptance.
      const isAmbiguous = (status >= 500 || status === 408 || status === 429 || category === 'RATE_LIMITED');

      throw new PostalApiError(errorMsg, {
        httpStatus: status,
        code,
        category,
        retryAfterSeconds,
        isAmbiguous,
      });
    }

    return json;
  }
}

export const postalClient = new PostalClient();
