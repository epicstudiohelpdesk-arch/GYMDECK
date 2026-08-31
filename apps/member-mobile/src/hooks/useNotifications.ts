/**
 * GymDeck Member Mobile - useNotifications TanStack Query Hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/api';
import { MemberNotification } from '../types';
import { MEMBER_DASHBOARD_QUERY_KEY } from './useMemberDashboard';

export const NOTIFICATIONS_QUERY_KEY = ['member', 'notifications'];

export const useNotifications = () => {
  return useQuery<MemberNotification[]>({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => notificationService.getNotifications(),
    staleTime: 1000 * 60 * 2, // 2 minutes fresh
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: (_, notificationId) => {
      queryClient.setQueryData<MemberNotification[]>(NOTIFICATIONS_QUERY_KEY, (old) => {
        if (!old) return [];
        return old.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n));
      });
      queryClient.invalidateQueries({ queryKey: MEMBER_DASHBOARD_QUERY_KEY });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.setQueryData<MemberNotification[]>(NOTIFICATIONS_QUERY_KEY, (old) => {
        if (!old) return [];
        return old.map((n) => ({ ...n, isRead: true }));
      });
      queryClient.invalidateQueries({ queryKey: MEMBER_DASHBOARD_QUERY_KEY });
    },
  });
};
