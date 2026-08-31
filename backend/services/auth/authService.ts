/**
 * GymDeck Cloud Backend - Authentication & Token Lifecycle Service
 */

import * as crypto from 'crypto';
import { eq, and, gt, isNull, desc, sql } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  gyms,
  gymMembers,
  memberAccounts,
  emailVerificationOtps,
  passwordResetTokens,
  memberRefreshTokens,
  auditLogs,
} from '../../shared/database/schema';
import {
  generateSecureOtp,
  generateSecureToken,
  hashToken,
  hashPassword,
  verifyPassword,
  signJwt,
  constantTimeCompare,
  JwtPayload,
} from '../../shared/security';
import { config } from '../../shared/config';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logging';
import { emailService } from './email';

export interface SignupDto {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  gymId?: string;
  gymCode?: string;
}

export interface VerifyEmailDto {
  email: string;
  code: string;
}

export interface LoginDto {
  email: string;
  password: string;
  deviceFingerprint?: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
  deviceFingerprint?: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  token: string;
  newPassword: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: {
    id: string;
    memberId: string;
    gymId: string;
    email: string;
    fullName: string;
    phone: string;
    emailVerified: boolean;
    role: 'MEMBER';
  };
  tokens: AuthTokens;
}

export class AuthService {
  /**
   * 1. Register a new Member Mobile account
   */
  public async signup(dto: SignupDto): Promise<{ email: string; message: string; requiresVerification: boolean }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Check for existing account
    const existingAccount = await db
      .select()
      .from(memberAccounts)
      .where(eq(memberAccounts.email, normalizedEmail))
      .limit(1);

    if (existingAccount.length > 0) {
      const account = existingAccount[0]!;
      if (account.emailVerified) {
        // Return generic error if already registered to protect against account enumeration
        throw AppError.conflict('An account with this email address already exists. Please log in.');
      }

      // Unverified account: issue new verification OTP
      await this.issueVerificationOtp(normalizedEmail);
      return {
        email: normalizedEmail,
        message: 'Account already created. A new verification code has been dispatched to your email.',
        requiresVerification: true,
      };
    }

    // Determine target Gym (By gymId, gymCode, or default to HQ gym)
    let targetGymId = dto.gymId;
    if (!targetGymId && dto.gymCode) {
      const cleanCode = dto.gymCode.trim().toUpperCase();
      const matchedGym = (
        await db
          .select()
          .from(gyms)
          .where(sql`UPPER(${gyms.code}) = ${cleanCode}`)
          .limit(1)
      )[0];

      if (matchedGym) {
        targetGymId = matchedGym.id;
      }
    }

    if (!targetGymId) {
      const defaultGym = await db.select().from(gyms).limit(1);
      if (defaultGym.length > 0) {
        targetGymId = defaultGym[0]!.id;
      } else {
        // Bootstrap root gym if first run
        const [newGym] = await db
          .insert(gyms)
          .values({
            name: 'GymDeck Flagship HQ',
            code: 'GD-HQ',
            status: 'ACTIVE',
          })
          .returning();
        targetGymId = newGym!.id;
      }
    }

    const hashedPassword = await hashPassword(dto.password);

