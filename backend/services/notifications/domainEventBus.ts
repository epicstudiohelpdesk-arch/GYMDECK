/**
 * GymDeck Notification Core - Durable Domain Event Bus & Publisher
 */

import * as crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
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
   * 3. Process Pending Domain Events (Durable Event Processor)
   */
  public async processPendingEvents(
    gymId?: string,
    batchSize: number = 50
  ): Promise<{ processed: number; errors: number }> {
    const conditions = [eq(domainEvents.status, 'PENDING')];
    if (gymId) {
      conditions.push(eq(domainEvents.gymId, gymId));
    }

    const pending = await db
      .select()
      .from(domainEvents)
      .where(and(...conditions))
      .orderBy(domainEvents.occurredAt)
      .limit(batchSize);

    let processedCount = 0;
    let errorCount = 0;

    for (const evt of pending) {
      try {
        await db.transaction(async (tx) => {
          // A. Process event through notification engine
          await notificationEngine.handleDomainEvent(tx, {
            eventId: evt.eventId,
            gymId: evt.gymId,
            eventType: evt.eventType as DomainEventType,
            aggregateType: evt.aggregateType,
            aggregateId: evt.aggregateId,
            payload: JSON.parse(evt.payload),
            actorUserId: evt.actorUserId || undefined,
            occurredAt: evt.occurredAt,
          });

          // B. Mark event as PROCESSED
          await tx
            .update(domainEvents)
            .set({
              status: 'PROCESSED',
              processedAt: new Date(),
            })
            .where(eq(domainEvents.id, evt.id));
        });

        processedCount++;
      } catch (err) {
        errorCount++;
        await db
          .update(domainEvents)
          .set({
            status: 'FAILED',
            processedAt: new Date(),
          })
          .where(eq(domainEvents.id, evt.id));
      }
    }

    return { processed: processedCount, errors: errorCount };
  }
}

export const domainEventBus = new DomainEventBus();
export default domainEventBus;
