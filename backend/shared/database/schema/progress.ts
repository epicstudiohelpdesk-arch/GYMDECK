/**
 * GymDeck Cloud Database Schema - Fitness Progress, Measurements & Milestones
 */

import { pgTable, uuid, varchar, text, numeric, date, timestamp, index } from 'drizzle-orm/pg-core';
import { gyms } from './gyms';
import { gymMembers } from './members';

export const bodyWeightLogs = pgTable(
  'body_weight_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    weightKg: numeric('weight_kg', { precision: 5, scale: 2 }).notNull(),
    loggedDate: date('logged_date').notNull(),
    bmi: numeric('bmi', { precision: 4, scale: 1 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    memberWeightDateIdx: index('idx_weight_logs_gym_member_date').on(table.gymId, table.memberId, table.loggedDate),
  })
);

export const bodyMeasurements = pgTable(
  'body_measurements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    measuredDate: date('measured_date').notNull(),
    chestCm: numeric('chest_cm', { precision: 5, scale: 1 }),
    waistCm: numeric('waist_cm', { precision: 5, scale: 1 }),
    armsCm: numeric('arms_cm', { precision: 5, scale: 1 }),
    thighsCm: numeric('thighs_cm', { precision: 5, scale: 1 }),
    hipsCm: numeric('hips_cm', { precision: 5, scale: 1 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    memberMeasureDateIdx: index('idx_measurements_gym_mem_date').on(table.gymId, table.memberId, table.measuredDate),
  })
);

export const fitnessMilestones = pgTable(
  'fitness_milestones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    category: varchar('category', { length: 64 }).notNull(), // STREAK, VOLUME, WEIGHT
    achievedDate: date('achieved_date').notNull(),
    badgeIcon: varchar('badge_icon', { length: 64 }).notNull().default('award'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    memberMilestonesIdx: index('idx_milestones_gym_member').on(table.gymId, table.memberId),
  })
);

export type BodyWeightLog = typeof bodyWeightLogs.$inferSelect;
export type NewBodyWeightLog = typeof bodyWeightLogs.$inferInsert;
export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;
export type NewBodyMeasurement = typeof bodyMeasurements.$inferInsert;
export type FitnessMilestone = typeof fitnessMilestones.$inferSelect;
export type NewFitnessMilestone = typeof fitnessMilestones.$inferInsert;
