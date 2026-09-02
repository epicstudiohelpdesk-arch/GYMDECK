/**
 * GymDeck Cloud Database Schema - Payments & Financial Records
 */

import { pgTable, uuid, varchar, text, numeric, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { gyms } from './gyms';
import { gymMembers } from './members';
import { memberMemberships } from './memberships';

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
    membershipId: uuid('membership_id')
      .references(() => memberMemberships.id, { onDelete: 'set null' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    paymentMethod: varchar('payment_method', { length: 32 }).notNull().default('CASH'), // CASH, CARD, UPI, BANK_TRANSFER, OTHER
    transactionReference: varchar('transaction_reference', { length: 128 }),
    receiptNumber: varchar('receipt_number', { length: 64 }),
    idempotencyKey: varchar('idempotency_key', { length: 128 }),
    type: varchar('type', { length: 32 }).notNull().default('PAYMENT'), // PAYMENT, REFUND, ADJUSTMENT
    status: varchar('status', { length: 32 }).notNull().default('COMPLETED'), // COMPLETED, PENDING, REFUNDED, VOID
    notes: text('notes'),
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymMemberPaymentsIdx: index('idx_payments_gym_member').on(table.gymId, table.memberId),
    gymPaidAtIdx: index('idx_payments_gym_date').on(table.gymId, table.paidAt),
    membershipIdx: index('idx_payments_membership').on(table.gymId, table.membershipId),
    idempotencyIdx: uniqueIndex('idx_payments_gym_idempotency').on(table.gymId, table.idempotencyKey),
    receiptIdx: index('idx_payments_gym_receipt').on(table.gymId, table.receiptNumber),
  })
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
