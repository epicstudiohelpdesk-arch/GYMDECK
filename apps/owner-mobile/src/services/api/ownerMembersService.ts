/**
 * GymDeck Owner Mobile - Member Management API Service
 */

import { apiClient } from './client';
import {
  ApiResponse,
  GymMemberSummary,
  MemberProfileData,
  CreateMemberInput,
  UpdateMemberInput,
  MemberInvitationResult,
  MembershipPlanSummary,
  AttendanceRecord,
  PaymentRecord,
  MemberActiveMembership,
} from '../../types';

export class OwnerMembersService {
  /**
   * 1. Get Paginated Member Directory
   */
  public static async getMembers(
    query?: string,
    status: string = 'ALL',
    limit = 50,
    offset = 0
  ): Promise<{ members: GymMemberSummary[]; total: number }> {
    const response = await apiClient.get<ApiResponse<{ members: GymMemberSummary[]; total: number }>>(
      '/owner/members',
      {
        params: { query: query || undefined, status, limit, offset },
      }
    );
    return response.data.data;
  }

  /**
   * 2. Get Comprehensive Member Profile
   */
  public static async getMemberById(id: string): Promise<MemberProfileData> {
    const response = await apiClient.get<ApiResponse<MemberProfileData>>(`/owner/members/${id}`);
    return response.data.data;
  }

  /**
   * 3. Create New Member
   */
  public static async createMember(data: CreateMemberInput): Promise<GymMemberSummary> {
    const response = await apiClient.post<ApiResponse<{ member: GymMemberSummary }>>(
      '/owner/members',
      data
    );
    return response.data.data.member;
  }

  /**
   * 4. Update Member Profile
   */
  public static async updateMember(id: string, data: UpdateMemberInput): Promise<GymMemberSummary> {
    const response = await apiClient.patch<ApiResponse<{ member: GymMemberSummary }>>(
      `/owner/members/${id}`,
      data
    );
    return response.data.data.member;
  }

  /**
   * 5. Deactivate Member
   */
  public static async deleteMember(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<ApiResponse<{ success: boolean; message: string }>>(
      `/owner/members/${id}`
    );
    return response.data.data;
  }

  /**
   * 6. Get Member Attendance History
   */
  public static async getMemberAttendance(
    id: string,
    limit = 50,
    offset = 0
  ): Promise<{ attendance: AttendanceRecord[]; total: number }> {
    const response = await apiClient.get<ApiResponse<{ attendance: AttendanceRecord[]; total: number }>>(
      `/owner/members/${id}/attendance`,
      { params: { limit, offset } }
    );
    return response.data.data;
  }

  /**
   * 7. Get Member Payment History
   */
  public static async getMemberPayments(
    id: string,
    limit = 50,
    offset = 0
  ): Promise<{ payments: PaymentRecord[]; total: number }> {
    const response = await apiClient.get<ApiResponse<{ payments: PaymentRecord[]; total: number }>>(
      `/owner/members/${id}/payments`,
      { params: { limit, offset } }
    );
    return response.data.data;
  }

  /**
   * 8. Get Member Memberships History
   */
  public static async getMemberMemberships(id: string): Promise<MemberActiveMembership[]> {
    const response = await apiClient.get<ApiResponse<{ memberships: MemberActiveMembership[] }>>(
      `/owner/members/${id}/memberships`
    );
    return response.data.data.memberships;
  }

  /**
   * 9. Get Available Plans for Admission
   */
  public static async getPlans(): Promise<MembershipPlanSummary[]> {
    const response = await apiClient.get<ApiResponse<{ plans: MembershipPlanSummary[] }>>('/owner/plans');
    return response.data.data.plans;
  }

  /**
   * 10. Generate Member Activation Invite Token
   */
  public static async generateInvite(memberId: string): Promise<MemberInvitationResult> {
    const response = await apiClient.post<ApiResponse<MemberInvitationResult>>(
      `/owner/members/${memberId}/invite`
    );
    return response.data.data;
  }
}
