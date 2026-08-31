/**
 * GymDeck Cloud Database Schema - Personal Trainers, PT Packages & Sessions
 */

import { pgTable, uuid, varchar, text, integer, numeric, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { gyms } from './gyms';
import { gymMembers } from './members';

export const trainers = pgTable(
  'trainers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 32 }).notNull(),
    specialization: varchar('specialization', { length: 255 }),
    experienceYears: integer('experience_years').default(1),
    certifications: text('certifications'), // JSON array string e.g. ["CSCS", "NASM-CPT"]
    bio: text('bio'),
    photoUrl: text('photo_url'),
    rating: numeric('rating', { precision: 3, scale: 2 }).default('5.00'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymTrainersIdx: index('idx_trainers_gym').on(table.gymId, table.isActive),
  })
);

export const ptPackages = pgTable(
  'pt_packages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    trainerId: uuid('trainer_id')
      .notNull()
      .references(() => trainers.id, { onDelete: 'restrict' }),
    packageName: varchar('package_name', { length: 255 }).notNull(),
    totalSessions: integer('total_sessions').notNull(),
    usedSessions: integer('used_sessions').notNull().default(0),
    remainingSessions: integer('remaining_sessions').notNull(),
    expiryDate: timestamp('expiry_date', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('ACTIVE'), // ACTIVE, EXPIRED, DEPLETED
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    memberPtPackagesIdx: index('idx_pt_packages_gym_member').on(table.gymId, table.memberId),
  })
);

export const ptSessions = pgTable(
  'pt_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    packageId: uuid('package_id')
      .notNull()
      .references(() => ptPackages.id, { onDelete: 'cascade' }),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    trainerId: uuid('trainer_id')
      .notNull()
      .references(() => trainers.id, { onDelete: 'restrict' }),
    sessionDate: timestamp('session_date', { withTimezone: true }).notNull(),
    durationMinutes: integer('duration_minutes').notNull().default(60),
    focusArea: varchar('focus_area', { length: 255 }).notNull(),
    trainerNotes: text('trainer_notes'),
    status: varchar('status', { length: 32 }).notNull().default('COMPLETED'), // SCHEDULED, COMPLETED, CANCELLED, NO_SHOW
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    packageSessionsIdx: index('idx_pt_sessions_package').on(table.packageId),
    memberPtSessionsIdx: index('idx_pt_sessions_gym_member').on(table.gymId, table.memberId, table.sessionDate),
  })
);

export type Trainer = typeof trainers.$inferSelect;
export type NewTrainer = typeof trainers.$inferInsert;
export type PTPackage = typeof ptPackages.$inferSelect;
export type NewPTPackage = typeof ptPackages.$inferInsert;
export type PTSession = typeof ptSessions.$inferSelect;
export type NewPTSession = typeof ptSessions.$inferInsert;
