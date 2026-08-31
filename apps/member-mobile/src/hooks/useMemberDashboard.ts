/**
 * GymDeck Member Mobile - useMemberDashboard TanStack Query Hook
 */

import { useQuery } from '@tanstack/react-query';
import { memberService } from '../services/api';
import { MemberDashboardData } from '../types';

export const MEMBER_DASHBOARD_QUERY_KEY = ['member', 'dashboard'];

export const useMemberDashboard = () => {
  return useQuery<MemberDashboardData>({
    queryKey: MEMBER_DASHBOARD_QUERY_KEY,
    queryFn: () => memberService.getDashboard(),
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
    gcTime: 1000 * 60 * 15,    // 15 minutes in memory
  });
};

export default useMemberDashboard;
