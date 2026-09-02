/**
 * GymDeck Cloud Backend - Notification Core Domain Service
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  notifications,
  notificationPreferences,
  devicePushTokens,
  auditLogs,
} from '../../shared/database/schema';
import { AppError } from '../../shared/errors';
import {
  NotificationItem,
  NotificationPreferencesInput,
  RegisterPushTokenInput,
  RecipientType,
} from './types';

export interface NotificationPageResponse {
  items: NotificationItem[];
  unreadCount: number;
  total: number;
  page: number;
  totalPages: number;
}

export class NotificationService {
  /**
   * 1. Get Notifications for Authenticated Recipient (Member or Owner/Staff)
   */
  public async getRecipientNotifications(
    gymId: string,
    recipientType: RecipientType,
    recipientId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<NotificationPageResponse> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const conditions = [
      eq(notifications.gymId, gymId),
      eq(notifications.recipientType, recipientType),
      eq(notifications.recipientId, recipientId),
      eq(notifications.isArchived, false),
    ];

    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    const items = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(safeLimit)
      .offset(offset);

    // Unread Count
    const [unreadCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.gymId, gymId),
          eq(notifications.recipientId, recipientId),
          eq(notifications.isRead, false),
          eq(notifications.isArchived, false)
        )
      );

    // Total Count
    const [totalCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(...conditions));

    const total = totalCountResult?.count ?? 0;
    const unreadCount = unreadCountResult?.count ?? 0;

    return {
      items: items.map((n) => ({
        id: n.id,
        gymId: n.gymId,
        eventId: n.eventId,
        recipientType: n.recipientType as RecipientType,
        recipientId: n.recipientId,
        type: n.type as any,
        category: n.category as any,
        title: n.title,
        body: n.body,
        payload: n.payload ? JSON.parse(n.payload) : null,
        priority: n.priority as any,
        isRead: n.isRead,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        isArchived: n.isArchived,
        archivedAt: n.archivedAt ? n.archivedAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  /**
   * 2. Get Fast Unread Count for Recipient
   */
  public async getUnreadCount(
    gymId: string,
    recipientId: string
  ): Promise<{ unreadCount: number }> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.gymId, gymId),
          eq(notifications.recipientId, recipientId),
          eq(notifications.isRead, false),
          eq(notifications.isArchived, false)
        )
      );

    return { unreadCount: result?.count ?? 0 };
  }

  /**
   * 3. Mark Single Notification as Read (Strict Recipient & Tenant Authorization)
   */
  public async markAsRead(
    gymId: string,
    recipientId: string,
    notificationId: string
  ): Promise<{ success: boolean; id: string; readAt: string }> {
    const existing = (
      await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.gymId, gymId),
            eq(notifications.recipientId, recipientId)
          )
        )
        .limit(1)
    )[0];

    if (!existing) {
      throw AppError.notFound('Notification not found or access denied for authorized recipient.');
    }

    if (existing.isRead) {
      return {
        success: true,
        id: existing.id,
        readAt: existing.readAt ? existing.readAt.toISOString() : new Date().toISOString(),
      };
    }

    const now = new Date();
    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: now,
      })
      .where(eq(notifications.id, notificationId));

    return {
      success: true,
      id: notificationId,
      readAt: now.toISOString(),
    };
  }

  /**
   * 4. Mark All Notifications as Read for Authenticated Recipient
   */
  public async markAllAsRead(
    gymId: string,
    recipientId: string
  ): Promise<{ success: boolean; count: number }> {
    const now = new Date();
    const updated = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: now,
      })
      .where(
        and(
          eq(notifications.gymId, gymId),
          eq(notifications.recipientId, recipientId),
          eq(notifications.isRead, false)
        )
      )
      .returning({ id: notifications.id });

    return {
      success: true,
      count: updated.length,
    };
  }

  /**
   * 5. Get Recipient Preferences
   */
  public async getPreferences(
    gymId: string,
    recipientType: RecipientType,
    recipientId: string
  ): Promise<any[]> {
    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.gymId, gymId),
          eq(notificationPreferences.recipientType, recipientType),
          eq(notificationPreferences.recipientId, recipientId)
        )
      );

    return prefs.map((p) => ({
      category: p.category,
      channel: p.channel,
      isEnabled: p.isEnabled,
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /**
   * 6. Update Recipient Preferences
   */
  public async updatePreferences(
    gymId: string,
    recipientType: RecipientType,
    recipientId: string,
    inputs: NotificationPreferencesInput[],
    actorUserId?: string
  ): Promise<any> {
    return await db.transaction(async (tx) => {
      const results: any[] = [];

      for (const input of inputs) {
        const existing = (
          await tx
            .select()
            .from(notificationPreferences)
            .where(
              and(
                eq(notificationPreferences.gymId, gymId),
                eq(notificationPreferences.recipientType, recipientType),
                eq(notificationPreferences.recipientId, recipientId),
                eq(notificationPreferences.channel, input.channel),
                eq(notificationPreferences.category, input.category)
              )
            )
            .limit(1)
        )[0];

        const now = new Date();
        if (existing) {
          const [updated] = await tx
            .update(notificationPreferences)
            .set({
              isEnabled: input.isEnabled,
              updatedAt: now,
            })
            .where(eq(notificationPreferences.id, existing.id))
            .returning();
          results.push(updated);
        } else {
          const [inserted] = await tx
            .insert(notificationPreferences)
            .values({
              gymId,
              recipientType,
              recipientId,
              channel: input.channel,
              category: input.category,
              isEnabled: input.isEnabled,
              updatedAt: now,
            })
            .returning();
          results.push(inserted);
        }
      }

      await tx.insert(auditLogs).values({
        gymId,
        actorType: recipientType === 'MEMBER' ? 'MEMBER' : 'OWNER',
        action: 'NOTIFICATION_PREFERENCES_UPDATED',
        resource: 'notification_preferences',
        resourceId: recipientId,
        metadata: JSON.stringify({ recipientId, inputs, actorUserId }),
      });

      return results;
    });
  }

  /**
   * 7. Register / Rotate Device Push Token (Foundation for Phase 12B)
   */
  public async registerPushToken(
    gymId: string,
    recipientType: RecipientType,
    recipientId: string,
    input: RegisterPushTokenInput
  ): Promise<{ success: boolean; tokenId: string }> {
    if (!input.pushToken || input.pushToken.trim().length < 10) {
      throw AppError.validation('A valid push notification token is required.');
    }

    const cleanToken = input.pushToken.trim();
    const now = new Date();

    const existing = (
      await db
        .select()
        .from(devicePushTokens)
        .where(
          and(
            eq(devicePushTokens.gymId, gymId),
            eq(devicePushTokens.recipientId, recipientId),
            eq(devicePushTokens.pushToken, cleanToken)
          )
        )
        .limit(1)
    )[0];

    if (existing) {
      await db
        .update(devicePushTokens)
        .set({
          isActive: true,
          platform: input.platform || existing.platform,
          deviceModel: input.deviceModel || existing.deviceModel,
          appVersion: input.appVersion || existing.appVersion,
          lastUsedAt: now,
          updatedAt: now,
        })
        .where(eq(devicePushTokens.id, existing.id));

      return { success: true, tokenId: existing.id };
    }

    const [created] = await db
      .insert(devicePushTokens)
      .values({
        gymId,
        recipientType,
        recipientId,
        pushToken: cleanToken,
        platform: input.platform || 'ANDROID',
        deviceModel: input.deviceModel || null,
        appVersion: input.appVersion || null,
        isActive: true,
        lastUsedAt: now,
      })
      .returning();

    return { success: true, tokenId: created!.id };
  }
}

export const notificationService = new NotificationService();
export default notificationService;
