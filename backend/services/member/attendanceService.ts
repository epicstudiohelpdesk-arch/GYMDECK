/**
 * GymDeck Cloud Backend - Member Attendance & Check-In Service
 */

import { eq, and, gt, desc, sql } from 'drizzle-orm';
import { db } from '../../shared/database';
import { attendanceLogs, gymMembers, gyms, auditLogs } from '../../shared/database/schema';
import { membershipService } from '../membership';
import { checkInPassService } from './checkInPassService';
import { AppError } from '../../shared/errors';

export interface CheckInDto {
  gymId: string;
  memberId: string;
  idempotencyKey?: string;
  passToken?: string;
  entryMethod?: 'QR_DYNAMIC' | 'MANUAL' | 'RFID' | 'BIOMETRIC';
  deviceMetadata?: string;
}

export interface CheckInResponse {
  attendanceId: string;
  checkInTime: string;
  status: 'APPROVED' | 'REJECTED';
  memberName: string;
  gymName: string;
  message: string;
  idempotentReplay?: boolean;
}

export interface AttendanceRecord {
  id: string;
  checkInTime: string;
  checkOutTime: string | null;
  entryMethod: string;
}

export interface AttendanceHistoryResponse {
  items: AttendanceRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// In-memory idempotency store for check-in requests (24-hour TTL)
interface IdempotencyEntry {
  payloadHash: string;
  response: CheckInResponse;
  expiresAt: number;
}
const idempotencyStore = new Map<string, IdempotencyEntry>();

export class AttendanceService {
  /**
   * 1. Submit a member check-in with idempotency, pass verification, and duplicate cooldown
   */
  public async submitCheckIn(dto: CheckInDto): Promise<CheckInResponse> {
    const { gymId, memberId, idempotencyKey, passToken, entryMethod = 'QR_DYNAMIC', deviceMetadata } = dto;

    // A. Idempotency Check
    if (idempotencyKey) {
      const existing = idempotencyStore.get(idempotencyKey);
      if (existing && Date.now() < existing.expiresAt) {
        return {
          ...existing.response,
          idempotentReplay: true,
        };
      }
    }

    // B. Verify check-in pass if provided
    if (passToken) {
      checkInPassService.verifyCheckInPass(passToken, gymId, memberId);
    }

    // C. Verify member profile and gym association
    const memberRecords = await db
      .select({
        member: gymMembers,
        gym: gyms,
      })
      .from(gymMembers)
      .innerJoin(gyms, eq(gymMembers.gymId, gyms.id))
      .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId)))
      .limit(1);

    if (memberRecords.length === 0) {
      throw AppError.notFound('Member or gym affiliation not found.');
    }

    const { member, gym } = memberRecords[0]!;

    // D. Membership Eligibility Check
    const membership = await membershipService.getMemberMembership(gymId, memberId);
    if (membership.status === 'EXPIRED' || membership.status === 'CANCELLED' || membership.status === 'FROZEN') {
      throw AppError.forbidden(`Cannot check in: Membership is ${membership.status.toLowerCase()}.`);
    }

    // E. Duplicate Check-In Protection (2-hour cooldown)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentCheckIns = await db
      .select()
      .from(attendanceLogs)
      .where(
        and(
          eq(attendanceLogs.gymId, gymId),
          eq(attendanceLogs.memberId, memberId),
          gt(attendanceLogs.checkInTime, twoHoursAgo)
        )
      )
      .limit(1);

    if (recentCheckIns.length > 0) {
      throw AppError.conflict('Duplicate check-in: You have already checked in recently. Please wait before checking in again.');
    }

    // F. Persist Attendance Record
    const checkInTime = new Date();
    const [newLog] = await db
      .insert(attendanceLogs)
      .values({
        gymId,
        memberId,
        entryMethod,
        deviceMetadata,
        checkInTime,
      })
      .returning();

    // G. Audit Log
    await db.insert(auditLogs).values({
      gymId,
      memberId,
      actorType: 'MEMBER',
      action: 'MEMBER_CHECK_IN',
      resource: 'attendance_logs',
      resourceId: newLog!.id,
    });

    const responsePayload: CheckInResponse = {
      attendanceId: newLog!.id,
      checkInTime: checkInTime.toISOString(),
      status: 'APPROVED',
      memberName: member.fullName,
      gymName: gym.name,
      message: `Check-in approved! Welcome to ${gym.name}.`,
    };

    // H. Store Idempotency Result
    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, {
        payloadHash: `${gymId}_${memberId}`,
        response: responsePayload,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
    }

    return responsePayload;
  }

  /**
   * 2. Get paginated historical attendance records
   */
  public async getAttendanceHistory(
    gymId: string,
    memberId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<AttendanceHistoryResponse> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    // Query paginated items
    const records = await db
      .select({
        id: attendanceLogs.id,
        checkInTime: attendanceLogs.checkInTime,
        checkOutTime: attendanceLogs.checkOutTime,
        entryMethod: attendanceLogs.entryMethod,
      })
      .from(attendanceLogs)
      .where(and(eq(attendanceLogs.gymId, gymId), eq(attendanceLogs.memberId, memberId)))
      .orderBy(desc(attendanceLogs.checkInTime))
      .limit(safeLimit)
      .offset(offset);

    // Query total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(attendanceLogs)
      .where(and(eq(attendanceLogs.gymId, gymId), eq(attendanceLogs.memberId, memberId)));

    const total = countResult?.count ?? 0;
    const totalPages = Math.ceil(total / safeLimit);

    return {
      items: records.map((r) => ({
        id: r.id,
        checkInTime: r.checkInTime.toISOString(),
        checkOutTime: r.checkOutTime ? r.checkOutTime.toISOString() : null,
        entryMethod: r.entryMethod,
      })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  }
}

export const attendanceService = new AttendanceService();
export default attendanceService;
