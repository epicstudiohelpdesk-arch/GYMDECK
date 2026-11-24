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

const DEV_MEMBERS: any[] = [
  {
    id: 'm1',
    memberCode: 'GD-1001',
    fullName: 'Marcus Vance',
    email: 'marcus.v@example.com',
    phone: '+1-555-0101',
    phoneNumber: '+1-555-0101',
    membershipStatus: 'ACTIVE',
    status: 'ACTIVE',
    membershipPlan: 'Elite VIP Access',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    joinedAt: '2026-01-15T09:00:00Z',
    joinedDate: '2026-01-15',
    lastCheckIn: new Date(Date.now() - 35 * 60000).toISOString(),
    daysRemaining: 180,
  },
  {
    id: 'm2',
    memberCode: 'GD-1002',
    fullName: 'Elena Rostova',
    email: 'elena.r@example.com',
    phone: '+1-555-0102',
    phoneNumber: '+1-555-0102',
    membershipStatus: 'ACTIVE',
    status: 'ACTIVE',
    membershipPlan: 'Annual Pro Strength',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    joinedAt: '2026-02-10T09:00:00Z',
    joinedDate: '2026-02-10',
    lastCheckIn: new Date(Date.now() - 50 * 60000).toISOString(),
    daysRemaining: 215,
  },
  {
    id: 'm3',
    memberCode: 'GD-1003',
    fullName: 'David Chen',
    email: 'david.c@example.com',
    phone: '+1-555-0103',
    phoneNumber: '+1-555-0103',
    membershipStatus: 'ACTIVE',
    status: 'ACTIVE',
    membershipPlan: 'Functional Athlete Pass',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    joinedAt: '2026-03-01T09:00:00Z',
    joinedDate: '2026-03-01',
    lastCheckIn: new Date(Date.now() - 95 * 60000).toISOString(),
    daysRemaining: 45,
  },
  {
    id: 'm4',
    memberCode: 'GD-1004',
    fullName: 'Sophia Martinez',
    email: 'sophia.m@example.com',
    phone: '+1-555-0104',
    phoneNumber: '+1-555-0104',
    membershipStatus: 'ACTIVE',
    status: 'EXPIRING_SOON',
    membershipPlan: 'Quarterly Cardio Plus',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    joinedAt: '2025-11-20T09:00:00Z',
    joinedDate: '2025-11-20',
    lastCheckIn: '2026-11-03T16:20:00Z',
    daysRemaining: 5,
  },
];

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
    try {
      const response = await apiClient.get<ApiResponse<{ members: GymMemberSummary[]; total: number }>>(
        '/owner/members',
        {
          params: { query: query || undefined, status, limit, offset },
        }
      );
      return response.data.data;
    } catch (err) {
      if (__DEV__) {
        return {
          members: DEV_MEMBERS,
          total: DEV_MEMBERS.length,
        } as any;
      }
      throw err;
    }
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
