/**
 * GymDeck Cloud Database Schema - Synchronization & Outbox Subsystem
 *
 * Implements authoritative change logging, global idempotency tracking,
 * and durable server sequence cursors for Desktop <-> Cloud sync.
 */

import { pgTable, uuid, varchar, text, jsonb, timestamp, bigint, bigserial, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { gyms } from './gyms';

/**
 * 1. Global Sync Change Log (Monotonically Increasing Server Sequence Stream)
 */
export const syncChangeLog = pgTable(
  'sync_change_log',
  {
    serverSequence: bigserial('server_sequence', { mode: 'number' }).primaryKey(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id').notNull(), // Client-originated or server-originated event UUID
    entityType: varchar('entity_type', { length: 64 }).notNull(), // gym_member, membership_plan, attendance, payment, etc.
    entityId: uuid('entity_id').notNull(),
    operation: varchar('operation', { length: 32 }).notNull(), // CREATE, UPDATE, DELETE, VOID
    payload: jsonb('payload').notNull(),
    sourceDevice: varchar('source_device', { length: 128 }).notNull().default('DESKTOP'),
    actorUserId: uuid('actor_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymSeqIdx: index('idx_sync_change_log_gym_seq').on(table.gymId, table.serverSequence),
    eventIdIdx: uniqueIndex('idx_sync_change_log_event_id').on(table.gymId, table.eventId),
  })
);

/**
 * 2. Sync Idempotency Log (Deduplication & Replay Defense)
 */
export const syncIdempotencyLog = pgTable(
  'sync_idempotency_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id').notNull(),
    entityType: varchar('entity_type', { length: 64 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    operation: varchar('operation', { length: 32 }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
    serverSequence: bigint('server_sequence', { mode: 'number' }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('APPLIED'), // APPLIED, REJECTED, CONFLICT_RESOLVED
    responseSummary: text('response_summary'),
  },
  (table) => ({
    gymEventIdx: uniqueIndex('idx_sync_idempotency_gym_event').on(table.gymId, table.eventId),
  })
);

/**
 * 3. Sync Device Cursors (Tracks last acknowledged sequence per registered device)
 */
export const syncDeviceCursors = pgTable(
  'sync_device_cursors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    deviceId: varchar('device_id', { length: 128 }).notNull(),
    lastAcknowledgedSequence: bigint('last_acknowledged_sequence', { mode: 'number' }).notNull().default(0),
    deviceType: varchar('device_type', { length: 32 }).notNull().default('DESKTOP'), // DESKTOP, OWNER_MOBILE, MEMBER_MOBILE
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }).notNull().defaultNow(),
    appVersion: varchar('app_version', { length: 32 }).notNull().default('1.0.0'),
  },
  (table) => ({
    gymDeviceIdx: uniqueIndex('idx_sync_cursors_gym_device').on(table.gymId, table.deviceId),
  })
);

export type SyncChangeRecord = typeof syncChangeLog.$inferSelect;
export type NewSyncChangeRecord = typeof syncChangeLog.$inferInsert;
export type SyncIdempotencyRecord = typeof syncIdempotencyLog.$inferSelect;
export type SyncDeviceCursor = typeof syncDeviceCursors.$inferSelect;
