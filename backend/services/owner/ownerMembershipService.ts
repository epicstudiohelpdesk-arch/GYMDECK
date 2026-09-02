/**
 * GymDeck Cloud Backend - Membership Lifecycle & Subscription Operations Service
 */

import * as crypto from 'crypto';
import { eq, and, isNull, sql, desc, count, gte, lte, asc } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  gymMembers,
  membershipPlans,
  memberMemberships,
  auditLogs,
  syncChangeLog,
  syncIdempotencyLog,
} from '../../shared/database/schema';
import { domainEventBus } from '../notifications/domainEventBus';
import { AppError } from '../../shared/errors';

export interface FreezeMembershipDto {
  reason: string;
}

export interface MembershipLifecycleItem {
  id: string;
  gymId: string;
  memberId: string;
  planId: string;
  planName: string;
  status: string;
  startDate: string;
  endDate: string;
  priceAtPurchase: string;
  daysRemaining: number;
  isExpiringSoon: boolean;
  frozenAt: string | null;
  freezeReason: string | null;
  frozenDaysRemaining: number | null;
  unfrozenAt: string | null;
  createdAt: string;
}

export interface ExpiringMembershipItem {
  membershipId: string;
  memberId: string;
  memberCode: string;
  fullName: string;
  phone: string;
  email: string | null;
  planName: string;
  endDate: string;
  daysRemaining: number;
}

export interface MembershipLifecycleStats {
  activeCount: number;
  frozenCount: number;
  expiredCount: number;
  expiringIn7DaysCount: number;
  expiringIn30DaysCount: number;
}

