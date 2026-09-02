/**
 * GymDeck Cloud Backend - Owner Attendance Management & Check-In Service
 */

import * as crypto from 'crypto';
import { eq, and, isNull, desc, count, countDistinct, or, ilike, gte, lte } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  gymMembers,
  attendanceLogs,
  auditLogs,
  syncChangeLog,
  syncIdempotencyLog,
} from '../../shared/database/schema';
import { AppError } from '../../shared/errors';

export interface CheckInMemberDto {
  memberId?: string;
  memberCode?: string;
  entryMethod?: 'CODE_LOOKUP' | 'QR_DYNAMIC' | 'MANUAL' | 'RFID' | 'BIOMETRIC';
  deviceMetadata?: string;
  idempotencyKey?: string;
}

export interface ManualAttendanceDto {
  memberId?: string;
  memberCode?: string;
  checkInTime: string;
  checkOutTime?: string;
  notes: string;
}

export interface CheckOutMemberDto {
  checkOutTime?: string;
}

export interface AttendanceItem {
  id: string;
  gymId: string;
  memberId: string;
  memberCode: string;
  fullName: string;
  phone: string;
  membershipStatus: string;
  checkInTime: string;
  checkOutTime: string | null;
  entryMethod: string;
  deviceMetadata: string | null;
  notes: string | null;
  recordedByUserId: string | null;
  createdAt: string;
}

export interface DailyAttendanceResponse {
  items: AttendanceItem[];
  totalCount: number;
  uniqueMembersCount: number;
  date: string;
}

export interface AttendanceStatsResponse {
  todayCheckIns: number;
  todayUniqueMembers: number;
  weekCheckIns: number;
  monthCheckIns: number;
}

// In-memory idempotency cache (24 hours) for rapid network retry deduplication
const checkInIdempotencyCache = new Map<string, { result: any; expiresAt: number }>();

