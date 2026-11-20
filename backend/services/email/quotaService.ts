/**
 * GymDeck Monthly Email Quota Service
 *
 * Implements tenant-scoped atomic monthly quota enforcement:
 *  - 300 recipient allowances per calendar month per gym.
 *  - Reset cycle uses Asia/Kolkata timezone boundary.
 *  - Transaction-level reservation and consumption protection.
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../shared/database';
import { emailMonthlyUsage } from '../../shared/database/schema';
import { config } from '../../shared/config';
import { AppError } from '../../shared/errors';

export interface QuotaStatus {
  billingPeriod: string;
  allocatedQuota: number;
  reservedCount: number;
  consumedCount: number;
  remainingQuota: number;
  isExhausted: boolean;
}

export class EmailQuotaService {
  /**
   * Calculate current billing period in YYYY-MM format in Asia/Kolkata timezone.
   */
  public getCurrentBillingPeriod(date = new Date()): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
    });
    // Returns "YYYY-MM"
    return formatter.format(date);
  }

  /**
   * Retrieve or initialize this gym's quota row for the billing period.
   */
  public async getQuotaStatus(gymId: string, targetPeriod?: string): Promise<QuotaStatus> {
    const billingPeriod = targetPeriod || this.getCurrentBillingPeriod();

    let rows = await db
      .select()
      .from(emailMonthlyUsage)
      .where(and(eq(emailMonthlyUsage.gymId, gymId), eq(emailMonthlyUsage.billingPeriod, billingPeriod)))
      .limit(1);

    if (rows.length === 0) {
      const defaultQuota = config.EMAIL_MONTHLY_QUOTA_DEFAULT || 300;
      await db
        .insert(emailMonthlyUsage)
        .values({
          gymId,
          billingPeriod,
          allocatedQuota: defaultQuota,
          reservedCount: 0,
          consumedCount: 0,
        })
        .onConflictDoNothing();

      rows = await db
        .select()
        .from(emailMonthlyUsage)
        .where(and(eq(emailMonthlyUsage.gymId, gymId), eq(emailMonthlyUsage.billingPeriod, billingPeriod)))
        .limit(1);
    }

    const usage = rows[0] || {
      allocatedQuota: config.EMAIL_MONTHLY_QUOTA_DEFAULT || 300,
      reservedCount: 0,
      consumedCount: 0,
    };

    const remaining = Math.max(0, usage.allocatedQuota - usage.consumedCount - usage.reservedCount);

    return {
      billingPeriod,
      allocatedQuota: usage.allocatedQuota,
      reservedCount: usage.reservedCount,
      consumedCount: usage.consumedCount,
      remainingQuota: remaining,
      isExhausted: remaining <= 0,
    };
  }

  /**
   * Atomically reserve quota units for an outgoing email batch.
   * Throws 429 if requested count exceeds remaining allowance.
   */
  public async reserveQuota(gymId: string, recipientCount: number): Promise<QuotaStatus> {
    if (recipientCount <= 0) {
      throw AppError.validation('Recipient count must be greater than zero.');
    }

    const billingPeriod = this.getCurrentBillingPeriod();

    // Ensure record exists
    await this.getQuotaStatus(gymId, billingPeriod);

    // Conditional atomic update
    const result = await db
      .update(emailMonthlyUsage)
      .set({
        reservedCount: sql`${emailMonthlyUsage.reservedCount} + ${recipientCount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(emailMonthlyUsage.gymId, gymId),
          eq(emailMonthlyUsage.billingPeriod, billingPeriod),
          sql`(${emailMonthlyUsage.allocatedQuota} - ${emailMonthlyUsage.consumedCount} - ${emailMonthlyUsage.reservedCount}) >= ${recipientCount}`
        )
      )
      .returning();

    if (result.length === 0 || !result[0]) {
      const status = await this.getQuotaStatus(gymId, billingPeriod);
      throw AppError.rateLimited(
        `Email quota exceeded. This broadcast requires ${recipientCount} units, but only ${status.remainingQuota} remaining for this month (${billingPeriod}).`
      );
    }

    const row = result[0];
    const remaining = Math.max(0, row.allocatedQuota - row.consumedCount - row.reservedCount);

    return {
      billingPeriod,
      allocatedQuota: row.allocatedQuota,
      reservedCount: row.reservedCount,
      consumedCount: row.consumedCount,
      remainingQuota: remaining,
      isExhausted: remaining <= 0,
    };
  }

  /**
   * Confirm delivery reservation into permanent consumed count.
   */
  public async commitQuota(
    gymId: string,
    billingPeriod: string,
    actualSentCount: number,
    originalReservedCount: number
  ): Promise<void> {
    const unreserveDelta = originalReservedCount;
    const consumedDelta = actualSentCount;

    await db
      .update(emailMonthlyUsage)
      .set({
        reservedCount: sql`GREATEST(0, ${emailMonthlyUsage.reservedCount} - ${unreserveDelta})`,
        consumedCount: sql`${emailMonthlyUsage.consumedCount} + ${consumedDelta}`,
        updatedAt: new Date(),
      })
      .where(and(eq(emailMonthlyUsage.gymId, gymId), eq(emailMonthlyUsage.billingPeriod, billingPeriod)));
  }

  /**
   * Release reserved quota in case of complete job cancellation or pre-send validation failure.
   */
  public async releaseReservedQuota(
    gymId: string,
    billingPeriod: string,
    releaseCount: number
  ): Promise<void> {
    await db
      .update(emailMonthlyUsage)
      .set({
        reservedCount: sql`GREATEST(0, ${emailMonthlyUsage.reservedCount} - ${releaseCount})`,
        updatedAt: new Date(),
      })
      .where(and(eq(emailMonthlyUsage.gymId, gymId), eq(emailMonthlyUsage.billingPeriod, billingPeriod)));
  }
}

export const emailQuotaService = new EmailQuotaService();
