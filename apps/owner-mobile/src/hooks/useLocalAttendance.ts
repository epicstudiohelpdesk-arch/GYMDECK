/**
 * GymDeck Owner Mobile - Local-First Attendance Query Hook
 *
 * Offline-First V1: Gate 3 — Attendance Domain Local-First Reads
 *
 * Operational Model:
 * 1. Reads authoritative daily attendance & stats directly from local encrypted SQLCipher database.
 * 2. Operates 100% offline with zero network calls.
 * 3. In the background when online, performs non-destructive hydration via AttendanceBootstrapService.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { LocalDatabaseManager } from '../database/LocalDatabaseManager';
import { AttendanceRepository, AttendanceStatsSummary } from '../database/repositories/AttendanceRepository';
import { AttendanceBootstrapService } from '../database/bootstrap/AttendanceBootstrapService';
import { useAuthStore } from '../store/authStore';
import { AttendanceItem } from '../types';

export interface UseLocalAttendanceParams {
  date?: string;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface UseLocalAttendanceResult {
  items: AttendanceItem[];
  totalCount: number;
  stats: AttendanceStatsSummary;
  isLoading: boolean;
  isRefetching: boolean;
  isOffline: boolean;
  isBootstrapping: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useLocalAttendance(params?: UseLocalAttendanceParams): UseLocalAttendanceResult {
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

  const dateParam = params?.date || new Date().toISOString().slice(0, 10);

  const {
    data: attendanceData,
    isLoading: isLoadingItems,
    isRefetching: isRefetchingItems,
    refetch: queryRefetchItems,
    error: itemsError,
  } = useQuery({
    queryKey: ['local-attendance', gymId, dateParam, params?.query, params?.limit, params?.offset],
    queryFn: async () => {
      if (!gymId) return { items: [], totalCount: 0 };

      const dbManager = LocalDatabaseManager.getInstance();
      if (!dbManager.isOpen()) {
        await dbManager.initialize(gymId);
      }

      const repo = new AttendanceRepository(dbManager);
      const res = await repo.listDaily({
        gymId,
        date: dateParam,
        query: params?.query,
        limit: params?.limit || 100,
        offset: params?.offset || 0,
      });

      return res;
    },
    staleTime: 5000,
    enabled: Boolean(gymId),
  });

  const {
    data: statsData,
    refetch: queryRefetchStats,
  } = useQuery({
    queryKey: ['local-attendance-stats', gymId, dateParam],
    queryFn: async () => {
      if (!gymId) {
        return { todayTotalCheckIns: 0, onFloorCount: 0, todayCheckedOut: 0 };
      }

      const dbManager = LocalDatabaseManager.getInstance();
      if (!dbManager.isOpen()) {
        await dbManager.initialize(gymId);
      }

      const repo = new AttendanceRepository(dbManager);
      return await repo.getStats(dateParam, gymId);
    },
    staleTime: 5000,
    enabled: Boolean(gymId),
  });

  const runBackgroundBootstrap = useCallback(
    async (force: boolean = false) => {
      if (!gymId || isOffline) return;

      setIsBootstrapping(true);
      try {
        const result = await AttendanceBootstrapService.getInstance().bootstrapAttendance({ force });
        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ['local-attendance', gymId] });
          queryClient.invalidateQueries({ queryKey: ['local-attendance-stats', gymId] });
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
    await Promise.all([queryRefetchItems(), queryRefetchStats()]);
    if (!isOffline) {
      await runBackgroundBootstrap(true);
    }
  };

  return {
    items: (attendanceData?.items || []) as AttendanceItem[],
    totalCount: attendanceData?.totalCount || 0,
    stats: statsData || { todayTotalCheckIns: 0, onFloorCount: 0, todayCheckedOut: 0 },
    isLoading: isLoadingItems,
    isRefetching: isRefetchingItems,
    isOffline,
    isBootstrapping,
    error: itemsError instanceof Error ? itemsError : null,
    refetch: handleRefetch,
  };
}
