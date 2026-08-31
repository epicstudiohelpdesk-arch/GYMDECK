/**
 * GymDeck Cloud Database Schema - Gym Tenants
 */

import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';

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

export type Gym = typeof gyms.$inferSelect;
export type NewGym = typeof gyms.$inferInsert;
