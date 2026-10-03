/**
 * GymDeck Owner Mobile - Local-First Members Query Hook
 *
 * Offline-First V1: Gate 2 — Members Local-First Reads
 *
 * Operational Model:
 * 1. Reads authoritative member list directly from local encrypted SQLCipher database via MemberRepository.
 * 2. Operates 100% offline with instantaneous (<5ms) responses.
 * 3. In the background when online, initiates controlled bootstrap from cloud API and updates local SQLite.
 * 4. React Query is used strictly for in-memory rendering cache, NOT business persistence.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { LocalDatabaseManager } from '../database/LocalDatabaseManager';
import { MemberRepository } from '../database/repositories/MemberRepository';
import { memberBootstrapService } from '../database/bootstrap/MemberBootstrapService';
import { runMobileConvergenceAudit } from '../utils/auditConvergence';
import { useAuthStore } from '../store/authStore';
import { GymMemberSummary } from '../types';

export interface UseLocalMembersParams {
  search?: string;
  status?: string;
}

export interface UseLocalMembersResult {
  members: GymMemberSummary[];
  totalCount: number;
  isLoading: boolean;
  isRefetching: boolean;
  isOffline: boolean;
  isBootstrapping: boolean;
  lastBootstrappedAt: string | null;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useLocalMembers(params?: UseLocalMembersParams): UseLocalMembersResult {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const gymId = user?.gymId;

  const [isOffline, setIsOffline] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [lastBootstrappedAt, setLastBootstrappedAt] = useState<string | null>(null);

  // 1. Monitor network state transitions
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    NetInfo.fetch().then((state) => {
      setIsOffline(!state.isConnected);
    });

    return () => unsub();
  }, []);

  // 2. Fetch last bootstrap timestamp from local database
  useEffect(() => {
    if (gymId) {
      memberBootstrapService.getLastBootstrappedAt(gymId).then((ts) => {
        setLastBootstrappedAt(ts);
      });
    }
  }, [gymId]);

  // 3. Primary Local Query (SQLCipher via MemberRepository)
  const {
    data,
    isLoading,
    isRefetching,
    refetch: queryRefetch,
    error,
  } = useQuery({
    queryKey: ['local-members', gymId, params?.search, params?.status],
    queryFn: async () => {
      if (!gymId) return { members: [], total: 0 };

      const dbManager = LocalDatabaseManager.getInstance();
      if (!dbManager.isOpen()) {
        await dbManager.initialize(gymId);
      }

      const repo = new MemberRepository(dbManager);
      const records = await repo.list({
        gymId,
        search: params?.search,
        status: params?.status,
      });

      const total = await repo.count({
        gymId,
        status: params?.status,
      });

      const memberSummaries: GymMemberSummary[] = records.map((r) => ({
        id: r.id,
        memberCode: r.member_code,
        fullName: r.full_name,
        phone: r.phone,
        alternatePhone: r.alternate_phone,
        email: r.email,
        gender: r.gender,
        dob: r.dob,
        address: r.address,
        membershipStatus: r.membership_status,
        joinedAt: r.joined_at,
        expiresAt: r.expires_at,
        notes: r.notes,
        createdAt: r.created_at,
      }));

      return {
        members: memberSummaries,
        total,
      };
    },
    staleTime: 5000,
    enabled: Boolean(gymId),
  });

  // 4. Background Bootstrap (Only when online and database has zero members or stale)
  const runBackgroundBootstrap = useCallback(
    async (force: boolean = false) => {
      if (!gymId || isOffline) return;

      setIsBootstrapping(true);
      try {
        const result = await memberBootstrapService.bootstrapMembers({ force });
        if (result.success) {
          setLastBootstrappedAt(result.bootstrappedAt || new Date().toISOString());
          // Invalidate local query so fresh data from SQLite renders immediately
          queryClient.invalidateQueries({ queryKey: ['local-members', gymId] });
          runMobileConvergenceAudit().catch(() => {});
        }
      } catch {
        // Safe fail: local queries continue uninterrupted
      } finally {
        setIsBootstrapping(false);
      }
    },
    [gymId, isOffline, queryClient]
  );

  // Trigger initial background bootstrap on mount
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
    members: data?.members || [],
    totalCount: data?.total ?? 0,
    isLoading,
    isRefetching,
    isOffline,
    isBootstrapping,
    lastBootstrappedAt,
    error: error instanceof Error ? error : null,
    refetch: handleRefetch,
  };
}
