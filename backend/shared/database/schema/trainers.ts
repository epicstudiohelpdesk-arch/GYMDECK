/**
 * GymDeck Cloud Database Schema - Personal Trainers, Assignments, PT Packages, Sessions & Earnings
 */

import { pgTable, uuid, varchar, text, integer, numeric, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { gyms } from './gyms';
import { users } from './auth';
import { gymMembers } from './members';
import { payments } from './payments';

export const trainers = pgTable(
  'trainers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 32 }).notNull(),
    specialization: varchar('specialization', { length: 255 }),
    experienceYears: integer('experience_years').default(1),
    certifications: text('certifications'), // JSON array string e.g. ["CSCS", "NASM-CPT"]
    bio: text('bio'),
    photoUrl: text('photo_url'),
    rating: numeric('rating', { precision: 3, scale: 2 }).default('5.00'),
    commissionType: varchar('commission_type', { length: 32 }).notNull().default('FIXED_PER_SESSION'), // FIXED_PER_SESSION, PERCENTAGE
    commissionRate: numeric('commission_rate', { precision: 10, scale: 2 }).notNull().default('0.00'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    gymTrainersIdx: index('idx_trainers_gym').on(table.gymId, table.isActive),
    gymPhoneIdx: index('idx_trainers_gym_phone').on(table.gymId, table.phone),
  })
);

export const trainerAssignments = pgTable(
  'trainer_assignments',
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
      .references(() => trainers.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    status: varchar('status', { length: 32 }).notNull().default('ACTIVE'), // ACTIVE, ENDED
    notes: text('notes'),
    assignedByUserId: uuid('assigned_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    memberTrainerIdx: index('idx_trainer_assignments_gym_member').on(table.gymId, table.memberId, table.status),
    trainerMemberIdx: index('idx_trainer_assignments_gym_trainer').on(table.gymId, table.trainerId, table.status),
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
    paymentId: uuid('payment_id')
      .references(() => payments.id, { onDelete: 'set null' }),
    packageName: varchar('package_name', { length: 255 }).notNull(),
    totalSessions: integer('total_sessions').notNull(),
    usedSessions: integer('used_sessions').notNull().default(0),
    remainingSessions: integer('remaining_sessions').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0.00'),
    startDate: timestamp('start_date', { withTimezone: true }).notNull().defaultNow(),
    expiryDate: timestamp('expiry_date', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('ACTIVE'), // ACTIVE, EXPIRED, DEPLETED
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    memberPtPackagesIdx: index('idx_pt_packages_gym_member').on(table.gymId, table.memberId),
    trainerPtPackagesIdx: index('idx_pt_packages_gym_trainer').on(table.gymId, table.trainerId),
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
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    durationMinutes: integer('duration_minutes').notNull().default(60),
    focusArea: varchar('focus_area', { length: 255 }).notNull(),
    trainerNotes: text('trainer_notes'),
    status: varchar('status', { length: 32 }).notNull().default('COMPLETED'), // SCHEDULED, COMPLETED, CANCELLED, NO_SHOW
    recordedByUserId: uuid('recorded_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    packageSessionsIdx: index('idx_pt_sessions_package').on(table.packageId),
    memberPtSessionsIdx: index('idx_pt_sessions_gym_member').on(table.gymId, table.memberId, table.sessionDate),
    trainerPtSessionsIdx: index('idx_pt_sessions_gym_trainer').on(table.gymId, table.trainerId, table.sessionDate),
  })
);

export const trainerEarnings = pgTable(
  'trainer_earnings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    trainerId: uuid('trainer_id')
      .notNull()
      .references(() => trainers.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .references(() => ptSessions.id, { onDelete: 'set null' }),
    packageId: uuid('package_id')
      .references(() => ptPackages.id, { onDelete: 'set null' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    earningBasis: varchar('earning_basis', { length: 32 }).notNull().default('PER_SESSION'), // PER_SESSION, PERCENTAGE_COMMISSION, FIXED_PACKAGE
    rateApplied: numeric('rate_applied', { precision: 10, scale: 2 }).notNull().default('0.00'),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
    status: varchar('status', { length: 32 }).notNull().default('ACCRUED'), // ACCRUED, PAID, VOIDED
    period: varchar('period', { length: 32 }).notNull(), // e.g. "2026-09"
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    trainerEarningsIdx: index('idx_trainer_earnings_gym_trainer').on(table.gymId, table.trainerId, table.status),
    periodEarningsIdx: index('idx_trainer_earnings_period').on(table.gymId, table.period),
  })
);

export type Trainer = typeof trainers.$inferSelect;
export type NewTrainer = typeof trainers.$inferInsert;
export type TrainerAssignment = typeof trainerAssignments.$inferSelect;
export type NewTrainerAssignment = typeof trainerAssignments.$inferInsert;
export type PTPackage = typeof ptPackages.$inferSelect;
export type NewPTPackage = typeof ptPackages.$inferInsert;
export type PTSession = typeof ptSessions.$inferSelect;
export type NewPTSession = typeof ptSessions.$inferInsert;
export type TrainerEarning = typeof trainerEarnings.$inferSelect;
export type NewTrainerEarning = typeof trainerEarnings.$inferInsert;