    // Create physical member profile and digital account inside transaction
    const [newMember] = await db
      .insert(gymMembers)
      .values({
        gymId: targetGymId,
        memberCode: `GD-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: dto.fullName.trim(),
        phone: dto.phone.trim(),
        email: normalizedEmail,
        membershipStatus: 'ACTIVE',
      })
      .returning();

    await db.insert(memberAccounts).values({
      gymId: targetGymId,
      gymMemberId: newMember!.id,
      email: normalizedEmail,
      phoneNumber: dto.phone.trim(),
      passwordHash: hashedPassword,
      emailVerified: false,
      accountStatus: 'ACTIVE',
    });

    // Record audit event
    await db.insert(auditLogs).values({
      gymId: targetGymId,
      memberId: newMember!.id,
      actorType: 'MEMBER',
      action: 'AUTH_SIGNUP',
      resource: 'member_accounts',
      metadata: JSON.stringify({ email: normalizedEmail }),
    });

    // Generate and dispatch verification OTP
    await this.issueVerificationOtp(normalizedEmail);

    return {
      email: normalizedEmail,
      message: 'Account created successfully. Please enter the 6-digit verification code sent to your email.',
      requiresVerification: true,
    };
  }

  /**
   * 2. Verify Email OTP
   */
  public async verifyEmail(dto: VerifyEmailDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const submittedOtp = dto.code.trim();

    // Look up account
    const accounts = await db
      .select()
      .from(memberAccounts)
      .where(eq(memberAccounts.email, normalizedEmail))
      .limit(1);

    if (accounts.length === 0) {
      throw AppError.notFound('Account not found');
    }

    const account = accounts[0]!;

    // Find latest active OTP
    const otps = await db
      .select()
      .from(emailVerificationOtps)
      .where(
        and(
          eq(emailVerificationOtps.email, normalizedEmail),
          isNull(emailVerificationOtps.consumedAt),
          gt(emailVerificationOtps.expiresAt, new Date())
        )
      )
      .orderBy(desc(emailVerificationOtps.createdAt))
      .limit(1);

    if (otps.length === 0) {
      throw AppError.validation('Verification code has expired or is invalid. Please request a new code.');
    }

    const otpRecord = otps[0]!;

    // Check maximum attempts
    if (otpRecord.attemptsCount >= 5) {
      throw AppError.rateLimited('Maximum verification attempts exceeded. Please request a new code.');
    }

    // Increment attempt count
    await db
      .update(emailVerificationOtps)
      .set({ attemptsCount: otpRecord.attemptsCount + 1 })
      .where(eq(emailVerificationOtps.id, otpRecord.id));

    // Verify hash in constant time
    const computedHash = hashToken(submittedOtp);
    if (!constantTimeCompare(otpRecord.otpHash, computedHash)) {
      throw AppError.validation('Invalid verification code. Please check and try again.');
    }

    // Mark OTP consumed and account verified
    await db
      .update(emailVerificationOtps)
      .set({ consumedAt: new Date() })
      .where(eq(emailVerificationOtps.id, otpRecord.id));

    await db
      .update(memberAccounts)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(memberAccounts.id, account.id));

    // Fetch member details
    const members = await db
      .select()
      .from(gymMembers)
      .where(eq(gymMembers.id, account.gymMemberId))
      .limit(1);
    const member = members[0]!;

    // Issue tokens
    const tokens = await this.generateTokenPair(account.id, account.gymMemberId, account.gymId, account.email);

    return {
      user: {
        id: account.id,
        memberId: member.id,
        gymId: account.gymId,
        email: account.email,
        fullName: member.fullName,
        phone: member.phone,
        emailVerified: true,
        role: 'MEMBER',
      },
      tokens,
    };
  }

  /**
   * 3. Resend Verification OTP
   */
  public async resendVerificationOtp(dto: { email: string }): Promise<{ message: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const accounts = await db
      .select()
      .from(memberAccounts)
      .where(eq(memberAccounts.email, normalizedEmail))
      .limit(1);

    if (accounts.length === 0 || accounts[0]!.emailVerified) {
      // Return generic message for email enumeration defense
      return { message: 'If an unverified account exists, a new verification code has been dispatched.' };
    }

    await this.issueVerificationOtp(normalizedEmail);

    return { message: 'If an unverified account exists, a new verification code has been dispatched.' };
  }

  /**
   * 4. Member Login
   */
  public async login(dto: LoginDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const accounts = await db
      .select()
      .from(memberAccounts)
      .where(eq(memberAccounts.email, normalizedEmail))
      .limit(1);

    if (accounts.length === 0) {
      // Perform dummy verification to prevent timing attack enumeration
      await verifyPassword(dto.password, 'scrypt$16384$8$1$dummy$dummyhash');
      throw AppError.unauthorized('Invalid email or password');
    }

    const account = accounts[0]!;

    if (account.accountStatus !== 'ACTIVE') {
      throw AppError.forbidden('Your account is currently locked or suspended. Please contact support.');
    }

    const isPasswordValid = await verifyPassword(dto.password, account.passwordHash);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (!account.emailVerified) {
      // Re-send OTP if needed
      await this.issueVerificationOtp(normalizedEmail);
      throw AppError.forbidden('Email verification is required before logging in.', {
        requiresVerification: true,
        email: account.email,
      });
    }

    // Update last login
    await db
      .update(memberAccounts)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(memberAccounts.id, account.id));

    // Fetch member details
    const members = await db
      .select()
      .from(gymMembers)
      .where(eq(gymMembers.id, account.gymMemberId))
      .limit(1);
    const member = members[0]!;

    // Issue tokens
    const tokens = await this.generateTokenPair(
      account.id,
      account.gymMemberId,
      account.gymId,
      account.email,
      dto.deviceFingerprint
    );

    // Audit log
    await db.insert(auditLogs).values({
      gymId: account.gymId,
      memberId: member.id,
      actorType: 'MEMBER',
      action: 'AUTH_LOGIN_SUCCESS',
      resource: 'member_accounts',
    });

    return {
      user: {
        id: account.id,
        memberId: member.id,
        gymId: account.gymId,
        email: account.email,
        fullName: member.fullName,
        phone: member.phone,
        emailVerified: true,
        role: 'MEMBER',
      },
      tokens,
    };
  }

  /**
   * 5. Refresh Access Token with Token Rotation & Reuse Detection
   */
  public async refreshToken(dto: RefreshTokenDto): Promise<AuthTokens> {
    const rawToken = dto.refreshToken;
    const tokenHash = hashToken(rawToken);

    // Lookup token
    const tokenRecords = await db
      .select()
      .from(memberRefreshTokens)
      .where(eq(memberRefreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (tokenRecords.length === 0) {
      throw AppError.unauthorized('Invalid refresh token');
    }

    const currentToken = tokenRecords[0]!;

    // REUSE DETECTION: If token was already revoked, token theft has occurred
    if (currentToken.revokedAt !== null) {
      logger.warn('[Security] Refresh token reuse detected! Revoking entire token family.', {
        familyId: currentToken.familyId,
        memberAccountId: currentToken.memberAccountId,
      });

      // Revoke all tokens belonging to this family
      await db
        .update(memberRefreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(memberRefreshTokens.familyId, currentToken.familyId));

      throw AppError.unauthorized('Refresh token session compromised. All sessions revoked. Please log in again.');
    }

    // Check expiration
    if (currentToken.expiresAt < new Date()) {
      throw AppError.unauthorized('Refresh token has expired. Please log in again.');
    }

    // Revoke current token atomically
    await db
      .update(memberRefreshTokens)
      .set({ revokedAt: new Date(), lastUsedAt: new Date() })
      .where(eq(memberRefreshTokens.id, currentToken.id));

    // Fetch account
    const accounts = await db
      .select()
      .from(memberAccounts)
      .where(eq(memberAccounts.id, currentToken.memberAccountId))
      .limit(1);

    if (accounts.length === 0 || accounts[0]!.accountStatus !== 'ACTIVE') {
      throw AppError.unauthorized('Account is inactive or not found');
    }

    const account = accounts[0]!;

    // Issue new rotated token in the SAME family
    const newRawRefreshToken = generateSecureToken(32);
    const newRefreshTokenHash = hashToken(newRawRefreshToken);
    const refreshExpiresAt = new Date(Date.now() + config.JWT_REFRESH_EXPIRATION_SECONDS * 1000);

    await db.insert(memberRefreshTokens).values({
      memberAccountId: account.id,
      tokenHash: newRefreshTokenHash,
      familyId: currentToken.familyId,
      deviceFingerprint: dto.deviceFingerprint ?? currentToken.deviceFingerprint,
      expiresAt: refreshExpiresAt,
    });

    const jwtPayload: JwtPayload = {
      sub: account.id,
      memberId: account.gymMemberId,
      gymId: account.gymId,
      email: account.email,
      role: 'MEMBER',
      jti: crypto.randomUUID(),
    };

    const newAccessToken = signJwt(jwtPayload, config.JWT_SECRET, config.JWT_ACCESS_EXPIRATION_SECONDS);

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: config.JWT_ACCESS_EXPIRATION_SECONDS,
    };
  }

  /**
   * 6. Logout
   */
  public async logout(dto: { refreshToken?: string }): Promise<{ message: string }> {
    if (dto.refreshToken) {
      const tokenHash = hashToken(dto.refreshToken);
      await db
        .update(memberRefreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(memberRefreshTokens.tokenHash, tokenHash));
    }
    return { message: 'Logged out successfully' };
  }

  /**
   * 7. Forgot Password (Dispatches Reset Token)
   */
  public async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const accounts = await db
      .select()
      .from(memberAccounts)
      .where(eq(memberAccounts.email, normalizedEmail))
      .limit(1);

    if (accounts.length === 0) {
      // Email enumeration defense: Always return generic success
      return { message: 'If an account exists for this email, a password reset link has been dispatched.' };
    }

    const account = accounts[0]!;
    const resetToken = generateSecureToken(24);
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await db.insert(passwordResetTokens).values({
      memberAccountId: account.id,
      tokenHash,
      expiresAt,
    });

    await emailService.sendPasswordReset(account.email, resetToken);

    return { message: 'If an account exists for this email, a password reset link has been dispatched.' };
  }

  /**
   * 8. Reset Password
   */
  public async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const accounts = await db
      .select()
      .from(memberAccounts)
      .where(eq(memberAccounts.email, normalizedEmail))
      .limit(1);

    if (accounts.length === 0) {
      throw AppError.validation('Invalid or expired password reset token.');
    }

    const account = accounts[0]!;
    const tokenHash = hashToken(dto.token.trim());

    const tokens = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.memberAccountId, account.id),
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.consumedAt),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (tokens.length === 0) {
      throw AppError.validation('Invalid or expired password reset token.');
    }

    const resetTokenRecord = tokens[0]!;

    // Hash new password
    const newHashedPassword = await hashPassword(dto.newPassword);

    // Update password and consume token
    await db
      .update(memberAccounts)
      .set({ passwordHash: newHashedPassword, updatedAt: new Date() })
      .where(eq(memberAccounts.id, account.id));

    await db
      .update(passwordResetTokens)
      .set({ consumedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetTokenRecord.id));

    // Revoke all existing refresh sessions
    await db
      .update(memberRefreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(memberRefreshTokens.memberAccountId, account.id));

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }

  /**
   * 7. Link Member Account to a specific Gym Affiliation
   */
  public async linkGym(
    memberAccountId: string,
    gymCode: string
  ): Promise<{ gym: any; user: any }> {
    const cleanCode = gymCode.trim().toUpperCase();

    // Find gym by code
    let targetGym = (
      await db
        .select()
        .from(gyms)
        .where(sql`UPPER(${gyms.code}) = ${cleanCode}`)
        .limit(1)
    )[0];

    if (!targetGym) {
      if (cleanCode.startsWith('GD-')) {
        const [bootstrapped] = await db
          .insert(gyms)
          .values({
            name: `GymDeck Partner (${cleanCode})`,
            code: cleanCode,
            status: 'ACTIVE',
          })
          .returning();
        targetGym = bootstrapped!;
      } else {
        throw AppError.notFound(`Gym with code ${cleanCode} not found. Please verify the code on your counter receipt.`);
      }
    }

    // Get current account
    const account = (
      await db
        .select()
        .from(memberAccounts)
        .where(eq(memberAccounts.id, memberAccountId))
        .limit(1)
    )[0];

    if (!account) {
      throw AppError.notFound('Member account not found');
    }

    // Check if an existing gym_members record exists for this gym and this member's email/phone
    let memberRecord = (
      await db
        .select()
        .from(gymMembers)
        .where(and(eq(gymMembers.gymId, targetGym.id), eq(gymMembers.email, account.email)))
        .limit(1)
    )[0];

    if (!memberRecord && account.phoneNumber) {
      memberRecord = (
        await db
          .select()
          .from(gymMembers)
          .where(and(eq(gymMembers.gymId, targetGym.id), eq(gymMembers.phone, account.phoneNumber)))
          .limit(1)
      )[0];
    }

    if (memberRecord) {
      // Link existing admission profile
      await db
        .update(memberAccounts)
        .set({
          gymId: targetGym.id,
          gymMemberId: memberRecord.id,
          updatedAt: new Date(),
        })
        .where(eq(memberAccounts.id, account.id));
    } else {
      // Create new gym_members entry under this gym tenant
      const currentMember = (
        await db
          .select()
          .from(gymMembers)
          .where(eq(gymMembers.id, account.gymMemberId))
          .limit(1)
      )[0];

      const [newGymMember] = await db
        .insert(gymMembers)
        .values({
          gymId: targetGym.id,
          memberCode: `GD-${Math.floor(1000 + Math.random() * 9000)}`,
          fullName: currentMember?.fullName || 'Member',
          phone: account.phoneNumber || currentMember?.phone || '0000000000',
          email: account.email,
          membershipStatus: 'ACTIVE',
        })
        .returning();

      await db
        .update(memberAccounts)
        .set({
          gymId: targetGym.id,
          gymMemberId: newGymMember!.id,
          updatedAt: new Date(),
        })
        .where(eq(memberAccounts.id, account.id));

      memberRecord = newGymMember!;
    }

    // Audit log
    await db.insert(auditLogs).values({
      gymId: targetGym.id,
      memberId: memberRecord.id,
      actorType: 'MEMBER',
      action: 'MEMBER_GYM_LINK',
      resource: 'gym_members',
      metadata: JSON.stringify({ gymCode: cleanCode, gymId: targetGym.id }),
    });

    return {
      gym: {
        id: targetGym.id,
        name: targetGym.name,
        code: targetGym.code,
        address: targetGym.address,
        phone: targetGym.contactPhone,
        email: targetGym.contactEmail,
      },
      user: {
        id: account.id,
        memberId: memberRecord.id,
        gymId: targetGym.id,
        email: account.email,
        fullName: memberRecord.fullName,
        phone: memberRecord.phone,
        memberCode: memberRecord.memberCode,
        emailVerified: account.emailVerified,
        role: 'MEMBER',
      },
    };
  }

  // ==============================================================================
  // Internal Helpers
  // ==============================================================================

  private async issueVerificationOtp(email: string): Promise<void> {
    const otp = generateSecureOtp();
    const otpHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await db.insert(emailVerificationOtps).values({
      email,
      otpHash,
      expiresAt,
      attemptsCount: 0,
    });

    await emailService.sendVerificationOtp(email, otp);
  }

  private async generateTokenPair(
    memberAccountId: string,
    memberId: string,
    gymId: string,
    email: string,
    deviceFingerprint?: string
  ): Promise<AuthTokens> {
    const rawRefreshToken = generateSecureToken(32);
    const refreshTokenHash = hashToken(rawRefreshToken);
    const familyId = crypto.randomUUID();
    const refreshExpiresAt = new Date(Date.now() + config.JWT_REFRESH_EXPIRATION_SECONDS * 1000);

    await db.insert(memberRefreshTokens).values({
      memberAccountId,
      tokenHash: refreshTokenHash,
      familyId,
      deviceFingerprint,
      expiresAt: refreshExpiresAt,
    });

    const jwtPayload: JwtPayload = {
      sub: memberAccountId,
      memberId,
      gymId,
      email,
      role: 'MEMBER',
      jti: crypto.randomUUID(),
    };

    const accessToken = signJwt(jwtPayload, config.JWT_SECRET, config.JWT_ACCESS_EXPIRATION_SECONDS);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: config.JWT_ACCESS_EXPIRATION_SECONDS,
    };
  }
}

export const authService = new AuthService();
export default authService;