export class OwnerAttendanceService {
  /**
   * 1. Check In Member (by memberId or memberCode) with strict eligibility & cooldown
   */
  public async checkInMember(
    gymId: string,
    dto: CheckInMemberDto,
    actorUserId?: string
  ): Promise<any> {
    if (!dto.memberId && !dto.memberCode) {
      throw AppError.validation('Either memberId or memberCode is required for check-in.');
    }

    // A. Idempotency Check
    if (dto.idempotencyKey) {
      const cached = checkInIdempotencyCache.get(dto.idempotencyKey);
      if (cached && Date.now() < cached.expiresAt) {
        return {
          ...cached.result,
          idempotentReplay: true,
        };
      }
    }

    // B. Lookup Member in Gym Tenant
    const memberConditions = [
      eq(gymMembers.gymId, gymId),
      isNull(gymMembers.deletedAt),
    ];

    if (dto.memberId) {
      memberConditions.push(eq(gymMembers.id, dto.memberId));
    } else if (dto.memberCode) {
      memberConditions.push(eq(gymMembers.memberCode, dto.memberCode.trim().toUpperCase()));
    }

    const member = (
      await db
        .select()
        .from(gymMembers)
        .where(and(...memberConditions))
        .limit(1)
    )[0];

    if (!member) {
      throw AppError.notFound('Active member not found in authorized gym tenant.');
    }

    // C. Check Membership Eligibility
    const now = new Date();

    if (member.membershipStatus === 'INACTIVE') {
      throw AppError.forbidden('Cannot check in: Member account is marked INACTIVE.');
    }
    if (member.membershipStatus === 'FROZEN') {
      throw AppError.forbidden('Cannot check in: Member subscription is FROZEN.');
    }
    if (member.membershipStatus === 'EXPIRED' || (member.expiresAt && new Date(member.expiresAt) < now)) {
      throw AppError.forbidden(
        `Cannot check in: Membership is EXPIRED (expired on ${
          member.expiresAt ? new Date(member.expiresAt).toLocaleDateString() : 'N/A'
        }). Please renew subscription.`
      );
    }

    // D. Duplicate Check-in Cooldown (2-hour cooldown without checkout)
    const cooldownWindow = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const recentCheckIn = (
      await db
        .select()
        .from(attendanceLogs)
        .where(
          and(
            eq(attendanceLogs.gymId, gymId),
            eq(attendanceLogs.memberId, member.id),
            gte(attendanceLogs.checkInTime, cooldownWindow),
            isNull(attendanceLogs.checkOutTime)
          )
        )
        .orderBy(desc(attendanceLogs.checkInTime))
        .limit(1)
    )[0];

    if (recentCheckIn) {
      // If same idempotency key or rapid double-tap, return existing record
      if (dto.idempotencyKey) {
        return {
          attendanceId: recentCheckIn.id,
          memberId: member.id,
          memberCode: member.memberCode,
          fullName: member.fullName,
          checkInTime: recentCheckIn.checkInTime.toISOString(),
          status: 'APPROVED',
          idempotentReplay: true,
        };
      }

      const checkedInAtTime = new Date(recentCheckIn.checkInTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      throw AppError.conflict(
        `Duplicate check-in: Member already checked in at ${checkedInAtTime}. Cooldown is 2 hours.`
      );
    }

    // E. Transactional Attendance Record Creation
    return await db.transaction(async (tx) => {
      const [record] = await tx
        .insert(attendanceLogs)
        .values({
          gymId,
          memberId: member.id,
          checkInTime: now,
          entryMethod: dto.entryMethod || 'CODE_LOOKUP',
          deviceMetadata: dto.deviceMetadata || null,
          recordedByUserId: actorUserId || null,
        })
        .returning();

      // Audit Log
      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'ATTENDANCE_CHECKED_IN',
        resource: 'attendance_log',
        resourceId: record!.id,
        metadata: JSON.stringify({
          memberId: member.id,
          memberCode: member.memberCode,
          entryMethod: record!.entryMethod,
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
          entityType: 'attendance_log',
          entityId: record!.id,
          operation: 'CREATE',
          payload: {
            ...record!,
            memberName: member.fullName,
            memberCode: member.memberCode,
          },
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'attendance_log',
        entityId: record!.id,
        operation: 'CREATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated member check-in',
      });

      const responsePayload = {
        attendanceId: record!.id,
        memberId: member.id,
        memberCode: member.memberCode,
        fullName: member.fullName,
        checkInTime: record!.checkInTime.toISOString(),
        entryMethod: record!.entryMethod,
        membershipStatus: member.membershipStatus,
        status: 'APPROVED',
      };

      if (dto.idempotencyKey) {
        checkInIdempotencyCache.set(dto.idempotencyKey, {
          result: responsePayload,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        });
      }

      return responsePayload;
    });
  }

  /**
   * 2. Record Manual Attendance Entry (Historical / Authorized Staff)
   */
  public async recordManualAttendance(
    gymId: string,
    dto: ManualAttendanceDto,
    actorUserId?: string
  ): Promise<any> {
    if (!dto.memberId && !dto.memberCode) {
      throw AppError.validation('Either memberId or memberCode is required for manual attendance.');
    }
    if (!dto.notes || dto.notes.trim().length < 3) {
      throw AppError.validation('A valid reason / notes (minimum 3 characters) is required for manual attendance.');
    }

    const checkInDate = new Date(dto.checkInTime);
    if (isNaN(checkInDate.getTime())) {
      throw AppError.validation('Invalid check-in timestamp format.');
    }
    if (checkInDate > new Date(Date.now() + 60 * 1000)) {
      throw AppError.validation('Check-in time cannot be in the future.');
    }

    let checkOutDate: Date | null = null;
    if (dto.checkOutTime) {
      checkOutDate = new Date(dto.checkOutTime);
      if (isNaN(checkOutDate.getTime()) || checkOutDate < checkInDate) {
        throw AppError.validation('Check-out time cannot precede check-in time.');
      }
    }

    // Lookup Member
    const memberConditions = [
      eq(gymMembers.gymId, gymId),
      isNull(gymMembers.deletedAt),
    ];
    if (dto.memberId) {
      memberConditions.push(eq(gymMembers.id, dto.memberId));
    } else if (dto.memberCode) {
      memberConditions.push(eq(gymMembers.memberCode, dto.memberCode.trim().toUpperCase()));
    }

    const member = (
      await db
        .select()
        .from(gymMembers)
        .where(and(...memberConditions))
        .limit(1)
    )[0];

    if (!member) {
      throw AppError.notFound('Active member not found in authorized gym tenant.');
    }

    return await db.transaction(async (tx) => {
      const [record] = await tx
        .insert(attendanceLogs)
        .values({
          gymId,
          memberId: member.id,
          checkInTime: checkInDate,
          checkOutTime: checkOutDate,
          entryMethod: 'MANUAL',
          notes: dto.notes.trim(),
          recordedByUserId: actorUserId || null,
        })
        .returning();

      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'ATTENDANCE_MANUAL_ENTRY',
        resource: 'attendance_log',
        resourceId: record!.id,
        metadata: JSON.stringify({
          memberId: member.id,
          memberCode: member.memberCode,
          notes: dto.notes.trim(),
          actorUserId,
        }),
      });

      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'attendance_log',
          entityId: record!.id,
          operation: 'CREATE',
          payload: {
            ...record!,
            memberName: member.fullName,
            memberCode: member.memberCode,
          },
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'attendance_log',
        entityId: record!.id,
        operation: 'CREATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated manual attendance entry',
      });

