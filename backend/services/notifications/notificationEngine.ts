/**
 * GymDeck Notification Core - Notification Resolution & Processing Engine
 */

import { eq, and } from 'drizzle-orm';
import {
  notifications,
  notificationPreferences,
  notificationDeliveries,
} from '../../shared/database/schema';
import {
  DomainEventType,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  RecipientType,
} from './types';

export interface DomainEventContext {
  eventId: string;
  gymId: string;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, any>;
  actorUserId?: string;
  occurredAt: Date;
}

export class NotificationEngine {
  /**
   * Handle domain event and generate appropriate notifications & deliveries
   */
  public async handleDomainEvent(tx: any, event: DomainEventContext): Promise<void> {
    const notificationsToCreate = this.resolveNotificationsForEvent(event);

    for (const notif of notificationsToCreate) {
      // 1. Check Recipient Preferences
      const isEnabled = await this.isNotificationEnabled(
        tx,
        event.gymId,
        notif.recipientType,
        notif.recipientId,
        notif.category,
        'IN_APP'
      );

      if (!isEnabled) {
        // Suppressed by recipient preference
        continue;
      }

      // 2. Idempotency Check: (gymId, eventId, recipientId)
      const existing = (
        await tx
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.gymId, event.gymId),
              eq(notifications.eventId, event.eventId),
              eq(notifications.recipientId, notif.recipientId)
            )
          )
          .limit(1)
      )[0];

      if (existing) {
        // Already created; skip to preserve idempotency
        continue;
      }

      // 3. Insert In-App Notification Record
      const [createdNotif] = await tx
        .insert(notifications)
        .values({
          gymId: event.gymId,
          eventId: event.eventId,
          recipientType: notif.recipientType,
          recipientId: notif.recipientId,
          type: notif.type,
          category: notif.category,
          title: notif.title,
          body: notif.body,
          message: notif.body,
          payload: notif.payload ? JSON.stringify(notif.payload) : null,
          priority: notif.priority || 'NORMAL',
          isRead: false,
          createdAt: event.occurredAt,
        })
        .returning();

      // 4. Create In-App Delivery Record
      await tx.insert(notificationDeliveries).values({
        gymId: event.gymId,
        notificationId: createdNotif!.id,
        channel: 'IN_APP',
        status: 'DELIVERED',
        attemptCount: 1,
        deliveredAt: event.occurredAt,
        metadata: JSON.stringify({ sourceEventId: event.eventId }),
      });
    }
  }

  /**
   * Check if recipient has enabled notifications for a specific category and channel
   */
  private async isNotificationEnabled(
    tx: any,
    gymId: string,
    recipientType: RecipientType,
    recipientId: string,
    category: NotificationCategory,
    channel: string
  ): Promise<boolean> {
    // 1. Check specific category preference
    const specificPref = (
      await tx
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.gymId, gymId),
            eq(notificationPreferences.recipientType, recipientType),
            eq(notificationPreferences.recipientId, recipientId),
            eq(notificationPreferences.channel, channel),
            eq(notificationPreferences.category, category)
          )
        )
        .limit(1)
    )[0];

    if (specificPref) {
      return specificPref.isEnabled;
    }

    // 2. Check global 'ALL' preference for this channel
    const allPref = (
      await tx
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.gymId, gymId),
            eq(notificationPreferences.recipientType, recipientType),
            eq(notificationPreferences.recipientId, recipientId),
            eq(notificationPreferences.channel, channel),
            eq(notificationPreferences.category, 'ALL')
          )
        )
        .limit(1)
    )[0];

    if (allPref) {
      return allPref.isEnabled;
    }

    // Default: Enabled
    return true;
  }

  /**
   * Map domain events to structured notification templates & recipients
   */
  private resolveNotificationsForEvent(event: DomainEventContext): Array<{
    recipientType: RecipientType;
    recipientId: string;
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    body: string;
    priority?: NotificationPriority;
    payload?: Record<string, any>;
  }> {
    const list: Array<any> = [];
    const { eventType, payload, aggregateId } = event;

    switch (eventType) {
      case 'membership.activated':
      case 'membership.renewed': {
        const isRenew = eventType === 'membership.renewed';
        if (payload.memberId) {
          list.push({
            recipientType: 'MEMBER',
            recipientId: payload.memberId,
            type: isRenew ? 'MEMBERSHIP_RENEWED' : 'MEMBERSHIP_ACTIVATED',
            category: 'MEMBERSHIP',
            title: isRenew ? 'Membership Renewed' : 'Membership Activated',
            body: `Your ${payload.planName || 'Gym'} membership has been successfully ${isRenew ? 'renewed' : 'activated'}. Valid until ${new Date(payload.endDate).toLocaleDateString()}.`,
            priority: 'HIGH',
            payload: { membershipId: aggregateId, planName: payload.planName },
          });
        }
        break;
      }

      case 'membership.frozen': {
        if (payload.memberId) {
          list.push({
            recipientType: 'MEMBER',
            recipientId: payload.memberId,
            type: 'MEMBERSHIP_FROZEN',
            category: 'MEMBERSHIP',
            title: 'Membership Frozen',
            body: `Your subscription has been placed on hold. ${payload.frozenDaysRemaining || 0} remaining days saved safely.`,
            priority: 'NORMAL',
            payload: { membershipId: aggregateId, reason: payload.reason },
          });
        }
        break;
      }

      case 'membership.unfrozen': {
        if (payload.memberId) {
          list.push({
            recipientType: 'MEMBER',
            recipientId: payload.memberId,
            type: 'MEMBERSHIP_UNFROZEN',
            category: 'MEMBERSHIP',
            title: 'Membership Resumed',
            body: `Your membership has been unfrozen! Full gym and class access is restored. New expiry: ${new Date(payload.newEndDate).toLocaleDateString()}.`,
            priority: 'HIGH',
            payload: { membershipId: aggregateId },
          });
        }
        break;
      }

      case 'payment.completed': {
        if (payload.memberId) {
          list.push({
            recipientType: 'MEMBER',
            recipientId: payload.memberId,
            type: 'PAYMENT_RECEIVED',
            category: 'BILLING',
            title: 'Payment Received',
            body: `Payment of $${Number(payload.amount).toFixed(2)} received via ${payload.paymentMethod}. Receipt #${payload.receiptNumber || 'N/A'}.`,
            priority: 'NORMAL',
            payload: { paymentId: aggregateId, receiptNumber: payload.receiptNumber, amount: payload.amount },
          });
        }
        break;
      }

      case 'payment.refunded': {
        if (payload.memberId) {
          list.push({
            recipientType: 'MEMBER',
            recipientId: payload.memberId,
            type: 'PAYMENT_REFUNDED',
            category: 'BILLING',
            title: 'Payment Refunded',
            body: `A refund of $${Number(payload.refundAmount).toFixed(2)} has been recorded for your account.`,
            priority: 'HIGH',
            payload: { paymentId: aggregateId, refundAmount: payload.refundAmount },
          });
        }
        break;
      }

      case 'attendance.checked_in': {
        if (payload.memberId) {
          list.push({
            recipientType: 'MEMBER',
            recipientId: payload.memberId,
            type: 'ATTENDANCE_CHECKED_IN',
            category: 'ATTENDANCE',
            title: 'Welcome to the Gym!',
            body: `Check-in recorded at ${new Date(payload.checkInTime).toLocaleTimeString()}. Have a great workout!`,
            priority: 'LOW',
            payload: { attendanceId: aggregateId },
          });
        }
        break;
      }

      case 'trainer.assigned': {
        if (payload.memberId) {
          list.push({
            recipientType: 'MEMBER',
            recipientId: payload.memberId,
            type: 'TRAINER_ASSIGNED',
            category: 'TRAINING',
            title: 'Coach Assigned',
            body: `${payload.trainerName || 'A certified trainer'} has been assigned as your personal coach.`,
            priority: 'HIGH',
            payload: { trainerId: payload.trainerId, trainerName: payload.trainerName },
          });
        }
        break;
      }

      case 'pt_package.purchased': {
        if (payload.memberId) {
          list.push({
            recipientType: 'MEMBER',
            recipientId: payload.memberId,
            type: 'PT_PACKAGE_PURCHASED',
            category: 'TRAINING',
            title: 'PT Package Ready',
            body: `${payload.totalSessions} Personal Training sessions allocated with ${payload.trainerName || 'your coach'}.`,
            priority: 'HIGH',
            payload: { packageId: aggregateId, totalSessions: payload.totalSessions },
          });
        }
        break;
      }

      case 'pt_session.completed': {
        if (payload.memberId) {
          list.push({
            recipientType: 'MEMBER',
            recipientId: payload.memberId,
            type: 'PT_SESSION_COMPLETED',
            category: 'TRAINING',
            title: 'PT Session Completed',
            body: `Completed ${payload.focusArea || 'workout'} session with ${payload.trainerName || 'your trainer'}. ${payload.remainingSessions || 0} sessions remaining.`,
            priority: 'NORMAL',
            payload: { sessionId: aggregateId, packageId: payload.packageId },
          });
        }
        break;
      }

      case 'pt_session.cancelled': {
        if (payload.memberId) {
          list.push({
            recipientType: 'MEMBER',
            recipientId: payload.memberId,
            type: 'PT_SESSION_CANCELLED',
            category: 'TRAINING',
            title: 'PT Session Cancelled',
            body: `Your training session scheduled for ${new Date(payload.sessionDate).toLocaleDateString()} was cancelled (${payload.reason || 'No reason provided'}).`,
            priority: 'HIGH',
            payload: { sessionId: aggregateId },
          });
        }
        break;
      }
    }

    return list;
  }
}

export const notificationEngine = new NotificationEngine();
export default notificationEngine;
