import { pgTable, uuid, varchar, text, boolean, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { gyms } from './gyms';

export const domainEvents = pgTable(
  'domain_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id').notNull().unique(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    aggregateType: varchar('aggregate_type', { length: 64 }).notNull(),
    aggregateId: varchar('aggregate_id', { length: 128 }).notNull(),
    payload: text('payload').notNull(), // JSON string
    actorUserId: uuid('actor_user_id'),
    status: varchar('status', { length: 32 }).notNull().default('PENDING'), // PENDING, PROCESSED, FAILED
    processedAt: timestamp('processed_at', { withTimezone: true }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymStatusIdx: index('idx_domain_events_gym_status').on(table.gymId, table.status, table.occurredAt),
    eventIdIdx: uniqueIndex('idx_domain_events_event_id').on(table.eventId),
  })
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id'),
    recipientType: varchar('recipient_type', { length: 32 }).notNull(), // MEMBER, USER, STAFF, OWNER
    recipientId: uuid('recipient_id').notNull(), // memberId or userId
    type: varchar('type', { length: 64 }).notNull(), // e.g. MEMBERSHIP_EXPIRING, PAYMENT_RECEIVED, ATTENDANCE_CONFIRMATION, PT_SESSION_COMPLETED
    category: varchar('category', { length: 64 }).notNull().default('SYSTEM'), // MEMBERSHIP, BILLING, ATTENDANCE, TRAINING, ANNOUNCEMENT, SECURITY, SYSTEM
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    message: text('message'),
    payload: text('payload'), // JSON string: { entityType, entityId, action, deepLink }
    priority: varchar('priority', { length: 32 }).notNull().default('NORMAL'), // LOW, NORMAL, HIGH, URGENT
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at', { withTimezone: true }),
    isArchived: boolean('is_archived').notNull().default(false),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymRecipientUnreadIdx: index('idx_notifications_gym_recipient_unread').on(
      table.gymId,
      table.recipientId,
      table.isRead,
      table.createdAt
    ),
    gymRecipientTypeIdx: index('idx_notifications_gym_recipient_type').on(
      table.gymId,
      table.recipientType,
      table.recipientId,
      table.createdAt
    ),
    dedupEventIdx: index('idx_notifications_dedup_event').on(table.gymId, table.eventId, table.recipientId),
  })
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    recipientType: varchar('recipient_type', { length: 32 }).notNull(), // MEMBER, USER
    recipientId: uuid('recipient_id').notNull(),
    channel: varchar('channel', { length: 32 }).notNull().default('IN_APP'), // IN_APP, PUSH, WHATSAPP, EMAIL, SMS
    category: varchar('category', { length: 64 }).notNull().default('ALL'), // ALL, MEMBERSHIP, BILLING, ATTENDANCE, TRAINING, ANNOUNCEMENT, SYSTEM
    isEnabled: boolean('is_enabled').notNull().default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    prefRecipientIdx: uniqueIndex('idx_notif_pref_recipient').on(
      table.gymId,
      table.recipientType,
      table.recipientId,
      table.channel,
      table.category
    ),
  })
);

export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notifications.id, { onDelete: 'cascade' }),
    channel: varchar('channel', { length: 32 }).notNull(), // IN_APP, PUSH, WHATSAPP, EMAIL, SMS
    status: varchar('status', { length: 32 }).notNull().default('PENDING'), // PENDING, PROCESSING, DELIVERED, FAILED, RETRYING
    attemptCount: integer('attempt_count').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    providerMessageId: varchar('provider_message_id', { length: 255 }),
    metadata: text('metadata'), // JSON string
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    deliveryQueueIdx: index('idx_notif_deliveries_queue').on(
      table.gymId,
      table.channel,
      table.status,
      table.nextAttemptAt
    ),
    notifDeliveryIdx: index('idx_notif_deliveries_notif').on(table.notificationId),
  })
);

export const devicePushTokens = pgTable(
  'device_push_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    recipientType: varchar('recipient_type', { length: 32 }).notNull(), // MEMBER, USER
    recipientId: uuid('recipient_id').notNull(),
    pushToken: varchar('push_token', { length: 512 }).notNull(),
    platform: varchar('platform', { length: 32 }).notNull().default('ANDROID'), // IOS, ANDROID, WEB
    deviceModel: varchar('device_model', { length: 128 }),
    appVersion: varchar('app_version', { length: 64 }),
    isActive: boolean('is_active').notNull().default(true),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pushTokenRecipientIdx: uniqueIndex('idx_push_tokens_unique').on(
      table.gymId,
      table.recipientId,
      table.pushToken
    ),
    pushTokenLookupIdx: index('idx_push_tokens_recipient').on(
      table.gymId,
      table.recipientType,
      table.recipientId,
      table.isActive
    ),
  })
);

export type DomainEvent = typeof domainEvents.$inferSelect;
export type NewDomainEvent = typeof domainEvents.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type NewNotificationDelivery = typeof notificationDeliveries.$inferInsert;
export type DevicePushToken = typeof devicePushTokens.$inferSelect;
export type NewDevicePushToken = typeof devicePushTokens.$inferInsert;
