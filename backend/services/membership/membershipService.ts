/**
 * GymDeck Cloud Backend - Membership Domain Service
 */

import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../shared/database';
import { memberMemberships, membershipPlans, gymMembers } from '../../shared/database/schema';
import { AppError } from '../../shared/errors';

export interface MembershipDetailsResponse {
  id: string;
  planId: string;
  planName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED' | 'PENDING';
  startDate: string;
  endDate: string;
  daysRemaining: number;
  durationDays: number;
  price: string;
  benefits: string[];
  autoRenew: boolean;
}

export class MembershipService {
  /**
   * Get active/current membership details for the authenticated member with tenant isolation
   */
  public async getMemberMembership(gymId: string, memberId: string): Promise<MembershipDetailsResponse> {
    // 1. Verify member exists in gym
    const memberRecords = await db
      .select()
      .from(gymMembers)
      .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId)))
      .limit(1);

    if (memberRecords.length === 0) {
      throw AppError.notFound('Member profile not found for this gym tenant.');
    }

    // 2. Fetch latest membership record
    const memberships = await db
      .select({
        membership: memberMemberships,
        plan: membershipPlans,
      })
      .from(memberMemberships)
      .innerJoin(membershipPlans, eq(memberMemberships.planId, membershipPlans.id))
      .where(
        and(
          eq(memberMemberships.gymId, gymId),
          eq(memberMemberships.memberId, memberId),
          eq(membershipPlans.gymId, gymId) // Tenant isolation cross-check
        )
      )
      .orderBy(desc(memberMemberships.endDate))
      .limit(1);

    if (memberships.length === 0) {
      // Return default pending / unassigned membership state
      return {
        id: '',
        planId: '',
        planName: 'No Active Plan',
        status: 'PENDING',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        daysRemaining: 0,
        durationDays: 0,
        price: '0.00',
        benefits: [],
        autoRenew: false,
      };
    }

    const { membership, plan } = memberships[0]!;
    const now = new Date();
    const endDate = new Date(membership.endDate);

    // Dynamic status calculation
    let calculatedStatus: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED' | 'PENDING' = membership.status as any;
    if (membership.status === 'ACTIVE' && endDate < now) {
      calculatedStatus = 'EXPIRED';
    }

    const diffTime = endDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    let parsedBenefits: string[] = [];
    if (plan.benefits) {
      try {
        parsedBenefits = JSON.parse(plan.benefits);
      } catch {
        parsedBenefits = [plan.benefits];
      }
    }

    return {
      id: membership.id,
      planId: plan.id,
      planName: plan.planName,
      status: calculatedStatus,
      startDate: membership.startDate.toISOString(),
      endDate: membership.endDate.toISOString(),
      daysRemaining,
      durationDays: plan.durationDays,
      price: plan.price,
      benefits: parsedBenefits,
      autoRenew: membership.autoRenew,
    };
  }
}

export const membershipService = new MembershipService();
export default membershipService;
