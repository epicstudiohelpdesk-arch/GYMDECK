/**
 * Postal Webhook Cryptographic Authentication & Verification Module
 *
 * Grounded in Postal's actual implementation (lib/postal/http.rb and lib/postal/signer.rb):
 *
 * Headers dispatched by Postal on every webhook call:
 *  - X-Postal-Signature-KID: Hex string / key identifier (Postal.signer.jwk.kid)
 *  - X-Postal-Signature-256: RSA-SHA256 signature Base64 encoded (Postal.signer.sign64(request.body.to_s))
 *  - X-Postal-Signature: RSA-SHA1 signature Base64 encoded (legacy, Postal.signer.sha1_sign64)
 *
 * Requirements:
 *  - Verification MUST use original raw request body Buffer (before JSON.parse).
 *  - Supports multiple valid public keys indexed by KID for zero-downtime key rotation.
 *  - In mock/development mode, also supports a fallback shared secret if configured.
 *  - Fails closed on missing headers, unknown key ID, malformed signature, or tampering.
 */

import crypto from 'crypto';
import { logger } from '../../shared/logging';
import { config } from '../../shared/config';

export interface PostalWebhookSignatureHeaders {
  kid?: string | string[];
  signature256?: string | string[];
  signatureLegacy?: string | string[];
}

export interface VerificationResult {
  valid: boolean;
  reason?: string;
  kid?: string;
  algorithm?: 'RSA-SHA256' | 'RSA-SHA1' | 'DEV-SECRET';
}

/**
 * In-memory registry of authorized Postal public verification keys.
 * Controlled centrally on the backend server.
 */
class PostalKeyStore {
  private keys: Map<string, string> = new Map();
  private defaultKid: string | null = null;

  constructor() {
    this.reloadFromConfig();
  }

  public reloadFromConfig(): void {
    this.keys.clear();

    // 1. If POSTAL_SIGNING_PUBLIC_KEY is provided in PEM format
    const pemKey = process.env.POSTAL_SIGNING_PUBLIC_KEY || config.POSTAL_SIGNING_PUBLIC_KEY;
    const configuredKid = process.env.POSTAL_SIGNING_KEY_ID || config.POSTAL_SIGNING_KEY_ID || 'default';

    if (pemKey && pemKey.trim().length > 0) {
      this.registerKey(configuredKid, pemKey.trim());
    }

    // 2. Parse any multi-key JSON if configured for controlled key rotation:
    // e.g. POSTAL_AUTHORIZED_PUBLIC_KEYS='{"kid-2026-a":"-----BEGIN PUBLIC KEY...","kid-2026-b":"..."}'
    const multiKeyJson = process.env.POSTAL_AUTHORIZED_PUBLIC_KEYS || config.POSTAL_AUTHORIZED_PUBLIC_KEYS;
    if (multiKeyJson) {
      try {
        const parsed = JSON.parse(multiKeyJson);
        if (typeof parsed === 'object' && parsed !== null) {
          for (const [kid, key] of Object.entries(parsed)) {
            if (typeof key === 'string') {
              this.registerKey(kid, key.trim());
            }
          }
        }
      } catch (err) {
        logger.warn('[PostalKeyStore] Failed to parse POSTAL_AUTHORIZED_PUBLIC_KEYS JSON', { err });
      }
    }
  }

  public registerKey(kid: string, publicKeyPem: string): void {
    try {
      // Validate that it's a parseable public key
      crypto.createPublicKey(publicKeyPem);
      this.keys.set(kid, publicKeyPem);
      if (!this.defaultKid) this.defaultKid = kid;
      logger.info('[PostalKeyStore] Registered Postal verification key', { kid });
    } catch (err: any) {
      logger.error('[PostalKeyStore] Invalid public key supplied for KID', { kid, error: err.message });
    }
  }

  public getKey(kid?: string): { kid: string; pem: string } | null {
    if (kid && this.keys.has(kid)) {
      return { kid, pem: this.keys.get(kid)! };
    }
    // If only one key is registered and no KID supplied, allow fallback
    if (!kid && this.keys.size === 1 && this.defaultKid) {
      return { kid: this.defaultKid, pem: this.keys.get(this.defaultKid)! };
    }
    return null;
  }

  public hasKeys(): boolean {
    return this.keys.size > 0;
  }
}

export const postalKeyStore = new PostalKeyStore();