      return {
        attendanceId: record!.id,
        memberId: member.id,
        memberCode: member.memberCode,
        fullName: member.fullName,
        checkInTime: record!.checkInTime.toISOString(),
        checkOutTime: record!.checkOutTime?.toISOString() || null,
        entryMethod: 'MANUAL',
        notes: record!.notes,
      };
    });
  }

  /**
   * 3. Member Check-Out
   */
  public async checkOutMember(
    gymId: string,
    attendanceId: string,
    dto: CheckOutMemberDto,
    actorUserId?: string
  ): Promise<any> {
    const existing = (
      await db
        .select()
        .from(attendanceLogs)
        .where(and(eq(attendanceLogs.id, attendanceId), eq(attendanceLogs.gymId, gymId)))
        .limit(1)
    )[0];

    if (!existing) {
      throw AppError.notFound('Attendance record not found in authorized gym tenant.');
    }

    if (existing.checkOutTime) {
      throw AppError.conflict('Member has already checked out for this session.');
    }

    const checkOutDate = dto.checkOutTime ? new Date(dto.checkOutTime) : new Date();
    if (checkOutDate < new Date(existing.checkInTime)) {
      throw AppError.validation('Check-out time cannot precede check-in time.');
    }

    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(attendanceLogs)
        .set({ checkOutTime: checkOutDate })
        .where(and(eq(attendanceLogs.id, attendanceId), eq(attendanceLogs.gymId, gymId)))
        .returning();

      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'ATTENDANCE_CHECKED_OUT',
        resource: 'attendance_log',
        resourceId: attendanceId,
        metadata: JSON.stringify({ checkOutTime: checkOutDate.toISOString(), actorUserId }),
      });

      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'attendance_log',
          entityId: attendanceId,
          operation: 'UPDATE',
          payload: updated!,
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'attendance_log',
        entityId: attendanceId,
        operation: 'UPDATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated member check-out',
      });

      return updated;
    });
  }

  /**
   * 4. Daily Attendance Directory & Search
   */
  public async getDailyAttendance(
    gymId: string,
    dateStr?: string,
    limit = 50,
    offset = 0,
    query?: string
  ): Promise<DailyAttendanceResponse> {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const conditions = [
      eq(attendanceLogs.gymId, gymId),
      gte(attendanceLogs.checkInTime, startOfDay),
      lte(attendanceLogs.checkInTime, endOfDay),
    ];

    if (query && query.trim().length > 0) {
      const term = `%${query.trim()}%`;
      conditions.push(
        or(
          ilike(gymMembers.fullName, term),
          ilike(gymMembers.phone, term),
          ilike(gymMembers.memberCode, term)
        )!
      );
    }

    // Total Count
    const totalResult = await db
      .select({
        totalCount: count(),
        uniqueMembersCount: countDistinct(attendanceLogs.memberId),
      })
      .from(attendanceLogs)
      .innerJoin(gymMembers, eq(attendanceLogs.memberId, gymMembers.id))
      .where(and(...conditions));

    const totalCount = totalResult[0]?.totalCount || 0;
    const uniqueMembersCount = totalResult[0]?.uniqueMembersCount || 0;

    // Fetch Paginated Logs
    const rows = await db
      .select({
        id: attendanceLogs.id,
        gymId: attendanceLogs.gymId,
        memberId: attendanceLogs.memberId,
        memberCode: gymMembers.memberCode,
        fullName: gymMembers.fullName,
        phone: gymMembers.phone,
        membershipStatus: gymMembers.membershipStatus,
        checkInTime: attendanceLogs.checkInTime,
        checkOutTime: attendanceLogs.checkOutTime,
        entryMethod: attendanceLogs.entryMethod,
        deviceMetadata: attendanceLogs.deviceMetadata,
        notes: attendanceLogs.notes,
        recordedByUserId: attendanceLogs.recordedByUserId,
        createdAt: attendanceLogs.createdAt,
      })
      .from(attendanceLogs)
      .innerJoin(gymMembers, eq(attendanceLogs.memberId, gymMembers.id))
      .where(and(...conditions))
      .orderBy(desc(attendanceLogs.checkInTime))
      .limit(limit)
      .offset(offset);

    const items: AttendanceItem[] = rows.map((r) => ({
      ...r,
      checkInTime: r.checkInTime.toISOString(),
      checkOutTime: r.checkOutTime ? r.checkOutTime.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      items,
      totalCount,
      uniqueMembersCount,
      date: startOfDay.toISOString().split('T')[0]!,
    };
  }

  /**
   * 5. Member Historical Attendance
   */
  public async getMemberAttendanceHistory(
    gymId: string,
    memberId: string,
    limit = 50,
    offset = 0
  ): Promise<{ items: any[]; totalCount: number }> {
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

    const totalCountRes = await db
      .select({ count: count() })
      .from(attendanceLogs)
      .where(and(eq(attendanceLogs.gymId, gymId), eq(attendanceLogs.memberId, memberId)));

    const rows = await db
      .select()
      .from(attendanceLogs)
      .where(and(eq(attendanceLogs.gymId, gymId), eq(attendanceLogs.memberId, memberId)))
      .orderBy(desc(attendanceLogs.checkInTime))
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map((r) => ({
        ...r,
        checkInTime: r.checkInTime.toISOString(),
        checkOutTime: r.checkOutTime ? r.checkOutTime.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      })),
      totalCount: totalCountRes[0]?.count || 0,
    };
  }

  /**
   * 6. Attendance Statistics & KPI Metrics
   */
  public async getAttendanceStats(gymId: string, targetDateStr?: string): Promise<AttendanceStatsResponse> {
    const date = targetDateStr ? new Date(targetDateStr) : new Date();
    
    // Today
    const todayStart = new Date(date);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(date);
    todayEnd.setHours(23, 59, 59, 999);

    const todayRes = await db
      .select({
        total: count(),
        unique: countDistinct(attendanceLogs.memberId),
      })
      .from(attendanceLogs)
      .where(
        and(
          eq(attendanceLogs.gymId, gymId),
          gte(attendanceLogs.checkInTime, todayStart),
          lte(attendanceLogs.checkInTime, todayEnd)
        )
      );

    // Week (Past 7 days)
    const weekStart = new Date(date);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekRes = await db
      .select({ total: count() })
      .from(attendanceLogs)
      .where(
        and(
          eq(attendanceLogs.gymId, gymId),
          gte(attendanceLogs.checkInTime, weekStart),
          lte(attendanceLogs.checkInTime, todayEnd)
        )
      );

    // Month (Past 30 days)
    const monthStart = new Date(date);
    monthStart.setDate(monthStart.getDate() - 30);
    monthStart.setHours(0, 0, 0, 0);

    const monthRes = await db
      .select({ total: count() })
      .from(attendanceLogs)
      .where(
        and(
          eq(attendanceLogs.gymId, gymId),
          gte(attendanceLogs.checkInTime, monthStart),
          lte(attendanceLogs.checkInTime, todayEnd)
        )
      );

    return {
      todayCheckIns: todayRes[0]?.total || 0,
      todayUniqueMembers: todayRes[0]?.unique || 0,
      weekCheckIns: weekRes[0]?.total || 0,
      monthCheckIns: monthRes[0]?.total || 0,
    };
  }
}

export const ownerAttendanceService = new OwnerAttendanceService();
export default ownerAttendanceService;
