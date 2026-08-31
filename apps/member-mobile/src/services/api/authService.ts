/**
 * GymDeck Member Mobile - Authentication API Service
 * 
 * Manages all authentication network interactions with /v1/auth/* endpoints.
 */

import { apiClient, normalizeAxiosError } from './client';
import { ApiResponse } from './types';
import { UserProfile, AuthTokens, GymTenant } from '../../types';
import {
  LoginInput,
  SignupInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../../validation';
import { Logger } from '../../observability';
import { AppError } from '../../errors';

export interface AuthResponseData {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface SignupResponseData {
  message: string;
  email: string;
  expiresInSeconds: number;
}

export interface GenericMessageResponse {
  message: string;
}

export interface VerifyResetOtpResponse {
  resetToken: string;
  message: string;
}

export interface GymLinkResponseData {
  gym: GymTenant;
  user: UserProfile;
}

export interface InviteVerificationData {
  gym: { id: string; name: string; code: string };
  member: {
    id: string;
    memberCode: string;
    fullName: string;
    email: string;
    phone: string;
    maskedEmail: string;
    maskedPhone: string;
  };
  activationTicket: string;
}

const DEV_INVITE_FIXTURE: InviteVerificationData = {
  gym: {
    id: 'gym_dev_nyc',
    name: 'Iron Forge Fitness',
    code: 'GD-IRON-001',
  },
  member: {
    id: 'mem_dev_1001',
    memberCode: 'GD-1001',
    fullName: 'Alex Morgan',
    email: 'alex.morgan@gymdeck.com',
    phone: '+1 (555) 234-5678',
    maskedEmail: 'al***@gymdeck.com',
    maskedPhone: '+** ******5678',
  },
  activationTicket: 'dev_signed_activation_ticket_123',
};

const DEV_AUTH_FIXTURE: AuthResponseData = {
  user: {
    id: 'usr_dev_1001',
    gymId: 'gym_dev_nyc',
    fullName: 'Alex Morgan',
    email: 'alex.morgan@gymdeck.com',
    phone: '+1 (555) 234-5678',
    emailVerified: true,
    phoneVerified: false,
    role: 'MEMBER',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-08-20T10:30:00Z',
  },
  tokens: {
    accessToken: 'dev_jwt_access_token_header.payload.signature',
    refreshToken: 'dev_jwt_refresh_token_string',
    expiresIn: 900,
    tokenType: 'Bearer',
  },
};

class AuthService {
  /**
   * Register a new member account.
   * Backend generates challenge and triggers Resend email OTP.
   */
  public async signup(input: SignupInput): Promise<SignupResponseData> {
    try {
      Logger.info('[AuthService] Initiating signup request...', { email: input.email });
      const response = await apiClient.post<ApiResponse<SignupResponseData>>('/auth/signup', {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone || undefined,
        gymCode: input.gymCode || undefined,
        password: input.password,
      });
      return response.data.data;
    } catch (err) {
      Logger.warn('[AuthService] Live signup failed. Checking dev mode fallback.', { error: err });
      if (__DEV__) {
        return {
          message: 'Account created in development mode. Verification code is 123456.',
          email: input.email,
          expiresInSeconds: 600,
        };
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Verify email via 6-digit OTP.
   */
  public async verifyEmail(email: string, otp: string): Promise<AuthResponseData> {
    try {
      Logger.info('[AuthService] Submitting email verification OTP...', { email });
      const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/verify-email', {
        email,
        otp,
      });
      return response.data.data;
    } catch (err) {
      Logger.warn('[AuthService] Live email verification failed. Checking dev mode fallback.', { error: err });
      if (__DEV__) {
        return {
          user: {
            ...DEV_AUTH_FIXTURE.user,
            email: email || DEV_AUTH_FIXTURE.user.email,
          },
          tokens: DEV_AUTH_FIXTURE.tokens,
        };
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Request resending of email verification OTP.
   */
  public async resendOtp(email: string): Promise<GenericMessageResponse> {
    try {
      Logger.info('[AuthService] Requesting OTP resend...', { email });
      const response = await apiClient.post<ApiResponse<GenericMessageResponse>>('/auth/resend-otp', {
        email,
      });
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return { message: 'Verification code resent in development mode: 123456' };
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Member email/password login.
   */
  public async login(input: LoginInput): Promise<AuthResponseData> {
    try {
      Logger.info('[AuthService] Submitting login request...', { email: input.email });
      const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', {
        email: input.email,
        password: input.password,
      });
      return response.data.data;
    } catch (err) {
      Logger.warn('[AuthService] Live login request failed. Checking dev fallback.', { error: err });
      if (__DEV__) {
        return {
          user: {
            ...DEV_AUTH_FIXTURE.user,
            email: input.email,
          },
          tokens: DEV_AUTH_FIXTURE.tokens,
        };
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Revoke active session on server and clear tokens.
   */
  public async logout(): Promise<void> {
    try {
      Logger.info('[AuthService] Logging out session...');
      await apiClient.post('/auth/logout');
    } catch (err) {
      // Non-fatal if server logout fails
      Logger.warn('[AuthService] Server logout notification failed', { error: err });
    }
  }

  /**
   * Request password reset challenge.
   * Always responds with generic message to prevent account enumeration.
   */
  public async forgotPassword(input: ForgotPasswordInput): Promise<GenericMessageResponse> {
    try {
      Logger.info('[AuthService] Requesting password reset...', { email: input.email });
      const response = await apiClient.post<ApiResponse<GenericMessageResponse>>('/auth/forgot-password', {
        email: input.email,
      });
      return response.data.data;
    } catch (err) {
      Logger.error('[AuthService] Forgot password request error', err);
      // Return safe generic response to prevent account enumeration
      return {
        message: 'If an account exists for this email, we have dispatched recovery instructions.',
      };
    }
  }

  /**
   * Verify password reset OTP.
   */
  public async verifyResetOtp(email: string, otp: string): Promise<VerifyResetOtpResponse> {
    try {
      Logger.info('[AuthService] Verifying password reset OTP...', { email });
      const response = await apiClient.post<ApiResponse<VerifyResetOtpResponse>>('/auth/verify-reset-otp', {
        email,
        otp,
      });
      return response.data.data;
    } catch (err) {
      Logger.error('[AuthService] Reset OTP verification failed', err);
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Set new password using reset token.
   */
  public async resetPassword(
    input: ResetPasswordInput & { email: string; resetToken?: string }
  ): Promise<GenericMessageResponse> {
    try {
      Logger.info('[AuthService] Submitting new password...', { email: input.email });
      const response = await apiClient.post<ApiResponse<GenericMessageResponse>>('/auth/reset-password', {
        email: input.email,
        otp: input.otp,
        password: input.password,
        resetToken: input.resetToken,
      });
      return response.data.data;
    } catch (err) {
      Logger.error('[AuthService] Password reset failed', err);
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Link member to a gym via gym code.
   */
  public async linkGym(gymCode: string): Promise<GymLinkResponseData> {
    const cleanCode = gymCode.trim().toUpperCase();
    try {
      Logger.info('[AuthService] Linking gym with code...', { gymCode: cleanCode });
      const response = await apiClient.post<ApiResponse<GymLinkResponseData>>('/member/gym-link', {
        gymCode: cleanCode,
      });
      return response.data.data;
    } catch (err) {
      Logger.warn('[AuthService] Gym linking request failed. Checking dev mode fallback.', { error: err });
      if (__DEV__) {
        return {
          gym: {
            id: 'gym_dev_nyc',
            name: `Iron Forge Fitness (${cleanCode || 'GD-NYC-101'})`,
            code: cleanCode || 'GD-NYC-101',
            address: '450 Lexington Ave, New York, NY 10017',
            phone: '+1 (212) 555-0199',
            email: 'support@ironforgegym.com',
          },
          user: {
            ...DEV_AUTH_FIXTURE.user,
            gymId: 'gym_dev_nyc',
          },
        };
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Verify admission QR token or 8-char activation code
   */
  public async verifyInvite(tokenOrCode: string): Promise<InviteVerificationData> {
    const cleanToken = tokenOrCode.trim();
    try {
      Logger.info('[AuthService] Verifying admission invitation...', { tokenOrCode: cleanToken });
      const response = await apiClient.post<ApiResponse<InviteVerificationData>>('/auth/invite/verify', {
        tokenOrCode: cleanToken,
      });
      return response.data.data;
    } catch (err) {
      Logger.warn('[AuthService] Invite verification failed. Checking dev mode fallback.', { error: err });
      if (__DEV__) {
        return DEV_INVITE_FIXTURE;
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Complete member digital account setup from verified invitation
   */
  public async completeInvite(activationTicket: string, password: string): Promise<AuthResponseData> {
    try {
      Logger.info('[AuthService] Completing account creation from invitation ticket...');
      const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/invite/complete', {
        activationTicket,
        password,
      });
      return response.data.data;
    } catch (err) {
      Logger.warn('[AuthService] Invite completion failed. Checking dev mode fallback.', { error: err });
      if (__DEV__) {
        return DEV_AUTH_FIXTURE;
      }
      throw normalizeAxiosError(err);
    }
  }
}

export const authService = new AuthService();
export default authService;
