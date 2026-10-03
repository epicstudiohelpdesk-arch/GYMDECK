/**
 * GymDeck Owner Mobile - Local-First Member Profile Detail Hook
 *
 * Offline-First V1: Gate 2 — Members Local-First Reads
 *
 * Operational Model:
 * 1. Reads comprehensive member profile directly from local SQLCipher database.
 * 2. Operates 100% offline without failing on network disconnect.
 * 3. In the background when online, refreshes from cloud API and updates local SQLite tables.
 */

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { LocalDatabaseManager } from '../database/LocalDatabaseManager';
import { MemberRepository } from '../database/repositories/MemberRepository';
import { OwnerMembersService } from '../services/api/ownerMembersService';
import { useAuthStore } from '../store/authStore';
import { MemberProfileData } from '../types';

export interface UseLocalMemberDetailResult {
  data: MemberProfileData | null;
  isLoading: boolean;
  isRefetching: boolean;
  isOffline: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useLocalMemberDetail(memberId?: string): UseLocalMemberDetailResult {
  const queryClient = useQueryClient();
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
  } = useQuery<MemberProfileData | null>({
    queryKey: ['local-member-detail', gymId, memberId],
    queryFn: async () => {
      if (!gymId || !memberId) return null;

      const dbManager = LocalDatabaseManager.getInstance();
      if (!dbManager.isOpen()) {
        await dbManager.initialize(gymId);
      }

      const memberRepo = new MemberRepository(dbManager);

      // 1. First, check local SQLCipher database
      let profile = await memberRepo.getMemberProfile(memberId, gymId);

      // 2. If online, attempt background refresh from cloud API to keep local SQLite fresh
      if (!isOffline) {
        try {
          const cloudData = await OwnerMembersService.getMemberById(memberId);
          if (cloudData?.member) {
            // Upsert member into local database
            await memberRepo.upsert({
              id: cloudData.member.id,
              gymId,
              memberCode: cloudData.member.memberCode,
              fullName: cloudData.member.fullName,
              phone: cloudData.member.phone,
              alternatePhone: cloudData.member.alternatePhone,
              email: cloudData.member.email,
              gender: cloudData.member.gender,
              dob: cloudData.member.dob,
              address: cloudData.member.address,
              membershipStatus: cloudData.member.membershipStatus,
              joinedAt: cloudData.member.joinedAt,
              expiresAt: cloudData.member.expiresAt,
              notes: cloudData.member.notes,
            });

            // Re-read local profile with fresh data
            profile = await memberRepo.getMemberProfile(memberId, gymId);

            // Merge cloud-specific dynamic summaries if available
            if (profile) {
              profile.attendanceSummary = cloudData.attendanceSummary || profile.attendanceSummary;
              profile.paymentSummary = cloudData.paymentSummary || profile.paymentSummary;
              profile.trainer = cloudData.trainer || profile.trainer;
              profile.invite = cloudData.invite || profile.invite;
              if (cloudData.membership) {
                profile.membership = cloudData.membership;
              }
            }
          }
        } catch {
          // Cloud fetch failed (or offline transition); proceed smoothly with local profile
        }
      }

      return profile;
    },
    staleTime: 10000,
    enabled: Boolean(gymId && memberId),
  });

  const handleRefetch = async () => {
    await refetch();
  };

  return {
    data: data ?? null,
    isLoading,
    isRefetching,
    isOffline,
    error: error instanceof Error ? error : null,
    refetch: handleRefetch,
  };
}
