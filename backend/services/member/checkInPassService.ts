/**
 * GymDeck Cloud Backend - Dynamic Cryptographic Check-In Pass Service
 */

import * as crypto from 'crypto';
import { signJwt, verifyJwt, generateSecureToken } from '../../shared/security';
import { AppError } from '../../shared/errors';

export interface CheckInPassPayload {
  passId: string;
  gymId: string;
  memberId: string;
  memberCode: string;
  nonce: string;
  iat: number;
  exp: number;
}

export interface CheckInPassResponse {
  passToken: string;
  qrPayload: string;
  expiresInSeconds: number;
  expiresAt: string;
}

// In-memory replay prevention map (consumed pass nonces)
const consumedNonces = new Set<string>();

// Prune expired nonces periodically
setInterval(() => {
  if (consumedNonces.size > 10000) {
    consumedNonces.clear();
  }
}, 300000).unref();

export class CheckInPassService {
  private readonly PASS_TTL_SECONDS = 60; // 60-second rotating pass
  private readonly secret: string;

  constructor(secret?: string) {
    this.secret = secret || process.env.JWT_SECRET || 'gymdeck_default_dev_jwt_secret_must_be_overridden_in_prod';
  }

  /**
   * Generate a secure, signed, dynamic check-in pass
   */
  public generateCheckInPass(gymId: string, memberId: string, memberCode: string): CheckInPassResponse {
    const passId = crypto.randomUUID();
    const nonce = generateSecureToken(16);
    const now = Math.floor(Date.now() / 1000);
    const expiresAtMs = (now + this.PASS_TTL_SECONDS) * 1000;

    const payload = {
      passId,
      gymId,
      memberId,
      memberCode,
      nonce,
      role: 'MEMBER' as const,
      sub: memberId,
      jti: passId,
    };

    const passToken = signJwt(
      {
        ...payload,
        email: '',
      },
      this.secret,
      this.PASS_TTL_SECONDS
    );

    return {
      passToken,
      qrPayload: passToken,
      expiresInSeconds: this.PASS_TTL_SECONDS,
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }

  /**
   * Validate a scanned check-in pass with signature and replay verification
   */
  public verifyCheckInPass(passToken: string, expectedGymId: string, expectedMemberId: string): CheckInPassPayload {
    try {
      const decoded = verifyJwt<any>(passToken, this.secret);

      // 1. Validate tenant and member identity
      if (decoded.gymId !== expectedGymId || decoded.memberId !== expectedMemberId) {
        throw AppError.forbidden('Check-in pass is not authorized for this gym or member.');
      }

      // 2. Replay check (one-time consumption)
      if (decoded.nonce && consumedNonces.has(decoded.nonce)) {
        throw AppError.conflict('This check-in pass has already been used. Please refresh the QR code.');
      }

      if (decoded.nonce) {
        consumedNonces.add(decoded.nonce);
      }

      return decoded;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw AppError.unauthorized('Check-in pass is invalid, expired, or tampered with.');
    }
  }
}

export const checkInPassService = new CheckInPassService();
export default checkInPassService;
