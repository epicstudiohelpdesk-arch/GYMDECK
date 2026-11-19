/**
 * GymDeck WhatsApp - tenant-scoped recipient + personalisation resolution.
 *
 * Every query is scoped by gym_id first. Variable values come from the correct
 * gym's own records; nothing is accepted from the renderer.
 */

import { and, eq, isNull, inArray, gte, lte, sql, desc } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  gymMembers,
  memberMemberships,
  membershipPlans,
  trainerAssignments,
  trainers,
  payments,
  attendanceLogs,
} from '../../shared/database/schema';
import { normalizeWhatsAppNumber } from './phone';
import type { WhatsAppVariable } from './types';

export type AudienceMode =
  | 'SELECTED'
  | 'ALL'
  | 'STATUS'
  | 'EXPIRING'
  | 'PENDING_PAYMENT'
  | 'RECENT_ATTENDANCE';

export interface AudienceFilter {
  mode?: AudienceMode;
  memberIds?: string[];
  status?: string;
  withinDays?: number;
  search?: string;
  limit?: number;
}

export interface MemberContext {
  id: string;
  fullName: string;
  memberCode: string;
  phone: string;
  normalizedPhone: string | null;
  membershipStatus: string;
  expiresAt: Date | null;
  planName: string | null;
  trainerName: string | null;
  latestPaymentAmount: number | null;
  latestPaymentStatus: string | null;
  profilePhotoUrl?: string | null;
}

export interface VariableInputs {
  gymName: string;
  paymentAmount?: number | null;
  paymentDueDate?: string | null;
  classTime?: string | null;
}

export const MAX_RECIPIENTS = 200;

export function formatWhatsAppDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatWhatsAppAmount(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  const amount = Number(value);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `INR ${amount}`;
  }
}

export class WhatsAppMemberContextService {
  public async loadAudience(gymId: string, filter: AudienceFilter = {}): Promise<MemberContext[]> {
    const limit = Math.min(MAX_RECIPIENTS, Math.max(1, Number(filter.limit) || MAX_RECIPIENTS));
    const mode: AudienceMode = filter.mode || 'ALL';

    const conditions: any[] = [eq(gymMembers.gymId, gymId), isNull(gymMembers.deletedAt)];

    if (filter.status) {
      conditions.push(eq(gymMembers.membershipStatus, filter.status));
    }
    if (filter.search?.trim()) {
      const term = `%${filter.search.trim().slice(0, 80)}%`;
      conditions.push(
        sql`(${gymMembers.fullName} ILIKE ${term} OR ${gymMembers.phone} ILIKE ${term} OR ${gymMembers.memberCode} ILIKE ${term})`
      );
    }

    if (mode === 'SELECTED') {
      const ids = (filter.memberIds || []).filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );
      if (!ids.length) return [];
      conditions.push(inArray(gymMembers.id, ids.slice(0, MAX_RECIPIENTS)));
    }

    if (mode === 'EXPIRING') {
      const withinDays = Math.min(90, Math.max(1, Number(filter.withinDays) || 7));
      const now = new Date();
      const horizon = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
      conditions.push(gte(gymMembers.expiresAt, now));
      conditions.push(lte(gymMembers.expiresAt, horizon));
    }

    if (mode === 'PENDING_PAYMENT') {
      const pending = await db
        .select({ memberId: payments.memberId })
        .from(payments)
        .where(and(eq(payments.gymId, gymId), eq(payments.status, 'PENDING')));
      const ids = [...new Set(pending.map((row) => row.memberId))];
      if (!ids.length) return [];
      conditions.push(inArray(gymMembers.id, ids));
    }

    if (mode === 'RECENT_ATTENDANCE') {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recent = await db
        .select({ memberId: attendanceLogs.memberId })
        .from(attendanceLogs)
        .where(
          and(
            eq(attendanceLogs.gymId, gymId),
            gte(attendanceLogs.checkInTime, since)
          )
        );
      const ids = [...new Set(recent.map((row) => row.memberId))];
      if (!ids.length) return [];
      conditions.push(inArray(gymMembers.id, ids));
    }

    const members = await db
      .select({
        id: gymMembers.id,
        fullName: gymMembers.fullName,
        memberCode: gymMembers.memberCode,
        phone: gymMembers.phone,
        membershipStatus: gymMembers.membershipStatus,
        expiresAt: gymMembers.expiresAt,
        profilePhotoUrl: gymMembers.profilePhotoUrl,
      })
      .from(gymMembers)
      .where(and(...conditions))
      .orderBy(gymMembers.fullName)
      .limit(limit);

