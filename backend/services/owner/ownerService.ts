/**
 * GymDeck Cloud Backend - Owner Dashboard, Member Management & Lifecycle Service
 */

import * as crypto from 'crypto';
import { eq, and, isNull, sql, or, count, desc } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  gyms,
  gymMembers,
  membershipPlans,
  memberMemberships,
  payments,
  attendanceLogs,
  trainers,
  ptPackages,
  memberActivationTokens,
  auditLogs,
  syncChangeLog,
  syncIdempotencyLog,
} from '../../shared/database/schema';
import { AppError } from '../../shared/errors';
import { generateSecureToken, hashToken } from '../../shared/security';

export interface OwnerDashboardSummary {
  gym: {
    id: string;
    name: string;
    code: string;
    status: string;
  };
  metrics: {
    activeMembersCount: number;
    todayAttendanceCount: number;
    activePlansCount: number;
    todayRevenue: number;
    activeTrainersCount: number;
  };
}

export interface CreateMemberDto {
  fullName: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  gender?: string;
  dob?: string;
  address?: string;
  memberCode?: string;
  notes?: string;
  planId?: string;
  initialPaymentAmount?: number;
  initialPaymentMethod?: string;
}

export interface UpdateMemberDto {
  fullName?: string;
  phone?: string;
  alternatePhone?: string;
  email?: string;
  gender?: string;
  dob?: string;
  address?: string;
  membershipStatus?: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'INACTIVE';
  notes?: string;
}

export class OwnerService {
  /**
   * 1. Get Owner Dashboard KPI Metrics
   */
  public async getDashboard(gymId: string): Promise<OwnerDashboardSummary> {
    const gym = (
      await db.select().from(gyms).where(eq(gyms.id, gymId)).limit(1)
    )[0];

    if (!gym) {
      throw AppError.notFound('Gym tenant record not found.');
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Active Members
    const activeMembersRow = (
      await db
        .select({ count: count() })
        .from(gymMembers)
        .where(
          and(
            eq(gymMembers.gymId, gymId),
            eq(gymMembers.membershipStatus, 'ACTIVE'),
            isNull(gymMembers.deletedAt)
          )
        )
    )[0];

    // 2. Today's Attendance
    const todayAttendanceRow = (
      await db
        .select({ count: count() })
        .from(attendanceLogs)
        .where(
          and(
            eq(attendanceLogs.gymId, gymId),
            sql`${attendanceLogs.checkInTime} >= ${todayStart.toISOString()}`
          )
        )
    )[0];

    // 3. Active Plans
    const activePlansRow = (
      await db
        .select({ count: count() })
        .from(membershipPlans)
        .where(
          and(
            eq(membershipPlans.gymId, gymId),
            eq(membershipPlans.isActive, true),
            isNull(membershipPlans.deletedAt)
          )
        )
    )[0];

    // 4. Today's Revenue
    const todayPayments = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(
        and(
          eq(payments.gymId, gymId),
          eq(payments.status, 'COMPLETED'),
          sql`${payments.paidAt} >= ${todayStart.toISOString()}`
        )
      );

    const todayRevenue = todayPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // 5. Active Trainers
    const activeTrainersRow = (
      await db
        .select({ count: count() })
        .from(trainers)
        .where(
          and(
            eq(trainers.gymId, gymId),
            eq(trainers.isActive, true)
          )
        )
    )[0];

    return {
      gym: {
        id: gym.id,
        name: gym.name,
        code: gym.code,
        status: gym.status,
      },
      metrics: {
        activeMembersCount: activeMembersRow?.count || 0,
        todayAttendanceCount: todayAttendanceRow?.count || 0,
        activePlansCount: activePlansRow?.count || 0,
        todayRevenue,
        activeTrainersCount: activeTrainersRow?.count || 0,
      },
    };
  }

  /**
   * 2. Get Paginated Member Directory with Search & Status Filtering
   */
  public async getMembers(
    gymId: string,
    limit: number = 50,
    offset: number = 0,
    searchQuery?: string,
    statusFilter?: string
  ): Promise<{ members: any[]; total: number; limit: number; offset: number }> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);

    const conditions = [
      eq(gymMembers.gymId, gymId),
      isNull(gymMembers.deletedAt),
    ];

