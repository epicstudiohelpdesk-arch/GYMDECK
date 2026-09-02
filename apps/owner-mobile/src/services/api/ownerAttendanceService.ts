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
    const response = await apiClient.get<ApiResponse<AttendanceStatsResponse>>(
      '/owner/attendance/stats',
      { params: { date } }
    );
    return response.data.data;
  }
}
