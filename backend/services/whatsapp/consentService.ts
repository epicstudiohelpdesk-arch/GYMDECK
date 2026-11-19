/**
 * GymDeck WhatsApp - member consent.
 *
 * Storing a phone number is not consent. Consent is an explicit record with a
 * source and timestamp. Existing `gym_members.whatsapp_opt_in` is treated as a
 * legacy source of truth until an explicit record exists, so the product does
 * not silently start messaging members who had opted out.
 */

import { eq, and, inArray, desc } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  whatsappMessageConsents,
  whatsappConsentHistory,
  gymMembers,
} from '../../shared/database/schema';
import { AppError } from '../../shared/errors';
import { normalizeWhatsAppNumber } from './phone';
import { recordWhatsAppAudit } from './audit';
import type { ConsentStatus } from './types';

export interface ConsentView {
  memberId: string;
  status: ConsentStatus;
  source: string;
  consentTimestamp: string | null;
  withdrawalTimestamp: string | null;
  explicit: boolean;
}

const OPT_OUT_KEYWORDS = new Set([
  'stop',
  'unsubscribe',
  'optout',
  'opt out',
  'opt-out',
  'cancel',
  'remove me',
  'no messages',
]);

export function isOptOutMessage(body: string | null | undefined): boolean {
  if (!body) return false;
  const normalized = body.trim().toLowerCase().replace(/[.!]+$/, '');
  return OPT_OUT_KEYWORDS.has(normalized);
}

