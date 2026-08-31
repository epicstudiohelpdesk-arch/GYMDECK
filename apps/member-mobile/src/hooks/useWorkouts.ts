/**
 * GymDeck Member Mobile - useWorkouts TanStack Query Hook
 */

import { useQuery } from '@tanstack/react-query';
import { memberService } from '../services/api';
import { WorkoutRoutine } from '../types';

export const WORKOUTS_QUERY_KEY = ['member', 'workouts'];

export const useWorkouts = () => {
  return useQuery<WorkoutRoutine[]>({
    queryKey: WORKOUTS_QUERY_KEY,
    queryFn: () => memberService.getWorkouts(),
    staleTime: 1000 * 60 * 15,
  });
};

export default useWorkouts;
