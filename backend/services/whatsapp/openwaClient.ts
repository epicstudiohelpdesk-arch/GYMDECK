/**
 * GymDeck WhatsApp - OpenWA gateway client.
 *
 * OpenWA is the bundled WhatsApp engine. It owns the QR-linked WhatsApp Web
 * session and exposes a REST API; GymDeck keeps tenant isolation, consent,
 * scheduling, queueing, history and the owner UI. No API key or session
 * credential is ever returned to the frontend.
 */

import { config } from '../../shared/config';
import { logger } from '../../shared/logging';

export interface OpenWASession {
  id: string;
  name: string;
  status: string;
  phone?: string | null;
  pushName?: string | null;
  engineLoaded?: boolean;
  lastError?: string | null;
}

export interface OpenWAResult {
  ok: boolean;
  accepted: boolean;
  providerMessageId: string | null;
  errorClass:
    | 'TRANSIENT'
    | 'RATE_LIMITED'
    | 'INVALID_RECIPIENT'
    | 'INVALID_TEMPLATE'
    | 'AUTHENTICATION'
    | 'PERMANENT'
    | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryable: boolean;
  retryAfterSeconds: number | null;
}

export class OpenWARequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'OpenWARequestError';
  }
}

function baseUrl(): string {
  return config.OPENWA_API_URL.replace(/\/$/, '');
}

