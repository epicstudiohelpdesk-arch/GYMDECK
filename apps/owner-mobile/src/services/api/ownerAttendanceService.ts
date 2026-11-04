/**
 * GymDeck Owner Mobile - Attendance API Service
 */

import { apiClient } from './client';
import {
  ApiResponse,
  DailyAttendanceResponse,
  AttendanceStatsResponse,
  CheckInInput,
  ManualAttendanceInput,
  AttendanceItem,
} from '../../types';

const DEV_ATTENDANCE_ITEMS: any[] = [
  {
    id: 'att_01',
    memberId: 'm1',
    memberName: 'Marcus Vance',
    membershipPlan: 'Elite VIP Access',
    checkInTime: new Date(Date.now() - 35 * 60000).toISOString(),
    status: 'ACTIVE',
  },
  {
    id: 'att_02',
    memberId: 'm2',
    memberName: 'Elena Rostova',
    membershipPlan: 'Annual Pro Strength',
    checkInTime: new Date(Date.now() - 50 * 60000).toISOString(),
    status: 'ACTIVE',
  },
  {
    id: 'att_03',
    memberId: 'm3',
    memberName: 'David Chen',
    membershipPlan: 'Functional Athlete Pass',
    checkInTime: new Date(Date.now() - 95 * 60000).toISOString(),
    checkOutTime: new Date(Date.now() - 10 * 60000).toISOString(),
    status: 'CHECKED_OUT',
  },
];

const DEV_ATTENDANCE_STATS: any = {
  activeNow: 42,
  totalToday: 218,
  peakHour: '18:00 - 19:00',
  averageDurationMinutes: 68,
};

export class OwnerAttendanceService {
  /**
   * 1. Get Daily Attendance List & Search
   */
  public static async getDailyAttendance(
    date?: string,
    limit = 50,
    offset = 0,
    query?: string
  ): Promise<DailyAttendanceResponse> {
    try {
      const response = await apiClient.get<ApiResponse<DailyAttendanceResponse>>(
        '/owner/attendance',
        {
          params: {
            date,
            limit,
            offset,
            query: query?.trim() || undefined,
          },
        }
      );
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return {
          items: DEV_ATTENDANCE_ITEMS,
          total: DEV_ATTENDANCE_ITEMS.length,
          activeNow: 42,
          date: date || new Date().toISOString().split('T')[0],
        } as any;
      }
      throw err;
    }
  }

  /**
   * 2. Check In Member (1-Tap / Code Lookup)
   */
  public static async checkInMember(data: CheckInInput): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      '/owner/attendance/check-in',
      data
    );
    return response.data.data;
  }

  /**
   * 3. Record Manual Attendance
   */
  public static async recordManualAttendance(data: ManualAttendanceInput): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      '/owner/attendance/manual',
      data
    );
    return response.data.data;
  }

  /**
   * 4. Member Check-Out
   */
  public static async checkOutMember(
    attendanceId: string,
    checkOutTime?: string
  ): Promise<AttendanceItem> {
    const response = await apiClient.patch<ApiResponse<AttendanceItem>>(
      `/owner/attendance/${attendanceId}/checkout`,
      { checkOutTime }
    );
    return response.data.data;
  }

  /**
   * 5. Get Attendance Stats & KPIs
   */
  public static async getAttendanceStats(date?: string): Promise<AttendanceStatsResponse> {
    try {
      const response = await apiClient.get<ApiResponse<AttendanceStatsResponse>>(
        '/owner/attendance/stats',
        { params: { date } }
      );
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return DEV_ATTENDANCE_STATS;
      }
      throw err;
    }
  }
}
