/**
 * Brevo Transactional Email Send Client.
 *
 * Implements Brevo v3 REST API (/v3/smtp/email) with:
 *  - Proper header authentication ('api-key')
 *  - Strict response stream parsing (never uses parse: false)
 *  - Safe extraction of Brevo messageId from JSON payload
 *  - Classification of 4xx permanent client errors, 429 rate limits, 5xx server errors,
 *    network failures, and ambiguous timeouts.
 */

import { config } from '../../../shared/config';
import { logger } from '../../../shared/logging';

export interface BrevoRecipient {
  email: string;
  name?: string;
  type?: 'to' | 'cc' | 'bcc';
}

export interface BrevoSendParams {
  to: BrevoRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  sender?: { name?: string; email: string };
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface BrevoRecipientResult {
  email: string;
  status: 'accepted' | 'refused' | 'error' | 'neutral';
  messageId?: string;
  error?: string;
  id?: string;
  token?: string;
}

export interface BrevoSendResponse {
  status: 'success' | 'error';
  time?: number;
  data?: {
    messageId?: string;
    Accept?: string[];
    Reject?: string[];
    Neutral?: string[];
    Error?: string[];
    warnings?: string[];
  };
  messageId?: string;
  httpStatus?: number;
  rawError?: any;
}

export type BrevoErrorCategory =
  | 'CLIENT_REJECTED'
  | 'AUTH_FAILED'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'CONNECTION_FAILED'
  | 'AMBIGUOUS_TIMEOUT';

export class BrevoApiError extends Error {
  public readonly httpStatus?: number;
  public readonly code?: string;
  public readonly category: BrevoErrorCategory;
  public readonly isAmbiguous: boolean;
  public readonly responseBody?: any;

  constructor(
    message: string,
    opts: {
      httpStatus?: number;
      code?: string;
      category: BrevoErrorCategory;
      isAmbiguous?: boolean;
      responseBody?: any;
    }
  ) {
    super(message);
    this.name = 'BrevoApiError';
    this.httpStatus = opts.httpStatus;
    this.code = opts.code;
    this.category = opts.category;
    this.isAmbiguous = opts.isAmbiguous ?? false;
    this.responseBody = opts.responseBody;
  }
}

export function classifyBrevoError(httpStatus: number, body: any): {
  category: BrevoErrorCategory;
  isAmbiguous: boolean;
  code: string;
  message: string;
} {
  const data = body && typeof body === 'object' ? body : {};
  const message = data.message || data.error || (typeof body === 'string' ? body : `HTTP ${httpStatus}`);

  if (httpStatus === 401 || httpStatus === 403) {
    return {
      category: 'AUTH_FAILED',
      isAmbiguous: false,
      code: data.code || `HTTP_${httpStatus}`,
      message,
    };
  }

  if (httpStatus === 429) {
    return {
      category: 'RATE_LIMITED',
      isAmbiguous: true, // Upstream rate limiting may occur after queueing or before
      code: data.code || 'HTTP_429',
      message,
    };
  }

  if (httpStatus >= 400 && httpStatus < 500) {
    return {
      category: 'CLIENT_REJECTED',
      isAmbiguous: false,
      code: data.code || `HTTP_${httpStatus}`,
      message,
    };
  }

  if (httpStatus >= 500) {
    return {
      category: 'SERVER_ERROR',
      isAmbiguous: true, // 5xx may occur after Brevo SMTP proxy accepted message
      code: data.code || `HTTP_${httpStatus}`,
      message,
    };
  }

  return {
    category: 'CLIENT_REJECTED',
    isAmbiguous: false,
    code: `HTTP_${httpStatus}`,
    message,
  };
}

export class BrevoClient {
  private apiKey: string;
  private baseUrl: string;
  private senderEmail: string;

  constructor() {
    this.apiKey = config.BREVO_API_KEY || '';
    this.baseUrl = 'https://api.brevo.com/v3';
    this.senderEmail = config.BREVO_SENDER_EMAIL || '';
  }

  public async send(params: BrevoSendParams): Promise<BrevoSendResponse> {
    if (config.BREVO_DELIVERY_MODE === 'mock') {
      return {
        status: 'success',
        time: 0.01,
        data: { messageId: 'mock_brevo_' + Math.random().toString(36).slice(2, 10) },
        messageId: 'mock_brevo_' + Math.random().toString(36).slice(2, 10),
        httpStatus: 201,
      };
    }

    const endpoint = '/smtp/email';
    const url = `${this.baseUrl}${endpoint}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'api-key': this.apiKey,
          ...(params.headers || {}),
        },
        body: JSON.stringify({
          to: params.to,
          subject: params.subject,
          htmlContent: params.htmlContent,
          textContent: params.textContent,
          sender: params.sender || {
            name: 'GymDeck',
            email: this.senderEmail,
          },
          replyTo: params.replyTo ? { email: params.replyTo } : undefined,
        }),
      });
    } catch (netErr: any) {
      const isTimeout = netErr?.name === 'TimeoutError' || netErr?.code === 'ETIMEDOUT' || /timeout/i.test(netErr?.message || '');
      throw new BrevoApiError(netErr?.message || 'Network connection to Brevo failed', {
        category: isTimeout ? 'AMBIGUOUS_TIMEOUT' : 'CONNECTION_FAILED',
        isAmbiguous: true,
        code: netErr?.code || (isTimeout ? 'ETIMEDOUT' : 'ECONNREFUSED'),
      });
    }

    // Always read response body as text first to handle both JSON and non-JSON cleanly
    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch (readErr: any) {
      throw new BrevoApiError('Failed to read Brevo response body stream', {
        httpStatus: response.status,
        category: 'AMBIGUOUS_TIMEOUT',
        isAmbiguous: true,
        code: 'STREAM_READ_ERROR',
      });
    }

    let parsedBody: any = null;
    if (bodyText && bodyText.trim().length > 0) {
      try {
        parsedBody = JSON.parse(bodyText);
      } catch (jsonErr) {
        logger.warn('[BrevoClient] Brevo response returned non-JSON body', {
          httpStatus: response.status,
          bodySnippet: bodyText.slice(0, 100),
        });
        parsedBody = null;
      }
    }

    if (!response.ok) {
      const classified = classifyBrevoError(response.status, parsedBody || bodyText);
      throw new BrevoApiError(classified.message, {
        httpStatus: response.status,
        code: classified.code,
        category: classified.category,
        isAmbiguous: classified.isAmbiguous,
        responseBody: parsedBody,
      });
    }

    // Response is 2xx. Extract messageId safely.
    const messageId = parsedBody?.messageId || parsedBody?.data?.messageId || undefined;

    return {
      status: 'success',
      data: parsedBody || {},
      messageId,
      httpStatus: response.status,
      rawError: null,
    };
  }
}

export const brevoClient = new BrevoClient();
