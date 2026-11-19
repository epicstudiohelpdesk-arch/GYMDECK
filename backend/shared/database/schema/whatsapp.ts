/**
 * GymDeck Cloud Database Schema - Multi-Tenant WhatsApp (OpenWA)
 *
 * Every row is scoped to a gym tenant. A gym's linked account is identified by
 * its OpenWA session id; OpenWA credentials live only in the sidecar.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { gyms } from './gyms';

export const gymWhatsAppAccounts = pgTable(
  'gym_whatsapp_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 16 }).notNull().default('OPENWA'),
    openwaSessionId: varchar('openwa_session_id', { length: 64 }),
    openwaSessionName: varchar('openwa_session_name', { length: 100 }),
    openwaWebhookId: varchar('openwa_webhook_id', { length: 64 }),
    openwaStatus: varchar('openwa_status', { length: 32 }),
    wabaId: varchar('waba_id', { length: 64 }),
    phoneNumberId: varchar('phone_number_id', { length: 64 }),
    businessPhoneNumber: varchar('business_phone_number', { length: 32 }),
    displayName: varchar('display_name', { length: 255 }),
    metaBusinessId: varchar('meta_business_id', { length: 64 }),
    connectionStatus: varchar('connection_status', { length: 32 })
      .notNull()
      .default('NOT_CONNECTED'),
    statusReason: text('status_reason'),
    tokenReference: uuid('token_reference'),
    tokenExpiry: timestamp('token_expiry', { withTimezone: true }),
    accountQualityStatus: varchar('account_quality_status', { length: 32 }),
    webhookSubscribed: boolean('webhook_subscribed').notNull().default(false),
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
    connectedAt: timestamp('connected_at', { withTimezone: true }),
    disconnectedAt: timestamp('disconnected_at', { withTimezone: true }),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymUniqueIdx: uniqueIndex('idx_gym_whatsapp_accounts_gym').on(table.gymId),
    phoneNumberIdx: index('idx_gym_whatsapp_accounts_phone_number').on(table.phoneNumberId),
    wabaIdx: index('idx_gym_whatsapp_accounts_waba').on(table.wabaId),
    statusIdx: index('idx_gym_whatsapp_accounts_status').on(table.connectionStatus),
  })
);

/**
 * Encrypted credential store. Only the messaging service role may read this
 * table. The frontend never receives any value from it.
 */
export const whatsappCredentialVault = pgTable(
  'whatsapp_credential_vault',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => gymWhatsAppAccounts.id, { onDelete: 'cascade' }),
    ciphertext: text('ciphertext').notNull(),
    keyVersion: varchar('key_version', { length: 16 }).notNull().default('v1'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountIdx: index('idx_whatsapp_vault_account').on(table.accountId),
    gymIdx: index('idx_whatsapp_vault_gym').on(table.gymId),
  })
);

/**
 * Embedded Signup OAuth state. The state value itself is never persisted;
 * only its SHA-256 hash, which makes replay / CSRF guessing useless even if
 * the table is read.
 */
export const whatsappSignupSessions = pgTable(
  'whatsapp_signup_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id'),
    stateHash: varchar('state_hash', { length: 64 }).notNull(),
    requestedPhoneNumber: varchar('requested_phone_number', { length: 32 }),
    status: varchar('status', { length: 24 }).notNull().default('PENDING'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    stateIdx: uniqueIndex('idx_whatsapp_signup_state').on(table.stateHash),
    gymIdx: index('idx_whatsapp_signup_gym').on(table.gymId, table.createdAt),
  })
);

export const gymWhatsAppTemplates = pgTable(
  'gym_whatsapp_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    metaTemplateId: varchar('meta_template_id', { length: 64 }),
    templateName: varchar('template_name', { length: 128 }).notNull(),
    category: varchar('category', { length: 32 }).notNull().default('UTILITY'),
    language: varchar('language', { length: 16 }).notNull().default('en'),
    approvalStatus: varchar('approval_status', { length: 32 })
      .notNull()
      .default('NOT_SUBMITTED'),
    templateComponents: text('template_components'),
    variableKeys: text('variable_keys'),
    rejectionReason: text('rejection_reason'),
    templateVersion: integer('template_version').notNull().default(1),
    isBuiltin: boolean('is_builtin').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymNameUniqueIdx: uniqueIndex('idx_gym_whatsapp_templates_gym_name').on(
      table.gymId,
      table.templateName,
      table.language
    ),
    gymStatusIdx: index('idx_gym_whatsapp_templates_gym_status').on(
      table.gymId,
      table.approvalStatus
    ),
    metaTemplateIdx: index('idx_gym_whatsapp_templates_meta').on(table.metaTemplateId),
  })
);

