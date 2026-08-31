/**
 * GymDeck Member Mobile - useWorkoutSession TanStack Query Mutation Hooks
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutService } from '../services/api';
import { WorkoutSession, LoggedSet, WorkoutHistoryItem, WorkoutRoutine } from '../types';
import { WORKOUT_HISTORY_QUERY_KEY } from './useWorkoutHistory';
import { MEMBER_DASHBOARD_QUERY_KEY } from './useMemberDashboard';

export const useStartWorkoutSession = () => {
  return useMutation<WorkoutSession, Error, WorkoutRoutine>({
    mutationFn: (routine: WorkoutRoutine) => workoutService.startSession(routine),
  });
};

export const useLogSet = () => {
  return useMutation<LoggedSet, Error, { sessionId: string; exerciseId: string; set: LoggedSet }>({
    mutationFn: ({ sessionId, exerciseId, set }) =>
      workoutService.logSet(sessionId, exerciseId, set),
  });
};

export const useCompleteWorkoutSession = () => {
  const queryClient = useQueryClient();

  return useMutation<WorkoutHistoryItem, Error, { sessionId: string; durationMinutes: number }>({
    mutationFn: ({ sessionId, durationMinutes }) =>
      workoutService.completeSession(sessionId, durationMinutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKOUT_HISTORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MEMBER_DASHBOARD_QUERY_KEY });
    },
  });
};
