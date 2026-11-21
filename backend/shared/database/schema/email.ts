/**
 * GymDeck Cloud Database Schema - Email Communication System
 *
 * Production multi-tenant email data models:
 *  - emailMessages: parent broadcast / communication records
 *  - emailRecipients: individual recipient statuses & delivery mapping
 *  - emailOutbox: persistent durable delivery queue
 *  - emailMonthlyUsage: monthly quota tracking & reservation (300/gym/month)
 *  - emailSuppressions: hard bounces, complaints, unsubscribes
 *  - emailTemplates: reusable templates with variables
 *  - emailDeliveryEvents: webhook telemetry log
 */

import {
  pgTable, uuid, varchar, text, integer, timestamp, jsonb, index, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { gyms } from './gyms';
import { gymMembers } from './members';

export const emailMessages = pgTable(
  'email_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    createdByUserId: uuid('created_by_user_id'),
    subject: varchar('subject', { length: 255 }).notNull(),
    bodyHtml: text('body_html').notNull(),
    bodyText: text('body_text'),
    senderDisplayName: varchar('sender_display_name', { length: 120 }),
    fromAddress: varchar('from_address', { length: 255 }).notNull(),
    replyToAddress: varchar('reply_to_address', { length: 255 }),
    status: varchar('status', { length: 32 }).notNull().default('QUEUED'), // DRAFT | QUEUED | SENDING | COMPLETED | FAILED | CANCELLED
    idempotencyKey: varchar('idempotency_key', { length: 128 }),
    recipientCount: integer('recipient_count').notNull().default(0),
    deliveredCount: integer('delivered_count').notNull().default(0),
    bouncedCount: integer('bounced_count').notNull().default(0),
    failedCount: integer('failed_count').notNull().default(0),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    queuedAt: timestamp('queued_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    idempotencyIdx: uniqueIndex('idx_email_messages_idempotency')
      .on(table.gymId, table.idempotencyKey),
    gymCreatedIdx: index('idx_email_messages_gym_created').on(table.gymId, table.createdAt),
    statusIdx: index('idx_email_messages_status').on(table.status),
  })
);

export const emailRecipients = pgTable(
  'email_recipients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    emailMessageId: uuid('email_message_id').notNull().references(() => emailMessages.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id').references(() => gymMembers.id, { onDelete: 'set null' }),
    recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
    recipientName: varchar('recipient_name', { length: 255 }),
    deliveryStatus: varchar('delivery_status', { length: 32 }).notNull().default('QUEUED'), // QUEUED | SENT | DELIVERED | BOUNCED | FAILED | SUPPRESSED
    providerMessageId: varchar('provider_message_id', { length: 128 }),
    providerInstanceId: varchar('provider_instance_id', { length: 128 }).default('default'),
    providerToken: varchar('provider_token', { length: 128 }),
    attempts: integer('attempts').notNull().default(0),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    bouncedAt: timestamp('bounced_at', { withTimezone: true }),
    failureCode: varchar('failure_code', { length: 64 }),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    messageIdx: index('idx_email_recipients_message').on(table.emailMessageId),
    gymMemberIdx: index('idx_email_recipients_gym_member').on(table.gymId, table.memberId),
    providerMsgIdx: index('idx_email_recipients_provider_msg').on(table.providerMessageId),
    emailIdx: index('idx_email_recipients_email').on(table.recipientEmail),
  })
);

export const emailOutbox = pgTable(
  'email_outbox',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    emailMessageId: uuid('email_message_id').notNull().references(() => emailMessages.id, { onDelete: 'cascade' }),
    jobStatus: varchar('job_status', { length: 32 }).notNull().default('PENDING'), // PENDING | PROCESSING | COMPLETED | FAILED | RECONCILIATION_REQUIRED
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lockedBy: varchar('locked_by', { length: 64 }),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
    currentAttemptId: uuid('current_attempt_id'),
    lastError: text('last_error'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    queueIdx: index('idx_email_outbox_queue').on(table.jobStatus, table.nextAttemptAt),
    leaseIdx: index('idx_email_outbox_lease').on(table.jobStatus, table.leaseExpiresAt),
  })
);

