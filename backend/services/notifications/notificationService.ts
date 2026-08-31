/**
 * GymDeck Cloud Backend - Notification Center Domain Service
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../shared/database';
import { notifications, memberNotificationRecipients } from '../../shared/database/schema';
import { AppError } from '../../shared/errors';

export interface NotificationItemResponse {
  id: string;
  title: string;
  message: string;
  category: 'ANNOUNCEMENT' | 'MEMBERSHIP' | 'WORKOUT' | 'SECURITY' | 'BILLING';
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPageResponse {
  items: NotificationItemResponse[];
  unreadCount: number;
  total: number;
  page: number;
  totalPages: number;
}

export class NotificationService {
  /**
   * 1. Get member notifications with read status & unread count
   */
  public async getNotifications(
    gymId: string,
    memberId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<NotificationPageResponse> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    // Fetch recipient records joined with notifications
    const items = await db
      .select({
        recipientId: memberNotificationRecipients.id,
        notificationId: notifications.id,
        title: notifications.title,
        message: notifications.message,
        category: notifications.category,
        isRead: memberNotificationRecipients.isRead,
        readAt: memberNotificationRecipients.readAt,
        createdAt: notifications.createdAt,
      })
      .from(memberNotificationRecipients)
      .innerJoin(notifications, eq(memberNotificationRecipients.notificationId, notifications.id))
      .where(
        and(
          eq(memberNotificationRecipients.gymId, gymId),
          eq(memberNotificationRecipients.memberId, memberId)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(safeLimit)
      .offset(offset);

    // Calculate unread count
    const [unreadCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberNotificationRecipients)
      .where(
        and(
          eq(memberNotificationRecipients.gymId, gymId),
          eq(memberNotificationRecipients.memberId, memberId),
          eq(memberNotificationRecipients.isRead, false)
        )
      );

    const [totalCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberNotificationRecipients)
      .where(
        and(
          eq(memberNotificationRecipients.gymId, gymId),
          eq(memberNotificationRecipients.memberId, memberId)
        )
      );

    const total = totalCountResult?.count ?? 0;
    const unreadCount = unreadCountResult?.count ?? 0;

    return {
      items: items.map((n) => ({
        id: n.notificationId,
        title: n.title,
        message: n.message,
        category: n.category as any,
        isRead: n.isRead,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * 2. Mark an individual notification as read
   */
  public async markAsRead(gymId: string, memberId: string, notificationId: string): Promise<{ success: boolean }> {
    const updated = await db
      .update(memberNotificationRecipients)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(memberNotificationRecipients.notificationId, notificationId),
          eq(memberNotificationRecipients.gymId, gymId),
          eq(memberNotificationRecipients.memberId, memberId)
        )
      )
      .returning();

    if (updated.length === 0) {
      throw AppError.notFound('Notification not found or access denied.');
    }

    return { success: true };
  }

  /**
   * 3. Mark all unread notifications as read
   */
  public async markAllAsRead(gymId: string, memberId: string): Promise<{ updatedCount: number }> {
    const updated = await db
      .update(memberNotificationRecipients)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(memberNotificationRecipients.gymId, gymId),
          eq(memberNotificationRecipients.memberId, memberId),
          eq(memberNotificationRecipients.isRead, false)
        )
      )
      .returning();

    return { updatedCount: updated.length };
  }
}

export const notificationService = new NotificationService();
export default notificationService;
