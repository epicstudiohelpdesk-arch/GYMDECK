/**
 * GymDeck Cloud Database Schema - Notification Feed & Broadcasts
 */

import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { gyms } from './gyms';
import { gymMembers } from './members';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    category: varchar('category', { length: 64 }).notNull().default('GENERAL'), // WORKOUT, TRAINER, MEMBERSHIP, ANNOUNCEMENT, SYSTEM
    targetScope: varchar('target_scope', { length: 32 }).notNull().default('ALL'), // ALL, MEMBERS, STAFF, INDIVIDUAL
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymNotifsIdx: index('idx_notifications_gym').on(table.gymId, table.createdAt),
  })
);

export const memberNotificationRecipients = pgTable(
  'member_notification_recipients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notifications.id, { onDelete: 'cascade' }),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    memberUnreadIdx: index('idx_notif_recipients_unread').on(table.gymId, table.memberId, table.isRead),
    notifMemberIdx: index('idx_notif_recipients_notif_mem').on(table.notificationId, table.memberId),
  })
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type MemberNotificationRecipient = typeof memberNotificationRecipients.$inferSelect;
export type NewMemberNotificationRecipient = typeof memberNotificationRecipients.$inferInsert;
