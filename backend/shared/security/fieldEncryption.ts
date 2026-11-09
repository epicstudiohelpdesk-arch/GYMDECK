/**
 * GymDeck Cloud - Field-level encryption for sensitive payment data.
 * AES-256-GCM. Key material comes from PAYMENT_ENCRYPTION_KEY (64 hex chars).
 * In development only, a deterministic fallback keeps local databases usable.
 */

import * as crypto from 'crypto';
import { config, isProduction } from '../config';

const FALLBACK_DEV_KEY = 'gymdeck_dev_payment_field_key_do_not_use_in_prod';

function resolveKey(): Buffer {
  const raw = (process.env.PAYMENT_ENCRYPTION_KEY || '').trim();
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  if (raw.length > 0) {
    return crypto.createHash('sha256').update(raw).digest();
  }
  if (isProduction || config.NODE_ENV === 'staging') {
    throw new Error('PAYMENT_ENCRYPTION_KEY is required outside development.');
  }
  return crypto.createHash('sha256').update(FALLBACK_DEV_KEY).digest();
}

const KEY = resolveKey();

export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

export function decryptField(payload: string | null | undefined): string | null {
  if (!payload) return null;
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;
  try {
    const iv = Buffer.from(parts[1]!, 'base64');
    const tag = Buffer.from(parts[2]!, 'base64');
    const ct = Buffer.from(parts[3]!, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export function last4(value: string): string {
  return value.replace(/\s+/g, '').slice(-4);
}
