/**
 * GymDeck Owner Mobile - Owner Authentication API Service
 */

import { apiClient } from './client';
import { ApiResponse, OwnerAuthResponse, OwnerUser, AuthTokens } from '../../types';

export class OwnerAuthApiService {
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

  public static async getMe(): Promise<OwnerUser> {
    const response = await apiClient.get<ApiResponse<OwnerUser>>('/auth/owner/me');
    return response.data.data;
  }
}
