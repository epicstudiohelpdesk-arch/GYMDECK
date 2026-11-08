/**
 * GymDeck Cloud Database Schema - Owner Communication Settings & Assisted Broadcasts (Mode A)
 *
 * Privacy-by-design:
 *  - Broadcast message bodies are NEVER persisted (only SHA-256 digest + length).
 *  - Recipient contacts are stored masked for auditability.
 *  - Raw phone/email is resolved per request from the tenant-scoped member record.
 */

import {
  pgTable, uuid, varchar, boolean, integer, timestamp, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { gyms } from './gyms';

export const gymCommunicationSettings = pgTable('gym_communication_settings', {
  gymId: uuid('gym_id').primaryKey().references(() => gyms.id, { onDelete: 'cascade' }),
  primaryPhone: varchar('primary_phone', { length: 32 }),
  whatsappNumber: varchar('whatsapp_number', { length: 32 }),
  officialEmail: varchar('official_email', { length: 255 }),
  mobileForMembers: boolean('mobile_for_members').notNull().default(true),
  mobileSmsAllowed: boolean('mobile_sms_allowed').notNull().default(true),
  mobileCallsAllowed: boolean('mobile_calls_allowed').notNull().default(true),
  mobilePromosAllowed: boolean('mobile_promos_allowed').notNull().default(false),
  whatsappForMembers: boolean('whatsapp_for_members').notNull().default(true),
  whatsappReceiptsAllowed: boolean('whatsapp_receipts_allowed').notNull().default(true),
  whatsappRemindersAllowed: boolean('whatsapp_reminders_allowed').notNull().default(true),
  whatsappSupportAllowed: boolean('whatsapp_support_allowed').notNull().default(true),
  whatsappPromosAllowed: boolean('whatsapp_promos_allowed').notNull().default(false),
  emailForMembers: boolean('email_for_members').notNull().default(true),
  emailInvoicesAllowed: boolean('email_invoices_allowed').notNull().default(true),
  emailAlertsAllowed: boolean('email_alerts_allowed').notNull().default(true),
  emailNewsletterAllowed: boolean('email_newsletter_allowed').notNull().default(false),
  quietHoursStart: varchar('quiet_hours_start', { length: 5 }).notNull().default('22:00'),
  quietHoursEnd: varchar('quiet_hours_end', { length: 5 }).notNull().default('06:00'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const communicationBroadcasts = pgTable(
  'communication_broadcasts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id'),
    channel: varchar('channel', { length: 16 }).notNull(), // WHATSAPP | EMAIL
    messageKind: varchar('message_kind', { length: 24 }).notNull(), // TRANSACTIONAL | ANNOUNCEMENT | PROMOTIONAL
    subject: varchar('subject', { length: 200 }),
    bodySha256: varchar('body_sha256', { length: 64 }).notNull(),
    bodyLength: integer('body_length').notNull(),
    recipientCount: integer('recipient_count').notNull().default(0),
    queuedCount: integer('queued_count').notNull().default(0),
    sentCount: integer('sent_count').notNull().default(0),
    failedCount: integer('failed_count').notNull().default(0),
    skippedCount: integer('skipped_count').notNull().default(0),
    status: varchar('status', { length: 24 }).notNull().default('QUEUED'), // QUEUED | COMPLETED | CANCELLED
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymCreatedIdx: index('idx_comm_broadcasts_gym_created').on(table.gymId, table.createdAt),
    retentionIdx: index('idx_comm_broadcasts_expires').on(table.expiresAt),
  })
);

export const communicationBroadcastRecipients = pgTable(
  'communication_broadcast_recipients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    broadcastId: uuid('broadcast_id').notNull().references(() => communicationBroadcasts.id, { onDelete: 'cascade' }),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id').notNull(),
    channel: varchar('channel', { length: 16 }).notNull(), // WHATSAPP | EMAIL
    contactMasked: varchar('contact_masked', { length: 64 }),
    status: varchar('status', { length: 16 }).notNull().default('QUEUED'), // QUEUED | SENT | FAILED | SKIPPED
    skipReason: varchar('skip_reason', { length: 64 }), // NO_CONTACT | NO_CONSENT | DUPLICATE
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    broadcastIdx: index('idx_comm_recipients_broadcast').on(table.broadcastId, table.status),
    uniqueRecipientIdx: uniqueIndex('idx_comm_recipients_unique').on(table.broadcastId, table.memberId, table.channel),
  })
);

export type GymCommunicationSettings = typeof gymCommunicationSettings.$inferSelect;
export type NewGymCommunicationSettings = typeof gymCommunicationSettings.$inferInsert;
export type CommunicationBroadcast = typeof communicationBroadcasts.$inferSelect;
export type NewCommunicationBroadcast = typeof communicationBroadcasts.$inferInsert;
export type CommunicationBroadcastRecipient = typeof communicationBroadcastRecipients.$inferSelect;
export type NewCommunicationBroadcastRecipient = typeof communicationBroadcastRecipients.$inferInsert;
