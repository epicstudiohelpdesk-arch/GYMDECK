/**
 * GymDeck Notification Core - Durable Domain Event Bus & Publisher (Hardened)
 */

import * as crypto from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../shared/database';
import { domainEvents } from '../../shared/database/schema';
import { PublishDomainEventInput, DomainEventType } from './types';
import { notificationEngine } from './notificationEngine';

export class DomainEventBus {
  /**
   * 1. Publish Domain Event atomically inside an active database transaction
   */
  public async publishDomainEvent(
    tx: any,
    input: PublishDomainEventInput
  ): Promise<any> {
    const eventId = crypto.randomUUID();
    const now = input.occurredAt || new Date();

    const [event] = await tx
      .insert(domainEvents)
      .values({
        gymId: input.gymId,
        eventId,
        eventType: input.eventType,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        payload: JSON.stringify(input.payload),
        actorUserId: input.actorUserId || null,
        status: 'PENDING',
        occurredAt: now,
      })
      .returning();

    return event;
  }

  /**
   * 2. Direct event publish outside existing transaction
   */
  public async publishDomainEventDirect(
    input: PublishDomainEventInput
  ): Promise<any> {
    return await db.transaction(async (tx) => {
      return await this.publishDomainEvent(tx, input);
    });
  }

  /**
   * 3. Process Pending Domain Events with Concurrency Locks & Lease-Based Crash Recovery
   */
  public async processPendingEvents(
    gymId?: string,
    batchSize: number = 50,
    leaseTimeoutMinutes: number = 5
  ): Promise<{ processed: number; errors: number; claimed: number }> {
    // A. Atomically claim PENDING events OR stale PROCESSING events whose lease expired
    const claimQuery = sql`
      UPDATE domain_events
      SET status = 'PROCESSING',
          processing_started_at = NOW(),
          processing_lease_expires_at = NOW() + (${sql.raw(`${leaseTimeoutMinutes}`)} || ' minutes')::INTERVAL,
          retry_count = retry_count + 1
      WHERE id IN (
        SELECT id
        FROM domain_events
        WHERE (
          status = 'PENDING'
          OR (status = 'PROCESSING' AND processing_lease_expires_at < NOW())
        )
        ${gymId ? sql`AND gym_id = ${gymId}::uuid` : sql``}
        ORDER BY occurred_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${batchSize}
      )
      RETURNING *;
    `;

    const claimResult = await db.execute(claimQuery);
    const claimedRows: any[] = claimResult.rows || [];

    let processedCount = 0;
    let errorCount = 0;

    for (const rawEvt of claimedRows) {
      const evtId = rawEvt.id;
      const retryCount = Number(rawEvt.retry_count || 1);

      try {
        const parsedPayload =
          typeof rawEvt.payload === 'string' ? JSON.parse(rawEvt.payload) : rawEvt.payload;

        const evt = {
          id: rawEvt.id,
          gymId: rawEvt.gym_id,
          eventId: rawEvt.event_id,
          eventType: rawEvt.event_type as DomainEventType,
          aggregateType: rawEvt.aggregate_type,
          aggregateId: rawEvt.aggregate_id,
          payload: parsedPayload,
          actorUserId: rawEvt.actor_user_id || undefined,
          retryCount,
          occurredAt: new Date(rawEvt.occurred_at),
        };

        await db.transaction(async (tx) => {
          // Process event through notification engine
          await notificationEngine.handleDomainEvent(tx, {
            eventId: evt.eventId,
            gymId: evt.gymId,
            eventType: evt.eventType,
            aggregateType: evt.aggregateType,
            aggregateId: evt.aggregateId,
            payload: evt.payload,
            actorUserId: evt.actorUserId,
            occurredAt: evt.occurredAt,
          });

          // Mark event as PROCESSED atomically
          await tx
            .update(domainEvents)
            .set({
              status: 'PROCESSED',
              processedAt: new Date(),
              lastError: null,
            })
            .where(eq(domainEvents.id, evt.id));
        });

        processedCount++;
      } catch (err: any) {
        errorCount++;
        const maxRetries = 3;
        const isMaxExceeded = retryCount >= maxRetries;
        const errorMessage = err?.message || String(err);

        await db
          .update(domainEvents)
          .set({
            status: isMaxExceeded ? 'FAILED' : 'PENDING',
            processedAt: isMaxExceeded ? new Date() : null,
            lastError: errorMessage.substring(0, 1000),
          })
          .where(eq(domainEvents.id, evtId));
      }
    }

    return { processed: processedCount, errors: errorCount, claimed: claimedRows.length };
  }
}

export const domainEventBus = new DomainEventBus();
export default domainEventBus;
