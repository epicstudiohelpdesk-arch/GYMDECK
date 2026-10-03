/**
 * GymDeck Owner Mobile - Billing, Ledger & Membership API Service
 */

import { apiClient } from './client';
import {
  ApiResponse,
  MembershipPlanSummary,
  MemberActiveMembership,
  PurchaseMembershipInput,
  RecordPaymentInput,
  MemberBillingSummary,
  ReceiptData,
  PaymentRecord,
} from '../../types';

export class OwnerBillingService {
  /**
   * 1. Get Membership Plans
   */
  public static async getPlans(includeInactive = false): Promise<MembershipPlanSummary[]> {
    const response = await apiClient.get<ApiResponse<{ plans: MembershipPlanSummary[] }>>(
      '/owner/plans',
      { params: { includeInactive } }
    );
    return response.data.data.plans;
  }

  /**
   * 2. Purchase / Assign Membership
   */
  public static async purchaseMembership(
    memberId: string,
    data: PurchaseMembershipInput
  ): Promise<{ membership: MemberActiveMembership; payment?: PaymentRecord }> {
    const response = await apiClient.post<
      ApiResponse<{ membership: MemberActiveMembership; payment?: PaymentRecord }>
    >(`/owner/members/${memberId}/memberships`, data);
    return response.data.data;
  }

  /**
   * 3. Renew Membership
   */
  public static async renewMembership(
    memberId: string,
    data: PurchaseMembershipInput
  ): Promise<{ membership: MemberActiveMembership; payment?: PaymentRecord }> {
    const response = await apiClient.post<
      ApiResponse<{ membership: MemberActiveMembership; payment?: PaymentRecord }>
    >(`/owner/members/${memberId}/memberships/renew`, data);
    return response.data.data;
  }

  /**
   * 4. Get Member Billing Summary & Balances
   */
  public static async getMemberBilling(memberId: string): Promise<MemberBillingSummary> {
    const response = await apiClient.get<ApiResponse<MemberBillingSummary>>(
      `/owner/members/${memberId}/billing`
    );
    return response.data.data;
  }

  /**
   * 5. Record Payment / Collect Dues
   */
  public static async recordPayment(
    memberId: string,
    data: RecordPaymentInput
  ): Promise<PaymentRecord> {
    const response = await apiClient.post<ApiResponse<{ payment: PaymentRecord }>>(
      `/owner/members/${memberId}/payments`,
      data
    );
    return response.data.data.payment;
  }

  /**
   * 6. Get Payment Receipt
   */
  public static async getReceipt(paymentId: string): Promise<ReceiptData> {
    const response = await apiClient.get<ApiResponse<ReceiptData>>(
      `/owner/payments/${paymentId}/receipt`
    );
    return response.data.data;
  }

  /**
   * 7. Get Financial Dashboard Metrics
   */
  public static async getFinancialDashboard(): Promise<{
    todayRevenue: number;
    monthRevenue: number;
    activeMembershipsCount: number;
    expiringSoonCount: number;
  }> {
    const response = await apiClient.get<
      ApiResponse<{
        todayRevenue: number;
        monthRevenue: number;
        activeMembershipsCount: number;
        expiringSoonCount: number;
      }>
    >('/owner/billing/dashboard');
    return response.data.data;
  }

  /**
   * 8. Refund Payment / Ledger Reversal
   */
  public static async refundPayment(
    paymentId: string,
    data: { refundAmount?: number; reason: string; notes?: string }
  ): Promise<PaymentRecord> {
    const response = await apiClient.post<ApiResponse<{ refund: PaymentRecord }>>(
      `/owner/payments/${paymentId}/refund`,
      {
        ...data,
        idempotencyKey: `REFUND-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      }
    );
    return response.data.data.refund;
  }
}
