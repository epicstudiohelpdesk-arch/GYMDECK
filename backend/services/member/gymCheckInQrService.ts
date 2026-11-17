/**
 * GymDeck Cloud Backend - Gym Attendance QR Pass Service
 *
 * Each gym owns exactly one permanent attendance QR pass. Owners display or
 * print it; members scan it with the GymDeck Member App to record attendance.
 * The pass is normally minted by the desktop app at gym signup and replicated
 * here through the sync outbox. This service also mints one on demand so a gym
 * that has not synced yet still resolves correctly.
 */

import * as crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../shared/database';
import { gymCheckInQr } from '../../shared/database/schema';
import { AppError } from '../../shared/errors';

export interface GymCheckInQrRecord {
  id: string;
  gymId: string;
  checkinCode: string;
  qrToken: string;
  qrPayload: string;
  version: number;
  isActive: boolean;
  createdAt: string;
}

const CHECKIN_BASE_URL = 'https://gymdeck.app/checkin';

export class GymCheckInQrService {
  /** The exact string encoded into the QR image. */
  public buildPayload(gymId: string, checkinCode: string, qrToken: string): string {
    return `${CHECKIN_BASE_URL}?gym_id=${gymId}&code=${checkinCode}&token=${qrToken}`;
  }

  /** Accepts either the full QR payload URL or a bare token. */
  public extractToken(qrPayload: string): string | null {
    if (!qrPayload || typeof qrPayload !== 'string') return null;

    const trimmed = qrPayload.trim();

    try {
      const url = new URL(trimmed);
      const token = url.searchParams.get('token');
      if (token) return token;
    } catch {
      // Not a URL: fall through to bare-token handling.
    }

    const match = trimmed.match(/token=([A-Za-z0-9_-]+)/);
    if (match?.[1]) return match[1];

    return /^[A-Za-z0-9_-]{16,64}$/.test(trimmed) ? trimmed : null;
  }

  /** Returns the gym's pass, minting and persisting it when absent. */
  public async getOrCreateForGym(gymId: string): Promise<GymCheckInQrRecord> {
    const existing = await this.findByGym(gymId);
    if (existing) return existing;

    const id = crypto.randomUUID();
    const qrToken = crypto.randomUUID().replace(/-/g, '');
    const checkinCode = `GD-${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
    const qrPayload = this.buildPayload(gymId, checkinCode, qrToken);

    // Another node may have minted the pass concurrently; unique constraints
    // on gym_id keep ownership single-valued.
    await db
      .insert(gymCheckInQr)
      .values({ id, gymId, checkinCode, qrToken, qrPayload })
      .onConflictDoNothing({ target: gymCheckInQr.gymId });

    const created = await this.findByGym(gymId);
    if (!created) {
      throw AppError.database('Failed to provision gym attendance QR pass.');
    }
    return created;
  }

  /** Resolves a scanned pass to the gym that owns it, or null when unknown/inactive. */
  public async resolveByToken(qrToken: string): Promise<GymCheckInQrRecord | null> {
    const rows = await db
      .select()
      .from(gymCheckInQr)
      .where(eq(gymCheckInQr.qrToken, qrToken))
      .limit(1);

    const row = rows[0];
    if (!row || !row.isActive) return null;
    return this.toRecord(row);
  }

  private async findByGym(gymId: string): Promise<GymCheckInQrRecord | null> {
    const rows = await db
      .select()
      .from(gymCheckInQr)
      .where(eq(gymCheckInQr.gymId, gymId))
      .limit(1);

    const row = rows[0];
    return row ? this.toRecord(row) : null;
  }

  private toRecord(row: typeof gymCheckInQr.$inferSelect): GymCheckInQrRecord {
    return {
      id: row.id,
      gymId: row.gymId,
      checkinCode: row.checkinCode,
      qrToken: row.qrToken,
      qrPayload: row.qrPayload,
      version: row.version,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

export const gymCheckInQrService = new GymCheckInQrService();
export default gymCheckInQrService;
