/**
 * GymDeck Cloud Database Schema - Payments & Financial Records
 * Payments V2: Multi-tenant, integer minor units (paise), zero-custody, immutable ledger.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
  index,
  uniqueIndex,
  boolean,
  bigint,
  integer,
  date,
  jsonb,
} from 'drizzle-orm/pg-core';
import { gyms } from './gyms';
import { gymMembers } from './members';
import { memberMemberships } from './memberships';

// Legacy payments table (preserved for backwards-compatibility)
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
    paymentMethod: varchar('payment_method', { length: 32 }).notNull().default('CASH'),
    transactionReference: varchar('transaction_reference', { length: 128 }),
    receiptNumber: varchar('receipt_number', { length: 64 }),
    idempotencyKey: varchar('idempotency_key', { length: 128 }),
    type: varchar('type', { length: 32 }).notNull().default('PAYMENT'),
    status: varchar('status', { length: 32 }).notNull().default('COMPLETED'),
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

// Payments V2 - Receiving Accounts (Multi-account, AES-256 encrypted at rest)
export const gymPaymentAccounts = pgTable(
  'gym_payment_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    method: varchar('method', { length: 32 }).notNull(), // 'UPI', 'BANK_TRANSFER'
    label: varchar('label', { length: 64 }),
    status: varchar('status', { length: 24 }).notNull().default('UNVERIFIED'),
    isActive: boolean('is_active').notNull().default(true),
    isPrimary: boolean('is_primary').notNull().default(false),
    beneficiaryName: varchar('beneficiary_name', { length: 255 }).notNull(),
    upiVpa: varchar('upi_vpa', { length: 255 }),
    bankName: varchar('bank_name', { length: 128 }),
    accountType: varchar('account_type', { length: 64 }),
    accountNumberEnc: text('account_number_enc'),
    accountNumberLast4: varchar('account_number_last4', { length: 4 }),
    ifscCode: varchar('ifsc_code', { length: 16 }),
    branchName: varchar('branch_name', { length: 255 }),
    branchCity: varchar('branch_city', { length: 128 }),
    qrImageUrl: text('qr_image_url'),
    instructions: text('instructions'),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymActiveIdx: index('idx_gpa_gym_active').on(table.gymId, table.isActive),
  })
);

// Payments V2 - Gym Payment & Tax Policy Preferences
export const gymPaymentSettings = pgTable('gym_payment_settings', {
  gymId: uuid('gym_id')
    .primaryKey()
    .references(() => gyms.id, { onDelete: 'cascade' }),
  allowPartialPayments: boolean('allow_partial_payments').notNull().default(false),
  allowOverpayment: boolean('allow_overpayment').notNull().default(false),
  activateMembershipOnPartial: boolean('activate_membership_on_partial').notNull().default(false),
  invoicePrefix: varchar('invoice_prefix', { length: 16 }).notNull().default('INV'),
  receiptPrefix: varchar('receipt_prefix', { length: 16 }).notNull().default('REC'),
  gstEnabled: boolean('gst_enabled').notNull().default(false),
  gstin: varchar('gstin', { length: 15 }),
  legalBusinessName: varchar('legal_business_name', { length: 255 }),
  placeOfSupply: varchar('place_of_supply', { length: 128 }),
  defaultTaxRateBps: integer('default_tax_rate_bps').notNull().default(0),
  receiptFooter: text('receipt_footer'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Payments V2 - Invoices (Integer minor units / paise)
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    membershipId: uuid('membership_id').references(() => memberMemberships.id, { onDelete: 'set null' }),
    invoiceNumber: varchar('invoice_number', { length: 64 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    subtotalMinor: bigint('subtotal_minor', { mode: 'number' }).notNull().default(0),
    taxMinor: bigint('tax_minor', { mode: 'number' }).notNull().default(0),
    totalMinor: bigint('total_minor', { mode: 'number' }).notNull(),
    paidMinor: bigint('paid_minor', { mode: 'number' }).notNull().default(0),
    refundedMinor: bigint('refunded_minor', { mode: 'number' }).notNull().default(0),
    status: varchar('status', { length: 24 }).notNull().default('OPEN'),
    description: text('description'),
    issueDate: date('issue_date').notNull().defaultNow(),
    dueDate: date('due_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymMemberStatusIdx: index('idx_invoices_gym_member').on(table.gymId, table.memberId, table.status),
    gymDueDateIdx: index('idx_invoices_gym_due').on(table.gymId, table.dueDate),
    numberUniqueIdx: uniqueIndex('invoices_number_uq').on(table.gymId, table.invoiceNumber),
  })
);

// Payments V2 - Payment Attempts (Discrete payment requests with locked authoritative amounts)
export const paymentAttempts = pgTable(
  'payment_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    receivingAccountId: uuid('receiving_account_id').references(() => gymPaymentAccounts.id, { onDelete: 'set null' }),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    provider: varchar('provider', { length: 24 }).notNull().default('DIRECT_UPI'),
    transactionReference: varchar('transaction_reference', { length: 64 }).notNull(),
    status: varchar('status', { length: 24 }).notNull().default('INITIATED'),
    idempotencyKey: varchar('idempotency_key', { length: 128 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdByType: varchar('created_by_type', { length: 16 }).notNull().default('MEMBER'),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymStatusIdx: index('idx_payment_attempts_gym_status').on(table.gymId, table.status, table.createdAt),
    invoiceIdx: index('idx_payment_attempts_invoice').on(table.gymId, table.invoiceId),
    refUniqueIdx: uniqueIndex('payment_attempts_ref_uq').on(table.gymId, table.transactionReference),
  })
);

// Payments V2 - Payment Submissions (Member UTR proof / screenshot)
export const paymentSubmissions = pgTable(
  'payment_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => paymentAttempts.id, { onDelete: 'cascade' }),
    submittedByMemberId: uuid('submitted_by_member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    utr: varchar('utr', { length: 64 }).notNull(),
    claimedAmountMinor: bigint('claimed_amount_minor', { mode: 'number' }).notNull(),
    claimedPaidAt: timestamp('claimed_paid_at', { withTimezone: true }),
    screenshotDocumentId: uuid('screenshot_document_id'),
    status: varchar('status', { length: 24 }).notNull().default('SUBMITTED'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    attemptIdx: index('idx_payment_submissions_attempt').on(table.gymId, table.attemptId),
    utrUniqueIdx: uniqueIndex('payment_submissions_utr_uq').on(table.gymId, table.utr),
  })
);

// Payments V2 - Payment Allocations
export const paymentAllocations = pgTable(
  'payment_allocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'restrict' }),
    attemptId: uuid('attempt_id').references(() => paymentAttempts.id, { onDelete: 'set null' }),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'restrict' }),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    invoiceIdx: index('idx_payment_allocations_invoice').on(table.gymId, table.invoiceId),
    attemptInvoiceUniqueIdx: uniqueIndex('payment_allocations_attempt_invoice_uq').on(table.attemptId, table.invoiceId),
  })
);

// Payments V2 - Verifications (Staff decision log)
export const paymentVerifications = pgTable('payment_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id')
    .notNull()
    .references(() => gyms.id, { onDelete: 'cascade' }),
  attemptId: uuid('attempt_id')
    .notNull()
    .unique()
    .references(() => paymentAttempts.id, { onDelete: 'cascade' }),
  decision: varchar('decision', { length: 16 }).notNull(),
  verifiedBy: uuid('verified_by').notNull(),
  verificationMethod: varchar('verification_method', { length: 32 }).notNull().default('MANUAL_UTR'),
  note: text('note'),
  decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
});

// Payments V2 - Refunds (Discrete tracking)
export const paymentRefunds = pgTable(
  'payment_refunds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    originalPaymentId: uuid('original_payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'restrict' }),
    invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    reason: text('reason').notNull(),
    refundMethod: varchar('refund_method', { length: 32 }).notNull().default('DIRECT_UPI'),
    refundReference: varchar('refund_reference', { length: 128 }),
    status: varchar('status', { length: 24 }).notNull().default('RECORDED'),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
  },
  (table) => ({
    paymentIdx: index('idx_payment_refunds_payment').on(table.gymId, table.originalPaymentId),
  })
);

// Payments V2 - Receipts (Official snapshot)
export const paymentReceipts = pgTable('payment_receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id')
    .notNull()
    .references(() => gyms.id, { onDelete: 'cascade' }),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'restrict' }),
  receiptNumber: varchar('receipt_number', { length: 64 }).notNull(),
  receiptType: varchar('receipt_type', { length: 24 }).notNull().default('PAYMENT_RECEIPT'),
  snapshot: jsonb('snapshot').notNull().default({}),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
});

// Payments V2 - Audit Events
export const paymentAuditEvents = pgTable(
  'payment_audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    entityType: varchar('entity_type', { length: 32 }).notNull(),
    entityId: uuid('entity_id'),
    action: varchar('action', { length: 64 }).notNull(),
    actorUserId: uuid('actor_user_id'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymTimeIdx: index('idx_payment_audit_gym_time').on(table.gymId, table.createdAt),
  })
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type GymPaymentAccount = typeof gymPaymentAccounts.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type PaymentAttempt = typeof paymentAttempts.$inferSelect;
export type PaymentSubmission = typeof paymentSubmissions.$inferSelect;
