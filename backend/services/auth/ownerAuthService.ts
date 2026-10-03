/**
 * GymDeck Cloud Backend - Owner & Staff Authentication & Session Lifecycle Service
 */

import * as crypto from 'crypto';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  gyms,
  users,
  userRefreshTokens,
  userPasswordResetTokens,
  auditLogs,
} from '../../shared/database/schema';
import {
  generateSecureToken,
  hashToken,
  hashPassword,
  verifyPassword,
  signJwt,
} from '../../shared/security';
import { config } from '../../shared/config';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logging';
import { emailService } from './email';
import { ALL_PERMISSIONS } from '../../gateway/src/middleware/rbacMiddleware';

export interface OwnerSignupDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  gymName: string;
  gymCode?: string;
}

export interface OwnerBootstrapDesktopDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  gymId: string;
  gymName: string;
  gymCode?: string;
  userId?: string;
}

export interface OwnerLoginDto {
  email: string;
  password: string;
  deviceFingerprint?: string;
}

export interface OwnerRefreshTokenDto {
  refreshToken: string;
  deviceFingerprint?: string;
}

export interface OwnerForgotPasswordDto {
  email: string;
}

export interface OwnerResetPasswordDto {
  email: string;
  token: string;
  newPassword: string;
}

export interface OwnerAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface OwnerAuthResponse {
  user: {
    id: string;
    gymId: string;
    gymName: string;
    gymCode: string;
    email: string;
    fullName: string;
    phoneNumber: string | null;
    role: 'OWNER' | 'MANAGER' | 'STAFF' | 'ADMIN' | 'RECEPTIONIST' | 'TRAINER';
    permissions: string[];
    accountStatus: string;
  };
  tokens: OwnerAuthTokens;
}

