/** Brevo SMTP send client. Backend-only, no hardcoded credentials. */

import { config } from '../../../shared/config';

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

export class BrevoApiError extends Error {
  public readonly httpStatus?: number;
  public readonly code?: string;
  public readonly category: string;
  public readonly isAmbiguous: boolean;
  constructor(message: string, opts: { httpStatus?: number; code?: string; category: string; isAmbiguous?: boolean }) {
    super(message);
    this.name = 'BrevoApiError';
    this.httpStatus = opts.httpStatus;
    this.code = opts.code;
    this.category = opts.category;
    this.isAmbiguous = opts.isAmbiguous ?? false;
  }
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

  private authHeader(): string {
    return `apiapikey ${this.apiKey}`;
  }

  private async request<T>(endpoint: string, init: RequestInit & { parse?: boolean }): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        ...{
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: this.authHeader(),
        },
        ...init.headers,
      },
    });

    let body: any = null;
    if (init.parse !== false) {
      body = await response.text();
    }

    if (!response.ok) {
      const reason = body && typeof body === 'object' ? body : { message: `HTTP ${response.status}` };
      const code = typeof reason === 'object' && reason.error_code ? String(reason.error_code) : `HTTP_${response.status}`;
      const category = response.status >= 500 ? 'SERVER_ERROR' : response.status >= 400 ? 'CLIENT_REJECTED' : 'CONNECTION_FAILED';
      throw new BrevoApiError(String(reason.message || reason.error || reason), {
        httpStatus: response.status,
        code,
        category,
        isAmbiguous: response.status === 400 || response.status === 429,
      });
    }

    return body as T;
  }

  public async send(params: BrevoSendParams): Promise<BrevoSendResponse> {
    if (config.BREVO_DELIVERY_MODE === 'mock') {
      return {
        status: 'success',
        time: 0.01,
        data: { messageId: 'mock_brevo_' + Math.random().toString(36).slice(2, 10) },
        httpStatus: 201,
      };
    }

    const response = await this.request<BrevoSendResponse>('/smtp/email', {
      method: 'POST',
      body: JSON.stringify({
        to: params.to,
        subject: params.subject,
        htmlContent: params.htmlContent,
        textContent: params.textContent,
        sender: {
          name: 'GymDeck',
          email: this.senderEmail,
        },
        replyTo: params.replyTo,
        headers: params.headers,
      }),
      parse: false,
    });

    if (response && typeof response === 'object' && 'messageId' in (response as any)) {
      return response as BrevoSendResponse;
    }

    return response as BrevoSendResponse;
  }
}

export const brevoClient = new BrevoClient();
