/**
 * GymDeck Owner Mobile - Local-First PT Packages Query Hook
 *
 * Offline-First V1: Gate 3 — PT Domain Local-First Reads
 *
 * Operational Model:
 * 1. Reads personal training packages and sessions directly from local SQLCipher database via PTPackageRepository.
 * 2. Operates 100% offline with zero network calls.
 * 3. In the background when online, performs non-destructive hydration via PTPackageBootstrapService.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { LocalDatabaseManager } from '../database/LocalDatabaseManager';
import { PTPackageRepository } from '../database/repositories/PTPackageRepository';
import { PTPackageBootstrapService } from '../database/bootstrap/PTPackageBootstrapService';
import { useAuthStore } from '../store/authStore';
import { PTPackageRecord, PTSessionRecord } from '../database/types';

export interface UseLocalPTPackagesParams {
  memberId?: string;
  trainerId?: string;
  status?: string;
}

export interface UseLocalPTPackagesResult {
  packages: PTPackageRecord[];
  isLoading: boolean;
  isRefetching: boolean;
  isOffline: boolean;
  isBootstrapping: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useLocalPTPackages(params?: UseLocalPTPackagesParams): UseLocalPTPackagesResult {
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
    data: packages = [],
    isLoading,
    isRefetching,
    refetch: queryRefetch,
    error,
  } = useQuery({
    queryKey: ['local-pt-packages', gymId, params?.memberId, params?.trainerId, params?.status],
    queryFn: async () => {
      if (!gymId) return [];

      const dbManager = LocalDatabaseManager.getInstance();
      if (!dbManager.isOpen()) {
        await dbManager.initialize(gymId);
      }

      const repo = new PTPackageRepository(dbManager);
      return await repo.listPackages({
        gymId,
        memberId: params?.memberId,
        trainerId: params?.trainerId,
        status: params?.status,
      });
    },
    staleTime: 10000,
    enabled: Boolean(gymId),
  });

  const runBackgroundBootstrap = useCallback(
    async (force: boolean = false) => {
      if (!gymId || isOffline) return;

      setIsBootstrapping(true);
      try {
        const result = await PTPackageBootstrapService.getInstance().bootstrapPTPackages({ force });
        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ['local-pt-packages', gymId] });
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
    packages,
    isLoading,
    isRefetching,
    isOffline,
    isBootstrapping,
    error: error instanceof Error ? error : null,
    refetch: handleRefetch,
  };
}
