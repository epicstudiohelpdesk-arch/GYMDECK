/**
 * GymDeck Member Mobile - useMembership TanStack Query Hook
 */

import { useQuery } from '@tanstack/react-query';
import { memberService } from '../services/api';
import { MemberMembership } from '../types';

export const MEMBERSHIP_QUERY_KEY = ['member', 'membership'];

export const useMembership = () => {
  return useQuery<MemberMembership>({
    queryKey: MEMBERSHIP_QUERY_KEY,
    queryFn: () => memberService.getMembership(),
    staleTime: 1000 * 60 * 10,
  });
};

export default useMembership;
