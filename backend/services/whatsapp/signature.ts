/**
 * GymDeck WhatsApp - webhook authenticity, idempotency and state hashing.
 */

import * as crypto from 'crypto';

/**
 * Meta signs the exact raw request body with the app secret using HMAC-SHA256.
 * The body must be captured before JSON parsing (see app.ts rawBody).
 */
export function computeWebhookSignature(rawBody: string | Buffer, appSecret: string): string {
  return `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
}

export function verifyWebhookSignature(
  rawBody: string | Buffer | undefined,
  signatureHeader: string | undefined,
  appSecret: string
): boolean {
  if (!rawBody || !signatureHeader || !appSecret) return false;
  if (!signatureHeader.startsWith('sha256=')) return false;

  const provided = signatureHeader.slice(7);
  if (!/^[0-9a-f]{64}$/i.test(provided)) return false;

  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/** Stable SHA-256 for webhook payload fingerprints and message dedupe keys. */
export function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
