/**
 * GymDeck Owner Mobile - Notification Center & Preferences API Service
 */

import { apiClient } from './client';
import {
  NotificationPageResponse,
  NotificationPreferenceItem,
  ApiResponse,
} from '../../types';

export const ownerNotificationService = {
  /**
   * 1. Get Owner / Staff Notifications
   */
  getNotifications: async (
    limit: number = 20,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<NotificationPageResponse> => {
    const params: Record<string, any> = { limit, offset };
    if (unreadOnly) params.unreadOnly = true;

    const response = await apiClient.get<ApiResponse<NotificationPageResponse>>('/owner/notifications', {
      params,
    });
    return response.data.data;
  },

  /**
   * 2. Get Fast Unread Count
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<ApiResponse<{ unreadCount: number }>>(
      '/owner/notifications/unread-count'
    );
    return response.data.data.unreadCount;
  },

  /**
   * 3. Mark Single Notification as Read
   */
  markAsRead: async (notificationId: string): Promise<{ success: boolean; id: string; readAt: string }> => {
    const response = await apiClient.patch<ApiResponse<{ success: boolean; id: string; readAt: string }>>(
      `/owner/notifications/${notificationId}/read`
    );
    return response.data.data;
  },

  /**
   * 4. Mark All Notifications as Read
   */
  markAllAsRead: async (): Promise<{ success: boolean; count: number }> => {
    const response = await apiClient.patch<ApiResponse<{ success: boolean; count: number }>>(
      '/owner/notifications/read-all'
    );
    return response.data.data;
  },

  /**
   * 5. Get Notification Preferences
   */
  getPreferences: async (): Promise<NotificationPreferenceItem[]> => {
    const response = await apiClient.get<ApiResponse<{ preferences: NotificationPreferenceItem[] }>>(
      '/owner/notifications/preferences'
    );
    return response.data.data.preferences;
  },

  /**
   * 6. Update Notification Preferences
   */
  updatePreferences: async (
    preferences: Array<{ category: string; channel: string; isEnabled: boolean }>
  ): Promise<NotificationPreferenceItem[]> => {
    const response = await apiClient.patch<ApiResponse<{ preferences: NotificationPreferenceItem[] }>>(
      '/owner/notifications/preferences',
      { preferences }
    );
    return response.data.data.preferences;
  },

  /**
   * 7. Register Device Push Token
   */
  registerPushToken: async (tokenData: {
    pushToken: string;
    platform: 'IOS' | 'ANDROID' | 'WEB';
    deviceModel?: string;
    appVersion?: string;
  }): Promise<{ success: boolean; tokenId: string }> => {
    const response = await apiClient.post<ApiResponse<{ success: boolean; tokenId: string }>>(
      '/owner/notifications/push-token',
      tokenData
    );
    return response.data.data;
  },
};
