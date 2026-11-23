/** Idempotent migration helper for legacy loopback OpenWA webhook registrations. */
import { openwaClient } from './openwaClient';

export interface WebhookRecord { sessionId: string; id?: string; url: string }

export function isLoopbackWebhookUrl(url: string): boolean {
  return /^(https?:\/\/)(127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(String(url || '').trim());
}

export function planWebhookReRegistration(
  records: WebhookRecord[],
  canonicalUrl: string
): WebhookRecord[] {
  return records.filter((r) => r.url !== canonicalUrl && isLoopbackWebhookUrl(r.url));
}

export interface ReRegistrationResult {
  sessionId: string;
  from: string;
  to: string;
  status: 'updated' | 'skipped' | 'failed';
  detail?: string;
}

export async function reRegisterWebhooks(
  records: WebhookRecord[],
  canonicalUrl: string,
  secret: string,
  events: string[]
): Promise<ReRegistrationResult[]> {
  const results: ReRegistrationResult[] = [];
  for (const record of planWebhookReRegistration(records, canonicalUrl)) {
    try {
      await openwaClient.ensureWebhook(record.sessionId, canonicalUrl, secret, events);
      results.push({ sessionId: record.sessionId, from: record.url, to: canonicalUrl, status: 'updated' });
    } catch (err) {
      results.push({ sessionId: record.sessionId, from: record.url, to: canonicalUrl, status: 'failed', detail: (err as Error).message });
    }
  }
  return results;
}