export const emailDispatchAttempts = pgTable(
  'email_dispatch_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    emailMessageId: uuid('email_message_id').notNull().references(() => emailMessages.id, { onDelete: 'cascade' }),
    outboxId: uuid('outbox_id').notNull().references(() => emailOutbox.id, { onDelete: 'cascade' }),
    attemptNumber: integer('attempt_number').notNull().default(1),
    attemptStatus: varchar('attempt_status', { length: 48 }).notNull().default('PREPARED'), // PREPARED | DISPATCHING | ACCEPTED | REJECTED | UNKNOWN_OUTCOME | RECONCILIATION_REQUIRED | FAILED_PERMANENT
    provider: varchar('provider', { length: 32 }).notNull().default('POSTAL'),
    providerInstanceId: varchar('provider_instance_id', { length: 128 }).default('default'),
    providerMessageId: varchar('provider_message_id', { length: 128 }),
    recipientCount: integer('recipient_count').notNull().default(0),
    recipientBatchIds: jsonb('recipient_batch_ids'), // Array of recipient UUIDs in this attempt
    workerId: varchar('worker_id', { length: 64 }).notNull(),
    requestStartedAt: timestamp('request_started_at', { withTimezone: true }),
    requestCompletedAt: timestamp('request_completed_at', { withTimezone: true }),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
    httpStatus: integer('http_status'),
    providerResponse: jsonb('provider_response'),
    errorCode: varchar('error_code', { length: 64 }),
    errorMessage: text('error_message'),
    reconciliationNotes: text('reconciliation_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqOutboxAttempt: uniqueIndex('uq_email_dispatch_attempt_num').on(table.outboxId, table.attemptNumber),
    statusLeaseIdx: index('idx_dispatch_attempts_status').on(table.attemptStatus, table.leaseExpiresAt),
    providerMsgIdx: index('idx_dispatch_attempts_provider_msg').on(table.providerMessageId),
    gymMsgIdx: index('idx_dispatch_attempts_gym_msg').on(table.gymId, table.emailMessageId),
  })
);

export const emailMonthlyUsage = pgTable(
  'email_monthly_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    billingPeriod: varchar('billing_period', { length: 10 }).notNull(), // 'YYYY-MM'
    allocatedQuota: integer('allocated_quota').notNull().default(300),
    reservedCount: integer('reserved_count').notNull().default(0),
    consumedCount: integer('consumed_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqGymPeriod: uniqueIndex('uq_gym_billing_period').on(table.gymId, table.billingPeriod),
  })
);

export const emailSuppressions = pgTable(
  'email_suppressions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').references(() => gyms.id, { onDelete: 'cascade' }),
    emailAddress: varchar('email_address', { length: 255 }).notNull(),
    suppressionReason: varchar('suppression_reason', { length: 64 }).notNull(), // HARD_BOUNCE | COMPLAINT | UNSUBSCRIBE | ADMIN_MANUAL
    source: varchar('source', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    lookupIdx: index('idx_email_suppressions_lookup').on(table.emailAddress),
  })
);

export const emailTemplates = pgTable(
  'email_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    bodyHtml: text('body_html').notNull(),
    bodyText: text('body_text'),
    category: varchar('category', { length: 64 }).notNull().default('GENERAL'),
    createdByUserId: uuid('created_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymIdx: index('idx_email_templates_gym').on(table.gymId, table.createdAt),
  })
);

export const emailDeliveryEvents = pgTable(
  'email_delivery_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').notNull().references(() => gyms.id, { onDelete: 'cascade' }),
    emailMessageId: uuid('email_message_id').notNull().references(() => emailMessages.id, { onDelete: 'cascade' }),
    emailRecipientId: uuid('email_recipient_id').references(() => emailRecipients.id, { onDelete: 'set null' }),
    providerEventId: varchar('provider_event_id', { length: 128 }).notNull(),
    providerInstanceId: varchar('provider_instance_id', { length: 128 }).default('default'),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    eventTimestamp: timestamp('event_timestamp', { withTimezone: true }).notNull(),
    details: text('details'),
    rawPayload: jsonb('raw_payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqEventId: uniqueIndex('uq_provider_event_id').on(table.providerEventId),
    msgIdx: index('idx_email_events_message').on(table.emailMessageId),
  })
);

export const emailWebhookQuarantine = pgTable(
  'email_webhook_quarantine',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: varchar('event_type', { length: 64 }),
    rawPayload: jsonb('raw_payload'),
    quarantineReason: text('quarantine_reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdIdx: index('idx_email_webhook_quarantine_created').on(table.createdAt),
  })
);