export const whatsappMessageJobs = pgTable(
  'whatsapp_message_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    batchId: uuid('batch_id'),
    memberId: uuid('member_id'),
    senderAccountId: uuid('sender_account_id')
      .notNull()
      .references(() => gymWhatsAppAccounts.id, { onDelete: 'restrict' }),
    recipientNumber: varchar('recipient_number', { length: 32 }).notNull(),
    recipientName: varchar('recipient_name', { length: 255 }),
    messageType: varchar('message_type', { length: 24 }).notNull(), // TEXT | TEMPLATE
    environment: varchar('environment', { length: 16 }).notNull().default('PRODUCTION'), // PRODUCTION | DEVELOPMENT
    templateId: uuid('template_id').references(() => gymWhatsAppTemplates.id, {
      onDelete: 'set null',
    }),
    messagePayload: text('message_payload').notNull(),
    renderedPreview: text('rendered_preview'),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
    dedupeKey: varchar('dedupe_key', { length: 160 }),
    metaMessageId: varchar('meta_message_id', { length: 128 }),
    deliveryStatus: varchar('delivery_status', { length: 24 }).notNull().default('QUEUED'),
    failureCode: varchar('failure_code', { length: 64 }),
    failureReason: text('failure_reason'),
    attemptCount: integer('attempt_count').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    processingLeaseExpiresAt: timestamp('processing_lease_expires_at', { withTimezone: true }),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymCreatedIdx: index('idx_whatsapp_jobs_gym_created').on(table.gymId, table.createdAt),
    gymStatusIdx: index('idx_whatsapp_jobs_gym_status').on(table.gymId, table.deliveryStatus),
    memberIdx: index('idx_whatsapp_jobs_member').on(table.gymId, table.memberId),
    senderIdx: index('idx_whatsapp_jobs_sender').on(table.senderAccountId),
    dueIdx: index('idx_whatsapp_jobs_due').on(
      table.deliveryStatus,
      table.nextAttemptAt,
      table.scheduledAt
    ),
    metaMessageIdx: index('idx_whatsapp_jobs_meta_message').on(table.metaMessageId),
    idempotencyUniqueIdx: uniqueIndex('idx_whatsapp_jobs_idempotency').on(
      table.gymId,
      table.idempotencyKey
    ),
    dedupeUniqueIdx: uniqueIndex('idx_whatsapp_jobs_dedupe').on(table.gymId, table.dedupeKey),
    batchIdx: index('idx_whatsapp_jobs_batch').on(table.batchId),
  })
);

export const whatsappCustomerWindows = pgTable(
  'whatsapp_customer_windows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id').notNull(),
    senderAccountId: uuid('sender_account_id')
      .notNull()
      .references(() => gymWhatsAppAccounts.id, { onDelete: 'cascade' }),
    lastInboundMessageAt: timestamp('last_inbound_message_at', { withTimezone: true }).notNull(),
    serviceWindowExpiresAt: timestamp('service_window_expires_at', {
      withTimezone: true,
    }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    memberWindowUniqueIdx: uniqueIndex('idx_whatsapp_windows_member').on(
      table.gymId,
      table.memberId,
      table.senderAccountId
    ),
    expiryIdx: index('idx_whatsapp_windows_expiry').on(table.gymId, table.serviceWindowExpiresAt),
  })
);

export const whatsappMessageConsents = pgTable(
  'whatsapp_message_consents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id').notNull(),
    consentStatus: varchar('consent_status', { length: 24 }).notNull().default('PENDING'),
    consentSource: varchar('consent_source', { length: 64 }).notNull().default('REGISTRATION'),
    consentTimestamp: timestamp('consent_timestamp', { withTimezone: true }),
    withdrawalTimestamp: timestamp('withdrawal_timestamp', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    memberConsentUniqueIdx: uniqueIndex('idx_whatsapp_consents_member').on(
      table.gymId,
      table.memberId
    ),
    statusIdx: index('idx_whatsapp_consents_status').on(table.gymId, table.consentStatus),
  })
);

