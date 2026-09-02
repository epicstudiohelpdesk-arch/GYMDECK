/**
 * GymDeck Owner Mobile - Membership Lifecycle API Service
 */

import { apiClient } from './client';
import {
  ApiResponse,
  MembershipLifecycleItem,
  ExpiringMembershipItem,
  MembershipLifecycleStats,
  FreezeMembershipInput,
} from '../../types';

export class OwnerMembershipService {
  /**
   * 1. Get Current Active/Latest Membership for a Member
   */
  public static async getCurrentMembership(memberId: string): Promise<MembershipLifecycleItem | null> {
    const response = await apiClient.get<ApiResponse<{ membership: MembershipLifecycleItem | null }>>(
      `/owner/members/${memberId}/memberships/current`
    );
    return response.data.data.membership;
  }

  /**
   * 2. Get Membership History Timeline
   */
  public static async getMembershipHistory(
    memberId: string,
    limit = 50,
    offset = 0
  ): Promise<{ items: MembershipLifecycleItem[]; totalCount: number }> {
    const response = await apiClient.get<ApiResponse<{ items: MembershipLifecycleItem[]; totalCount: number }>>(
      `/owner/members/${memberId}/memberships`,
      { params: { limit, offset } }
    );
    return response.data.data;
  }

  /**
   * 3. Freeze Membership Subscription
   */
  public static async freezeMembership(
    memberId: string,
    membershipId: string,
    data: FreezeMembershipInput
  ): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/owner/members/${memberId}/memberships/${membershipId}/freeze`,
      data
    );
    return response.data.data;
  }

  /**
   * 4. Unfreeze Membership Subscription
   */
  public static async unfreezeMembership(
    memberId: string,
    membershipId: string
  ): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/owner/members/${memberId}/memberships/${membershipId}/unfreeze`
    );
    return response.data.data;
  }

  /**
   * 5. Get Expiring Memberships List
   */
  public static async getExpiringMemberships(
    daysAhead = 7,
    limit = 50,
    offset = 0
  ): Promise<{ items: ExpiringMembershipItem[]; totalCount: number }> {
    const response = await apiClient.get<ApiResponse<{ items: ExpiringMembershipItem[]; totalCount: number }>>(
      '/owner/memberships/expiring',
      { params: { daysAhead, limit, offset } }
    );
    return response.data.data;
  }

  /**
   * 6. Get Membership Lifecycle Stats
   */
  public static async getMembershipLifecycleStats(): Promise<MembershipLifecycleStats> {
    const response = await apiClient.get<ApiResponse<MembershipLifecycleStats>>(
      '/owner/memberships/stats'
    );
    return response.data.data;
  }
}
