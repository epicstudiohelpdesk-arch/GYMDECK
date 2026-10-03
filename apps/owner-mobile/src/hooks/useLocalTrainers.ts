/**
 * GymDeck Owner Mobile - Local-First Trainers Query Hook
 *
 * Offline-First V1: Gate 3 — Trainers Domain Local-First Reads
 *
 * Operational Model:
 * 1. Reads authoritative trainer list directly from local encrypted SQLCipher database via TrainerRepository.
 * 2. Operates 100% offline with zero network calls.
 * 3. In the background when online, performs controlled data hydration via TrainerBootstrapService.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { LocalDatabaseManager } from '../database/LocalDatabaseManager';
import { TrainerRepository } from '../database/repositories/TrainerRepository';
import { TrainerBootstrapService } from '../database/bootstrap/TrainerBootstrapService';
import { useAuthStore } from '../store/authStore';
import { TrainerSummary } from '../types';

export interface UseLocalTrainersParams {
  search?: string;
  activeOnly?: boolean;
}

export interface UseLocalTrainersResult {
  trainers: TrainerSummary[];
  isLoading: boolean;
  isRefetching: boolean;
  isOffline: boolean;
  isBootstrapping: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useLocalTrainers(params?: UseLocalTrainersParams): UseLocalTrainersResult {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const gymId = user?.gymId;

  const [isOffline, setIsOffline] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    NetInfo.fetch().then((state) => {
      setIsOffline(!state.isConnected);
    });
    return () => unsub();
  }, []);

  const {
    data: trainers = [],
    isLoading,
    isRefetching,
    refetch: queryRefetch,
    error,
  } = useQuery({
    queryKey: ['local-trainers', gymId, params?.search, params?.activeOnly],
    queryFn: async () => {
      if (!gymId) return [];

      const dbManager = LocalDatabaseManager.getInstance();
      if (!dbManager.isOpen()) {
        await dbManager.initialize(gymId);
      }

      const repo = new TrainerRepository(dbManager);
      const rows = await repo.list({
        gymId,
        search: params?.search,
        onlyActive: params?.activeOnly,
      });

      const summaries: TrainerSummary[] = rows.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        phone: r.phone,
        email: r.email,
        specialization: r.specialization,
        experienceYears: r.experience_years ?? undefined,
        bio: r.bio,
        photoUrl: null,
        commissionType: 'FIXED_PER_SESSION',
        commissionRate: '0',
        isActive: Boolean(r.is_active),
      }));

      return summaries;
    },
    staleTime: 10000,
    enabled: Boolean(gymId),
  });

  const runBackgroundBootstrap = useCallback(
    async (force: boolean = false) => {
      if (!gymId || isOffline) return;

      setIsBootstrapping(true);
      try {
        const result = await TrainerBootstrapService.getInstance().bootstrapTrainers({ force });
        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ['local-trainers', gymId] });
        }
      } catch {
        // Safe fail: local queries continue uninterrupted
      } finally {
        setIsBootstrapping(false);
      }
    },
    [gymId, isOffline, queryClient]
  );

  useEffect(() => {
    if (gymId && !isOffline) {
      runBackgroundBootstrap(false);
    }
  }, [gymId, isOffline, runBackgroundBootstrap]);

  const handleRefetch = async () => {
    await queryRefetch();
    if (!isOffline) {
      await runBackgroundBootstrap(true);
    }
  };

  return {
    trainers,
    isLoading,
    isRefetching,
    isOffline,
    isBootstrapping,
    error: error instanceof Error ? error : null,
    refetch: handleRefetch,
  };
}
