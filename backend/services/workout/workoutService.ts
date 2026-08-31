/**
 * GymDeck Cloud Backend - Workout Domain Service
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  workoutRoutines,
  workoutExercises,
  workoutSessions,
  workoutLoggedSets,
  gymMembers,
  auditLogs,
} from '../../shared/database/schema';
import { AppError } from '../../shared/errors';

export interface RoutineExerciseDto {
  id: string;
  order: number;
  name: string;
  targetMuscle: string;
  targetSets: number;
  targetReps: string;
  suggestedWeightKg: string | null;
  restSeconds: number;
  instructions: string | null;
}

export interface WorkoutRoutineResponse {
  id: string;
  title: string;
  dayOfWeek: string | null;
  estimatedMinutes: number;
  targetMuscles: string[];
  exercises: RoutineExerciseDto[];
}

export interface StartSessionDto {
  routineId?: string;
  sessionName?: string;
}

export interface LogSetDto {
  exerciseId?: string;
  exerciseName: string;
  setNumber: number;
  weightKg: number;
  repsCompleted: number;
  isCompleted?: boolean;
}

export interface CompleteSessionDto {
  totalVolumeKg?: number;
  durationMinutes?: number;
  completedSetsCount?: number;
}

export interface WorkoutSessionDetailResponse {
  id: string;
  routineId: string | null;
  sessionName: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  totalVolumeKg: string;
  completedSetsCount: number;
  sets: {
    id: string;
    exerciseName: string;
    setNumber: number;
    weightKg: string;
    repsCompleted: number;
    isCompleted: boolean;
  }[];
}

// In-memory idempotency cache for completed sessions (24-hour TTL)
const workoutIdempotencyStore = new Map<string, { sessionId: string; response: WorkoutSessionDetailResponse; expiresAt: number }>();

export class WorkoutService {
  /**
   * 1. Get assigned routines for the authenticated member
   */
  public async getRoutines(gymId: string, memberId: string): Promise<WorkoutRoutineResponse[]> {
    const routines = await db
      .select()
      .from(workoutRoutines)
      .where(and(eq(workoutRoutines.gymId, gymId), eq(workoutRoutines.assignedMemberId, memberId)))
      .orderBy(desc(workoutRoutines.createdAt));

    const result: WorkoutRoutineResponse[] = [];

    for (const r of routines) {
      const exercises = await db
        .select()
        .from(workoutExercises)
        .where(eq(workoutExercises.routineId, r.id))
        .orderBy(workoutExercises.exerciseOrder);

      let muscles: string[] = [];
      if (r.targetMuscleGroups) {
        try {
          muscles = JSON.parse(r.targetMuscleGroups);
        } catch {
          muscles = [r.targetMuscleGroups];
        }
      }

      result.push({
        id: r.id,
        title: r.title,
        dayOfWeek: r.dayOfWeek,
        estimatedMinutes: r.estimatedDurationMinutes,
        targetMuscles: muscles,
        exercises: exercises.map((e) => ({
          id: e.id,
          order: e.exerciseOrder,
          name: e.name,
          targetMuscle: e.targetMuscle,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          suggestedWeightKg: e.suggestedWeightKg,
          restSeconds: e.restSeconds,
          instructions: e.instructions,
        })),
      });
    }

    return result;
  }

  /**
   * 2. Start a live workout session
   */
  public async startSession(
    gymId: string,
    memberId: string,
    dto: StartSessionDto
  ): Promise<WorkoutSessionDetailResponse> {
    let sessionName = dto.sessionName || 'Live Workout Session';
    let exercisesToSeed: (typeof workoutExercises.$inferSelect)[] = [];

    if (dto.routineId) {
      const routines = await db
        .select()
        .from(workoutRoutines)
        .where(
          and(
            eq(workoutRoutines.id, dto.routineId),
            eq(workoutRoutines.gymId, gymId),
            eq(workoutRoutines.assignedMemberId, memberId)
          )
        )
        .limit(1);

      if (routines.length > 0) {
        sessionName = routines[0]!.title;
        exercisesToSeed = await db
          .select()
          .from(workoutExercises)
          .where(eq(workoutExercises.routineId, dto.routineId))
          .orderBy(workoutExercises.exerciseOrder);
      }
    }

    const startTime = new Date();
    const [newSession] = await db
      .insert(workoutSessions)
      .values({
        gymId,
        memberId,
        routineId: dto.routineId,
        sessionName,
        startTime,
        status: 'IN_PROGRESS',
        totalVolumeKg: '0',
        completedSetsCount: 0,
      })
      .returning();

    // Pre-seed sets from routine exercises
    const seededSets: (typeof workoutLoggedSets.$inferSelect)[] = [];
    for (const ex of exercisesToSeed) {
      for (let s = 1; s <= ex.targetSets; s++) {
        const [insertedSet] = await db
          .insert(workoutLoggedSets)
          .values({
            sessionId: newSession!.id,
            exerciseId: ex.id,
            exerciseName: ex.name,
            setNumber: s,
            weightKg: ex.suggestedWeightKg || '0',
            repsCompleted: 0,
            isCompleted: false,
          })
          .returning();
        if (insertedSet) seededSets.push(insertedSet);
      }
    }

    // Audit log
    await db.insert(auditLogs).values({
      gymId,
      memberId,
      actorType: 'MEMBER',
      action: 'WORKOUT_SESSION_START',
      resource: 'workout_sessions',
      resourceId: newSession!.id,
    });

    return {
      id: newSession!.id,
      routineId: newSession!.routineId,
      sessionName: newSession!.sessionName,
      status: 'IN_PROGRESS',
      startTime: startTime.toISOString(),
      endTime: null,
      durationMinutes: null,
      totalVolumeKg: '0',
      completedSetsCount: 0,
      sets: seededSets.map((s) => ({
        id: s.id,
        exerciseName: s.exerciseName,
        setNumber: s.setNumber,
        weightKg: s.weightKg,
        repsCompleted: s.repsCompleted,
        isCompleted: s.isCompleted,
      })),
    };
  }

  /**
   * 3. Log/Update a set within an active workout session
   */
  public async logSet(
    gymId: string,
    memberId: string,
    sessionId: string,
    dto: LogSetDto
  ): Promise<{ id: string; success: boolean }> {
    // Verify session ownership and active status
    const sessions = await db
      .select()
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.id, sessionId),
          eq(workoutSessions.gymId, gymId),
          eq(workoutSessions.memberId, memberId)
        )
      )
      .limit(1);

    if (sessions.length === 0) {
      throw AppError.notFound('Workout session not found for this member.');
    }

    const session = sessions[0]!;
    if (session.status !== 'IN_PROGRESS') {
      throw AppError.conflict('Cannot log sets: Workout session is already finished or abandoned.');
    }

    const [loggedSet] = await db
      .insert(workoutLoggedSets)
      .values({
        sessionId,
        exerciseId: dto.exerciseId,
        exerciseName: dto.exerciseName,
        setNumber: dto.setNumber,
        weightKg: dto.weightKg.toString(),
        repsCompleted: dto.repsCompleted,
        isCompleted: dto.isCompleted ?? true,
      })
      .returning();

    return { id: loggedSet!.id, success: true };
  }

  /**
   * 4. Complete a workout session (State Machine + Idempotency)
   */
  public async completeSession(
    gymId: string,
    memberId: string,
    sessionId: string,
    dto: CompleteSessionDto,
    idempotencyKey?: string
  ): Promise<WorkoutSessionDetailResponse> {
    // Idempotency check
    if (idempotencyKey) {
      const cached = workoutIdempotencyStore.get(idempotencyKey);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.response;
      }
    }

    // Verify session
    const sessions = await db
      .select()
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.id, sessionId),
          eq(workoutSessions.gymId, gymId),
          eq(workoutSessions.memberId, memberId)
        )
      )
      .limit(1);

    if (sessions.length === 0) {
      throw AppError.notFound('Workout session not found.');
    }

    const session = sessions[0]!;

    // State machine check: Cannot complete an already completed session
    if (session.status === 'COMPLETED') {
      // Re-fetch sets and return current completed view safely
      const existingSets = await db
        .select()
        .from(workoutLoggedSets)
        .where(eq(workoutLoggedSets.sessionId, sessionId))
        .orderBy(workoutLoggedSets.setNumber);

      return {
        id: session.id,
        routineId: session.routineId,
        sessionName: session.sessionName,
        status: 'COMPLETED',
        startTime: session.startTime.toISOString(),
        endTime: session.endTime ? session.endTime.toISOString() : new Date().toISOString(),
        durationMinutes: session.durationMinutes,
        totalVolumeKg: session.totalVolumeKg ?? '0',
        completedSetsCount: session.completedSetsCount ?? 0,
        sets: existingSets.map((s) => ({
          id: s.id,
          exerciseName: s.exerciseName,
          setNumber: s.setNumber,
          weightKg: s.weightKg,
          repsCompleted: s.repsCompleted,
          isCompleted: s.isCompleted,
        })),
      };
    }

    const endTime = new Date();
    const durationMinutes = dto.durationMinutes || Math.max(1, Math.round((endTime.getTime() - session.startTime.getTime()) / 60000));
    const totalVolumeKg = (dto.totalVolumeKg || 0).toString();
    const completedSetsCount = dto.completedSetsCount || 0;

    // Transition state IN_PROGRESS -> COMPLETED
    await db
      .update(workoutSessions)
      .set({
        status: 'COMPLETED',
        endTime,
        durationMinutes,
        totalVolumeKg,
        completedSetsCount,
        idempotencyKey: idempotencyKey || null,
        updatedAt: new Date(),
      })
      .where(eq(workoutSessions.id, sessionId));

    const sets = await db
      .select()
      .from(workoutLoggedSets)
      .where(eq(workoutLoggedSets.sessionId, sessionId))
      .orderBy(workoutLoggedSets.setNumber);

    // Audit log
    await db.insert(auditLogs).values({
      gymId,
      memberId,
      actorType: 'MEMBER',
      action: 'WORKOUT_SESSION_COMPLETE',
      resource: 'workout_sessions',
      resourceId: sessionId,
      metadata: JSON.stringify({ totalVolumeKg, durationMinutes }),
    });

    const responsePayload: WorkoutSessionDetailResponse = {
      id: session.id,
      routineId: session.routineId,
      sessionName: session.sessionName,
      status: 'COMPLETED',
      startTime: session.startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMinutes,
      totalVolumeKg,
      completedSetsCount,
      sets: sets.map((s) => ({
        id: s.id,
        exerciseName: s.exerciseName,
        setNumber: s.setNumber,
        weightKg: s.weightKg,
        repsCompleted: s.repsCompleted,
        isCompleted: s.isCompleted,
      })),
    };

    if (idempotencyKey) {
      workoutIdempotencyStore.set(idempotencyKey, {
        sessionId,
        response: responsePayload,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
    }

    return responsePayload;
  }

  /**
   * 5. Get completed workout history for member
   */
  public async getWorkoutHistory(
    gymId: string,
    memberId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ items: any[]; total: number; page: number; totalPages: number }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const sessions = await db
      .select()
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.gymId, gymId),
          eq(workoutSessions.memberId, memberId),
          eq(workoutSessions.status, 'COMPLETED')
        )
      )
      .orderBy(desc(workoutSessions.startTime))
      .limit(safeLimit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.gymId, gymId),
          eq(workoutSessions.memberId, memberId),
          eq(workoutSessions.status, 'COMPLETED')
        )
      );

    const total = countResult?.count ?? 0;

    return {
      items: sessions.map((s) => ({
        id: s.id,
        sessionName: s.sessionName,
        completedAt: s.endTime ? s.endTime.toISOString() : s.startTime.toISOString(),
        durationMinutes: s.durationMinutes || 45,
        totalVolumeKg: parseFloat(s.totalVolumeKg || '0'),
        completedSetsCount: s.completedSetsCount || 0,
      })),
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }
}

export const workoutService = new WorkoutService();
export default workoutService;
