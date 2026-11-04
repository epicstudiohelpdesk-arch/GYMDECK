/**
 * GymDeck Owner Mobile - Owner Analytics & BI API Service
 */

import { apiClient } from './client';
import { ApiResponse, AnalyticsOverviewData } from '../../types';

const DEV_ANALYTICS_FIXTURE: any = {
  period: {
    from: '2026-11-01',
    to: '2026-11-04',
    preset: 'this_month',
    timezone: 'UTC',
    daysCount: 4,
  },
  generatedAt: new Date().toISOString(),
  gym: {
    id: 'gym_01',
    name: 'Titan Fitness HQ',
    code: 'TITAN01',
  },
  metrics: {
    members: {
      total: 1248,
      active: 1042,
      frozen: 48,
      expired: 158,
      newInPeriod: 64,
    },
    financial: {
      grossPaid: 84520,
      refunds: 1200,
      netPaid: 83320,
      transactionCount: 312,
    },
    memberships: {
      expiringSoon: 18,
      active: 1042,
    },
    attendance: {
      totalVisits: 3840,
      peakHour: '18:00 - 19:00',
      activeNow: 42,
    },
  },
  retention: {
    rate: 94.2,
    churnedCount: 12,
  },
  topPlans: [
    { id: 'p1', name: 'Elite Annual Access', activeCount: 680, revenue: 54400 },
    { id: 'p2', name: 'Monthly Flex Pass', activeCount: 362, revenue: 28920 },
  ],
};

export class OwnerAnalyticsService {
  /**
   * Fetch executive overview analytics data for the given range preset
   */
  public static async getOverview(range: string = 'this_month'): Promise<AnalyticsOverviewData> {
    try {
      const response = await apiClient.get<ApiResponse<AnalyticsOverviewData>>('/owner/analytics/overview', {
        params: { range },
      });
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return DEV_ANALYTICS_FIXTURE;
      }
      throw err;
    }
  }
}

export default OwnerAnalyticsService;