/**
 * Verify incoming Postal webhook signature.
 *
 * @param rawBody - Raw Buffer captured from incoming HTTP request before parsing
 * @param headers - Request headers object containing X-Postal-Signature-*
 */
export function verifyPostalWebhookSignature(
  rawBody: Buffer | string | undefined,
  headers: Record<string, string | string[] | undefined>
): VerificationResult {
  if (!rawBody || (Buffer.isBuffer(rawBody) && rawBody.length === 0)) {
    return { valid: false, reason: 'Request body is empty or rawBody is missing' };
  }

  const rawBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');

  // Normalize header keys
  const getHeader = (name: string): string | undefined => {
    const val = headers[name.toLowerCase()] || headers[name];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  const kid = getHeader('x-postal-signature-kid');
  const sig256 = getHeader('x-postal-signature-256');
  const sigLegacy = getHeader('x-postal-signature');

  // 1. Check if public keys are registered for genuine RSA verification
  if (postalKeyStore.hasKeys()) {
    if (!sig256 && !sigLegacy) {
      return { valid: false, reason: 'Missing Postal cryptographic signature headers (X-Postal-Signature-256)' };
    }

    const keyEntry = postalKeyStore.getKey(kid);
    if (!keyEntry) {
      return { valid: false, reason: `Unknown or unconfigured Postal Key ID (KID): ${kid || 'none'}` };
    }

    // Prefer RSA-SHA256 (Postal.signer.sign64)
    if (sig256) {
      try {
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(rawBuffer);
        const verified = verifier.verify(keyEntry.pem, sig256, 'base64');
        if (verified) {
          return { valid: true, kid: keyEntry.kid, algorithm: 'RSA-SHA256' };
        }
        return { valid: false, reason: 'RSA-SHA256 signature mismatch (tampered payload or wrong key)' };
      } catch (err: any) {
        return { valid: false, reason: `Verification error: ${err.message}` };
      }
    }

    // Fallback to legacy RSA-SHA1 ONLY IF explicitly allowed via POSTAL_ALLOW_LEGACY_SHA1
    if (sigLegacy) {
      if (!config.POSTAL_ALLOW_LEGACY_SHA1) {
        return {
          valid: false,
          reason: 'Legacy RSA-SHA1 webhook signatures are disabled in configuration (POSTAL_ALLOW_LEGACY_SHA1=false). Upgrade provider to RSA-SHA256.',
        };
      }

      logger.warn('[PostalWebhookAuth] Processing incoming webhook using legacy RSA-SHA1 signature. Recommend upgrading Postal signing key to RSA-SHA256.');

      try {
        const verifier = crypto.createVerify('RSA-SHA1');
        verifier.update(rawBuffer);
        const verified = verifier.verify(keyEntry.pem, sigLegacy, 'base64');
        if (verified) {
          return { valid: true, kid: keyEntry.kid, algorithm: 'RSA-SHA1' };
        }
        return { valid: false, reason: 'Legacy RSA-SHA1 signature mismatch' };
      } catch (err: any) {
        return { valid: false, reason: `Legacy verification error: ${err.message}` };
      }
    }
  }

  // 2. Fallback strictly in development/local test mode when RSA public key is not yet configured:
  // Under NO circumstances is this permitted in 'production' or 'staging'.
  // Mock delivery mode does NOT disable signature verification in staging or production.
  const isLocalDev = config.NODE_ENV === 'development' || config.NODE_ENV === 'test';
  if (isLocalDev && config.POSTAL_DELIVERY_MODE === 'mock') {
    const devToken = getHeader('x-postal-webhook-token') || getHeader('x-webhook-token');
    const configuredDevSecret = config.POSTAL_WEBHOOK_KEY || 'dev_postal_webhook_signing_key';

    if (devToken && devToken === configuredDevSecret) {
      return { valid: true, algorithm: 'DEV-SECRET', reason: 'Verified via local development shared secret header' };
    }

    return {
      valid: false,
      reason: 'No Postal RSA public keys configured, and development secret header (X-Postal-Webhook-Token) missing or invalid',
    };
  }

  // In production AND staging, failure to configure RSA keys or valid signatures is a hard failure (fail closed)
  return {
    valid: false,
    reason: `Security configuration error (${config.NODE_ENV}): Genuine Postal RSA public keys and valid cryptographic signatures are required.`,
  };
}
