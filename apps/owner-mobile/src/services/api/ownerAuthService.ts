/**
 * GymDeck Owner Mobile - Owner Authentication API Service
 */

import { apiClient } from './client';
import {
  ApiResponse,
  OwnerAuthResponse,
  OwnerUser,
  AuthTokens,
  OwnerSignupInput,
  OwnerForgotPasswordInput,
  OwnerResetPasswordInput,
} from '../../types';

export class OwnerAuthApiService {
  public static async signup(payload: OwnerSignupInput): Promise<OwnerAuthResponse> {
    const response = await apiClient.post<ApiResponse<OwnerAuthResponse>>('/auth/owner/signup', payload);
    return response.data.data;
  }

  public static async login(credentials: { email: string; password: string }): Promise<OwnerAuthResponse> {
    const response = await apiClient.post<ApiResponse<OwnerAuthResponse>>('/auth/owner/login', credentials);
    return response.data.data;
  }

  public static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await apiClient.post<ApiResponse<AuthTokens>>('/auth/owner/refresh', { refreshToken });
    return response.data.data;
  }

  public static async logout(refreshToken?: string): Promise<void> {
    await apiClient.post('/auth/owner/logout', { refreshToken });
  }

  public static async forgotPassword(payload: OwnerForgotPasswordInput): Promise<{ message: string }> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/owner/forgot-password', payload);
    return response.data.data;
  }

  public static async resetPassword(payload: OwnerResetPasswordInput): Promise<{ message: string }> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/owner/reset-password', payload);
    return response.data.data;
  }

  public static async getMe(): Promise<OwnerUser> {
    const response = await apiClient.get<ApiResponse<OwnerUser>>('/auth/owner/me');
    return response.data.data;
  }
}