export class OwnerMembershipService {
  /**
   * 1. Get Current Active/Latest Membership for a Member
   */
  public async getCurrentMembership(gymId: string, memberId: string): Promise<MembershipLifecycleItem | null> {
    const member = (
      await db
        .select()
        .from(gymMembers)
        .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId), isNull(gymMembers.deletedAt)))
        .limit(1)
    )[0];

    if (!member) {
      throw AppError.notFound('Member not found in authorized gym tenant.');
    }

    const rows = await db
      .select({
        id: memberMemberships.id,
        gymId: memberMemberships.gymId,
        memberId: memberMemberships.memberId,
        planId: memberMemberships.planId,
        planName: membershipPlans.planName,
        status: memberMemberships.status,
        startDate: memberMemberships.startDate,
        endDate: memberMemberships.endDate,
        priceAtPurchase: memberMemberships.priceAtPurchase,
        frozenAt: memberMemberships.frozenAt,
        freezeReason: memberMemberships.freezeReason,
        frozenDaysRemaining: memberMemberships.frozenDaysRemaining,
        unfrozenAt: memberMemberships.unfrozenAt,
        createdAt: memberMemberships.createdAt,
      })
      .from(memberMemberships)
      .innerJoin(membershipPlans, eq(memberMemberships.planId, membershipPlans.id))
      .where(and(eq(memberMemberships.gymId, gymId), eq(memberMemberships.memberId, memberId)))
      .orderBy(desc(memberMemberships.endDate))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const m = rows[0]!;
    const now = new Date();
    const endDate = new Date(m.endDate);
    const msDiff = endDate.getTime() - now.getTime();
    const daysRemaining = m.status === 'FROZEN'
      ? (m.frozenDaysRemaining || 0)
      : Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));

    let calculatedStatus = m.status;
    if (m.status === 'ACTIVE' && endDate < now) {
      calculatedStatus = 'EXPIRED';
    }

    return {
      ...m,
      status: calculatedStatus,
      startDate: m.startDate.toISOString(),
      endDate: m.endDate.toISOString(),
      daysRemaining,
      isExpiringSoon: daysRemaining <= 7 && calculatedStatus === 'ACTIVE',
      frozenAt: m.frozenAt ? m.frozenAt.toISOString() : null,
      unfrozenAt: m.unfrozenAt ? m.unfrozenAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
    };
  }

  /**
   * 2. Get Member Subscription History Timeline
   */
  public async getMembershipHistory(
    gymId: string,
    memberId: string,
    limit = 50,
    offset = 0
  ): Promise<{ items: MembershipLifecycleItem[]; totalCount: number }> {
    const member = (
      await db
        .select()
        .from(gymMembers)
        .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId), isNull(gymMembers.deletedAt)))
        .limit(1)
    )[0];

    if (!member) {
      throw AppError.notFound('Member not found in authorized gym tenant.');
    }

    const countRes = await db
      .select({ count: count() })
      .from(memberMemberships)
      .where(and(eq(memberMemberships.gymId, gymId), eq(memberMemberships.memberId, memberId)));

    const rows = await db
      .select({
        id: memberMemberships.id,
        gymId: memberMemberships.gymId,
        memberId: memberMemberships.memberId,
        planId: memberMemberships.planId,
        planName: membershipPlans.planName,
        status: memberMemberships.status,
        startDate: memberMemberships.startDate,
        endDate: memberMemberships.endDate,
        priceAtPurchase: memberMemberships.priceAtPurchase,
        frozenAt: memberMemberships.frozenAt,
        freezeReason: memberMemberships.freezeReason,
        frozenDaysRemaining: memberMemberships.frozenDaysRemaining,
        unfrozenAt: memberMemberships.unfrozenAt,
        createdAt: memberMemberships.createdAt,
      })
      .from(memberMemberships)
      .innerJoin(membershipPlans, eq(memberMemberships.planId, membershipPlans.id))
      .where(and(eq(memberMemberships.gymId, gymId), eq(memberMemberships.memberId, memberId)))
      .orderBy(desc(memberMemberships.startDate))
      .limit(limit)
      .offset(offset);

    const now = new Date();
    const items: MembershipLifecycleItem[] = rows.map((m) => {
      const endDate = new Date(m.endDate);
      const msDiff = endDate.getTime() - now.getTime();
      const daysRemaining = m.status === 'FROZEN'
        ? (m.frozenDaysRemaining || 0)
        : Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));

      let calculatedStatus = m.status;
      if (m.status === 'ACTIVE' && endDate < now) {
        calculatedStatus = 'EXPIRED';
      }

      return {
        ...m,
        status: calculatedStatus,
        startDate: m.startDate.toISOString(),
        endDate: m.endDate.toISOString(),
        daysRemaining,
        isExpiringSoon: daysRemaining <= 7 && calculatedStatus === 'ACTIVE',
        frozenAt: m.frozenAt ? m.frozenAt.toISOString() : null,
        unfrozenAt: m.unfrozenAt ? m.unfrozenAt.toISOString() : null,
        createdAt: m.createdAt.toISOString(),
      };
    });

    return {
      items,
      totalCount: countRes[0]?.count || 0,
    };
  }

  /**
   * 3. Freeze Membership Subscription
   */
  public async freezeMembership(
    gymId: string,
    memberId: string,
    membershipId: string,
    dto: FreezeMembershipDto,
    actorUserId?: string
  ): Promise<any> {
    if (!dto.reason || dto.reason.trim().length < 3) {
      throw AppError.validation('A valid reason (minimum 3 characters) is required to freeze membership.');
    }

    // Lookup Member
    const member = (
      await db
        .select()
        .from(gymMembers)
        .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId), isNull(gymMembers.deletedAt)))
        .limit(1)
    )[0];

    if (!member) {
      throw AppError.notFound('Member not found in authorized gym tenant.');
    }

    // Lookup Membership
    const membership = (
      await db
        .select()
        .from(memberMemberships)
        .where(
          and(
            eq(memberMemberships.id, membershipId),
            eq(memberMemberships.gymId, gymId),
            eq(memberMemberships.memberId, memberId)
          )
        )
        .limit(1)
    )[0];

    if (!membership) {
      throw AppError.notFound('Membership subscription record not found.');
    }

    if (membership.status === 'FROZEN') {
      throw AppError.conflict('Membership subscription is already frozen.');
    }

    const now = new Date();
    if (membership.status !== 'ACTIVE' || new Date(membership.endDate) <= now) {
      throw AppError.forbidden('Cannot freeze: Only active, unexpired memberships can be frozen.');
    }

    // Calculate days remaining at time of freeze
    const endDate = new Date(membership.endDate);
    const msRemaining = endDate.getTime() - now.getTime();
    const frozenDaysRemaining = Math.max(1, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    return await db.transaction(async (tx) => {
      const [updatedMembership] = await tx
        .update(memberMemberships)
        .set({
          status: 'FROZEN',
          frozenAt: now,
          freezeReason: dto.reason.trim(),
          frozenDaysRemaining,
          updatedAt: now,
        })
        .where(and(eq(memberMemberships.id, membershipId), eq(memberMemberships.gymId, gymId)))
        .returning();

      // Update Member state
      await tx
        .update(gymMembers)
        .set({
          membershipStatus: 'FROZEN',
          updatedAt: now,
        })
        .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId)));

      // Audit Log
      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'MEMBERSHIP_FROZEN',
        resource: 'member_membership',
        resourceId: membershipId,
        metadata: JSON.stringify({
          memberId,
          reason: dto.reason.trim(),
          frozenDaysRemaining,
          actorUserId,
        }),
      });

      // Stream to Desktop Sync Log
      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'member_membership',
          entityId: membershipId,
          operation: 'UPDATE',
          payload: updatedMembership!,
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'member_membership',
        entityId: membershipId,
        operation: 'UPDATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated membership freeze',
      });

      // Phase 12A: Atomically emit domain event
      await domainEventBus.publishDomainEvent(tx, {
        gymId,
        eventType: 'membership.frozen',
        aggregateType: 'member_membership',
        aggregateId: membershipId,
        payload: {
          memberId,
          reason: dto.reason.trim(),
          frozenDaysRemaining,
        },
        actorUserId,
        occurredAt: now,
      });

      return {
        membership: updatedMembership,
        frozenDaysRemaining,
        status: 'FROZEN',
      };
    });
  }

  /**
   * 4. Unfreeze Membership Subscription (Restores Remaining Duration)
   */
  public async unfreezeMembership(
    gymId: string,
    memberId: string,
    membershipId: string,
    actorUserId?: string
  ): Promise<any> {
    const member = (
      await db
        .select()
        .from(gymMembers)
        .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId), isNull(gymMembers.deletedAt)))
        .limit(1)
    )[0];

    if (!member) {
      throw AppError.notFound('Member not found in authorized gym tenant.');
    }

    const membership = (
      await db
        .select()
        .from(memberMemberships)
        .where(
          and(
            eq(memberMemberships.id, membershipId),
            eq(memberMemberships.gymId, gymId),
            eq(memberMemberships.memberId, memberId)
          )
        )
        .limit(1)
    )[0];

    if (!membership) {
      throw AppError.notFound('Membership subscription record not found.');
    }

    if (membership.status !== 'FROZEN') {
      throw AppError.conflict('Cannot unfreeze: Membership subscription is not frozen.');
    }

    const now = new Date();
    const daysToRestore = membership.frozenDaysRemaining || 1;
    const newEndDate = new Date(now.getTime() + daysToRestore * 24 * 60 * 60 * 1000);

    return await db.transaction(async (tx) => {
      const [updatedMembership] = await tx
        .update(memberMemberships)
        .set({
          status: 'ACTIVE',
          endDate: newEndDate,
          unfrozenAt: now,
          updatedAt: now,
        })
        .where(and(eq(memberMemberships.id, membershipId), eq(memberMemberships.gymId, gymId)))
        .returning();

      // Update Member state
      await tx
        .update(gymMembers)
        .set({
          membershipStatus: 'ACTIVE',
          expiresAt: newEndDate,
          updatedAt: now,
        })
        .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId)));

      // Audit Log
      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'MEMBERSHIP_UNFROZEN',
        resource: 'member_membership',
        resourceId: membershipId,
        metadata: JSON.stringify({
          memberId,
          restoredDays: daysToRestore,
          newEndDate: newEndDate.toISOString(),
          actorUserId,
        }),
      });

      // Stream to Desktop Sync Log
      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'member_membership',
          entityId: membershipId,
          operation: 'UPDATE',
          payload: updatedMembership!,
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'member_membership',
        entityId: membershipId,
        operation: 'UPDATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated membership unfreeze',
      });

      // Phase 12A: Atomically emit domain event
      await domainEventBus.publishDomainEvent(tx, {
        gymId,
        eventType: 'membership.unfrozen',
        aggregateType: 'member_membership',
        aggregateId: membershipId,
        payload: {
          memberId,
          newEndDate: newEndDate.toISOString(),
          restoredDays: daysToRestore,
        },
        actorUserId,
        occurredAt: now,
      });

      return {
        membership: updatedMembership,
        newEndDate: newEndDate.toISOString(),
        status: 'ACTIVE',
      };
    });
  }

  /**
   * 5. Get Expiring Memberships Directory (Next N days)
   */
  public async getExpiringMemberships(
    gymId: string,
    daysAhead = 7,
    limit = 50,
    offset = 0
  ): Promise<{ items: ExpiringMembershipItem[]; totalCount: number }> {
    const now = new Date();
    const horizon = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const conditions = [
      eq(memberMemberships.gymId, gymId),
      eq(memberMemberships.status, 'ACTIVE'),
      gte(memberMemberships.endDate, now),
      lte(memberMemberships.endDate, horizon),
      isNull(gymMembers.deletedAt),
    ];

    const countRes = await db
      .select({ count: count() })
      .from(memberMemberships)
      .innerJoin(gymMembers, eq(memberMemberships.memberId, gymMembers.id))
      .where(and(...conditions));

    const rows = await db
      .select({
        membershipId: memberMemberships.id,
        memberId: gymMembers.id,
        memberCode: gymMembers.memberCode,
        fullName: gymMembers.fullName,
        phone: gymMembers.phone,
        email: gymMembers.email,
        planName: membershipPlans.planName,
        endDate: memberMemberships.endDate,
      })
      .from(memberMemberships)
      .innerJoin(gymMembers, eq(memberMemberships.memberId, gymMembers.id))
      .innerJoin(membershipPlans, eq(memberMemberships.planId, membershipPlans.id))
      .where(and(...conditions))
      .orderBy(asc(memberMemberships.endDate))
      .limit(limit)
      .offset(offset);

    const items: ExpiringMembershipItem[] = rows.map((r) => {
      const msDiff = new Date(r.endDate).getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
      return {
        ...r,
        endDate: r.endDate.toISOString(),
        daysRemaining,
      };
    });

    return {
      items,
      totalCount: countRes[0]?.count || 0,
    };
  }

  /**
   * 6. Membership Operational Lifecycle Statistics
   */
  public async getMembershipLifecycleStats(gymId: string): Promise<MembershipLifecycleStats> {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Active
    const activeRes = await db
      .select({ count: count() })
      .from(memberMemberships)
      .where(and(eq(memberMemberships.gymId, gymId), eq(memberMemberships.status, 'ACTIVE'), gte(memberMemberships.endDate, now)));

    // Frozen
    const frozenRes = await db
      .select({ count: count() })
      .from(memberMemberships)
      .where(and(eq(memberMemberships.gymId, gymId), eq(memberMemberships.status, 'FROZEN')));

    // Expired
    const expiredRes = await db
      .select({ count: count() })
      .from(memberMemberships)
      .where(
        and(
          eq(memberMemberships.gymId, gymId),
          sql`(${memberMemberships.status} = 'EXPIRED' OR (${memberMemberships.status} = 'ACTIVE' AND ${memberMemberships.endDate} < ${now.toISOString()}))`
        )
      );

    // Expiring in 7 Days
    const exp7Res = await db
      .select({ count: count() })
      .from(memberMemberships)
      .where(
        and(
          eq(memberMemberships.gymId, gymId),
          eq(memberMemberships.status, 'ACTIVE'),
          gte(memberMemberships.endDate, now),
          lte(memberMemberships.endDate, in7Days)
        )
      );

    // Expiring in 30 Days
    const exp30Res = await db
      .select({ count: count() })
      .from(memberMemberships)
      .where(
        and(
          eq(memberMemberships.gymId, gymId),
          eq(memberMemberships.status, 'ACTIVE'),
          gte(memberMemberships.endDate, now),
          lte(memberMemberships.endDate, in30Days)
        )
      );

    return {
      activeCount: activeRes[0]?.count || 0,
      frozenCount: frozenRes[0]?.count || 0,
      expiredCount: expiredRes[0]?.count || 0,
      expiringIn7DaysCount: exp7Res[0]?.count || 0,
      expiringIn30DaysCount: exp30Res[0]?.count || 0,
    };
  }
}

export const ownerMembershipService = new OwnerMembershipService();
export default ownerMembershipService;