    if (statusFilter && statusFilter !== 'ALL') {
      conditions.push(eq(gymMembers.membershipStatus, statusFilter.toUpperCase()));
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = `%${searchQuery.trim().toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${gymMembers.fullName}) LIKE ${q}`,
          sql`LOWER(${gymMembers.phone}) LIKE ${q}`,
          sql`LOWER(${gymMembers.memberCode}) LIKE ${q}`,
          sql`LOWER(${gymMembers.email}) LIKE ${q}`
        )!
      );
    }

    const whereClause = and(...conditions);

    const members = await db
      .select({
        id: gymMembers.id,
        memberCode: gymMembers.memberCode,
        fullName: gymMembers.fullName,
        phone: gymMembers.phone,
        alternatePhone: gymMembers.alternatePhone,
        email: gymMembers.email,
        gender: gymMembers.gender,
        dob: gymMembers.dob,
        address: gymMembers.address,
        membershipStatus: gymMembers.membershipStatus,
        joinedAt: gymMembers.joinedAt,
        expiresAt: gymMembers.expiresAt,
        notes: gymMembers.notes,
        createdAt: gymMembers.createdAt,
      })
      .from(gymMembers)
      .where(whereClause)
      .orderBy(desc(gymMembers.createdAt))
      .limit(safeLimit)
      .offset(safeOffset);

    const totalRow = (
      await db.select({ count: count() }).from(gymMembers).where(whereClause)
    )[0];

    return {
      members,
      total: totalRow?.count || 0,
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  /**
   * 3. Get Comprehensive Member Profile (Details, Membership, Stats, Trainer)
   */
  public async getMemberById(gymId: string, memberId: string): Promise<any> {
    const member = (
      await db
        .select()
        .from(gymMembers)
        .where(
          and(
            eq(gymMembers.id, memberId),
            eq(gymMembers.gymId, gymId),
            isNull(gymMembers.deletedAt)
          )
        )
        .limit(1)
    )[0];

    if (!member) {
      throw AppError.notFound('Member not found in authorized gym tenant.');
    }

    // 1. Current / Latest Active Membership
    const latestMembership = (
      await db
        .select({
          id: memberMemberships.id,
          planId: memberMemberships.planId,
          planName: membershipPlans.planName,
          status: memberMemberships.status,
          startDate: memberMemberships.startDate,
          endDate: memberMemberships.endDate,
          autoRenew: memberMemberships.autoRenew,
          price: membershipPlans.price,
          durationDays: membershipPlans.durationDays,
        })
        .from(memberMemberships)
        .innerJoin(membershipPlans, eq(memberMemberships.planId, membershipPlans.id))
        .where(
          and(
            eq(memberMemberships.gymId, gymId),
            eq(memberMemberships.memberId, memberId)
          )
        )
        .orderBy(desc(memberMemberships.startDate))
        .limit(1)
    )[0];

    // 2. Attendance Summary & Recent Check-ins
    const totalAttendanceRow = (
      await db
        .select({ count: count() })
        .from(attendanceLogs)
        .where(
          and(
            eq(attendanceLogs.gymId, gymId),
            eq(attendanceLogs.memberId, memberId)
          )
        )
    )[0];

    const recentAttendance = await db
      .select({
        id: attendanceLogs.id,
        checkInTime: attendanceLogs.checkInTime,
        checkOutTime: attendanceLogs.checkOutTime,
        entryMethod: attendanceLogs.entryMethod,
      })
      .from(attendanceLogs)
      .where(
        and(
          eq(attendanceLogs.gymId, gymId),
          eq(attendanceLogs.memberId, memberId)
        )
      )
      .orderBy(desc(attendanceLogs.checkInTime))
      .limit(10);

    // 3. Payment Summary & Recent Transactions
    const paymentsList = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        paymentMethod: payments.paymentMethod,
        transactionReference: payments.transactionReference,
        status: payments.status,
        paidAt: payments.paidAt,
      })
      .from(payments)
      .where(
        and(
          eq(payments.gymId, gymId),
          eq(payments.memberId, memberId)
        )
      )
      .orderBy(desc(payments.paidAt))
      .limit(10);

    const totalPaid = paymentsList
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // 4. Assigned Trainer / PT Package
    const assignedPt = (
      await db
        .select({
          packageId: ptPackages.id,
          packageName: ptPackages.packageName,
          remainingSessions: ptPackages.remainingSessions,
          totalSessions: ptPackages.totalSessions,
          trainerId: trainers.id,
          trainerName: trainers.fullName,
          trainerPhone: trainers.phone,
          specialization: trainers.specialization,
        })
        .from(ptPackages)
        .innerJoin(trainers, eq(ptPackages.trainerId, trainers.id))
        .where(
          and(
            eq(ptPackages.gymId, gymId),
            eq(ptPackages.memberId, memberId),
            eq(ptPackages.status, 'ACTIVE')
          )
        )
        .limit(1)
    )[0];

    // 5. Active Activation Invite (if pending activation)
    const activeInvite = (
      await db
        .select({
          displayCode: memberActivationTokens.displayCode,
          expiresAt: memberActivationTokens.expiresAt,
          consumedAt: memberActivationTokens.consumedAt,
        })
        .from(memberActivationTokens)
        .where(
          and(
            eq(memberActivationTokens.gymId, gymId),
            eq(memberActivationTokens.gymMemberId, memberId),
            isNull(memberActivationTokens.consumedAt),
            sql`${memberActivationTokens.expiresAt} > NOW()`
          )
        )
        .orderBy(desc(memberActivationTokens.createdAt))
        .limit(1)
    )[0];

    return {
      member: {
        id: member.id,
        memberCode: member.memberCode,
        fullName: member.fullName,
        phone: member.phone,
        alternatePhone: member.alternatePhone,
        email: member.email,
        gender: member.gender,
        dob: member.dob,
        address: member.address,
        profilePhotoUrl: member.profilePhotoUrl,
        membershipStatus: member.membershipStatus,
        joinedAt: member.joinedAt,
        expiresAt: member.expiresAt,
        notes: member.notes,
        createdAt: member.createdAt,
      },
      membership: latestMembership || null,
      attendanceSummary: {
        totalCheckIns: totalAttendanceRow?.count || 0,
        recentCheckIns: recentAttendance,
      },
      paymentSummary: {
        totalPaid,
        recentPayments: paymentsList,
      },
      trainer: assignedPt || null,
      invite: activeInvite || null,
    };
  }

  /**
   * 4. Create New Member (Transactional Admission)
   */
  public async createMember(
    gymId: string,
    dto: CreateMemberDto,
    actorUserId?: string
  ): Promise<any> {
    const cleanPhone = dto.phone.trim();
    const cleanFullName = dto.fullName.trim();
    const cleanEmail = dto.email?.trim().toLowerCase() || null;

    if (!cleanFullName || cleanFullName.length < 2) {
      throw AppError.validation('Full name must be at least 2 characters long.');
    }
    if (!cleanPhone || cleanPhone.length < 7) {
      throw AppError.validation('A valid phone number is required.');
    }

    // Auto-generate member code if omitted
    const memberCode = dto.memberCode?.trim().toUpperCase() || `GD-${crypto.randomUUID().substring(0, 6).toUpperCase()}`;

    // Check for duplicate memberCode in same gym
    const existingCode = (
      await db
        .select()
        .from(gymMembers)
        .where(and(eq(gymMembers.gymId, gymId), eq(gymMembers.memberCode, memberCode)))
        .limit(1)
    )[0];

    if (existingCode) {
      throw AppError.conflict(`Member code '${memberCode}' is already registered in this gym.`);
    }

    return await db.transaction(async (tx) => {
      let expiryDate: Date | null = null;
      let planRecord: any = null;

      if (dto.planId) {
        planRecord = (
          await tx
            .select()
            .from(membershipPlans)
            .where(
              and(
                eq(membershipPlans.id, dto.planId),
                eq(membershipPlans.gymId, gymId),
                eq(membershipPlans.isActive, true)
              )
            )
            .limit(1)
        )[0];

        if (planRecord) {
          expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + planRecord.durationDays);
        }
      }

      // 1. Insert Member
      const [newMember] = await tx
        .insert(gymMembers)
        .values({
          gymId,
          memberCode,
          fullName: cleanFullName,
          phone: cleanPhone,
          alternatePhone: dto.alternatePhone?.trim() || null,
          email: cleanEmail,
          gender: dto.gender || null,
          dob: dto.dob ? (dto.dob as any) : null,
          address: dto.address?.trim() || null,
          membershipStatus: 'ACTIVE',
          joinedAt: new Date(),
          expiresAt: expiryDate,
          notes: dto.notes?.trim() || null,
        })
        .returning();

      // 2. Insert Membership Instance if plan selected
      if (planRecord && newMember) {
        await tx.insert(memberMemberships).values({
          gymId,
          memberId: newMember.id,
          planId: planRecord.id,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: expiryDate!,
        });
      }

      // 3. Record Initial Payment if provided
      if (dto.initialPaymentAmount && dto.initialPaymentAmount > 0 && newMember) {
        await tx.insert(payments).values({
          gymId,
          memberId: newMember.id,
          amount: dto.initialPaymentAmount.toFixed(2),
          paymentMethod: (dto.initialPaymentMethod || 'CASH').toUpperCase(),
          status: 'COMPLETED',
          notes: 'Initial admission fee / plan payment',
          paidAt: new Date(),
        });
      }

      // 4. Record Audit Log
      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'MEMBER_CREATED',
        resource: 'gym_member',
        resourceId: newMember!.id,
        metadata: JSON.stringify({
          memberCode,
          fullName: cleanFullName,
          planId: dto.planId,
          actorUserId,
        }),
      });

      // 5. Record Server Sync Change for Desktop Pull
      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'gym_member',
          entityId: newMember!.id,
          operation: 'CREATE',
          payload: newMember!,
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'gym_member',
        entityId: newMember!.id,
        operation: 'CREATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated member admission',
      });

      return newMember;
    });
  }

  /**
   * 5. Update Member Profile
   */
  public async updateMember(
    gymId: string,
    memberId: string,
    dto: UpdateMemberDto,
    actorUserId?: string
  ): Promise<any> {
    const existing = (
      await db
        .select()
        .from(gymMembers)
        .where(
          and(
            eq(gymMembers.id, memberId),
            eq(gymMembers.gymId, gymId),
            isNull(gymMembers.deletedAt)
          )
        )
        .limit(1)
    )[0];

    if (!existing) {
      throw AppError.notFound('Member not found in authorized gym tenant.');
    }

    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (dto.fullName !== undefined) updates.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) updates.phone = dto.phone.trim();
    if (dto.alternatePhone !== undefined) updates.alternatePhone = dto.alternatePhone.trim();
    if (dto.email !== undefined) updates.email = dto.email.trim().toLowerCase();
    if (dto.gender !== undefined) updates.gender = dto.gender;
    if (dto.dob !== undefined) updates.dob = dto.dob;
    if (dto.address !== undefined) updates.address = dto.address.trim();
    if (dto.membershipStatus !== undefined) updates.membershipStatus = dto.membershipStatus;
    if (dto.notes !== undefined) updates.notes = dto.notes.trim();

    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(gymMembers)
        .set(updates)
        .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId)))
        .returning();

      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'MEMBER_UPDATED',
        resource: 'gym_member',
        resourceId: memberId,
        metadata: JSON.stringify({ updates, actorUserId }),
      });

      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'gym_member',
          entityId: memberId,
          operation: 'UPDATE',
          payload: updated!,
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'gym_member',
        entityId: memberId,
        operation: 'UPDATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated member update',
      });

      return updated;
    });
  }

  /**
   * 6. Deactivate / Soft-Delete Member
   */
  public async deleteMember(
    gymId: string,
    memberId: string,
    actorUserId?: string
  ): Promise<{ success: boolean; message: string }> {
    const existing = (
      await db
        .select()
        .from(gymMembers)
        .where(
          and(
            eq(gymMembers.id, memberId),
            eq(gymMembers.gymId, gymId),
            isNull(gymMembers.deletedAt)
          )
        )
        .limit(1)
    )[0];

    if (!existing) {
      throw AppError.notFound('Member not found in authorized gym tenant.');
    }

    return await db.transaction(async (tx) => {
      await tx
        .update(gymMembers)
        .set({
          membershipStatus: 'INACTIVE',
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId)));

      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'MEMBER_DEACTIVATED',
        resource: 'gym_member',
        resourceId: memberId,
        metadata: JSON.stringify({ actorUserId }),
      });

      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'gym_member',
          entityId: memberId,
          operation: 'DELETE',
          payload: { id: memberId, membershipStatus: 'INACTIVE', deletedAt: new Date().toISOString() },
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'gym_member',
        entityId: memberId,
        operation: 'DELETE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated member deactivation',
      });

      return { success: true, message: 'Member deactivated successfully.' };
    });
  }

  /**
   * 7. Get Member Attendance History
   */
  public async getMemberAttendance(
    gymId: string,
    memberId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ attendance: any[]; total: number }> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);

    const whereClause = and(
      eq(attendanceLogs.gymId, gymId),
      eq(attendanceLogs.memberId, memberId)
    );

    const logs = await db
      .select()
      .from(attendanceLogs)
      .where(whereClause)
      .orderBy(desc(attendanceLogs.checkInTime))
      .limit(safeLimit)
      .offset(safeOffset);

    const totalRow = (
      await db.select({ count: count() }).from(attendanceLogs).where(whereClause)
    )[0];

    return {
      attendance: logs,
      total: totalRow?.count || 0,
    };
  }

  /**
   * 8. Get Member Payment History
   */
  public async getMemberPayments(
    gymId: string,
    memberId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ payments: any[]; total: number }> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);

    const whereClause = and(
      eq(payments.gymId, gymId),
      eq(payments.memberId, memberId)
    );

    const paymentRecords = await db
      .select()
      .from(payments)
      .where(whereClause)
      .orderBy(desc(payments.paidAt))
      .limit(safeLimit)
      .offset(safeOffset);

    const totalRow = (
      await db.select({ count: count() }).from(payments).where(whereClause)
    )[0];

    return {
      payments: paymentRecords,
      total: totalRow?.count || 0,
    };
  }

  /**
   * 9. Get Member Membership History
   */
  public async getMemberMemberships(gymId: string, memberId: string): Promise<any[]> {
    return await db
      .select({
        id: memberMemberships.id,
        planId: memberMemberships.planId,
        planName: membershipPlans.planName,
        price: membershipPlans.price,
        durationDays: membershipPlans.durationDays,
        status: memberMemberships.status,
        startDate: memberMemberships.startDate,
        endDate: memberMemberships.endDate,
        autoRenew: memberMemberships.autoRenew,
        createdAt: memberMemberships.createdAt,
      })
      .from(memberMemberships)
      .innerJoin(membershipPlans, eq(memberMemberships.planId, membershipPlans.id))
      .where(
        and(
          eq(memberMemberships.gymId, gymId),
          eq(memberMemberships.memberId, memberId)
        )
      )
      .orderBy(desc(memberMemberships.startDate));
  }

  /**
   * 10. Create Member Invitation Token / QR Code
   */
  public async createMemberInvite(
    gymId: string,
    memberId: string,
    actorUserId?: string
  ): Promise<{
    activationTicket: string;
    displayCode: string;
    memberId: string;
    gymId: string;
    expiresAt: string;
  }> {
    // Verify member belongs to this gym and is active
    const member = (
      await db
        .select()
        .from(gymMembers)
        .where(
          and(
            eq(gymMembers.id, memberId),
            eq(gymMembers.gymId, gymId),
            isNull(gymMembers.deletedAt)
          )
        )
        .limit(1)
    )[0];

    if (!member) {
      throw AppError.notFound('Member not found in authorized gym tenant.');
    }

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const displayCode = `GD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(memberActivationTokens).values({
      gymId,
      gymMemberId: memberId,
      tokenHash,
      displayCode,
      expiresAt,
    });

    await db.insert(auditLogs).values({
      gymId,
      actorType: 'OWNER',
      action: 'MEMBER_INVITATION_GENERATED',
      resource: 'gym_member',
      resourceId: memberId,
      metadata: JSON.stringify({ displayCode, actorUserId }),
    });

    return {
      activationTicket: rawToken,
      displayCode,
      memberId,
      gymId,
      expiresAt: expiresAt.toISOString(),
    };
  }
}

export const ownerService = new OwnerService();
export default ownerService;
