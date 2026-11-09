/**
 * GymDeck Cloud Backend - Membership, Billing & Financial Ledger Service
 */

import * as crypto from 'crypto';
import { eq, and, isNull, sql, desc, count } from 'drizzle-orm';
import { db, getDatabasePool } from '../../shared/database';
import {
  gyms,
  gymMembers,
  membershipPlans,
  memberMemberships,
  payments,
  auditLogs,
  syncChangeLog,
  syncIdempotencyLog,
} from '../../shared/database/schema';
import { AppError } from '../../shared/errors';
import { toMinorUnits, fromMinorUnits, minorUnitsToNumber } from '../../shared/utils/money';
import { getGymPaymentSettings } from '../payments/invoiceService';
import { paymentAccountService } from '../payments/accountService';

// ==============================================================================
// DTOs & Interfaces
// ==============================================================================

export interface CreatePlanDto {
  planName: string;
  durationDays: number;
  price: number;
  description?: string;
  benefits?: string[];
}

export interface UpdatePlanDto {
  planName?: string;
  durationDays?: number;
  price?: number;
  description?: string;
  benefits?: string[];
  isActive?: boolean;
}

export interface PurchaseMembershipDto {
  planId: string;
  startDate?: string;
  paymentAmount?: number;
  paymentMethod?: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  transactionReference?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface RecordPaymentDto {
  membershipId?: string;
  amount: number;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  transactionReference?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface RefundPaymentDto {
  reason: string;
  refundAmount?: number;
}

export interface ReceiptData {
  receiptNumber: string;
  issuedAt: string;
  gym: {
    name: string;
    code: string;
  };
  member: {
    id: string;
    fullName: string;
    memberCode: string;
    phone: string;
    email: string | null;
  };
  membership: {
    planName: string;
    durationDays: number;
    startDate: string;
    endDate: string;
  } | null;
  payment: {
    id: string;
    amount: string;
    paymentMethod: string;
    transactionReference: string | null;
    status: string;
    type: string;
    paidAt: string;
  };
  notes: string | null;
}

export interface MemberBillingSummary {
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
  totalBilledMinorUnits?: number;
  totalPaidMinorUnits?: number;
  outstandingBalanceMinorUnits?: number;
  invoices?: any[];
  outstandingInvoicesMinor?: number;
  activeMembership: any | null;
  recentPayments: any[];
}

type Tx = any;

/** Creates an OPEN invoice inside an existing transaction and returns its id. */
async function insertInvoiceTx(
  tx: Tx,
  gymId: string,
  memberId: string,
  membershipId: string,
  totalMinor: number,
  description: string
): Promise<string> {
  const year = new Date().getFullYear();
  const countRes = await tx.execute(
    sql`SELECT COUNT(*)::int AS c FROM invoices WHERE gym_id = ${gymId} AND invoice_number LIKE ${`INV-${year}-%`}`
  );
  const seq = Number(countRes.rows?.[0]?.c || 0) + 1;
  const invoiceNumber = `INV-${year}-${String(seq).padStart(6, '0')}`;
  const inserted = await tx.execute(
    sql`INSERT INTO invoices (gym_id, member_id, membership_id, invoice_number, total_minor, status, description)
        VALUES (${gymId}, ${memberId}, ${membershipId}, ${invoiceNumber}, ${totalMinor}, 'OPEN', ${description})
        RETURNING id`
  );
  return inserted.rows[0].id as string;
}

/** Allocates a recorded payment to an invoice and recalculates its status. */
async function allocatePaymentTx(
  tx: Tx,
  gymId: string,
  paymentId: string,
  invoiceId: string,
  amountMinor: number
): Promise<void> {
  await tx.execute(
    sql`INSERT INTO payment_allocations (gym_id, payment_id, invoice_id, amount_minor)
        VALUES (${gymId}, ${paymentId}, ${invoiceId}, ${amountMinor})`
  );
  await tx.execute(
    sql`UPDATE invoices SET
          paid_minor = paid_minor + ${amountMinor},
          status = CASE
            WHEN paid_minor + ${amountMinor} >= total_minor THEN 'PAID'
            ELSE 'PARTIALLY_PAID'
          END,
          updated_at = NOW()
        WHERE id = ${invoiceId} AND gym_id = ${gymId}`
  );
}

export class BillingService {  /**
   * 1. List Membership Plans for a Gym
   */
  public async getPlans(gymId: string, includeInactive = false): Promise<any[]> {
    const conditions = [
      eq(membershipPlans.gymId, gymId),
      isNull(membershipPlans.deletedAt),
    ];

    if (!includeInactive) {
      conditions.push(eq(membershipPlans.isActive, true));
    }

    return await db
      .select()
      .from(membershipPlans)
      .where(and(...conditions))
      .orderBy(membershipPlans.price);
  }

  /**
   * 2. Create Membership Plan
   */
  public async createPlan(gymId: string, dto: CreatePlanDto, actorUserId?: string): Promise<any> {
    const cleanName = dto.planName.trim();
    if (!cleanName || cleanName.length < 2) {
      throw AppError.validation('Plan name must be at least 2 characters.');
    }
    if (dto.durationDays <= 0) {
      throw AppError.validation('Duration must be greater than 0 days.');
    }
    if (dto.price < 0) {
      throw AppError.validation('Price cannot be negative.');
    }

    return await db.transaction(async (tx) => {
      const [plan] = await tx
        .insert(membershipPlans)
        .values({
          gymId,
          planName: cleanName,
          durationDays: dto.durationDays,
          price: dto.price.toFixed(2),
          description: dto.description?.trim() || null,
          benefits: dto.benefits ? JSON.stringify(dto.benefits) : null,
          isActive: true,
        })
        .returning();

      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'PLAN_CREATED',
        resource: 'membership_plan',
        resourceId: plan!.id,
        metadata: JSON.stringify({ planName: cleanName, price: dto.price, actorUserId }),
      });

      return plan;
    });
  }

