/**
 * GymDeck Member Mobile - Personal Training (PT) API Service
 */

import { apiClient, normalizeAxiosError } from './client';
import { ApiResponse } from './types';
import { TrainerProfile, PTPackage, PTSession } from '../../types';
import { Logger } from '../../observability';

const DEV_TRAINER_FIXTURE: TrainerProfile = {
  id: 'trn_marcus_vance',
  name: 'Marcus Vance (CSCS)',
  specialization: 'Hypertrophy & Strength Conditioning',
  experienceYears: 8,
  bio: 'Certified Strength & Conditioning Specialist dedicated to progressive overload mechanics and sustainable athletic conditioning.',
  certifications: ['NSCA-CSCS', 'NASM-PES', 'USA Weightlifting Level 2', 'Precision Nutrition L1'],
};

const DEV_PT_PACKAGE_FIXTURE: PTPackage = {
  id: 'pt_pkg_elite_20',
  packageName: '20-Session 1-on-1 Elite Coaching',
  totalSessions: 20,
  usedSessions: 14,
  remainingSessions: 6,
  startDate: '2026-06-01T00:00:00Z',
  expiryDate: '2026-12-31T23:59:59Z',
  status: 'ACTIVE',
  trainerName: 'Marcus Vance (CSCS)',
};

const DEV_PT_SESSIONS_FIXTURE: PTSession[] = [
  {
    id: 'pts_next',
    date: '2026-08-31',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    trainerName: 'Marcus Vance (CSCS)',
    focusArea: 'Barbell Deadlift Mechanics & Pull Day',
    status: 'SCHEDULED',
    durationMinutes: 60,
    notes: 'Bring lifting straps and flat shoes.',
  },
  {
    id: 'pts_past_1',
    date: '2026-08-25',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    trainerName: 'Marcus Vance (CSCS)',
    focusArea: 'Overhead Press & Shoulder Stability',
    status: 'COMPLETED',
    durationMinutes: 60,
  },
  {
    id: 'pts_past_2',
    date: '2026-08-18',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    trainerName: 'Marcus Vance (CSCS)',
    focusArea: 'Squat Depth & Hip Mobility Assessment',
    status: 'COMPLETED',
    durationMinutes: 60,
  },
];

class PTService {
  /**
   * Fetch assigned personal trainer profile.
   */
  public async getTrainerProfile(): Promise<TrainerProfile> {
    try {
      Logger.info('[PTService] Fetching trainer profile...');
      const response = await apiClient.get<ApiResponse<TrainerProfile>>('/member/trainer');
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return DEV_TRAINER_FIXTURE;
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Fetch active PT session package status.
   */
  public async getPTPackage(): Promise<PTPackage> {
    try {
      Logger.info('[PTService] Fetching PT package details...');
      const response = await apiClient.get<ApiResponse<PTPackage>>('/member/pt-package');
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return DEV_PT_PACKAGE_FIXTURE;
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Fetch PT session history & upcoming appointments.
   */
  public async getPTSessions(): Promise<PTSession[]> {
    try {
      Logger.info('[PTService] Fetching PT sessions...');
      const response = await apiClient.get<ApiResponse<PTSession[]>>('/member/pt-sessions');
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return DEV_PT_SESSIONS_FIXTURE;
      }
      throw normalizeAxiosError(err);
    }
  }
}

export const ptService = new PTService();
export default ptService;
