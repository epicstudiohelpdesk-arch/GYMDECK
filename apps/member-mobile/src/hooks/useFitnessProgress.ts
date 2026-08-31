/**
 * GymDeck Member Mobile - useFitnessProgress TanStack Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { progressService } from '../services/api';
import { WeightLog, BodyMeasurement, FitnessMilestone } from '../types';

export const WEIGHT_HISTORY_QUERY_KEY = ['member', 'progress', 'weight'];
export const MEASUREMENTS_QUERY_KEY = ['member', 'progress', 'measurements'];
export const MILESTONES_QUERY_KEY = ['member', 'progress', 'milestones'];

export const useWeightHistory = () => {
  return useQuery<WeightLog[]>({
    queryKey: WEIGHT_HISTORY_QUERY_KEY,
    queryFn: () => progressService.getWeightHistory(),
    staleTime: 1000 * 60 * 10,
  });
};

export const useLogWeight = () => {
  const queryClient = useQueryClient();

  return useMutation<WeightLog, Error, number>({
    mutationFn: (weightKg: number) => progressService.logWeight(weightKg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WEIGHT_HISTORY_QUERY_KEY });
    },
  });
};

export const useBodyMeasurements = () => {
  return useQuery<BodyMeasurement[]>({
    queryKey: MEASUREMENTS_QUERY_KEY,
    queryFn: () => progressService.getBodyMeasurements(),
    staleTime: 1000 * 60 * 10,
  });
};

export const useLogBodyMeasurement = () => {
  const queryClient = useQueryClient();

  return useMutation<BodyMeasurement, Error, Partial<BodyMeasurement>>({
    mutationFn: (data: Partial<BodyMeasurement>) => progressService.logBodyMeasurement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEASUREMENTS_QUERY_KEY });
    },
  });
};

export const useMilestones = () => {
  return useQuery<FitnessMilestone[]>({
    queryKey: MILESTONES_QUERY_KEY,
    queryFn: () => progressService.getMilestones(),
    staleTime: 1000 * 60 * 15,
  });
};
