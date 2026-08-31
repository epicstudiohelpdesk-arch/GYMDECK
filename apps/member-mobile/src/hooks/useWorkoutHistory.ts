/**
 * GymDeck Member Mobile - useWorkoutHistory TanStack Query Hook
 */

import { useQuery } from '@tanstack/react-query';
import { workoutService } from '../services/api';
import { WorkoutHistoryItem } from '../types';

export const WORKOUT_HISTORY_QUERY_KEY = ['member', 'workout-history'];

export const useWorkoutHistory = () => {
  return useQuery<WorkoutHistoryItem[]>({
    queryKey: WORKOUT_HISTORY_QUERY_KEY,
    queryFn: () => workoutService.getWorkoutHistory(),
    staleTime: 1000 * 60 * 5,
  });
};

export default useWorkoutHistory;
