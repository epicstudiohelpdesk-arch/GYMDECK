/**
 * GymDeck Owner Mobile - Owner Dashboard Service
 */

import { apiClient } from './client';
import { ApiResponse, OwnerDashboardData } from '../../types';

export class OwnerDashboardService {
  public static async getDashboard(): Promise<OwnerDashboardData> {
    const response = await apiClient.get<ApiResponse<OwnerDashboardData>>('/owner/dashboard');
    return response.data.data;
  }
}
