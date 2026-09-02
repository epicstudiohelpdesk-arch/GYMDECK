/**
 * GymDeck Owner Mobile - Owner Analytics & BI API Service
 */

import { apiClient } from './client';
import { ApiResponse, AnalyticsOverviewData } from '../../types';

export class OwnerAnalyticsService {
  /**
   * Fetch executive overview analytics data for the given range preset
   */
  public static async getOverview(range: string = 'this_month'): Promise<AnalyticsOverviewData> {
    const response = await apiClient.get<ApiResponse<AnalyticsOverviewData>>('/owner/analytics/overview', {
      params: { range },
    });
    return response.data.data;
  }
}

export default OwnerAnalyticsService;
