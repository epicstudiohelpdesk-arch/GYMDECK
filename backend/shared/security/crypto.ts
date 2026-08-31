/**
 * GymDeck Cloud Backend - Cryptographic Utilities & JWT Management
 */

import * as crypto from 'crypto';
import { AppError } from '../errors';

/**
 * Generate a 6-digit numeric OTP using CSPRNG.
 */
export function generateSecureOtp(): string {
  const min = 100000;
  const max = 999999;
  return crypto.randomInt(min, max + 1).toString();
}

/**
 * Generate a random cryptographically secure token.
 */
export function generateSecureToken(byteLength: number = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Compute SHA-256 hash of a string (for OTP and refresh token storage).
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Perform a constant-time comparison to prevent timing attacks.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Hash a password securely using memory-hard scrypt with CSPRNG salt.
 * Stored format: scrypt$16384$8$1$<salt_hex>$<hash_hex>
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const cost = 16384;
    const blockSize = 8;
    const parallel = 1;
    const keyLen = 64;

    crypto.scrypt(password, salt, keyLen, { N: cost, r: blockSize, p: parallel }, (err, derivedKey) => {
      if (err) return reject(err);
      const hash = derivedKey.toString('hex');
      resolve(`scrypt$${cost}$${blockSize}$${parallel}$${salt}$${hash}`);
    });
  });
}

/**
 * Verify a candidate password against the stored password hash in constant time.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    const parts = storedHash.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') {
      return resolve(false);
    }

    const cost = parseInt(parts[1]!, 10);
    const blockSize = parseInt(parts[2]!, 10);
    const parallel = parseInt(parts[3]!, 10);
    const salt = parts[4]!;
    const expectedHash = parts[5]!;

    crypto.scrypt(password, salt, 64, { N: cost, r: blockSize, p: parallel }, (err, derivedKey) => {
      if (err) return resolve(false);
      const actualHash = derivedKey.toString('hex');
      resolve(constantTimeCompare(expectedHash, actualHash));
    });
  });
}

// ==============================================================================
// JWT Management (HMAC-SHA256)
// ==============================================================================

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export interface JwtPayload {
  sub: string; // memberAccountId
  memberId: string;
  gymId: string;
  email: string;
  role: 'MEMBER';
  jti: string;
  iat?: number;
  exp?: number;
}

/**
 * Sign a JSON Web Token with HMAC-SHA256.
 */
export function signJwt(payload: JwtPayload, secret: string, expiresInSeconds: number): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${signature}`;
}

/**
 * Verify and decode an HMAC-SHA256 JWT in constant time.
 */
export function verifyJwt<T = JwtPayload>(token: string, secret: string): T {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw AppError.unauthorized('Malformed token format');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput!)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (!constantTimeCompare(signature!, expectedSignature)) {
    throw AppError.unauthorized('Invalid token signature');
  }

  try {
    const payloadJson = base64UrlDecode(encodedPayload!);
    const payload = JSON.parse(payloadJson) as JwtPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw AppError.unauthorized('Token has expired');
    }

    return payload as unknown as T;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.unauthorized('Invalid token payload');
  }
}
