/**
 * GymDeck Cloud Database Schema - Gym Tenants
 */

import { pgTable, uuid, varchar, text, timestamp, index, integer, boolean } from 'drizzle-orm/pg-core';

export const gyms = pgTable(
  'gyms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 32 }).notNull().unique(), // External unique gym handle e.g. "GD-DOWNTOWN"
    status: varchar('status', { length: 32 }).notNull().default('ACTIVE'), // ACTIVE, SUSPENDED, INACTIVE
    ownerUserId: uuid('owner_user_id'),
    address: text('address'),
    contactPhone: varchar('contact_phone', { length: 32 }),
    contactEmail: varchar('contact_email', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: index('idx_gyms_code').on(table.code),
    statusIdx: index('idx_gyms_status').on(table.status),
  })
);

/**
 * Permanent attendance QR pass for a gym facility.
 *
 * Exactly one pass exists per gym, minted when the gym is registered. Members
 * scan the printed/displayed QR with the GymDeck Member App; the embedded
 * `qrToken` is what the cloud resolves back to this gym to record attendance.
 */
export const gymCheckInQr = pgTable(
  'gym_checkin_qr',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .unique()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    checkinCode: varchar('checkin_code', { length: 32 }).notNull().unique(), // Human readable facility code e.g. GD-7K2M9Q
    qrToken: varchar('qr_token', { length: 64 }).notNull().unique(), // Opaque token encoded in the QR
    qrPayload: text('qr_payload').notNull(), // Exact string encoded into the QR image
    version: integer('version').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: index('idx_gym_checkin_qr_code').on(table.checkinCode),
    tokenIdx: index('idx_gym_checkin_qr_token').on(table.qrToken),
  })
);

export type Gym = typeof gyms.$inferSelect;
export type NewGym = typeof gyms.$inferInsert;
export type GymCheckInQr = typeof gymCheckInQr.$inferSelect;
export type NewGymCheckInQr = typeof gymCheckInQr.$inferInsert;
