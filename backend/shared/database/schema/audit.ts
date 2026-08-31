/**
 * GymDeck Cloud Database Schema - Audit Logs
 */

import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { gyms } from './gyms';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id').references(() => gyms.id, { onDelete: 'set null' }),
    memberId: uuid('member_id'),
    actorType: varchar('actor_type', { length: 32 }).notNull().default('MEMBER'), // MEMBER, STAFF, SYSTEM
    action: varchar('action', { length: 128 }).notNull(),
    resource: varchar('resource', { length: 128 }).notNull(),
    resourceId: varchar('resource_id', { length: 128 }),
    requestId: varchar('request_id', { length: 128 }),
    metadata: text('metadata'), // JSON string, with secrets strictly redacted
    ipAddress: varchar('ip_address', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymAuditIdx: index('idx_audit_logs_gym').on(table.gymId, table.createdAt),
    resourceIdx: index('idx_audit_logs_resource').on(table.resource, table.resourceId),
  })
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