export class OwnerAuthService {
  /**
   * 1. Register a new Owner and Gym Tenant (Initial Bootstrap)
   */
  public async signup(dto: OwnerSignupDto): Promise<OwnerAuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Check if user already exists
    const existing = (
      await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)
    )[0];

    if (existing) {
      throw AppError.conflict('An account with this email address already exists.');
    }

    const passwordHash = await hashPassword(dto.password);
    const gymCode = dto.gymCode?.trim().toUpperCase() || `GD-${crypto.randomUUID().substring(0, 6).toUpperCase()}`;

    return await db.transaction(async (tx) => {
      // 1. Create Gym Tenant
      const [gym] = await tx
        .insert(gyms)
        .values({
          name: dto.gymName.trim(),
          code: gymCode,
          status: 'ACTIVE',
          contactEmail: normalizedEmail,
          contactPhone: dto.phone || null,
        })
        .returning();

      // 2. Create Owner User
      const [user] = await tx
        .insert(users)
        .values({
          gymId: gym!.id,
          email: normalizedEmail,
          fullName: dto.fullName.trim(),
          phoneNumber: dto.phone || null,
          passwordHash,
          role: 'OWNER',
          permissions: Array.from(ALL_PERMISSIONS),
          accountStatus: 'ACTIVE',
        })
        .returning();

      // Update gym owner link
      await tx.update(gyms).set({ ownerUserId: user!.id }).where(eq(gyms.id, gym!.id));

      // 3. Issue Session Tokens
      const familyId = crypto.randomUUID();
      const rawRefreshToken = generateSecureToken(32);
      const tokenHash = hashToken(rawRefreshToken);
      const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await tx.insert(userRefreshTokens).values({
        userId: user!.id,
        gymId: gym!.id,
        tokenHash,
        familyId,
        expiresAt: refreshTokenExpiry,
      });

      const accessToken = signJwt(
        {
          sub: user!.id,
          userId: user!.id,
          sessionId: familyId,
          gymId: gym!.id,
          email: user!.email,
          role: 'OWNER',
          permissions: Array.from(ALL_PERMISSIONS),
          jti: crypto.randomUUID(),
        },
        config.JWT_SECRET,
        15 * 60 // 15 minutes
      );

      // 4. Audit Log
      await tx.insert(auditLogs).values({
        gymId: gym!.id,
        actorType: 'OWNER',
        action: 'OWNER_SIGNUP_BOOTSTRAP',
        resource: 'gym',
        resourceId: gym!.id,
        metadata: JSON.stringify({ email: normalizedEmail, gymCode }),
      });

      return {
        user: {
          id: user!.id,
          gymId: gym!.id,
          gymName: gym!.name,
          gymCode: gym!.code,
          email: user!.email,
          fullName: user!.fullName,
          phoneNumber: user!.phoneNumber,
          role: 'OWNER',
          permissions: Array.from(ALL_PERMISSIONS),
          accountStatus: user!.accountStatus,
        },
        tokens: {
          accessToken,
          refreshToken: rawRefreshToken,
          expiresIn: 15 * 60,
        },
      };
    });
  }

  /**
   * 1b. Controlled Desktop Local Data -> Cloud Tenant Bootstrap & Identity Linking
   * Preserves canonical Desktop gym UUID and registers/links Cloud Owner identity.
   */
  public async bootstrapDesktop(dto: OwnerBootstrapDesktopDto): Promise<OwnerAuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const gymId = dto.gymId.trim().toLowerCase();

    return await db.transaction(async (tx) => {
      // 1. Verify or create gym tenant with exact gymId
      let gym = (await tx.select().from(gyms).where(eq(gyms.id, gymId)).limit(1))[0];
      const gymCode = dto.gymCode?.trim().toUpperCase() || `GD-${gymId.substring(0, 6).toUpperCase()}`;

      if (!gym) {
        let safeCode = gymCode;
        const codeExists = (await tx.select().from(gyms).where(eq(gyms.code, safeCode)).limit(1))[0];
        if (codeExists) {
          safeCode = `${gymCode}-${crypto.randomUUID().substring(0, 4).toUpperCase()}`;
        }

        const [createdGym] = await tx
          .insert(gyms)
          .values({
            id: gymId,
            name: dto.gymName.trim(),
            code: safeCode,
            status: 'ACTIVE',
            contactEmail: normalizedEmail,
            contactPhone: dto.phone || null,
          })
          .returning();
        gym = createdGym!;
      }

      // 2. Verify or create user
      let user = (await tx.select().from(users).where(eq(users.email, normalizedEmail)).limit(1))[0];
      const passwordHash = await hashPassword(dto.password);

      if (!user) {
        const [createdUser] = await tx
          .insert(users)
          .values({
            id: dto.userId || undefined,
            gymId: gym.id,
            email: normalizedEmail,
            fullName: dto.fullName.trim(),
            phoneNumber: dto.phone || null,
            passwordHash,
            role: 'OWNER',
            permissions: Array.from(ALL_PERMISSIONS),
            accountStatus: 'ACTIVE',
          })
          .returning();
        user = createdUser!;

        await tx.update(gyms).set({ ownerUserId: user.id }).where(eq(gyms.id, gym.id));
      } else {
        if (user.gymId !== gym.id) {
          throw AppError.conflict('An account with this email already exists under a different gym.');
        }
        const isValid = await verifyPassword(dto.password, user.passwordHash);
        if (!isValid) {
          await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));
        }
      }

      // 3. Issue Session Tokens
      const familyId = crypto.randomUUID();
      const rawRefreshToken = generateSecureToken(32);
      const tokenHash = hashToken(rawRefreshToken);
      const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await tx.insert(userRefreshTokens).values({
        userId: user.id,
        gymId: gym.id,
        tokenHash,
        familyId,
        expiresAt: refreshTokenExpiry,
      });

      const accessToken = signJwt(
        {
          sub: user.id,
          userId: user.id,
          sessionId: familyId,
          gymId: gym.id,
          email: user.email,
          role: 'OWNER',
          permissions: Array.from(ALL_PERMISSIONS),
          jti: crypto.randomUUID(),
        },
        config.JWT_SECRET,
        15 * 60 // 15 minutes
      );

      // 4. Audit Log
      await tx.insert(auditLogs).values({
        gymId: gym.id,
        actorType: 'OWNER',
        action: 'OWNER_DESKTOP_BOOTSTRAP',
        resource: 'gym',
        resourceId: gym.id,
        metadata: JSON.stringify({ email: normalizedEmail, gymId: gym.id, gymName: gym.name }),
      });

      return {
        user: {
          id: user.id,
          gymId: gym.id,
          gymName: gym.name,
          gymCode: gym.code,
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          role: 'OWNER',
          permissions: Array.from(ALL_PERMISSIONS),
          accountStatus: user.accountStatus,
        },
        tokens: {
          accessToken,
          refreshToken: rawRefreshToken,
          expiresIn: 15 * 60,
        },
      };
    });
  }

  /**
   * 2. Owner & Staff Login
   */
  public async login(dto: OwnerLoginDto): Promise<OwnerAuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const userRecord = (
      await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)
    )[0];

    if (!userRecord) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    if (userRecord.accountStatus === 'LOCKED' || userRecord.accountStatus === 'SUSPENDED') {
      throw AppError.forbidden('Account is suspended or locked. Please contact support.');
    }

    const isValidPassword = await verifyPassword(dto.password, userRecord.passwordHash);
    if (!isValidPassword) {
      logger.warn('[OwnerAuthService] Failed login attempt for owner/staff', { email: normalizedEmail });
      throw AppError.unauthorized('Invalid email or password.');
    }

    // Verify Gym status
    const gymRecord = (
      await db.select().from(gyms).where(eq(gyms.id, userRecord.gymId)).limit(1)
    )[0];

    if (!gymRecord || gymRecord.status !== 'ACTIVE') {
      throw AppError.forbidden('Gym subscription or tenant is inactive.');
    }

    // Generate Session & Token Family
    const familyId = crypto.randomUUID();
    const rawRefreshToken = generateSecureToken(32);
    const tokenHash = hashToken(rawRefreshToken);
    const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(userRefreshTokens).values({
      userId: userRecord.id,
      gymId: userRecord.gymId,
      tokenHash,
      familyId,
      deviceFingerprint: dto.deviceFingerprint || null,
      expiresAt: refreshTokenExpiry,
    });

    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userRecord.id));

    const effectivePermissions =
      userRecord.role === 'OWNER' || userRecord.role === 'ADMIN'
        ? Array.from(ALL_PERMISSIONS)
        : userRecord.permissions || [];

    const accessToken = signJwt(
      {
        sub: userRecord.id,
        userId: userRecord.id,
        sessionId: familyId,
        gymId: userRecord.gymId,
        email: userRecord.email,
        role: userRecord.role as any,
        permissions: effectivePermissions,
        jti: crypto.randomUUID(),
      },
      config.JWT_SECRET,
      15 * 60 // 15 minutes
    );

    // Audit Log
    await db.insert(auditLogs).values({
      gymId: userRecord.gymId,
      actorType: 'OWNER',
      action: 'OWNER_LOGIN_SUCCESS',
      resource: 'user',
      resourceId: userRecord.id,
      metadata: JSON.stringify({ email: normalizedEmail, role: userRecord.role }),
    });

    return {
      user: {
        id: userRecord.id,
        gymId: userRecord.gymId,
        gymName: gymRecord.name,
        gymCode: gymRecord.code,
        email: userRecord.email,
        fullName: userRecord.fullName,
        phoneNumber: userRecord.phoneNumber,
        role: userRecord.role as any,
        permissions: effectivePermissions,
        accountStatus: userRecord.accountStatus,
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: 15 * 60,
      },
    };
  }

  /**
   * 3. Refresh Access Token with Token Rotation & Reuse Detection
   */
  public async refreshToken(dto: OwnerRefreshTokenDto): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    if (!dto.refreshToken) {
      throw AppError.unauthorized('Refresh token is required.');
    }

    const tokenHash = hashToken(dto.refreshToken.trim());

    const tokenRecord = (
      await db
        .select()
        .from(userRefreshTokens)
        .where(eq(userRefreshTokens.tokenHash, tokenHash))
        .limit(1)
    )[0];

    if (!tokenRecord) {
      throw AppError.unauthorized('Invalid refresh token.');
    }

    // Reuse / Replay Detection
    if (tokenRecord.revokedAt) {
      logger.error('[OwnerAuthService] Replay attack detected: Revoked refresh token used!', {
        userId: tokenRecord.userId,
        familyId: tokenRecord.familyId,
      });

      // Invalidate entire family
      await db
        .update(userRefreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(userRefreshTokens.familyId, tokenRecord.familyId));

      await db.insert(auditLogs).values({
        gymId: tokenRecord.gymId,
        actorType: 'OWNER',
        action: 'SECURITY_REFRESH_TOKEN_REUSE_DETECTED',
        resource: 'user_refresh_tokens',
        resourceId: tokenRecord.id,
        metadata: JSON.stringify({ userId: tokenRecord.userId, familyId: tokenRecord.familyId }),
      });

      throw AppError.unauthorized('Security alert: Invalid session state. All sessions revoked.');
    }

    // Check expiration
    if (tokenRecord.expiresAt < new Date()) {
      throw AppError.unauthorized('Refresh token has expired. Please log in again.');
    }

    // Revoke current token
    await db
      .update(userRefreshTokens)
      .set({ revokedAt: new Date(), lastUsedAt: new Date() })
      .where(eq(userRefreshTokens.id, tokenRecord.id));

    // Fetch user and gym details
    const userRecord = (
      await db.select().from(users).where(eq(users.id, tokenRecord.userId)).limit(1)
    )[0];

    if (!userRecord || userRecord.accountStatus !== 'ACTIVE') {
      throw AppError.unauthorized('User account is invalid or locked.');
    }

    const gymRecord = (
      await db.select().from(gyms).where(eq(gyms.id, userRecord.gymId)).limit(1)
    )[0];

    if (!gymRecord || gymRecord.status !== 'ACTIVE') {
      throw AppError.forbidden('Gym tenant is inactive.');
    }

    // Issue new rotating refresh token in same family
    const newRawRefreshToken = generateSecureToken(32);
    const newTokenHash = hashToken(newRawRefreshToken);
    const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(userRefreshTokens).values({
      userId: userRecord.id,
      gymId: userRecord.gymId,
      tokenHash: newTokenHash,
      familyId: tokenRecord.familyId,
      deviceFingerprint: dto.deviceFingerprint || tokenRecord.deviceFingerprint,
      expiresAt: newExpiry,
    });

    const effectivePermissions =
      userRecord.role === 'OWNER' || userRecord.role === 'ADMIN'
        ? Array.from(ALL_PERMISSIONS)
        : userRecord.permissions || [];

    const newAccessToken = signJwt(
      {
        sub: userRecord.id,
        userId: userRecord.id,
        sessionId: tokenRecord.familyId,
        gymId: userRecord.gymId,
        email: userRecord.email,
        role: userRecord.role as any,
        permissions: effectivePermissions,
        jti: crypto.randomUUID(),
      },
      config.JWT_SECRET,
      15 * 60
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: 15 * 60,
    };
  }

  /**
   * 4. Session Revocation (Logout)
   */
  public async logout(dto: { refreshToken?: string; userId?: string }): Promise<{ success: boolean; message: string }> {
    if (dto.refreshToken) {
      const tokenHash = hashToken(dto.refreshToken.trim());
      const tokenRecord = (
        await db
          .select()
          .from(userRefreshTokens)
          .where(eq(userRefreshTokens.tokenHash, tokenHash))
          .limit(1)
      )[0];

      if (tokenRecord) {
        await db
          .update(userRefreshTokens)
          .set({ revokedAt: new Date() })
          .where(eq(userRefreshTokens.familyId, tokenRecord.familyId));
      }
    } else if (dto.userId) {
      await db
        .update(userRefreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(userRefreshTokens.userId, dto.userId));
    }

    return { success: true, message: 'Session logged out successfully.' };
  }

  /**
   * 5. Get current authenticated Owner / Staff context
   */
  public async getMe(userId: string, gymId: string): Promise<any> {
    const userRecord = (
      await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.gymId, gymId)))
        .limit(1)
    )[0];

    if (!userRecord) {
      throw AppError.notFound('User record not found in authorized gym tenant.');
    }

    const gymRecord = (
      await db.select().from(gyms).where(eq(gyms.id, gymId)).limit(1)
    )[0];

    const effectivePermissions =
      userRecord.role === 'OWNER' || userRecord.role === 'ADMIN'
        ? Array.from(ALL_PERMISSIONS)
        : userRecord.permissions || [];

    return {
      id: userRecord.id,
      gymId: userRecord.gymId,
      gymName: gymRecord?.name || 'Gym',
      gymCode: gymRecord?.code || 'GD-GYM',
      email: userRecord.email,
      fullName: userRecord.fullName,
      phoneNumber: userRecord.phoneNumber,
      role: userRecord.role,
      permissions: effectivePermissions,
      accountStatus: userRecord.accountStatus,
      lastLoginAt: userRecord.lastLoginAt,
    };
  }

  /**
   * 6. Forgot Password (Owner/Staff)
   * Dispatches reset token if user exists; always returns identical generic message to prevent account enumeration.
   */
  public async forgotPassword(dto: OwnerForgotPasswordDto): Promise<{ message: string; debugToken?: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const usersList = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (usersList.length === 0) {
      // Account enumeration defense: Always return identical generic success message
      return { message: 'If an account exists for this email, password reset instructions have been sent.' };
    }

    const user = usersList[0]!;
    const rawResetToken = generateSecureToken(24);
    const tokenHash = hashToken(rawResetToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.insert(userPasswordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    try {
      await emailService.sendPasswordReset(user.email, rawResetToken);
    } catch (err) {
      logger.error('[OwnerAuthService] Failed to dispatch password reset email', err);
    }

    return {
      message: 'If an account exists for this email, password reset instructions have been sent.',
      // Only include debugToken in development/test for programmatic verification
      ...(process.env.NODE_ENV !== 'production' ? { debugToken: rawResetToken } : {}),
    };
  }

  /**
   * 7. Reset Password (Owner/Staff)
   * Validates token, consumes it (single-use), updates scrypt password hash, and revokes all active sessions.
   */
  public async resetPassword(dto: OwnerResetPasswordDto): Promise<{ message: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const usersList = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (usersList.length === 0) {
      throw AppError.validation('Invalid or expired password reset token.');
    }

    const user = usersList[0]!;
    const tokenHash = hashToken(dto.token.trim());

    const tokenRecords = await db
      .select()
      .from(userPasswordResetTokens)
      .where(
        and(
          eq(userPasswordResetTokens.userId, user.id),
          eq(userPasswordResetTokens.tokenHash, tokenHash),
          isNull(userPasswordResetTokens.consumedAt),
          gt(userPasswordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (tokenRecords.length === 0) {
      throw AppError.validation('Invalid or expired password reset token.');
    }

    const tokenRecord = tokenRecords[0]!;

    // Hash new password using memory-hard scrypt
    const newPasswordHash = await hashPassword(dto.newPassword);

    await db.transaction(async (tx) => {
      // 1. Update user password
      await tx
        .update(users)
        .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      // 2. Consume reset token (single-use)
      await tx
        .update(userPasswordResetTokens)
        .set({ consumedAt: new Date() })
        .where(eq(userPasswordResetTokens.id, tokenRecord.id));

      // 3. Invalidate all active refresh sessions for this user
      await tx
        .update(userRefreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(userRefreshTokens.userId, user.id));

      // 4. Audit Log
      await tx.insert(auditLogs).values({
        gymId: user.gymId,
        actorType: 'OWNER',
        action: 'OWNER_PASSWORD_RESET_SUCCESS',
        resource: 'users',
        resourceId: user.id,
        metadata: JSON.stringify({ email: normalizedEmail }),
      });
    });

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }
}

export const ownerAuthService = new OwnerAuthService();
export default ownerAuthService;
