/**
 * GymDeck Member Mobile - Notification Center API Service
 */

import { apiClient, normalizeAxiosError } from './client';
import { ApiResponse } from './types';
import { MemberNotification } from '../../types';
import { Logger } from '../../observability';

const DEV_NOTIFICATIONS_FIXTURES: MemberNotification[] = [
  {
    id: 'notif_1',
    title: 'Workout Program Assigned',
    message: 'Coach Marcus Vance has assigned you a new "Chest & Triceps Hypertrophy" program.',
    category: 'WORKOUT',
    isRead: false,
    createdAt: '2026-08-28T07:00:00Z',
  },
  {
    id: 'notif_2',
    title: 'Upcoming PT Session Reminder',
    message: 'Your 1-on-1 Personal Training session is scheduled for Monday at 09:00 AM.',
    category: 'TRAINER',
    isRead: false,
    createdAt: '2026-08-27T18:00:00Z',
  },
  {
    id: 'notif_3',
    title: 'Holiday Operating Hours',
    message: 'Iron Forge Fitness will operate on modified hours (07:00 AM - 08:00 PM) on Labor Day.',
    category: 'GYM_ANNOUNCEMENT',
    isRead: true,
    createdAt: '2026-08-25T12:00:00Z',
  },
  {
    id: 'notif_4',
    title: 'Membership Active & Verified',
    message: 'Your 12-Month Elite Annual plan is active. 139 days remaining on this pass.',
    category: 'MEMBERSHIP',
    isRead: true,
    createdAt: '2026-08-20T10:00:00Z',
  },
];

class NotificationService {
  /**
   * Fetch all notifications for the member.
   */
  public async getNotifications(): Promise<MemberNotification[]> {
    try {
      Logger.info('[NotificationService] Fetching member notifications...');
      const response = await apiClient.get<ApiResponse<any>>('/member/notifications');
      const data = response.data.data;
      if (Array.isArray(data)) {
        return data;
      }
      if (data && Array.isArray(data.items)) {
        return data.items.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          category: n.category || 'ANNOUNCEMENT',
          isRead: n.isRead,
          createdAt: n.createdAt,
        }));
      }
      return [];
    } catch (err) {
      if (__DEV__) {
        return DEV_NOTIFICATIONS_FIXTURES;
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Mark a single notification as read.
   */
  public async markAsRead(notificationId: string): Promise<void> {
    try {
      Logger.info('[NotificationService] Marking notification as read...', { notificationId });
      await apiClient.post(`/member/notifications/${notificationId}/read`);
    } catch (err) {
      if (!__DEV__) {
        throw normalizeAxiosError(err);
      }
    }
  }

  /**
   * Mark all notifications as read.
   */
  public async markAllAsRead(): Promise<void> {
    try {
      Logger.info('[NotificationService] Marking all notifications as read...');
      await apiClient.post('/member/notifications/read-all');
    } catch (err) {
      if (!__DEV__) {
        throw normalizeAxiosError(err);
      }
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