export class WhatsAppConsentService {
  public async get(gymId: string, memberId: string): Promise<ConsentView> {
    const rows = await db
      .select()
      .from(whatsappMessageConsents)
      .where(
        and(
          eq(whatsappMessageConsents.gymId, gymId),
          eq(whatsappMessageConsents.memberId, memberId)
        )
      )
      .limit(1);

    const explicit = rows[0];
    if (explicit) {
      return {
        memberId,
        status: explicit.consentStatus as ConsentStatus,
        source: explicit.consentSource,
        consentTimestamp: explicit.consentTimestamp
          ? new Date(explicit.consentTimestamp).toISOString()
          : null,
        withdrawalTimestamp: explicit.withdrawalTimestamp
          ? new Date(explicit.withdrawalTimestamp).toISOString()
          : null,
        explicit: true,
      };
    }

    const memberRows = await db
      .select({ whatsappOptIn: gymMembers.whatsappOptIn })
      .from(gymMembers)
      .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId)))
      .limit(1);

    const legacyOptIn = memberRows[0]?.whatsappOptIn !== false;
    return {
      memberId,
      status: legacyOptIn ? 'GRANTED' : 'WITHDRAWN',
      source: 'LEGACY_PROFILE',
      consentTimestamp: null,
      withdrawalTimestamp: null,
      explicit: false,
    };
  }

  /** Bulk consent map for audience evaluation. */
  public async getMany(gymId: string, memberIds: string[]): Promise<Map<string, ConsentView>> {
    const map = new Map<string, ConsentView>();
    if (!memberIds.length) return map;

    const explicitRows = await db
      .select()
      .from(whatsappMessageConsents)
      .where(
        and(
          eq(whatsappMessageConsents.gymId, gymId),
          inArray(whatsappMessageConsents.memberId, memberIds)
        )
      );
    for (const row of explicitRows) {
      map.set(row.memberId, {
        memberId: row.memberId,
        status: row.consentStatus as ConsentStatus,
        source: row.consentSource,
        consentTimestamp: row.consentTimestamp ? new Date(row.consentTimestamp).toISOString() : null,
        withdrawalTimestamp: row.withdrawalTimestamp
          ? new Date(row.withdrawalTimestamp).toISOString()
          : null,
        explicit: true,
      });
    }

    const fallbackIds = memberIds.filter((id) => !map.has(id));
    if (fallbackIds.length) {
      const members = await db
        .select({ id: gymMembers.id, whatsappOptIn: gymMembers.whatsappOptIn })
        .from(gymMembers)
        .where(and(eq(gymMembers.gymId, gymId), inArray(gymMembers.id, fallbackIds)));
      for (const member of members) {
        map.set(member.id, {
          memberId: member.id,
          status: member.whatsappOptIn === false ? 'WITHDRAWN' : 'GRANTED',
          source: 'LEGACY_PROFILE',
          consentTimestamp: null,
          withdrawalTimestamp: null,
          explicit: false,
        });
      }
    }

    return map;
  }

  public async set(params: {
    gymId: string;
    memberId: string;
    status: ConsentStatus;
    source: string;
    actorUserId?: string | null;
  }): Promise<ConsentView> {
    const member = await db
      .select({ id: gymMembers.id })
      .from(gymMembers)
      .where(and(eq(gymMembers.id, params.memberId), eq(gymMembers.gymId, params.gymId)))
      .limit(1);
    if (!member.length) throw AppError.notFound('Member not found in this gym.');

    const now = new Date();
    const consentTimestamp = params.status === 'GRANTED' ? now : null;
    const withdrawalTimestamp = params.status === 'WITHDRAWN' ? now : null;

    await db
      .insert(whatsappMessageConsents)
      .values({
        gymId: params.gymId,
        memberId: params.memberId,
        consentStatus: params.status,
        consentSource: params.source,
        consentTimestamp,
        withdrawalTimestamp,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [whatsappMessageConsents.gymId, whatsappMessageConsents.memberId],
        set: {
          consentStatus: params.status,
          consentSource: params.source,
          consentTimestamp,
          withdrawalTimestamp,
          updatedAt: now,
        },
      });

    await db.insert(whatsappConsentHistory).values({
      gymId: params.gymId,
      memberId: params.memberId,
      consentStatus: params.status,
      consentSource: params.source,
      actorUserId: params.actorUserId ?? null,
    });

    // Keep the legacy member flag aligned so other modules see the same truth.
    await db
      .update(gymMembers)
      .set({
        whatsappOptIn: params.status === 'GRANTED',
        consentUpdatedAt: now,
        updatedAt: now,
      })
      .where(and(eq(gymMembers.id, params.memberId), eq(gymMembers.gymId, params.gymId)));

    await recordWhatsAppAudit({
      gymId: params.gymId,
      actorId: params.actorUserId,
      action: 'WHATSAPP_CONSENT_UPDATED',
      targetId: params.memberId,
      metadata: { status: params.status, source: params.source },
    });

    return {
      memberId: params.memberId,
      status: params.status,
      source: params.source,
      consentTimestamp: consentTimestamp ? consentTimestamp.toISOString() : null,
      withdrawalTimestamp: withdrawalTimestamp ? withdrawalTimestamp.toISOString() : null,
      explicit: true,
    };
  }

  /** Inbound STOP-style keyword handling. Returns the affected member, if any. */
  public async recordInboundOptOut(
    gymId: string,
    fromNumber: string,
    actorSource = 'INBOUND_MESSAGE'
  ): Promise<string | null> {
    const normalized = normalizeWhatsAppNumber(fromNumber);
    if (!normalized) return null;

    const members = await db
      .select({ id: gymMembers.id, phone: gymMembers.phone })
      .from(gymMembers)
      .where(eq(gymMembers.gymId, gymId));

    const match = members.find(
      (member) => normalizeWhatsAppNumber(member.phone) === normalized
    );
    if (!match) return null;

    await this.set({
      gymId,
      memberId: match.id,
      status: 'WITHDRAWN',
      source: actorSource,
      actorUserId: null,
    });
    return match.id;
  }

  public async history(gymId: string, memberId: string): Promise<any[]> {
    const rows = await db
      .select()
      .from(whatsappConsentHistory)
      .where(
        and(
          eq(whatsappConsentHistory.gymId, gymId),
          eq(whatsappConsentHistory.memberId, memberId)
        )
      )
      .orderBy(desc(whatsappConsentHistory.recordedAt))
      .limit(50);

    return rows.map((row) => ({
      status: row.consentStatus,
      source: row.consentSource,
      recordedAt: new Date(row.recordedAt).toISOString(),
    }));
  }
}

export const whatsappConsentService = new WhatsAppConsentService();
export default whatsappConsentService;
