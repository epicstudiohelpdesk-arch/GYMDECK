/**
 * GymDeck Member Mobile - usePersonalTraining TanStack Query Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { ptService } from '../services/api';
import { TrainerProfile, PTPackage, PTSession } from '../types';

export const TRAINER_QUERY_KEY = ['member', 'trainer'];
export const PT_PACKAGE_QUERY_KEY = ['member', 'pt-package'];
export const PT_SESSIONS_QUERY_KEY = ['member', 'pt-sessions'];

export const useTrainer = () => {
  return useQuery<TrainerProfile>({
    queryKey: TRAINER_QUERY_KEY,
    queryFn: () => ptService.getTrainerProfile(),
    staleTime: 1000 * 60 * 15,
  });
};

export const usePTPackage = () => {
  return useQuery<PTPackage>({
    queryKey: PT_PACKAGE_QUERY_KEY,
    queryFn: () => ptService.getPTPackage(),
    staleTime: 1000 * 60 * 10,
  });
};

export const usePTSessions = () => {
  return useQuery<PTSession[]>({
    queryKey: PT_SESSIONS_QUERY_KEY,
    queryFn: () => ptService.getPTSessions(),
    staleTime: 1000 * 60 * 5,
  });
};
