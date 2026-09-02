/**
 * GymDeck Notification Core - Domain Event & Notification Types Registry
 */

export type RecipientType = 'MEMBER' | 'USER' | 'STAFF' | 'OWNER';

export type NotificationChannel = 'IN_APP' | 'PUSH' | 'WHATSAPP' | 'EMAIL' | 'SMS';

export type NotificationCategory =
  | 'ALL'
  | 'MEMBERSHIP'
  | 'BILLING'
  | 'ATTENDANCE'
  | 'TRAINING'
  | 'ANNOUNCEMENT'
  | 'SECURITY'
  | 'SYSTEM';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type NotificationType =
  | 'MEMBERSHIP_ACTIVATED'
  | 'MEMBERSHIP_RENEWED'
  | 'MEMBERSHIP_EXPIRING'
  | 'MEMBERSHIP_EXPIRED'
  | 'MEMBERSHIP_FROZEN'
  | 'MEMBERSHIP_UNFROZEN'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_DUE'
  | 'ATTENDANCE_CHECKED_IN'
  | 'ATTENDANCE_CHECKED_OUT'
  | 'TRAINER_ASSIGNED'
  | 'TRAINER_UNASSIGNED'
  | 'PT_PACKAGE_PURCHASED'
  | 'PT_SESSION_COMPLETED'
  | 'PT_SESSION_CANCELLED'
  | 'PT_PACKAGE_DEPLETED'
  | 'INVITATION_GENERATED'
  | 'SYSTEM_ALERT';

export type DomainEventType =
  | 'membership.activated'
  | 'membership.renewed'
  | 'membership.expiring'
  | 'membership.expired'
  | 'membership.frozen'
  | 'membership.unfrozen'
  | 'payment.completed'
  | 'payment.refunded'
  | 'attendance.checked_in'
  | 'attendance.checked_out'
  | 'trainer.assigned'
  | 'trainer.unassigned'
  | 'pt_package.purchased'
  | 'pt_session.completed'
  | 'pt_session.cancelled'
  | 'member.invited';

export interface PublishDomainEventInput {
  gymId: string;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, any>;
  actorUserId?: string;
  occurredAt?: Date;
}

export interface NotificationItem {
  id: string;
  gymId: string;
  eventId?: string | null;
  recipientType: RecipientType;
  recipientId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  payload?: Record<string, any> | null;
  priority: NotificationPriority;
  isRead: boolean;
  readAt: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
}

export interface NotificationPreferencesInput {
  category: NotificationCategory;
  channel: NotificationChannel;
  isEnabled: boolean;
}

export interface RegisterPushTokenInput {
  pushToken: string;
  platform: 'IOS' | 'ANDROID' | 'WEB';
  deviceModel?: string;
  appVersion?: string;
}
