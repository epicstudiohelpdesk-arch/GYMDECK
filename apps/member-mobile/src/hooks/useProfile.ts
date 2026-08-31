/**
 * GymDeck Member Mobile - useProfile TanStack Query Hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberService } from '../services/api';
import { UserProfile } from '../types';
import { useAuthStore } from '../store';

export const PROFILE_QUERY_KEY = ['member', 'profile'];

export const useProfile = () => {
  return useQuery<UserProfile>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => memberService.getProfile(),
    staleTime: 1000 * 60 * 10,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation<UserProfile, Error, Partial<UserProfile>>({
    mutationFn: (data: Partial<UserProfile>) => memberService.updateProfile(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(PROFILE_QUERY_KEY, updatedUser);
      queryClient.invalidateQueries({ queryKey: ['member', 'dashboard'] });
    },
  });
};

export default useProfile;
