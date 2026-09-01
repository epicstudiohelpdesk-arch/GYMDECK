/**
 * GymDeck Cloud Database Schema - Payments & Financial Records
 */

import { pgTable, uuid, varchar, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { gyms } from './gyms';
import { gymMembers } from './members';

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: varchar('payment_method', { length: 32 }).notNull().default('CASH'), // CASH, CARD, UPI, BANK_TRANSFER
    transactionReference: varchar('transaction_reference', { length: 128 }),
    status: varchar('status', { length: 32 }).notNull().default('COMPLETED'), // COMPLETED, PENDING, REFUNDED, VOID
    notes: text('notes'),
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymMemberPaymentsIdx: index('idx_payments_gym_member').on(table.gymId, table.memberId),
    gymPaidAtIdx: index('idx_payments_gym_date').on(table.gymId, table.paidAt),
  })
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
