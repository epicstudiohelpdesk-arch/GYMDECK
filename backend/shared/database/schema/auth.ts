/**
 * GymDeck Cloud Database Schema - Authentication & Credential Storage
 */

import { pgTable, uuid, varchar, text, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { gyms } from './gyms';
import { gymMembers } from './members';

/**
 * 1. Member Accounts (Mobile/Cloud Login Credentials)
 */
export const memberAccounts = pgTable(
  'member_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymMemberId: uuid('gym_member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull().unique(), // Global unique login email
    phoneNumber: varchar('phone_number', { length: 32 }),
    passwordHash: text('password_hash').notNull(), // Argon2id hash (never plaintext)
    emailVerified: boolean('email_verified').notNull().default(false),
    phoneVerified: boolean('phone_verified').notNull().default(false),
    accountStatus: varchar('account_status', { length: 32 }).notNull().default('ACTIVE'), // ACTIVE, LOCKED, SUSPENDED
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index('idx_member_accounts_email').on(table.email),
    gymMemberIdx: index('idx_member_accounts_gym_member').on(table.gymId, table.gymMemberId),
  })
);

/**
 * 2. Email Verification OTPs (6-digit hashed OTPs)
 */
export const emailVerificationOtps = pgTable(
  'email_verification_otps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    otpHash: varchar('otp_hash', { length: 64 }).notNull(), // SHA-256 hash
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attemptsCount: integer('attempts_count').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailLookupIdx: index('idx_email_otps_email_exp').on(table.email, table.expiresAt),
  })
);

/**
 * 3. Password Reset Tokens
 */
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberAccountId: uuid('member_account_id')
      .notNull()
      .references(() => memberAccounts.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(), // SHA-256 hash
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountTokenIdx: index('idx_pwd_reset_acc_token').on(table.memberAccountId, table.tokenHash),
  })
);

/**
 * 4. Member Refresh Tokens (Rotating Sessions)
 */
export const memberRefreshTokens = pgTable(
  'member_refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberAccountId: uuid('member_account_id')
      .notNull()
      .references(() => memberAccounts.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(), // SHA-256 hash
    familyId: uuid('family_id').notNull(), // Family UUID for reuse detection
    deviceFingerprint: text('device_fingerprint'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountIdx: index('idx_refresh_tokens_account').on(table.memberAccountId),
    tokenHashIdx: index('idx_refresh_tokens_hash').on(table.tokenHash),
    familyIdx: index('idx_refresh_tokens_family').on(table.familyId),
  })
);

export type MemberAccount = typeof memberAccounts.$inferSelect;
export type NewMemberAccount = typeof memberAccounts.$inferInsert;
export type EmailVerificationOtp = typeof emailVerificationOtps.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type MemberRefreshToken = typeof memberRefreshTokens.$inferSelect;
