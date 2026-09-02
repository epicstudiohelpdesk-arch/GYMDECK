/**
 * GymDeck Cloud Database Schema - Membership Plans & Subscriptions
 */

import { pgTable, uuid, varchar, text, numeric, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { gyms } from './gyms';
import { gymMembers } from './members';

export const membershipPlans = pgTable(
  'membership_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    planName: varchar('plan_name', { length: 255 }).notNull(),
    durationDays: integer('duration_days').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    description: text('description'),
    benefits: text('benefits'), // JSON array string e.g. ["Full gym access", "Sauna", "1 Free PT session"]
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    gymPlansIdx: index('idx_plans_gym').on(table.gymId, table.isActive),
  })
);

export const memberMemberships = pgTable(
  'member_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id')
      .notNull()
      .references(() => membershipPlans.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 32 }).notNull().default('ACTIVE'), // ACTIVE, EXPIRED, FROZEN, CANCELLED
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),
    priceAtPurchase: numeric('price_at_purchase', { precision: 10, scale: 2 }).notNull().default('0.00'),
    autoRenew: boolean('auto_renew').notNull().default(false),
    frozenAt: timestamp('frozen_at', { withTimezone: true }),
    freezeReason: text('freeze_reason'),
    frozenDaysRemaining: integer('frozen_days_remaining'),
    unfrozenAt: timestamp('unfrozen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    memberMembershipIdx: index('idx_member_memberships_gym_mem').on(table.gymId, table.memberId),
    statusIdx: index('idx_member_memberships_status').on(table.memberId, table.status),
    endDateIdx: index('idx_member_memberships_end_date').on(table.gymId, table.endDate),
  })
);

export type MembershipPlan = typeof membershipPlans.$inferSelect;
export type NewMembershipPlan = typeof membershipPlans.$inferInsert;
export type MemberMembership = typeof memberMemberships.$inferSelect;
export type NewMemberMembership = typeof memberMemberships.$inferInsert;
