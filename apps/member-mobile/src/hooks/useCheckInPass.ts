/**
 * GymDeck Member Mobile - useCheckInPass TanStack Query Hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberService, CheckInPassData, CheckInResult } from '../services/api';
import { MEMBER_DASHBOARD_QUERY_KEY } from './useMemberDashboard';

export const CHECK_IN_PASS_QUERY_KEY = ['member', 'check-in-pass'];

export const useCheckInPass = () => {
  return useQuery<CheckInPassData>({
    queryKey: CHECK_IN_PASS_QUERY_KEY,
    queryFn: () => memberService.getCheckInPass(),
    staleTime: 1000 * 60 * 4, // 4 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh pass before expiry
  });
};

export const useSubmitCheckIn = () => {
  const queryClient = useQueryClient();

  return useMutation<CheckInResult, Error, string>({
    mutationFn: (passToken: string) => memberService.checkIn(passToken),
    onSuccess: () => {
      // Invalidate dashboard to update attendance count and streak
      queryClient.invalidateQueries({ queryKey: MEMBER_DASHBOARD_QUERY_KEY });
    },
  });
};

export default useCheckInPass;
