/**
 * GymDeck Member Mobile - Fitness Progress & Measurements API Service
 */

import { apiClient, normalizeAxiosError } from './client';
import { ApiResponse } from './types';
import { WeightLog, BodyMeasurement, FitnessMilestone } from '../../types';
import { Logger } from '../../observability';

const DEV_WEIGHT_HISTORY_FIXTURES: WeightLog[] = [
  { id: 'wt_1', date: '2026-08-28', weightKg: 78.2, bmi: 23.6 },
  { id: 'wt_2', date: '2026-08-21', weightKg: 78.8, bmi: 23.8 },
  { id: 'wt_3', date: '2026-08-14', weightKg: 79.4, bmi: 24.0 },
  { id: 'wt_4', date: '2026-08-07', weightKg: 80.1, bmi: 24.2 },
  { id: 'wt_5', date: '2026-07-31', weightKg: 80.8, bmi: 24.4 },
];

const DEV_BODY_MEASUREMENTS_FIXTURES: BodyMeasurement[] = [
  {
    id: 'bm_1',
    date: '2026-08-28',
    chestCm: 104,
    waistCm: 81,
    armsCm: 39.5,
    thighsCm: 60,
    hipsCm: 98,
  },
  {
    id: 'bm_2',
    date: '2026-07-28',
    chestCm: 102,
    waistCm: 84,
    armsCm: 38.5,
    thighsCm: 59,
    hipsCm: 99,
  },
];

const DEV_MILESTONES_FIXTURES: FitnessMilestone[] = [
  {
    id: 'ms_1',
    title: '4-Day Consistency Streak',
    description: 'Checked into the gym 4 consecutive training days this week.',
    achievedDate: '2026-08-28T07:30:00Z',
    category: 'STREAK',
  },
  {
    id: 'ms_2',
    title: '5,000 kg Volume Milestone',
    description: 'Lifted over 5,000 kg total workload in a single workout session.',
    achievedDate: '2026-08-26T19:25:00Z',
    category: 'VOLUME',
  },
  {
    id: 'ms_3',
    title: 'Goal Weight: -2.6 kg Reached',
    description: 'Successfully reached target body weight of 78.2 kg.',
    achievedDate: '2026-08-21T08:00:00Z',
    category: 'WEIGHT',
  },
];

class ProgressService {
  /**
   * Fetch weight tracking history.
   */
  public async getWeightHistory(): Promise<WeightLog[]> {
    try {
      Logger.info('[ProgressService] Fetching weight history...');
      const response = await apiClient.get<ApiResponse<WeightLog[]>>('/member/progress/weight');
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return DEV_WEIGHT_HISTORY_FIXTURES;
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Log new body weight entry.
   */
  public async logWeight(weightKg: number): Promise<WeightLog> {
    try {
      Logger.info('[ProgressService] Logging weight entry...', { weightKg });
      const response = await apiClient.post<ApiResponse<WeightLog>>('/member/progress/weight', {
        weightKg,
      });
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return {
          id: `wt_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          weightKg,
          bmi: 23.5,
        };
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Fetch body measurements history.
   */
  public async getBodyMeasurements(): Promise<BodyMeasurement[]> {
    try {
      Logger.info('[ProgressService] Fetching body measurements...');
      const response = await apiClient.get<ApiResponse<BodyMeasurement[]>>(
        '/member/progress/measurements'
      );
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return DEV_BODY_MEASUREMENTS_FIXTURES;
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Log body measurements.
   */
  public async logBodyMeasurement(data: Partial<BodyMeasurement>): Promise<BodyMeasurement> {
    try {
      Logger.info('[ProgressService] Logging body measurement...', { data });
      const response = await apiClient.post<ApiResponse<BodyMeasurement>>(
        '/member/progress/measurements',
        data
      );
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return {
          id: `bm_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          ...data,
        };
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Fetch fitness milestones & achievements.
   */
  public async getMilestones(): Promise<FitnessMilestone[]> {
    try {
      Logger.info('[ProgressService] Fetching milestones...');
      const response = await apiClient.get<ApiResponse<FitnessMilestone[]>>(
        '/member/progress/milestones'
      );
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return DEV_MILESTONES_FIXTURES;
      }
      throw normalizeAxiosError(err);
    }
  }
}

export const progressService = new ProgressService();
export default progressService;