  /**
   * 3. Update Membership Plan
   */
  public async updatePlan(
    gymId: string,
    planId: string,
    dto: UpdatePlanDto,
    actorUserId?: string
  ): Promise<any> {
    const existing = (
      await db
        .select()
        .from(membershipPlans)
        .where(
          and(
            eq(membershipPlans.id, planId),
            eq(membershipPlans.gymId, gymId),
            isNull(membershipPlans.deletedAt)
          )
        )
        .limit(1)
    )[0];

    if (!existing) {
      throw AppError.notFound('Membership plan not found.');
    }

    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (dto.planName !== undefined) updates.planName = dto.planName.trim();
    if (dto.durationDays !== undefined) updates.durationDays = dto.durationDays;
    if (dto.price !== undefined) updates.price = dto.price.toFixed(2);
    if (dto.description !== undefined) updates.description = dto.description.trim();
    if (dto.benefits !== undefined) updates.benefits = JSON.stringify(dto.benefits);
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;

    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(membershipPlans)
        .set(updates)
        .where(and(eq(membershipPlans.id, planId), eq(membershipPlans.gymId, gymId)))
        .returning();

      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'PLAN_UPDATED',
        resource: 'membership_plan',
        resourceId: planId,
        metadata: JSON.stringify({ updates, actorUserId }),
      });

      return updated;
    });
  }

  /**
   * 4. Purchase Membership Subscription (Transactional + Idempotent)
   */
  public async purchaseMembership(
    gymId: string,
    memberId: string,
    dto: PurchaseMembershipDto,
    actorUserId?: string
  ): Promise<any> {
    // 1. Validate Member
    const member = (
      await db
        .select()
        .from(gymMembers)
        .where(
          and(
            eq(gymMembers.id, memberId),
            eq(gymMembers.gymId, gymId),
            isNull(gymMembers.deletedAt)
          )
        )
        .limit(1)
    )[0];

    if (!member) {
      throw AppError.notFound('Member not found in authorized gym tenant.');
    }

    // 2. Validate Plan
    const plan = (
      await db
        .select()
        .from(membershipPlans)
        .where(
          and(
            eq(membershipPlans.id, dto.planId),
            eq(membershipPlans.gymId, gymId),
            eq(membershipPlans.isActive, true),
            isNull(membershipPlans.deletedAt)
          )
        )
        .limit(1)
    )[0];

    if (!plan) {
      throw AppError.notFound('Active membership plan not found in authorized gym tenant.');
    }

    // 3. Server-side Date Calculation
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const priceAtPurchase = plan.price;
    const paymentAmount = dto.paymentAmount !== undefined ? Number(dto.paymentAmount) : Number(priceAtPurchase);

    if (paymentAmount < 0) {
      throw AppError.validation('Payment amount cannot be negative.');
    }

    const paySettings = await getGymPaymentSettings(gymId);
    const totalMinor = Number(toMinorUnits(priceAtPurchase));
    const paidMinor = Number(toMinorUnits(paymentAmount));
    const fullyPaid = paidMinor >= totalMinor;
    const activate = fullyPaid || paySettings.activate_membership_on_partial;

    return await db.transaction(async (tx) => {
      // Create Membership Instance
      const [membership] = await tx
        .insert(memberMemberships)
        .values({
          gymId,
          memberId,
          planId: plan.id,
          status: activate ? 'ACTIVE' : 'PENDING_PAYMENT',
          startDate,
          endDate,
          priceAtPurchase,
          autoRenew: false,
        })
        .returning();

      // Update member access only when the payment policy allows it
      if (activate) {
        await tx
          .update(gymMembers)
          .set({
            membershipStatus: 'ACTIVE',
            expiresAt: endDate,
            updatedAt: new Date(),
          })
          .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId)));
      }

      // Authoritative invoice for this membership
      const invoiceId = await insertInvoiceTx(
        tx,
        gymId,
        memberId,
        membership!.id,
        totalMinor,
        `Membership: ${plan.planName}`
      );

      let paymentRecord: any = null;

      // Record Payment if amount > 0
      if (paymentAmount > 0) {
        const year = new Date().getFullYear();
        const receiptNumber = `REC-${year}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        const [p] = await tx
          .insert(payments)
          .values({
            gymId,
            memberId,
            membershipId: membership!.id,
            amount: paymentAmount.toFixed(2),
            paymentMethod: (dto.paymentMethod || 'CASH').toUpperCase(),
            transactionReference: dto.transactionReference?.trim() || null,
            receiptNumber,
            idempotencyKey: dto.idempotencyKey?.trim() || null,
            type: 'PAYMENT',
            status: 'COMPLETED',
            notes: dto.notes?.trim() || `Payment for ${plan.planName}`,
            paidAt: new Date(),
          })
          .returning();

        paymentRecord = p;
        await allocatePaymentTx(tx, gymId, p!.id, invoiceId, paidMinor);
      }

      // Record Audit Logs
      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'MEMBERSHIP_PURCHASED',
        resource: 'member_membership',
        resourceId: membership!.id,
        metadata: JSON.stringify({
          memberId,
          planId: plan.id,
          planName: plan.planName,
          priceAtPurchase,
          paymentAmount,
          actorUserId,
        }),
      });

      // Stream to Desktop Sync Log
      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'member_membership',
          entityId: membership!.id,
          operation: 'CREATE',
          payload: {
            ...membership!,
            planName: plan.planName,
            payment: paymentRecord,
          },
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'member_membership',
        entityId: membership!.id,
        operation: 'CREATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated membership purchase',
      });

      return {
        membership,
        payment: paymentRecord,
      };
    });
  }

  /**
   * 5. Renew Membership (Continuous Extension & Historical Preservation)
   */
  public async renewMembership(
    gymId: string,
    memberId: string,
    dto: PurchaseMembershipDto,
    actorUserId?: string
  ): Promise<any> {
    // 1. Validate Member
    const member = (
      await db
        .select()
        .from(gymMembers)
        .where(
          and(
            eq(gymMembers.id, memberId),
            eq(gymMembers.gymId, gymId),
            isNull(gymMembers.deletedAt)
          )
        )
        .limit(1)
    )[0];

    if (!member) {
      throw AppError.notFound('Member not found in authorized gym tenant.');
    }

    // 2. Validate Plan
    const plan = (
      await db
        .select()
        .from(membershipPlans)
        .where(
          and(
            eq(membershipPlans.id, dto.planId),
            eq(membershipPlans.gymId, gymId),
            eq(membershipPlans.isActive, true),
            isNull(membershipPlans.deletedAt)
          )
        )
        .limit(1)
    )[0];

    if (!plan) {
      throw AppError.notFound('Active membership plan not found.');
    }

    // 3. Find Latest Active/Expired Membership for Continuous Date Extension
    const latestMembership = (
      await db
        .select()
        .from(memberMemberships)
        .where(
          and(
            eq(memberMemberships.gymId, gymId),
            eq(memberMemberships.memberId, memberId)
          )
        )
        .orderBy(desc(memberMemberships.endDate))
        .limit(1)
    )[0];

    const now = new Date();
    let startDate: Date;

    // If latest membership is still active in the future, extend continuously from its endDate
    if (latestMembership && new Date(latestMembership.endDate) > now) {
      startDate = new Date(latestMembership.endDate);
    } else {
      startDate = now;
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const priceAtPurchase = plan.price;
    const paymentAmount = dto.paymentAmount !== undefined ? Number(dto.paymentAmount) : Number(priceAtPurchase);

    const paySettings = await getGymPaymentSettings(gymId);
    const totalMinor = Number(toMinorUnits(priceAtPurchase));
    const paidMinor = Number(toMinorUnits(paymentAmount));
    const activate = paidMinor >= totalMinor || paySettings.activate_membership_on_partial;

    return await db.transaction(async (tx) => {
      const [newMembership] = await tx
        .insert(memberMemberships)
        .values({
          gymId,
          memberId,
          planId: plan.id,
          status: activate ? 'ACTIVE' : 'PENDING_PAYMENT',
          startDate,
          endDate,
          priceAtPurchase,
          autoRenew: false,
        })
        .returning();

      // Update member access only when the payment policy allows it
      if (activate) {
        await tx
          .update(gymMembers)
          .set({
            membershipStatus: 'ACTIVE',
            expiresAt: endDate,
            updatedAt: new Date(),
          })
          .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId)));
      }

      const invoiceId = await insertInvoiceTx(
        tx,
        gymId,
        memberId,
        newMembership!.id,
        totalMinor,
        `Renewal: ${plan.planName}`
      );

      let paymentRecord: any = null;

      if (paymentAmount > 0) {
        const year = new Date().getFullYear();
        const receiptNumber = `REC-${year}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        const [p] = await tx
          .insert(payments)
          .values({
            gymId,
            memberId,
            membershipId: newMembership!.id,
            amount: paymentAmount.toFixed(2),
            paymentMethod: (dto.paymentMethod || 'CASH').toUpperCase(),
            transactionReference: dto.transactionReference?.trim() || null,
            receiptNumber,
            idempotencyKey: dto.idempotencyKey?.trim() || null,
            type: 'PAYMENT',
            status: 'COMPLETED',
            notes: dto.notes?.trim() || `Renewal for ${plan.planName}`,
            paidAt: new Date(),
          })
          .returning();

        paymentRecord = p;
        await allocatePaymentTx(tx, gymId, p!.id, invoiceId, paidMinor);
      }

      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'MEMBERSHIP_RENEWED',
        resource: 'member_membership',
        resourceId: newMembership!.id,
        metadata: JSON.stringify({
          memberId,
          planId: plan.id,
          planName: plan.planName,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          actorUserId,
        }),
      });

      // Stream to Sync Change Log
      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'member_membership',
          entityId: newMembership!.id,
          operation: 'CREATE',
          payload: {
            ...newMembership!,
            planName: plan.planName,
            payment: paymentRecord,
          },
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'member_membership',
        entityId: newMembership!.id,
        operation: 'CREATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated membership renewal',
      });

      return {
        membership: newMembership,
        payment: paymentRecord,
      };
    });
  }

  /**
   * 6. Record Standalone / Outstanding Payment (Idempotent)
   */
  public async recordPayment(
    gymId: string,
    memberId: string,
    dto: RecordPaymentDto,
    actorUserId?: string
  ): Promise<any> {
    if (dto.amount <= 0) {
      throw AppError.validation('Payment amount must be greater than 0.');
    }

    // Check Idempotency Key
    if (dto.idempotencyKey) {
      const existingPayment = (
        await db
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.gymId, gymId),
              eq(payments.idempotencyKey, dto.idempotencyKey)
            )
          )
          .limit(1)
      )[0];

      if (existingPayment) {
        return existingPayment;
      }
    }

    // Validate Member
    const member = (
      await db
        .select()
        .from(gymMembers)
        .where(
          and(
            eq(gymMembers.id, memberId),
            eq(gymMembers.gymId, gymId),
            isNull(gymMembers.deletedAt)
          )
        )
        .limit(1)
    )[0];

    if (!member) {
      throw AppError.notFound('Member not found in authorized gym tenant.');
    }

    return await db.transaction(async (tx) => {
      const year = new Date().getFullYear();
      const receiptNumber = `REC-${year}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      const [payment] = await tx
        .insert(payments)
        .values({
          gymId,
          memberId,
          membershipId: dto.membershipId || null,
          amount: dto.amount.toFixed(2),
          paymentMethod: (dto.paymentMethod || 'CASH').toUpperCase(),
          transactionReference: dto.transactionReference?.trim() || null,
          receiptNumber,
          idempotencyKey: dto.idempotencyKey?.trim() || null,
          type: 'PAYMENT',
          status: 'COMPLETED',
          notes: dto.notes?.trim() || null,
          paidAt: new Date(),
        })
        .returning();

      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'PAYMENT_RECORDED',
        resource: 'payment',
        resourceId: payment!.id,
        metadata: JSON.stringify({
          memberId,
          amount: dto.amount,
          receiptNumber,
          actorUserId,
        }),
      });

      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'payment',
          entityId: payment!.id,
          operation: 'CREATE',
          payload: payment!,
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'payment',
        entityId: payment!.id,
        operation: 'CREATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated payment transaction',
      });

      return payment;
    });
  }

  /**
   * 7. Refund / Reversal Financial Transaction
   */
  public async refundPayment(
    gymId: string,
    paymentId: string,
    dto: RefundPaymentDto,
    actorUserId?: string
  ): Promise<any> {
    const originalPayment = (
      await db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.id, paymentId),
            eq(payments.gymId, gymId)
          )
        )
        .limit(1)
    )[0];

    if (!originalPayment) {
      throw AppError.notFound('Payment record not found in authorized gym tenant.');
    }

    if (originalPayment.type === 'REFUND') {
      throw AppError.validation('Cannot refund a refund / reversal transaction.');
    }

    // Check existing refunds for this payment
    const existingRefunds = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(
        and(
          eq(payments.gymId, gymId),
          eq(payments.type, 'REFUND'),
          sql`${payments.transactionReference} LIKE ${'REFUND-OF-' + paymentId + '%'}`
        )
      );

    const totalAlreadyRefundedMinorUnits = existingRefunds.reduce(
      (sum, r) => {
        const u = toMinorUnits(r.amount);
        return sum + (u < 0n ? -u : u);
      },
      0n
    );

    const orig = toMinorUnits(originalPayment.amount);
    const originalAmountMinorUnits = orig < 0n ? -orig : orig;
    const maxRefundableMinorUnits = originalAmountMinorUnits > totalAlreadyRefundedMinorUnits
      ? originalAmountMinorUnits - totalAlreadyRefundedMinorUnits
      : 0n;

    if (maxRefundableMinorUnits <= 0n) {
      throw AppError.conflict('Payment transaction has already been fully refunded.');
    }

    const requestedRefundMinorUnits = dto.refundAmount !== undefined
      ? toMinorUnits(dto.refundAmount)
      : maxRefundableMinorUnits;

    if (requestedRefundMinorUnits <= 0n) {
      throw AppError.validation('Refund amount must be greater than 0.');
    }

    if (requestedRefundMinorUnits > maxRefundableMinorUnits) {
      throw AppError.validation(
        `Refund amount (₹${fromMinorUnits(requestedRefundMinorUnits)}) exceeds remaining refundable balance of ₹${fromMinorUnits(maxRefundableMinorUnits)}.`
      );
    }

    return await db.transaction(async (tx) => {
      // 1. Insert Immutable Reversal Record
      const year = new Date().getFullYear();
      const receiptNumber = `REF-${year}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      const [refundRecord] = await tx
        .insert(payments)
        .values({
          gymId,
          memberId: originalPayment.memberId,
          membershipId: originalPayment.membershipId,
          amount: fromMinorUnits(-requestedRefundMinorUnits),
          paymentMethod: originalPayment.paymentMethod,
          transactionReference: `REFUND-OF-${originalPayment.id}`,
          receiptNumber,
          type: 'REFUND',
          status: 'COMPLETED',
          notes: `Refund: ${dto.reason}`,
          paidAt: new Date(),
        })
        .returning();

      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'PAYMENT_REFUNDED',
        resource: 'payment',
        resourceId: paymentId,
        metadata: JSON.stringify({
          refundRecordId: refundRecord!.id,
          originalPaymentId: paymentId,
          amountRefunded: fromMinorUnits(requestedRefundMinorUnits),
          reason: dto.reason,
          actorUserId,
        }),
      });

      // Stream to Desktop Sync Log
      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'payment',
          entityId: refundRecord!.id,
          operation: 'CREATE',
          payload: refundRecord!,
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'payment',
        entityId: refundRecord!.id,
        operation: 'CREATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated payment refund reversal',
      });

      return refundRecord;
    });
  }

  /**
   * 8. Member Billing Summary & Outstanding Balance
   */
  public async getMemberBillingSummary(gymId: string, memberId: string): Promise<MemberBillingSummary> {
    // 1. Verify Member
    const member = (
      await db
        .select()
        .from(gymMembers)
        .where(
          and(
            eq(gymMembers.id, memberId),
            eq(gymMembers.gymId, gymId),
            isNull(gymMembers.deletedAt)
          )
        )
        .limit(1)
    )[0];

    if (!member) {
      throw AppError.notFound('Member not found in authorized gym tenant.');
    }

    // 2. Fetch all memberships
    const allMemberships = await db
      .select({
        id: memberMemberships.id,
        planId: memberMemberships.planId,
        planName: membershipPlans.planName,
        priceAtPurchase: memberMemberships.priceAtPurchase,
        status: memberMemberships.status,
        startDate: memberMemberships.startDate,
        endDate: memberMemberships.endDate,
      })
      .from(memberMemberships)
      .innerJoin(membershipPlans, eq(memberMemberships.planId, membershipPlans.id))
      .where(
        and(
          eq(memberMemberships.gymId, gymId),
          eq(memberMemberships.memberId, memberId)
        )
      )
      .orderBy(desc(memberMemberships.startDate));

    // Calculate Total Billed in minor units
    const totalBilledMinorUnits = allMemberships.reduce(
      (sum, m) => sum + toMinorUnits(m.priceAtPurchase),
      0n
    );

    // 3. Fetch all payments
    const paymentsList = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.gymId, gymId),
          eq(payments.memberId, memberId)
        )
      )
      .orderBy(desc(payments.paidAt));

    // Calculate Total Paid in minor units
    const totalPaidMinorUnits = paymentsList
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + toMinorUnits(p.amount), 0n);

    const outstandingMinorUnits = totalBilledMinorUnits > totalPaidMinorUnits
      ? totalBilledMinorUnits - totalPaidMinorUnits
      : 0n;

    const invoiceRows = (
      await getDatabasePool().query(
        `SELECT id, invoice_number, total_minor, paid_minor, status, due_date
         FROM invoices WHERE gym_id = $1 AND member_id = $2 ORDER BY created_at DESC LIMIT 100`,
        [gymId, memberId]
      )
    ).rows;
    const invoices = invoiceRows.map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      totalMinor: Number(inv.total_minor),
      paidMinor: Number(inv.paid_minor),
      outstandingMinor: Math.max(Number(inv.total_minor) - Number(inv.paid_minor), 0),
      status: inv.status,
      dueDate: inv.due_date,
    }));
    const outstandingInvoicesMinor = invoices.reduce(
      (sum: number, inv: any) => sum + inv.outstandingMinor,
      0
    );

    return {
      totalBilled: minorUnitsToNumber(totalBilledMinorUnits),
      totalPaid: minorUnitsToNumber(totalPaidMinorUnits),
      outstandingBalance: minorUnitsToNumber(outstandingMinorUnits),
      totalBilledMinorUnits: Number(totalBilledMinorUnits),
      totalPaidMinorUnits: Number(totalPaidMinorUnits),
      outstandingBalanceMinorUnits: Number(outstandingMinorUnits),
      invoices,
      outstandingInvoicesMinor,
      activeMembership: allMemberships[0] || null,
      recentPayments: paymentsList,
    };
  }

  /**
   * 9. Generate / Fetch Formal Receipt
   */
  public async getReceipt(gymId: string, paymentId: string): Promise<ReceiptData> {
    const payment = (
      await db
        .select()
        .from(payments)
        .where(and(eq(payments.id, paymentId), eq(payments.gymId, gymId)))
        .limit(1)
    )[0];

    if (!payment) {
      throw AppError.notFound('Payment not found in authorized gym tenant.');
    }

    const gym = (
      await db.select().from(gyms).where(eq(gyms.id, gymId)).limit(1)
    )[0];

    const member = (
      await db.select().from(gymMembers).where(eq(gymMembers.id, payment.memberId)).limit(1)
    )[0];

    let membershipData: any = null;
    if (payment.membershipId) {
      membershipData = (
        await db
          .select({
            planName: membershipPlans.planName,
            durationDays: membershipPlans.durationDays,
            startDate: memberMemberships.startDate,
            endDate: memberMemberships.endDate,
          })
          .from(memberMemberships)
          .innerJoin(membershipPlans, eq(memberMemberships.planId, membershipPlans.id))
          .where(eq(memberMemberships.id, payment.membershipId))
          .limit(1)
      )[0];
    }

    return {
      receiptNumber: payment.receiptNumber || `REC-${payment.id.substring(0, 8).toUpperCase()}`,
      issuedAt: payment.paidAt.toISOString(),
      gym: {
        name: gym!.name,
        code: gym!.code,
      },
      member: {
        id: member!.id,
        fullName: member!.fullName,
        memberCode: member!.memberCode,
        phone: member!.phone,
        email: member!.email,
      },
      membership: membershipData
        ? {
            planName: membershipData.planName,
            durationDays: membershipData.durationDays,
            startDate: membershipData.startDate.toISOString(),
            endDate: membershipData.endDate.toISOString(),
          }
        : null,
      payment: {
        id: payment.id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        transactionReference: payment.transactionReference,
        status: payment.status,
        type: payment.type,
        paidAt: payment.paidAt.toISOString(),
      },
      notes: payment.notes,
    };
  }

  /**
   * 10. Financial Dashboard Metrics
   */
  public async getFinancialDashboard(gymId: string): Promise<any> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Today Revenue
    const todayPayments = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(
        and(
          eq(payments.gymId, gymId),
          eq(payments.status, 'COMPLETED'),
          sql`${payments.paidAt} >= ${todayStart.toISOString()}`
        )
      );
    const todayRevenueMinorUnits = todayPayments.reduce((sum, p) => sum + toMinorUnits(p.amount), 0n);
    const todayRevenue = minorUnitsToNumber(todayRevenueMinorUnits);

    // Monthly Revenue
    const monthPayments = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(
        and(
          eq(payments.gymId, gymId),
          eq(payments.status, 'COMPLETED'),
          sql`${payments.paidAt} >= ${monthStart.toISOString()}`
        )
      );
    const monthRevenueMinorUnits = monthPayments.reduce((sum, p) => sum + toMinorUnits(p.amount), 0n);
    const monthRevenue = minorUnitsToNumber(monthRevenueMinorUnits);

    // Active Memberships Count
    const activeMembershipsCount = (
      await db
        .select({ count: count() })
        .from(memberMemberships)
        .where(
          and(
            eq(memberMemberships.gymId, gymId),
            eq(memberMemberships.status, 'ACTIVE'),
            sql`${memberMemberships.endDate} >= NOW()`
          )
        )
    )[0];

    // Expiring in Next 7 Days
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const expiringSoonCount = (
      await db
        .select({ count: count() })
        .from(memberMemberships)
        .where(
          and(
            eq(memberMemberships.gymId, gymId),
            eq(memberMemberships.status, 'ACTIVE'),
            sql`${memberMemberships.endDate} >= NOW()`,
            sql`${memberMemberships.endDate} <= ${in7Days.toISOString()}`
          )
        )
    )[0];

    return {
      todayRevenue,
      monthRevenue,
      activeMembershipsCount: activeMembershipsCount?.count || 0,
      expiringSoonCount: expiringSoonCount?.count || 0,
    };
  }

  /**
   * Fetch active payment & receiving bank configuration
   */
  async getPaymentConfig(gymId: string) {
    try {
      const v2Config = await paymentAccountService.getMemberFacingConfig(gymId);
      if (v2Config.upi?.vpa || v2Config.bank?.accountNumberMasked) {
        return {
          receivingMode: v2Config.upi ? 'UPI' : 'BANK_TRANSFER',
          bankId: 'bank',
          bankName: v2Config.bank?.bankName || 'Bank Account',
          accountHolder: v2Config.upi?.beneficiaryName || v2Config.bank?.beneficiaryName || 'GymDeck Fitness',
          accountNumberMasked: v2Config.bank?.accountNumberMasked || null,
          accountType: v2Config.bank?.accountType || 'Current Account',
          ifscCode: v2Config.bank?.ifscCode || null,
          branch: v2Config.bank?.branchName || null,
          upiVpa: v2Config.upi?.vpa || null,
          phoneNumber: null,
          isVerified: v2Config.upi?.status === 'VERIFIED' || v2Config.bank?.status === 'VERIFIED',
          soundboxEnabled: false,
        };
      }
    } catch {
      // Fallback to legacy single-account query
    }

    const pool = getDatabasePool();
    const result = await pool.query(
      `SELECT * FROM payment_configurations WHERE gym_id = $1 LIMIT 1;`,
      [gymId]
    );
    if (result.rows.length === 0) {
      return {
        receivingMode: 'UPI',
        bankId: 'unconfigured',
        bankName: '',
        accountHolder: '',
        accountNumberMasked: null,
        accountType: 'Current Account',
        ifscCode: '',
        branch: '',
        upiVpa: null,
        phoneNumber: null,
        isVerified: false,
        soundboxEnabled: false,
      };
    }
    const row = result.rows[0];
    return {
      receivingMode: row.receiving_mode,
      bankId: row.bank_id,
      bankName: row.bank_name,
      accountHolder: row.account_holder,
      accountNumberMasked: row.account_number_masked,
      accountType: row.account_type,
      ifscCode: row.ifsc_code,
      branch: row.branch,
      upiVpa: row.upi_vpa,
      phoneNumber: row.phone_number,
      isVerified: row.is_verified,
      soundboxEnabled: row.soundbox_enabled,
    };
  }

  /**
   * Save or update payment & receiving bank configuration
   */
  async savePaymentConfig(gymId: string, data: any) {
    const pool = getDatabasePool();
    const result = await pool.query(
      `INSERT INTO payment_configurations (
        gym_id, receiving_mode, bank_id, bank_name, account_holder,
        account_number_masked, account_type, ifsc_code, branch, upi_vpa,
        phone_number, is_verified, soundbox_enabled, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (gym_id) DO UPDATE SET
        receiving_mode = EXCLUDED.receiving_mode,
        bank_id = EXCLUDED.bank_id,
        bank_name = EXCLUDED.bank_name,
        account_holder = EXCLUDED.account_holder,
        account_number_masked = EXCLUDED.account_number_masked,
        account_type = EXCLUDED.account_type,
        ifsc_code = EXCLUDED.ifsc_code,
        branch = EXCLUDED.branch,
        upi_vpa = EXCLUDED.upi_vpa,
        phone_number = EXCLUDED.phone_number,
        is_verified = EXCLUDED.is_verified,
        soundbox_enabled = EXCLUDED.soundbox_enabled,
        updated_at = NOW()
      RETURNING *;`,
      [
        gymId,
        data.receivingMode || 'UPI',
        data.bankId || 'hdfc',
        data.bankName || 'HDFC Bank',
        data.accountHolder || "Indian's Gym Fitness",
        data.accountNumberMasked || '•••• •••• 4182',
        data.accountType || 'Current Account',
        data.ifscCode || 'HDFC0001248',
        data.branch || 'Commercial Capital Branch',
        data.upiVpa || 'gymdeck@okhdfcbank',
        data.phoneNumber || '+91 98765 00123',
        data.isVerified ?? true,
        data.soundboxEnabled ?? true,
      ]
    );
    const row = result.rows[0];
    return {
      receivingMode: row.receiving_mode,
      bankId: row.bank_id,
      bankName: row.bank_name,
      accountHolder: row.account_holder,
      accountNumberMasked: row.account_number_masked,
      accountType: row.account_type,
      ifscCode: row.ifsc_code,
      branch: row.branch,
      upiVpa: row.upi_vpa,
      phoneNumber: row.phone_number,
      isVerified: row.is_verified,
      soundboxEnabled: row.soundbox_enabled,
    };
  }
}

export const billingService = new BillingService();
export default billingService;