    if (!members.length) return [];
    return this.enrich(gymId, members);
  }

  public async loadByIds(gymId: string, memberIds: string[]): Promise<MemberContext[]> {
    if (!memberIds.length) return [];
    const members = await db
      .select({
        id: gymMembers.id,
        fullName: gymMembers.fullName,
        memberCode: gymMembers.memberCode,
        phone: gymMembers.phone,
        membershipStatus: gymMembers.membershipStatus,
        expiresAt: gymMembers.expiresAt,
        profilePhotoUrl: gymMembers.profilePhotoUrl,
      })
      .from(gymMembers)
      .where(
        and(
          eq(gymMembers.gymId, gymId),
          isNull(gymMembers.deletedAt),
          inArray(gymMembers.id, memberIds.slice(0, MAX_RECIPIENTS))
        )
      );
    return this.enrich(gymId, members);
  }

  private async enrich(
    gymId: string,
    members: Array<{
      id: string;
      fullName: string;
      memberCode: string;
      phone: string;
      membershipStatus: string;
      expiresAt: Date | null;
      profilePhotoUrl?: string | null;
    }>
  ): Promise<MemberContext[]> {
    const ids = members.map((member) => member.id);
    if (!ids.length) return [];

    const memberships = await db
      .select({
        memberId: memberMemberships.memberId,
        status: memberMemberships.status,
        endDate: memberMemberships.endDate,
        planName: membershipPlans.planName,
      })
      .from(memberMemberships)
      .leftJoin(membershipPlans, eq(membershipPlans.id, memberMemberships.planId))
      .where(
        and(eq(memberMemberships.gymId, gymId), inArray(memberMemberships.memberId, ids))
      )
      .orderBy(desc(memberMemberships.endDate));

    const planByMember = new Map<string, { planName: string | null; endDate: Date | null }>();
    for (const row of memberships) {
      const existing = planByMember.get(row.memberId);
      // Prefer an ACTIVE membership, then the furthest end date.
      if (!existing || row.status === 'ACTIVE') {
        planByMember.set(row.memberId, {
          planName: row.planName || null,
          endDate: row.endDate ? new Date(row.endDate) : null,
        });
      }
    }

    const assignments = await db
      .select({
        memberId: trainerAssignments.memberId,
        trainerName: trainers.fullName,
      })
      .from(trainerAssignments)
      .leftJoin(trainers, eq(trainers.id, trainerAssignments.trainerId))
      .where(
        and(
          eq(trainerAssignments.gymId, gymId),
          eq(trainerAssignments.status, 'ACTIVE'),
          inArray(trainerAssignments.memberId, ids)
        )
      );

    const trainerByMember = new Map<string, string | null>();
    for (const row of assignments) {
      if (!trainerByMember.has(row.memberId)) {
        trainerByMember.set(row.memberId, row.trainerName || null);
      }
    }

    const paymentRows = await db
      .select({
        memberId: payments.memberId,
        amount: payments.amount,
        status: payments.status,
        paidAt: payments.paidAt,
      })
      .from(payments)
      .where(and(eq(payments.gymId, gymId), inArray(payments.memberId, ids)))
      .orderBy(desc(payments.paidAt));

    const paymentByMember = new Map<string, { amount: number | null; status: string | null }>();
    for (const row of paymentRows) {
      if (!paymentByMember.has(row.memberId)) {
        paymentByMember.set(row.memberId, {
          amount: row.amount !== null ? Number(row.amount) : null,
          status: row.status || null,
        });
      }
    }

    return members.map((member) => {
      const plan = planByMember.get(member.id);
      const payment = paymentByMember.get(member.id);
      return {
        id: member.id,
        fullName: member.fullName,
        memberCode: member.memberCode,
        phone: member.phone,
        normalizedPhone: normalizeWhatsAppNumber(member.phone),
        membershipStatus: member.membershipStatus,
        expiresAt: plan?.endDate ?? (member.expiresAt ? new Date(member.expiresAt) : null),
        planName: plan?.planName || null,
        trainerName: trainerByMember.get(member.id) || null,
        latestPaymentAmount: payment?.amount ?? null,
        latestPaymentStatus: payment?.status ?? null,
        profilePhotoUrl: member.profilePhotoUrl || null,
      };
    });
  }

  public buildVariableValues(
    member: MemberContext,
    inputs: VariableInputs
  ): Partial<Record<WhatsAppVariable, string>> {
    const values: Partial<Record<WhatsAppVariable, string>> = {};

    const memberName = member.fullName?.trim();
    if (memberName) values.member_name = memberName;

    const gymName = inputs.gymName?.trim();
    if (gymName) values.gym_name = gymName;

    if (member.planName) values.membership_plan = member.planName;

    const expiry = formatWhatsAppDate(member.expiresAt);
    if (expiry) values.membership_expiry = expiry;

    const amount = inputs.paymentAmount ?? member.latestPaymentAmount;
    const formattedAmount = formatWhatsAppAmount(amount);
    if (formattedAmount) values.payment_amount = formattedAmount;

    const dueDate =
      inputs.paymentDueDate || (member.expiresAt ? formatWhatsAppDate(member.expiresAt) : null);
    if (inputs.paymentDueDate && dueDate) values.payment_due_date = dueDate;

    if (member.trainerName) values.trainer_name = member.trainerName;

    if (inputs.classTime) values.class_time = inputs.classTime;

    return values;
  }

  /** Display DTO used by the recipient selector. */
  public toAudienceDto(member: MemberContext): any {
    const last4 = member.normalizedPhone ? member.normalizedPhone.slice(-4) : null;
    const cc = member.normalizedPhone
      ? member.normalizedPhone.slice(0, Math.max(2, member.normalizedPhone.length - 10))
      : null;
    return {
      id: member.id,
      fullName: member.fullName,
      memberCode: member.memberCode,
      phoneMasked: last4 ? `+${cc} ••••• ${last4}` : null,
      hasValidWhatsApp: Boolean(member.normalizedPhone),
      membershipStatus: member.membershipStatus,
      planName: member.planName,
      membershipExpiry: formatWhatsAppDate(member.expiresAt),
      profilePhotoUrl: member.profilePhotoUrl || null,
    };
  }
}

export const memberContextService = new WhatsAppMemberContextService();
export default memberContextService;
