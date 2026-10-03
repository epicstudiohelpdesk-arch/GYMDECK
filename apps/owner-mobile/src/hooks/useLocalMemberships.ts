/**
 * GymDeck Owner Mobile - Local-First Member Memberships Hook
 *
 * Offline-First V1: Gate 3 — Subscriptions / Member Memberships Local-First Reads
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { LocalDatabaseManager } from '../database/LocalDatabaseManager';
import { MemberMembershipRepository } from '../database/repositories/MemberMembershipRepository';
import { useAuthStore } from '../store/authStore';
import { MemberMembershipRecord } from '../database/types';

export interface UseLocalMembershipsParams {
  memberId?: string;
  status?: string;
}

export interface UseLocalMembershipsResult {
  memberships: MemberMembershipRecord[];
  activeMembership: MemberMembershipRecord | null;
  isLoading: boolean;
  isRefetching: boolean;
  isOffline: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useLocalMemberships(params?: UseLocalMembershipsParams): UseLocalMembershipsResult {
  const user = useAuthStore((state) => state.user);
  const gymId = user?.gymId;

  const [isOffline, setIsOffline] = useState(false);

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
    data,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ['local-memberships', gymId, params?.memberId, params?.status],
    queryFn: async () => {
      if (!gymId) return { memberships: [], activeMembership: null };

      const dbManager = LocalDatabaseManager.getInstance();
      if (!dbManager.isOpen()) {
        await dbManager.initialize(gymId);
      }

      const repo = new MemberMembershipRepository(dbManager);
      let list: MemberMembershipRecord[] = [];
      let active: MemberMembershipRecord | null = null;

      if (params?.memberId) {
        list = await repo.listByMemberId(params.memberId, gymId);
        active = await repo.findActiveByMemberId(params.memberId, gymId);
      } else {
        list = await repo.list({ gymId, status: params?.status });
      }

      return { memberships: list, activeMembership: active };
    },
    staleTime: 10000,
    enabled: Boolean(gymId),
  });

  return {
    memberships: data?.memberships || [],
    activeMembership: data?.activeMembership || null,
    isLoading,
    isRefetching,
    isOffline,
    error: error instanceof Error ? error : null,
    refetch: async () => {
      await refetch();
    },
  };
}
