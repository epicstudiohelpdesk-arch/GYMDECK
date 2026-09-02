/**
 * GymDeck Notification Core - Asynchronous External Delivery Worker
 */

import { sql } from 'drizzle-orm';
import { db } from '../../shared/database';
import { providerRouter } from './providers/providerRouter';
import { logger } from '../../shared/logging';

export class NotificationDeliveryWorker {
  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;

  /**
   * 1. Process a batch of pending/retrying external deliveries (Atomically claimed via PostgreSQL)
   */
  public async processPendingDeliveries(
    gymId?: string,
    batchSize: number = 20,
    leaseTimeoutMinutes: number = 5
  ): Promise<{ processed: number; errors: number; claimed: number }> {
    const claimQuery = sql`
      UPDATE notification_deliveries
      SET status = 'PROCESSING',
          processing_started_at = NOW(),
          processing_lease_expires_at = NOW() + (${sql.raw(`${leaseTimeoutMinutes}`)} || ' minutes')::INTERVAL,
          attempt_count = attempt_count + 1
      WHERE id IN (
        SELECT id
        FROM notification_deliveries
        WHERE (
          status = 'PENDING'
          OR (status = 'RETRYING' AND (next_attempt_at IS NULL OR next_attempt_at <= NOW()))
          OR (status = 'PROCESSING' AND processing_lease_expires_at < NOW())
        )
        AND channel != 'IN_APP'
        ${gymId ? sql`AND gym_id = ${gymId}::uuid` : sql``}
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${batchSize}
      )
      RETURNING *;
    `;

    const result = await db.execute(claimQuery);
    const claimedRows: any[] = result.rows || [];

    let processedCount = 0;
    let errorCount = 0;

    for (const delivery of claimedRows) {
      try {
        const dispatchResult = await providerRouter.dispatchDelivery(delivery);
        if (dispatchResult.success) {
          processedCount++;
        } else {
          errorCount++;
        }
      } catch (err: any) {
        errorCount++;
        logger.error(`[DeliveryWorker] Unhandled error processing delivery ${delivery.id}: ${err?.message}`);
      }
    }

    return {
      processed: processedCount,
      errors: errorCount,
      claimed: claimedRows.length,
    };
  }

  /**
   * 2. Start continuous worker loop (Optional in server bootstrap)
   */
  public start(intervalMs: number = 5000): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const poll = async () => {
      if (!this.isRunning) return;
      try {
        await this.processPendingDeliveries();
      } catch (err) {
        logger.error(`[DeliveryWorker] Polling error: ${err}`);
      }
      if (this.isRunning) {
        this.pollTimer = setTimeout(poll, intervalMs);
      }
    };

    this.pollTimer = setTimeout(poll, intervalMs);
    logger.info('[DeliveryWorker] Background delivery worker started.');
  }

  /**
   * 3. Stop continuous worker loop
   */
  public stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    logger.info('[DeliveryWorker] Background delivery worker stopped.');
  }
}

export const notificationDeliveryWorker = new NotificationDeliveryWorker();
export default notificationDeliveryWorker;
