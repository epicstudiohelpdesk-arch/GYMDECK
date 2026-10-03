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

/**
 * 5. Member One-Time Admission Activation Tokens (QR / Code Invites)
 */
export const memberActivationTokens = pgTable(
  'member_activation_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    gymMemberId: uuid('gym_member_id')
      .notNull()
      .references(() => gymMembers.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(), // SHA-256 hash of activation token/code
    displayCode: varchar('display_code', { length: 32 }), // e.g. "7K9P-42XM"
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashIdx: index('idx_act_tokens_hash').on(table.tokenHash),
    gymMemberIdx: index('idx_act_tokens_gym_member').on(table.gymId, table.gymMemberId),
  })
);

/**
 * 6. Users / Staff / Owner Accounts (Desktop & Owner Mobile Login Credentials)
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 32 }),
    passwordHash: text('password_hash').notNull(), // Argon2id hash
    role: varchar('role', { length: 32 }).notNull().default('OWNER'), // OWNER, MANAGER, STAFF, RECEPTIONIST, TRAINER
    permissions: text('permissions').array(), // Granular permissions: ['members.read', 'members.write', ...]
    accountStatus: varchar('account_status', { length: 32 }).notNull().default('ACTIVE'), // ACTIVE, LOCKED, SUSPENDED
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gymEmailIdx: index('idx_users_gym_email').on(table.gymId, table.email),
    roleIdx: index('idx_users_role').on(table.role),
  })
);

/**
 * 7. User / Owner Refresh Tokens (Rotating Sessions)
 */
export const userRefreshTokens = pgTable(
  'user_refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gymId: uuid('gym_id')
      .notNull()
      .references(() => gyms.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(), // SHA-256 hash
    familyId: uuid('family_id').notNull(), // Family UUID for reuse detection
    deviceFingerprint: text('device_fingerprint'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_user_refresh_tokens_user').on(table.userId),
    tokenHashIdx: index('idx_user_refresh_tokens_hash').on(table.tokenHash),
    familyIdx: index('idx_user_refresh_tokens_family').on(table.familyId),
  })
);

export const userPasswordResetTokens = pgTable(
  'user_password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(), // SHA-256 hash
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userTokenIdx: index('idx_user_pwd_reset_token').on(table.userId, table.tokenHash),
  })
);

export type MemberAccount = typeof memberAccounts.$inferSelect;
export type NewMemberAccount = typeof memberAccounts.$inferInsert;
export type EmailVerificationOtp = typeof emailVerificationOtps.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type MemberRefreshToken = typeof memberRefreshTokens.$inferSelect;
export type MemberActivationToken = typeof memberActivationTokens.$inferSelect;
export type NewMemberActivationToken = typeof memberActivationTokens.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRefreshToken = typeof userRefreshTokens.$inferSelect;
export type NewUserRefreshToken = typeof userRefreshTokens.$inferInsert;
export type UserPasswordResetToken = typeof userPasswordResetTokens.$inferSelect;
export type NewUserPasswordResetToken = typeof userPasswordResetTokens.$inferInsert;
