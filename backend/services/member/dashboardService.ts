/**
 * GymDeck Cloud Backend - Member Dashboard Aggregator Service
 */

import { eq, and, gt, desc } from 'drizzle-orm';
import { db } from '../../shared/database';
import { gymMembers, gyms, attendanceLogs, workoutRoutines, trainers } from '../../shared/database/schema';
import { membershipService, MembershipDetailsResponse } from '../membership';
import { AppError } from '../../shared/errors';

export interface DashboardResponse {
  member: {
    id: string;
    memberCode: string;
    fullName: string;
    email: string | null;
    phone: string;
    profilePhotoUrl: string | null;
    gymId: string;
    gymName: string;
  };
  membership: MembershipDetailsResponse;
  attendanceSummary: {
    totalCheckInsThisMonth: number;
    streakDays: number;
    checkedInToday: boolean;
    lastCheckIn: string | null;
  };
  todayWorkout: {
    routineId: string;
    title: string;
    estimatedMinutes: number;
    targetMuscles: string[];
  } | null;
  trainer: {
    id: string;
    fullName: string;
    specialization: string | null;
    rating: string;
  } | null;
}

export class DashboardService {
  /**
   * Aggregate member dashboard view in a single optimized service workflow
   */
  public async getDashboardData(gymId: string, memberId: string): Promise<DashboardResponse> {
    // 1. Fetch Member & Gym container
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
      throw AppError.notFound('Member record not found for this gym tenant.');
    }

    const { member, gym } = memberRecords[0]!;

    // 2. Fetch Membership details
    const membership = await membershipService.getMemberMembership(gymId, memberId);

    // 3. Calculate Attendance metrics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const recentLogs = await db
      .select()
      .from(attendanceLogs)
      .where(
        and(
          eq(attendanceLogs.gymId, gymId),
          eq(attendanceLogs.memberId, memberId),
          gt(attendanceLogs.checkInTime, startOfMonth)
        )
      )
      .orderBy(desc(attendanceLogs.checkInTime));

    const totalCheckInsThisMonth = recentLogs.length;
    const checkedInToday = recentLogs.some((l) => l.checkInTime >= startOfDay);
    const lastCheckIn = recentLogs.length > 0 ? recentLogs[0]!.checkInTime.toISOString() : null;

    // Calculate simple consecutive streak
    let streakDays = 0;
    if (checkedInToday) {
      streakDays = 1;
    }

    // 4. Fetch assigned workout routine (if any)
    const routines = await db
      .select()
      .from(workoutRoutines)
      .where(and(eq(workoutRoutines.gymId, gymId), eq(workoutRoutines.assignedMemberId, memberId)))
      .limit(1);

    let todayWorkout: DashboardResponse['todayWorkout'] = null;
    if (routines.length > 0) {
      const routine = routines[0]!;
      let muscles: string[] = [];
      if (routine.targetMuscleGroups) {
        try {
          muscles = JSON.parse(routine.targetMuscleGroups);
        } catch {
          muscles = [routine.targetMuscleGroups];
        }
      }
      todayWorkout = {
        routineId: routine.id,
        title: routine.title,
        estimatedMinutes: routine.estimatedDurationMinutes,
        targetMuscles: muscles,
      };
    }

    // 5. Fetch assigned trainer (if any)
    const trainerRecords = await db
      .select()
      .from(trainers)
      .where(eq(trainers.gymId, gymId))
      .limit(1);

    let trainerSummary: DashboardResponse['trainer'] = null;
    if (trainerRecords.length > 0) {
      const t = trainerRecords[0]!;
      trainerSummary = {
        id: t.id,
        fullName: t.fullName,
        specialization: t.specialization,
        rating: t.rating ?? '5.00',
      };
    }

    return {
      member: {
        id: member.id,
        memberCode: member.memberCode,
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        profilePhotoUrl: member.profilePhotoUrl,
        gymId: gym.id,
        gymName: gym.name,
      },
      membership,
      attendanceSummary: {
        totalCheckInsThisMonth,
        streakDays,
        checkedInToday,
        lastCheckIn,
      },
      todayWorkout,
      trainer: trainerSummary,
    };
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
