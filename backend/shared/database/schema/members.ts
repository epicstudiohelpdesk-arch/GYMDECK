/**
 * GymDeck Cloud Database Schema - Gym Members Identity
 */

import { pgTable, uuid, varchar, text, timestamp, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { gyms } from './gyms';

export const gymMembers = pgTable(
  'gym_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberCode: varchar('member_code', { length: 64 }).notNull(), // e.g. "GD-1001"
    fullName: varchar('full_name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    alternatePhone: varchar('alternate_phone', { length: 32 }),
    email: varchar('email', { length: 255 }),
    gender: varchar('gender', { length: 32 }),
    dob: date('dob'),
    address: text('address'),
    profilePhotoUrl: text('profile_photo_url'),
    membershipStatus: varchar('membership_status', { length: 32 }).notNull().default('ACTIVE'), // ACTIVE, EXPIRED, FROZEN, INACTIVE
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    gymMemberCodeIdx: uniqueIndex('idx_gym_members_gym_code').on(table.gymId, table.memberCode),
    gymIdIdx: index('idx_gym_members_gym').on(table.gymId),
    gymPhoneIdx: index('idx_gym_members_gym_phone').on(table.gymId, table.phone),
    gymEmailIdx: index('idx_gym_members_gym_email').on(table.gymId, table.email),
    statusIdx: index('idx_gym_members_status').on(table.gymId, table.membershipStatus),
  })
);

export type GymMember = typeof gymMembers.$inferSelect;
export type NewGymMember = typeof gymMembers.$inferInsert;
