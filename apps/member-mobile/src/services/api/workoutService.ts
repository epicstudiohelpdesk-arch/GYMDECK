/**
 * GymDeck Member Mobile - Workout Tracking & History API Service
 */

import { apiClient, normalizeAxiosError } from './client';
import { ApiResponse } from './types';
import {
  WorkoutSession,
  LoggedSet,
  WorkoutHistoryItem,
  WorkoutRoutine,
} from '../../types';
import { Logger } from '../../observability';

const DEV_WORKOUT_HISTORY_FIXTURES: WorkoutHistoryItem[] = [
  {
    id: 'wh_1',
    routineTitle: 'Chest & Triceps Hypertrophy',
    date: '2026-08-28T08:20:00Z',
    durationMinutes: 48,
    totalSetsCompleted: 17,
    totalVolumeKg: 4250,
    status: 'COMPLETED',
  },
  {
    id: 'wh_2',
    routineTitle: 'Lower Body Quad & Hamstring Focus',
    date: '2026-08-26T18:30:00Z',
    durationMinutes: 55,
    totalSetsCompleted: 19,
    totalVolumeKg: 6800,
    status: 'COMPLETED',
  },
  {
    id: 'wh_3',
    routineTitle: 'Back, Lats & Biceps Pull Day',
    date: '2026-08-24T07:45:00Z',
    durationMinutes: 52,
    totalSetsCompleted: 18,
    totalVolumeKg: 5120,
    status: 'COMPLETED',
  },
];

class WorkoutService {
  /**
   * Start a live workout session for a given routine.
   */
  public async startSession(routine: WorkoutRoutine): Promise<WorkoutSession> {
    try {
      Logger.info('[WorkoutService] Starting workout session...', { routineId: routine.id });
      const response = await apiClient.post<ApiResponse<WorkoutSession>>(
        '/member/workout-sessions',
        { routineId: routine.id }
      );
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return {
          id: `sess_${Date.now()}`,
          routineId: routine.id,
          routineTitle: routine.title,
          startTime: new Date().toISOString(),
          status: 'IN_PROGRESS',
          loggedExercises: routine.exercises.map((ex) => ({
            exerciseId: ex.id,
            exerciseName: ex.name,
            targetMuscle: ex.targetMuscle,
            sets: Array.from({ length: ex.sets }).map((_, idx) => ({
              setNumber: idx + 1,
              reps: parseInt(ex.reps.split('-')[0] || '10', 10),
              weightKg: 20 + idx * 5,
              isCompleted: false,
            })),
          })),
        };
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Log an individual set performance within an active session.
   */
  public async logSet(
    sessionId: string,
    exerciseId: string,
    set: LoggedSet
  ): Promise<LoggedSet> {
    try {
      Logger.info('[WorkoutService] Logging exercise set...', { sessionId, exerciseId, set });
      const response = await apiClient.post<ApiResponse<LoggedSet>>(
        `/member/workout-sessions/${sessionId}/sets`,
        {
          exerciseId,
          exerciseName: (set as any).exerciseName || 'Exercise',
          setNumber: set.setNumber,
          weightKg: set.weightKg,
          repsCompleted: set.reps,
          isCompleted: set.isCompleted,
        }
      );
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return { ...set, isCompleted: true, completedAt: new Date().toISOString() };
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Complete an active workout session.
   */
  public async completeSession(
    sessionId: string,
    durationMinutes: number
  ): Promise<WorkoutHistoryItem> {
    try {
      Logger.info('[WorkoutService] Completing workout session...', { sessionId, durationMinutes });
      const response = await apiClient.post<ApiResponse<WorkoutHistoryItem>>(
        `/member/workout-sessions/${sessionId}/complete`,
        { durationMinutes }
      );
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return {
          id: sessionId,
          routineTitle: 'Workout Session',
          date: new Date().toISOString(),
          durationMinutes,
          totalSetsCompleted: 15,
          totalVolumeKg: 3850,
          status: 'COMPLETED',
        };
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Fetch past completed workout sessions.
   */
  public async getWorkoutHistory(): Promise<WorkoutHistoryItem[]> {
    try {
      Logger.info('[WorkoutService] Fetching workout history...');
      const response = await apiClient.get<ApiResponse<any>>(
        '/member/workout-history'
      );
      const data = response.data.data;
      if (Array.isArray(data)) {
        return data;
      }
      if (data && Array.isArray(data.items)) {
        return data.items.map((i: any) => ({
          id: i.id,
          routineTitle: i.sessionName || 'Completed Workout',
          date: i.completedAt || i.startTime,
          durationMinutes: i.durationMinutes || 45,
          totalSetsCompleted: i.completedSetsCount || 0,
          totalVolumeKg: i.totalVolumeKg || 0,
          status: 'COMPLETED',
        }));
      }
      return [];
    } catch (err) {
      if (__DEV__) {
        return DEV_WORKOUT_HISTORY_FIXTURES;
      }
      throw normalizeAxiosError(err);
    }
  }
}

export const workoutService = new WorkoutService();
export default workoutService;
