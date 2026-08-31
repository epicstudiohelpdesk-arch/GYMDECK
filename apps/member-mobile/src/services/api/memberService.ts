/**
 * GymDeck Member Mobile - Member API Service
 * 
 * Manages all member domain network calls:
 * - Aggregated Dashboard
 * - Membership Details & History
 * - Short-lived Check-in QR Pass & Check-in Submission
 * - Workout Routines & Exercise Details
 * - Profile Management
 */

import { apiClient, normalizeAxiosError } from './client';
import { ApiResponse } from './types';
import {
  MemberDashboardData,
  MemberMembership,
  AttendanceSummary,
  WorkoutRoutine,
  UserProfile,
  OutstandingDues,
} from '../../types';
import { Logger } from '../../observability';
import { AppError } from '../../errors';

export interface CheckInPassData {
  passToken: string;
  memberCode: string;
  memberName: string;
  gymName: string;
  expiresAt: string;
  refreshIntervalSeconds: number;
}

export interface CheckInResult {
  success: boolean;
  checkInTime: string;
  gymName: string;
  message: string;
}

// Development Fixtures for Offline UI Prototyping (Strictly isolated)
const DEV_DASHBOARD_FIXTURE: MemberDashboardData = {
  member: {
    id: 'mem_dev_1001',
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
  gym: {
    id: 'gym_dev_nyc',
    name: 'Iron Forge Fitness - Downtown',
    code: 'GD-NYC-101',
    address: '450 Lexington Ave, New York, NY 10017',
    phone: '+1 (212) 555-0199',
    email: 'support@ironforgegym.com',
  },
  membership: {
    id: 'ms_dev_annual',
    planId: 'plan_annual_elite',
    planName: '12-Month Elite Annual',
    status: 'ACTIVE',
    startDate: '2026-01-15T00:00:00Z',
    expiresAt: '2027-01-15T23:59:59Z',
    daysRemaining: 139,
    isExpiringSoon: false,
    price: 899.0,
    features: [
      'Unlimited 24/7 Gym Floor Access',
      'All Group Fitness & HIIT Classes',
      'Steam Room & Sauna Access',
      '2 Guest Passes per Month',
      'Complimentary Locker & Towel Service',
    ],
  },
  attendanceSummary: {
    totalCheckinsThisMonth: 19,
    currentStreak: 4,
    lastCheckin: '2026-08-28T07:30:00Z',
    history: [
      { id: 'att_1', checkInTime: '2026-08-28T07:30:00Z', method: 'QR', location: 'Turnstile A' },
      { id: 'att_2', checkInTime: '2026-08-27T18:15:00Z', method: 'QR', location: 'Front Desk' },
      { id: 'att_3', checkInTime: '2026-08-25T07:45:00Z', method: 'QR', location: 'Turnstile B' },
      { id: 'att_4', checkInTime: '2026-08-24T17:50:00Z', method: 'QR', location: 'Front Desk' },
      { id: 'att_5', checkInTime: '2026-08-22T08:00:00Z', method: 'QR', location: 'Turnstile A' },
    ],
  },
  todayWorkout: {
    id: 'wk_chest_hypertrophy',
    title: 'Chest & Triceps Hypertrophy',
    dayOfWeek: 'Saturday',
    muscleGroups: ['Chest', 'Triceps', 'Front Delts'],
    exerciseCount: 5,
    estimatedMinutes: 50,
    assignedByTrainerName: 'Marcus Vance (CSCS)',
    exercises: [
      { id: 'ex_1', name: 'Incline Barbell Bench Press', targetMuscle: 'Upper Chest', sets: 4, reps: '8-10', weightRecommendation: '75-80% 1RM' },
      { id: 'ex_2', name: 'Flat Dumbbell Press', targetMuscle: 'Mid Chest', sets: 3, reps: '10-12', weightRecommendation: 'Moderate-Heavy' },
      { id: 'ex_3', name: 'Cable Chest Flyes (Low to High)', targetMuscle: 'Lower & Inner Chest', sets: 3, reps: '12-15' },
      { id: 'ex_4', name: 'Overhead Rope Tricep Extension', targetMuscle: 'Triceps Long Head', sets: 4, reps: '12-15' },
      { id: 'ex_5', name: 'Weighted Dips', targetMuscle: 'Chest & Triceps', sets: 3, reps: 'Failure' },
    ],
  },
  outstandingDues: {
    hasDues: false,
    amount: 0.0,
    currency: '$',
  },
  unreadNotificationCount: 2,
};

class MemberService {
  /**
   * Fetch aggregated member dashboard in a single round-trip.
   */
  public async getDashboard(): Promise<MemberDashboardData> {
    try {
      Logger.info('[MemberService] Fetching aggregated dashboard data...');
      const response = await apiClient.get<ApiResponse<MemberDashboardData>>('/member/dashboard');
      return response.data.data;
    } catch (err) {
      Logger.warn('[MemberService] Live dashboard request failed. Using development fixture fallback.', { error: err });
      if (__DEV__) {
        return DEV_DASHBOARD_FIXTURE;
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Fetch active membership details and plan benefits.
   */
  public async getMembership(): Promise<MemberMembership> {
    try {
      Logger.info('[MemberService] Fetching membership details...');
      const response = await apiClient.get<ApiResponse<MemberMembership>>('/member/membership');
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return DEV_DASHBOARD_FIXTURE.membership;
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Fetch short-lived QR check-in pass token.
   */
  public async getCheckInPass(): Promise<CheckInPassData> {
    try {
      Logger.info('[MemberService] Requesting short-lived QR check-in pass...');
      const response = await apiClient.get<ApiResponse<CheckInPassData>>('/member/check-in-pass');
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        const expires = new Date(Date.now() + 1000 * 60 * 5).toISOString();
        return {
          passToken: `GD_PASS_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          memberCode: 'GD-1001',
          memberName: 'Alex Morgan',
          gymName: 'Iron Forge Fitness - Downtown',
          expiresAt: expires,
          refreshIntervalSeconds: 300,
        };
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Submit check-in verification via pass token.
   */
  public async checkIn(passToken: string): Promise<CheckInResult> {
    try {
      Logger.info('[MemberService] Submitting check-in pass token...', { passToken });
      const response = await apiClient.post<ApiResponse<CheckInResult>>('/member/check-in', {
        passToken,
      });
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return {
          success: true,
          checkInTime: new Date().toISOString(),
          gymName: 'Iron Forge Fitness - Downtown',
          message: 'Welcome to Iron Forge Fitness! Check-in verified.',
        };
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Fetch assigned workout programs and exercise library.
   */
  public async getWorkouts(): Promise<WorkoutRoutine[]> {
    try {
      Logger.info('[MemberService] Fetching workout routines...');
      const response = await apiClient.get<ApiResponse<WorkoutRoutine[]>>('/member/workouts');
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return [
          DEV_DASHBOARD_FIXTURE.todayWorkout!,
          {
            id: 'wk_back_biceps',
            title: 'Back, Lats & Biceps Pull Day',
            dayOfWeek: 'Monday',
            muscleGroups: ['Lats', 'Upper Back', 'Biceps'],
            exerciseCount: 5,
            estimatedMinutes: 55,
            assignedByTrainerName: 'Marcus Vance (CSCS)',
            exercises: [
              { id: 'ex_b1', name: 'Deadlifts (Conventional)', targetMuscle: 'Posterior Chain', sets: 4, reps: '5-6', weightRecommendation: '80% 1RM' },
              { id: 'ex_b2', name: 'Lat Pulldowns (Wide Grip)', targetMuscle: 'Latissimus Dorsi', sets: 3, reps: '10-12' },
              { id: 'ex_b3', name: 'Single-Arm Dumbbell Rows', targetMuscle: 'Mid Back', sets: 3, reps: '10-12' },
              { id: 'ex_b4', name: 'Barbell EZ-Bar Bicep Curls', targetMuscle: 'Biceps Brachii', sets: 3, reps: '12' },
              { id: 'ex_b5', name: 'Incline Dumbbell Hammer Curls', targetMuscle: 'Brachialis', sets: 3, reps: '12-15' },
            ],
          },
          {
            id: 'wk_legs_core',
            title: 'Lower Body Quad & Hamstring Focus',
            dayOfWeek: 'Wednesday',
            muscleGroups: ['Quadriceps', 'Hamstrings', 'Calves', 'Core'],
            exerciseCount: 5,
            estimatedMinutes: 60,
            assignedByTrainerName: 'Marcus Vance (CSCS)',
            exercises: [
              { id: 'ex_l1', name: 'Barbell Back Squats', targetMuscle: 'Quadriceps & Glutes', sets: 4, reps: '6-8' },
              { id: 'ex_l2', name: 'Romanian Deadlifts (RDL)', targetMuscle: 'Hamstrings', sets: 3, reps: '8-10' },
              { id: 'ex_l3', name: 'Leg Press (Foot Placed Low)', targetMuscle: 'Quads', sets: 3, reps: '12-15' },
              { id: 'ex_l4', name: 'Seated Leg Curl', targetMuscle: 'Hamstrings', sets: 3, reps: '15' },
              { id: 'ex_l5', name: 'Standing Calf Raises', targetMuscle: 'Gastrocnemius', sets: 4, reps: '15-20' },
            ],
          },
        ];
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Fetch member profile.
   */
  public async getProfile(): Promise<UserProfile> {
    try {
      Logger.info('[MemberService] Fetching member profile...');
      const response = await apiClient.get<ApiResponse<UserProfile>>('/member/profile');
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return DEV_DASHBOARD_FIXTURE.member;
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Update member profile information.
   */
  public async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    try {
      Logger.info('[MemberService] Updating member profile...', { data });
      const response = await apiClient.patch<ApiResponse<UserProfile>>('/member/profile', data);
      return response.data.data;
    } catch (err) {
      throw normalizeAxiosError(err);
    }
  }
}

export const memberService = new MemberService();
export default memberService;