async function request<T = any>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {}
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.OPENWA_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': config.OPENWA_API_KEY,
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let data: any = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      const message =
        data?.message ||
        data?.error?.message ||
        (Array.isArray(data?.message) ? data.message.join('; ') : null) ||
        `OpenWA request failed (HTTP ${response.status}).`;
      throw new OpenWARequestError(response.status, String(message), data);
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof OpenWARequestError) throw err;
    const aborted = err?.name === 'AbortError';
    throw new OpenWARequestError(
      0,
      aborted ? 'The OpenWA gateway did not respond in time.' : 'Could not reach the OpenWA gateway.',
      err
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function classifyOpenWAError(status: number, message: string): {
  errorClass: OpenWAResult['errorClass'];
  retryable: boolean;
  retryAfterSeconds: number | null;
} {
  const text = message.toLowerCase();

  if (status === 401 || status === 403) {
    return { errorClass: 'AUTHENTICATION', retryable: false, retryAfterSeconds: null };
  }
  if (status === 429) {
    return { errorClass: 'RATE_LIMITED', retryable: true, retryAfterSeconds: 60 };
  }
  if (status === 404) {
    return { errorClass: 'PERMANENT', retryable: false, retryAfterSeconds: null };
  }
  if (
    text.includes('not registered') ||
    text.includes('invalid') ||
    text.includes('no lid') ||
    text.includes('chat id')
  ) {
    return { errorClass: 'INVALID_RECIPIENT', retryable: false, retryAfterSeconds: null };
  }
  if (status === 400) {
    return { errorClass: 'PERMANENT', retryable: false, retryAfterSeconds: null };
  }
  if (status === 409 || status === 503 || status === 504 || status >= 500) {
    return { errorClass: 'TRANSIENT', retryable: true, retryAfterSeconds: 30 };
  }
  return { errorClass: 'TRANSIENT', retryable: true, retryAfterSeconds: 30 };
}

export const openwaClient = {
  async health(): Promise<{ ok: boolean; status: number; detail: string }> {
    try {
      await request('GET', '/health/live');
      return { ok: true, status: 200, detail: 'OpenWA is reachable.' };
    } catch (err: any) {
      return {
        ok: false,
        status: Number(err?.status || 0),
        detail: err?.message || 'OpenWA is unreachable.',
      };
    }
  },

  async listSessions(): Promise<OpenWASession[]> {
    const data = await request<OpenWASession[]>('GET', '/sessions');
    return Array.isArray(data) ? data : [];
  },

  async getSession(sessionId: string): Promise<OpenWASession> {
    return request<OpenWASession>('GET', `/sessions/${encodeURIComponent(sessionId)}`);
  },

  /**
   * Create one session per gym. Session names are derived from the gym UUID
   * only; the name is not a secret and never maps a caller-supplied gym.
   */
  async ensureSession(name: string): Promise<OpenWASession> {
    try {
      const created = await request<OpenWASession>('POST', '/sessions', {
        name,
        config: { linkPreview: false },
      });
      return created;
    } catch (err: any) {
      if (err?.status === 409) {
        const sessions = await this.listSessions();
        const existing = sessions.find((session) => session.name === name);
        if (existing) return existing;
      }
      throw err;
    }
  },

  async startSession(sessionId: string): Promise<OpenWASession | null> {
    try {
      return await request<OpenWASession>(
        'POST',
        `/sessions/${encodeURIComponent(sessionId)}/start`
      );
    } catch (err: any) {
      // Already running / already authenticated. The status read is authoritative.
      if (err?.status === 400) return null;
      throw err;
    }
  },

  async getQR(sessionId: string): Promise<string | null> {
    try {
      const data = await request<{ qrCode?: string; status?: string }>(
        'GET',
        `/sessions/${encodeURIComponent(sessionId)}/qr`
      );
      return data?.qrCode || null;
    } catch (err: any) {
      // OpenWA returns 400 until a QR exists or after the session authenticates.
      if (err?.status === 400 || err?.status === 404) return null;
      throw err;
    }
  },

  async stopSession(sessionId: string): Promise<void> {
    try {
      await request('POST', `/sessions/${encodeURIComponent(sessionId)}/stop`);
    } catch (err: any) {
      if (err?.status !== 400) throw err;
    }
  },

  async logoutSession(sessionId: string): Promise<void> {
    try {
      await request('POST', `/sessions/${encodeURIComponent(sessionId)}/logout`);
    } catch (err: any) {
      if (![400, 404].includes(Number(err?.status))) throw err;
    }
  },

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await request('DELETE', `/sessions/${encodeURIComponent(sessionId)}`);
    } catch (err: any) {
      if (err?.status !== 404) throw err;
    }
  },

  async listWebhooks(sessionId: string): Promise<any[]> {
    const data = await request<any[]>(
      'GET',
      `/sessions/${encodeURIComponent(sessionId)}/webhooks`
    );
    return Array.isArray(data) ? data : [];
  },

  async ensureWebhook(
    sessionId: string,
    url: string,
    secret: string,
    events: string[]
  ): Promise<any> {
    const existing = await this.listWebhooks(sessionId);
    const match = existing.find((webhook) => String(webhook?.url || '') === url);
    if (match?.id) {
      // Keep the signing secret and event list in sync after a rotation or a
      // code change; returning the stale row would silently fail verification.
      return request(
        'PUT',
        `/sessions/${encodeURIComponent(sessionId)}/webhooks/${encodeURIComponent(String(match.id))}`,
        { url, events, secret, active: true }
      );
    }

    return request('POST', `/sessions/${encodeURIComponent(sessionId)}/webhooks`, {
      url,
      events,
      secret,
    });
  },

  async sendText(
    sessionId: string,
    phone: string,
    text: string,
    idempotencyKey: string
  ): Promise<OpenWAResult> {
    try {
      const data = await request<{ messageId?: string }>(
        'POST',
        `/sessions/${encodeURIComponent(sessionId)}/messages/send-text`,
        {
          chatId: `${phone}@c.us`,
          text,
          linkPreview: false,
        },
        { 'Idempotency-Key': idempotencyKey }
      );

      if (!data?.messageId) {
        return {
          ok: false,
          accepted: false,
          providerMessageId: null,
          errorClass: 'TRANSIENT',
          errorCode: 'MISSING_PROVIDER_MESSAGE_ID',
          errorMessage: 'OpenWA accepted the message without returning a message ID.',
          retryable: false,
          retryAfterSeconds: null,
        };
      }

      return {
        ok: true,
        accepted: true,
        providerMessageId: String(data.messageId),
        errorClass: null,
        errorCode: null,
        errorMessage: null,
        retryable: false,
        retryAfterSeconds: null,
      };
    } catch (err: any) {
      const status = Number(err?.status || 0);
      const message = String(err?.message || 'OpenWA could not send the message.');
      const classification = classifyOpenWAError(status, message);

      logger.warn('[whatsapp] OpenWA send failed', {
        status,
        errorClass: classification.errorClass,
        message: message.slice(0, 300),
      });

      return {
        ok: false,
        accepted: false,
        providerMessageId: null,
        errorClass: classification.errorClass,
        errorCode: status ? String(status) : 'OPENWA_NETWORK_ERROR',
        errorMessage: message.slice(0, 500),
        retryable: classification.retryable,
        retryAfterSeconds: classification.retryAfterSeconds,
      };
    }
  },
};

export type OpenWAClient = typeof openwaClient;
