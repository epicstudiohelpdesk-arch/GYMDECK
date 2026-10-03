/**
 * GymDeck Owner Mobile - Local-First Membership Plans Query Hook
 *
 * Offline-First V1: Gate 3 — Plans Domain Local-First Reads
 *
 * Operational Model:
 * 1. Reads authoritative plans directly from local encrypted SQLCipher database via MembershipPlanRepository.
 * 2. Operates 100% offline with zero network calls.
 * 3. When online, triggers controlled background bootstrap from cloud API into SQLCipher.
 * 4. Preserves integer minor units: converts price_minor_units to major units string for UI compatibility.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { LocalDatabaseManager } from '../database/LocalDatabaseManager';
import { MembershipPlanRepository } from '../database/repositories/MembershipPlanRepository';
import { PlanBootstrapService } from '../database/bootstrap/PlanBootstrapService';
import { useAuthStore } from '../store/authStore';
import { MembershipPlanSummary } from '../types';

export interface UseLocalPlansParams {
  activeOnly?: boolean;
  search?: string;
}

export interface UseLocalPlansResult {
  plans: MembershipPlanSummary[];
  isLoading: boolean;
  isRefetching: boolean;
  isOffline: boolean;
  isBootstrapping: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useLocalPlans(params?: UseLocalPlansParams): UseLocalPlansResult {
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
    data: plans = [],
    isLoading,
    isRefetching,
    refetch: queryRefetch,
    error,
  } = useQuery({
    queryKey: ['local-plans', gymId, params?.activeOnly, params?.search],
    queryFn: async () => {
      if (!gymId) return [];

      const dbManager = LocalDatabaseManager.getInstance();
      if (!dbManager.isOpen()) {
        await dbManager.initialize(gymId);
      }

      const repo = new MembershipPlanRepository(dbManager);
      const rows = await repo.list({
        gymId,
        onlyActive: params?.activeOnly,
        search: params?.search,
      });

      const summaries: MembershipPlanSummary[] = rows.map((r) => ({
        id: r.id,
        planName: r.plan_name,
        durationDays: r.duration_days,
        price: (r.price_minor_units / 100).toString(),
        description: r.description,
        benefits: r.benefits,
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
        const result = await PlanBootstrapService.getInstance().bootstrapPlans({ force });
        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ['local-plans', gymId] });
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
    plans,
    isLoading,
    isRefetching,
    isOffline,
    isBootstrapping,
    error: error instanceof Error ? error : null,
    refetch: handleRefetch,
  };
}