export const whatsappConsentHistory = pgTable(
  'whatsapp_consent_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id').notNull(),
    consentStatus: varchar('consent_status', { length: 24 }).notNull(),
    consentSource: varchar('consent_source', { length: 64 }).notNull(),
    actorUserId: uuid('actor_user_id'),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    memberHistoryIdx: index('idx_whatsapp_consent_history_member').on(
      table.gymId,
      table.memberId,
      table.recordedAt
    ),
  })
);

export const whatsappWebhookEvents = pgTable(
  'whatsapp_webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    providerEventId: varchar('provider_event_id', { length: 255 }).notNull(),
    senderAccountId: uuid('sender_account_id'),
    gymId: uuid('gym_id'),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    processingStatus: varchar('processing_status', { length: 24 })
      .notNull()
      .default('RECEIVED'),
    payloadHash: varchar('payload_hash', { length: 64 }),
    payload: text('payload'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (table) => ({
    providerEventUniqueIdx: uniqueIndex('idx_whatsapp_webhook_events_provider').on(
      table.providerEventId
    ),
    accountIdx: index('idx_whatsapp_webhook_events_account').on(table.senderAccountId),
    statusIdx: index('idx_whatsapp_webhook_events_status').on(table.processingStatus),
  })
);

export const whatsappInboundMessages = pgTable(
  'whatsapp_inbound_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    senderAccountId: uuid('sender_account_id')
      .notNull()
      .references(() => gymWhatsAppAccounts.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id'),
    waFrom: varchar('wa_from', { length: 32 }).notNull(),
    messageType: varchar('message_type', { length: 32 }).notNull().default('text'),
    bodyPreview: varchar('body_preview', { length: 500 }),
    isOptOut: boolean('is_opt_out').notNull().default(false),
    providerMessageId: varchar('provider_message_id', { length: 128 }),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymReceivedIdx: index('idx_whatsapp_inbound_gym_received').on(table.gymId, table.receivedAt),
    fromIdx: index('idx_whatsapp_inbound_from').on(table.gymId, table.waFrom),
    providerMessageIdx: uniqueIndex('idx_whatsapp_inbound_provider_message')
      .on(table.gymId, table.providerMessageId)
      .where(sql`${table.providerMessageId} IS NOT NULL`),
  })
);

export const whatsappAuditLogs = pgTable(
  'whatsapp_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id'),
    action: varchar('action', { length: 64 }).notNull(),
    targetId: varchar('target_id', { length: 128 }),
    metadata: text('metadata'),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymTimestampIdx: index('idx_whatsapp_audit_gym_timestamp').on(table.gymId, table.timestamp),
    actionIdx: index('idx_whatsapp_audit_action').on(table.gymId, table.action),
  })
);

export const whatsappAutomationRules = pgTable(
  'whatsapp_automation_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    ruleType: varchar('rule_type', { length: 64 }).notNull(),
    offsetDays: integer('offset_days').notNull().default(0),
    sendTime: varchar('send_time', { length: 5 }).notNull().default('10:00'),
    isEnabled: boolean('is_enabled').notNull().default(false),
    templateId: uuid('template_id').references(() => gymWhatsAppTemplates.id, {
      onDelete: 'set null',
    }),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ruleUniqueIdx: uniqueIndex('idx_whatsapp_automation_rule').on(
      table.gymId,
      table.ruleType,
      table.offsetDays
    ),
  })
);

export type GymWhatsAppAccount = typeof gymWhatsAppAccounts.$inferSelect;
export type NewGymWhatsAppAccount = typeof gymWhatsAppAccounts.$inferInsert;
export type WhatsAppMessageJob = typeof whatsappMessageJobs.$inferSelect;
export type NewWhatsAppMessageJob = typeof whatsappMessageJobs.$inferInsert;
export type GymWhatsAppTemplate = typeof gymWhatsAppTemplates.$inferSelect;
export type WhatsAppConsent = typeof whatsappMessageConsents.$inferSelect;
export type WhatsAppAutomationRule = typeof whatsappAutomationRules.$inferSelect;
