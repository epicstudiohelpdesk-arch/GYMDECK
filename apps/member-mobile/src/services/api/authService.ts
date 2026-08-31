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
        password: input.password,
      });
      return response.data.data;
    } catch (err) {
      Logger.error('[AuthService] Signup failed', err);
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
      Logger.error('[AuthService] Email verification failed', err);
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
      Logger.error('[AuthService] OTP resend request failed', err);
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
      Logger.error('[AuthService] Login failed', err);
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
    try {
      Logger.info('[AuthService] Linking gym with code...', { gymCode });
      const response = await apiClient.post<ApiResponse<GymLinkResponseData>>('/member/gym-link', {
        gymCode: gymCode.trim().toUpperCase(),
      });
      return response.data.data;
    } catch (err) {
      Logger.error('[AuthService] Gym linking failed', err);
      throw normalizeAxiosError(err);
    }
  }
}

export const authService = new AuthService();
export default authService;
