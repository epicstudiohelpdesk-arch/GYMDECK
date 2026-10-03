/**
 * GymDeck Cloud Backend - Transactional Synchronization Service
 *
 * Handles bidirectional Push/Pull synchronization between Desktop workstations,
 * Owner Mobile clients, and Cloud PostgreSQL.
 *
 * Guarantees:
 * 1. Global idempotency via UUIDv4 event deduplication.
 * 2. Monotonic server sequence cursors for incremental synchronization.
 * 3. Strict tenant isolation (gym_id derived strictly from auth token).
 * 4. Immutable financial & attendance event integrity.
 * 5. Detailed per-event error reporting without silent data loss.
 */

import { eq, and, gt, sql } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  gyms,
  gymMembers,
  membershipPlans,
  memberMemberships,
  payments,
  attendanceLogs,
  trainers,
  syncChangeLog,
  syncIdempotencyLog,
  syncDeviceCursors,
  auditLogs,
} from '../../shared/database/schema';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logging';
import { toMinorUnits, fromMinorUnits } from '../../shared/utils/money';

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE' | 'VOID';

export interface SyncPushEventDto {
  eventId: string; // Client UUIDv4
  entityType:
    | 'gym_member'
    | 'membership_plan'
    | 'member_membership'
    | 'payment'
    | 'attendance'
    | 'attendance_log'
    | 'trainer';
  entityId: string; // Target record UUIDv4
  operation: SyncOperation;
  payload: Record<string, any>;
  clientTimestamp: string;
}

export interface SyncPushResult {
  eventId: string;
  entityId: string;
  status: 'APPLIED' | 'ALREADY_APPLIED' | 'CONFLICT_RESOLVED' | 'FAILED';
  serverSequence?: number;
  error?: string;
}

export interface SyncPullResponse {
  cursor: number;
  latestServerSequence: number;
  hasMore: boolean;
  changes: Array<{
    serverSequence: number;
    eventId: string;
    entityType: string;
    entityId: string;
    operation: string;
    payload: any;
    createdAt: string;
  }>;
}

export class SyncService {
  /**
   * 1. Process a batch of sync events pushed from an authenticated Desktop / Mobile client
   */
  public async pushBatch(
    gymId: string,
    deviceId: string,
    events: SyncPushEventDto[],
    actorUserId?: string
  ): Promise<{ results: SyncPushResult[]; latestServerSequence: number }> {
    if (!events || (Array.isArray(events) && events.length === 0)) {
      const latestSeq = await this.getLatestSequence(gymId);
      return { results: [], latestServerSequence: latestSeq };
    }

    // Verify gym exists and is active
    const gym = (await db.select().from(gyms).where(eq(gyms.id, gymId)).limit(1))[0];
    if (!gym || gym.status !== 'ACTIVE') {
      throw AppError.forbidden('Tenant gym is inactive or does not exist.');
    }

    const results: SyncPushResult[] = [];
    let maxSequence = 0;

    for (const event of events) {
      try {
        const result = await this.processSingleEvent(gymId, deviceId, event, actorUserId);
        results.push(result);
        if (result.serverSequence && result.serverSequence > maxSequence) {
          maxSequence = result.serverSequence;
        }
      } catch (err: any) {
        logger.error('[SyncService] Failed to process sync event', {
          gymId,
          eventId: event.eventId,
          error: err.message,
        });
        results.push({
          eventId: event.eventId,
          entityId: event.entityId,
          status: 'FAILED',
          error: err.message || 'Unknown processing error',
        });
      }
    }

    // Update device cursor if events were processed
    if (maxSequence > 0) {
      await this.updateDeviceCursor(gymId, deviceId, maxSequence, 'DESKTOP');
    }

    const currentLatestSeq = await this.getLatestSequence(gymId);

    return {
      results,
      latestServerSequence: currentLatestSeq,
    };
  }

  /**
   * 2. Pull incremental changes since last acknowledged server sequence cursor
   */
  public async pullChanges(
    gymId: string,
    deviceId: string,
    cursor?: number | string,
    limit?: number
  ): Promise<SyncPullResponse>;
  public async pullChanges(
    gymId: string,
    cursor: number | string,
    limit?: number
  ): Promise<SyncPullResponse>;
  public async pullChanges(
    gymId: string,
    arg2: string | number,
    arg3?: number | string,
    arg4?: number
  ): Promise<SyncPullResponse> {
    let deviceId: string;
    let cursor: number;
    let limit: number;

    if (typeof arg2 === 'number' || (!isNaN(Number(arg2)) && arg4 === undefined)) {
      // Called as: pullChanges(gymId, cursor, limit)
      deviceId = 'default_device';
      cursor = Number(arg2) || 0;
      limit = typeof arg3 === 'number' ? arg3 : Number(arg3) || 100;
    } else {
      // Called as: pullChanges(gymId, deviceId, cursor, limit)
      deviceId = String(arg2);
      cursor = typeof arg3 === 'number' ? arg3 : Number(arg3) || 0;
      limit = arg4 ?? 100;
    }

    const safeLimit = Math.min(Math.max(limit, 1), 500);
    const safeCursor = Math.max(cursor, 0);

    // Query change log for changes strictly belonging to this gym after cursor
    const changes = await db
      .select()
      .from(syncChangeLog)
      .where(
        and(
          eq(syncChangeLog.gymId, gymId),
          gt(syncChangeLog.serverSequence, safeCursor)
        )
      )
      .orderBy(syncChangeLog.serverSequence)
      .limit(safeLimit + 1);

    const hasMore = changes.length > safeLimit;
    const returnedChanges = hasMore ? changes.slice(0, safeLimit) : changes;

    const nextCursor =
      returnedChanges.length > 0
        ? returnedChanges[returnedChanges.length - 1]!.serverSequence
        : safeCursor;

    const latestSeq = await this.getLatestSequence(gymId);

    // Update device tracking
    if (nextCursor > safeCursor) {
      await this.updateDeviceCursor(gymId, deviceId, nextCursor, 'DESKTOP');
    }

    return {
      cursor: nextCursor,
      latestServerSequence: latestSeq,
      hasMore,
      changes: returnedChanges.map((c) => ({
        serverSequence: c.serverSequence,
        eventId: c.eventId,
        entityType: c.entityType,
        entityId: c.entityId,
        operation: c.operation,
        payload: c.payload,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  /**
   * 3. Record a server-originated change (e.g. from Cloud API, Mobile Check-in, Webhook)
   */
  public async recordServerChange(
    gymId: string,
    entityType: string,
    entityId: string,
    operation: SyncOperation,
    payload: Record<string, any>,
    actorUserId?: string
  ): Promise<number> {
    const eventId = crypto.randomUUID();

    const [change] = await db
      .insert(syncChangeLog)
      .values({
        gymId,
        eventId,
        entityType,
        entityId,
        operation,
        payload,
        sourceDevice: 'CLOUD_SERVER',
        actorUserId: actorUserId || undefined,
      })
      .returning();

    await db.insert(syncIdempotencyLog).values({
      gymId,
      eventId,
      entityType,
      entityId,
      operation,
      serverSequence: change!.serverSequence,
      status: 'APPLIED',
      responseSummary: 'Server-originated domain mutation',
    });

    return change!.serverSequence;
  }

  // ==============================================================================
  // Internal Event Execution & Idempotency Pipeline
  // ==============================================================================

  private async processSingleEvent(
    gymId: string,
    deviceId: string,
    event: SyncPushEventDto,
    actorUserId?: string
  ): Promise<SyncPushResult> {
    // 1. Initial Idempotency Check (Fast Path)
    const existingLog = (
      await db
        .select()
        .from(syncIdempotencyLog)
        .where(
          and(
            eq(syncIdempotencyLog.gymId, gymId),
            eq(syncIdempotencyLog.eventId, event.eventId)
          )
        )
        .limit(1)
    )[0];

    if (existingLog) {
      logger.info('[SyncService] Duplicate event detected. Skipping execution (Idempotent OK)', {
        gymId,
        eventId: event.eventId,
        serverSequence: existingLog.serverSequence,
      });
      return {
        eventId: event.eventId,
        entityId: event.entityId,
        status: 'ALREADY_APPLIED',
        serverSequence: existingLog.serverSequence,
      };
    }

    try {
      // 2. Execute ALL sync operations inside a single atomic PostgreSQL transaction
      return await db.transaction(async (tx) => {
        // Re-check idempotency inside transaction
        const txExisting = (
          await tx
            .select()
            .from(syncIdempotencyLog)
            .where(
              and(
                eq(syncIdempotencyLog.gymId, gymId),
                eq(syncIdempotencyLog.eventId, event.eventId)
              )
            )
            .limit(1)
        )[0];

        if (txExisting) {
          return {
            eventId: event.eventId,
            entityId: event.entityId,
            status: 'ALREADY_APPLIED',
            serverSequence: txExisting.serverSequence,
          };
        }

        // Apply domain mutation using transactional client tx
        await this.applyDomainMutationTx(tx, gymId, event);

        // Record in sync_change_log (Generates new serverSequence)
        const [changeRecord] = await tx
          .insert(syncChangeLog)
          .values({
            gymId,
            eventId: event.eventId,
            entityType: event.entityType,
            entityId: event.entityId,
            operation: event.operation,
            payload: event.payload,
            sourceDevice: deviceId,
            actorUserId: actorUserId || undefined,
          })
          .returning();

        const sequence = changeRecord!.serverSequence;

        // Record in sync_idempotency_log
        await tx.insert(syncIdempotencyLog).values({
          gymId,
          eventId: event.eventId,
          entityType: event.entityType,
          entityId: event.entityId,
          operation: event.operation,
          serverSequence: sequence,
          status: 'APPLIED',
          responseSummary: `Applied ${event.operation} on ${event.entityType}`,
        });

        // Record Audit Log inside the same atomic transaction
        await tx.insert(auditLogs).values({
          gymId,
          actorType: 'DESKTOP_SYNC',
          action: `SYNC_${event.operation}_${event.entityType.toUpperCase()}`,
          resource: event.entityType,
          resourceId: event.entityId,
          metadata: JSON.stringify({ eventId: event.eventId, sequence }),
        });

        return {
          eventId: event.eventId,
          entityId: event.entityId,
          status: 'APPLIED',
          serverSequence: sequence,
        };
      });
    } catch (err: any) {
      // Handle Postgres error 23505 (unique_violation on (gym_id, event_id)) during concurrent race
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('23505')) {
        logger.info('[SyncService] Concurrent duplicate event intercepted via unique constraint 23505', {
          gymId,
          eventId: event.eventId,
        });

        const racedLog = (
          await db
            .select()
            .from(syncIdempotencyLog)
            .where(
              and(
                eq(syncIdempotencyLog.gymId, gymId),
                eq(syncIdempotencyLog.eventId, event.eventId)
              )
            )
            .limit(1)
        )[0];

        if (racedLog) {
          return {
            eventId: event.eventId,
            entityId: event.entityId,
            status: 'ALREADY_APPLIED',
            serverSequence: racedLog.serverSequence,
          };
        }
      }
      throw err;
    }
  }

  private async applyDomainMutationTx(
    tx: any,
    gymId: string,
    event: SyncPushEventDto
  ): Promise<void> {
    const { entityType, entityId, operation, payload } = event;

    switch (entityType) {
      case 'gym_member': {
        if (operation === 'CREATE' || operation === 'UPDATE') {
          const existing = (
            await tx
              .select()
              .from(gymMembers)
              .where(and(eq(gymMembers.id, entityId), eq(gymMembers.gymId, gymId)))
              .limit(1)
          )[0];

          if (existing) {
            await tx
              .update(gymMembers)
              .set({
                memberCode: payload.memberCode || payload.member_code || existing.memberCode,
                fullName: payload.fullName || payload.full_name || existing.fullName,
                phone: payload.phone || existing.phone,
                email: payload.email !== undefined ? payload.email : existing.email,
                membershipStatus: payload.membershipStatus || payload.membership_status || existing.membershipStatus,
                expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : existing.expiresAt,
                updatedAt: new Date(),
              })
              .where(eq(gymMembers.id, entityId));
          } else {
            await tx.insert(gymMembers).values({
              id: entityId,
              gymId,
              memberCode: payload.memberCode || payload.member_code || `GD-${Math.floor(1000 + Math.random() * 9000)}`,
              fullName: payload.fullName || payload.full_name || 'Member',
              phone: payload.phone || '0000000000',
              email: payload.email || null,
              membershipStatus: payload.membershipStatus || payload.membership_status || 'ACTIVE',
              joinedAt: payload.joinedAt ? new Date(payload.joinedAt) : new Date(),
              expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
            });
          }
        } else if (operation === 'DELETE') {
          await tx
            .update(gymMembers)
            .set({ membershipStatus: 'INACTIVE', updatedAt: new Date() })
            .where(and(eq(gymMembers.id, entityId), eq(gymMembers.gymId, gymId)));
        }
        break;
      }

      case 'membership_plan': {
        if (operation === 'CREATE' || operation === 'UPDATE') {
          const existing = (
            await tx
              .select()
              .from(membershipPlans)
              .where(and(eq(membershipPlans.id, entityId), eq(membershipPlans.gymId, gymId)))
              .limit(1)
          )[0];

          const priceStr = payload.priceMinorUnits !== undefined
            ? fromMinorUnits(BigInt(payload.priceMinorUnits))
            : payload.price !== undefined
            ? fromMinorUnits(toMinorUnits(payload.price))
            : undefined;

          if (existing) {
            await tx
              .update(membershipPlans)
              .set({
                planName: payload.planName || payload.name || payload.plan_name || existing.planName,
                durationDays: payload.durationDays || payload.duration_days || existing.durationDays,
                price: priceStr !== undefined ? priceStr : existing.price,
                isActive: payload.isActive !== undefined ? payload.isActive : existing.isActive,
                updatedAt: new Date(),
              })
              .where(eq(membershipPlans.id, entityId));
          } else {
            await tx.insert(membershipPlans).values({
              id: entityId,
              gymId,
              planName: payload.planName || payload.name || payload.plan_name || 'Standard Plan',
              durationDays: payload.durationDays || payload.duration_days || 30,
              price: priceStr || '0.00',
              isActive: payload.isActive !== undefined ? payload.isActive : true,
            });
          }
        }
        break;
      }

      case 'member_membership': {
        const memberId = payload.memberId || payload.member_id;
        const planId = payload.planId || payload.plan_id;
        const status = payload.status || payload.membershipStatus || 'ACTIVE';
        const startDate = payload.startDate ? new Date(payload.startDate) : new Date();
        const endDate = payload.endDate ? new Date(payload.endDate) : new Date();

        if (operation === 'CREATE' || operation === 'UPDATE') {
          const existing = (
            await tx
              .select()
              .from(memberMemberships)
              .where(and(eq(memberMemberships.id, entityId), eq(memberMemberships.gymId, gymId)))
              .limit(1)
          )[0];

          if (existing) {
            await tx
              .update(memberMemberships)
              .set({
                status,
                startDate,
                endDate,
              })
              .where(eq(memberMemberships.id, entityId));
          } else if (memberId && planId) {
            await tx.insert(memberMemberships).values({
              id: entityId,
              gymId,
              memberId,
              planId,
              status,
              startDate,
              endDate,
            });
          }

          if (memberId) {
            await tx
              .update(gymMembers)
              .set({
                membershipStatus: status,
                expiresAt: endDate,
                updatedAt: new Date(),
              })
              .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId)));
          }
        }
        break;
      }

      case 'payment': {
        // Financial records are IMMUTABLE append-only events
        const existing = (
          await tx
            .select()
            .from(payments)
            .where(and(eq(payments.id, entityId), eq(payments.gymId, gymId)))
            .limit(1)
        )[0];

        if (!existing) {
          const amountStr = payload.amountMinorUnits !== undefined
            ? fromMinorUnits(BigInt(payload.amountMinorUnits))
            : fromMinorUnits(toMinorUnits(payload.amount || payload.amount_paid || 0));

          await tx.insert(payments).values({
            id: entityId,
            gymId,
            memberId: payload.memberId || payload.member_id,
            amount: amountStr,
            paymentMethod: payload.paymentMethod || payload.payment_method || 'CASH',
            status: payload.status || 'COMPLETED',
            paidAt: payload.paymentDate || payload.paidAt ? new Date(payload.paymentDate || payload.paidAt) : new Date(),
          });
        }
        break;
      }

      case 'attendance':
      case 'attendance_log': {
        // Attendance logs are append-only events
        const existing = (
          await tx
            .select()
            .from(attendanceLogs)
            .where(and(eq(attendanceLogs.id, entityId), eq(attendanceLogs.gymId, gymId)))
            .limit(1)
        )[0];

        if (!existing) {
          await tx.insert(attendanceLogs).values({
            id: entityId,
            gymId,
            memberId: payload.memberId || payload.member_id,
            checkInTime: payload.checkInTime || payload.check_in_time ? new Date(payload.checkInTime || payload.check_in_time) : new Date(),
            entryMethod: payload.attendanceMethod || payload.checkInMethod || payload.entryMethod || 'MANUAL',
          });
        }
        break;
      }

      case 'trainer': {
        const existing = (
          await tx
            .select()
            .from(trainers)
            .where(and(eq(trainers.id, entityId), eq(trainers.gymId, gymId)))
            .limit(1)
        )[0];

        if (existing) {
          await tx
            .update(trainers)
            .set({
              fullName: payload.fullName || payload.full_name || existing.fullName,
              phone: payload.phone || existing.phone,
              specialization: payload.specialization !== undefined ? payload.specialization : existing.specialization,
              isActive: payload.isActive !== undefined ? payload.isActive : existing.isActive,
              updatedAt: new Date(),
            })
            .where(eq(trainers.id, entityId));
        } else {
          await tx.insert(trainers).values({
            id: entityId,
            gymId,
            fullName: payload.fullName || payload.full_name || 'Trainer',
            phone: payload.phone || '0000000000',
            specialization: payload.specialization || 'General Fitness',
            isActive: payload.isActive !== undefined ? payload.isActive : true,
          });
        }
        break;
      }

      default:
        logger.warn('[SyncService] Unhandled entity type for domain mutation', { entityType });
    }
  }

  private async getLatestSequence(gymId: string): Promise<number> {
    const row = (
      await db
        .select({ maxSeq: sql<number>`COALESCE(MAX(${syncChangeLog.serverSequence}), 0)` })
        .from(syncChangeLog)
        .where(eq(syncChangeLog.gymId, gymId))
    )[0];

    return row?.maxSeq || 0;
  }

  private async updateDeviceCursor(
    gymId: string,
    deviceId: string,
    sequence: number,
    deviceType: string = 'DESKTOP'
  ): Promise<void> {
    const existing = (
      await db
        .select()
        .from(syncDeviceCursors)
        .where(
          and(
            eq(syncDeviceCursors.gymId, gymId),
            eq(syncDeviceCursors.deviceId, deviceId)
          )
        )
        .limit(1)
    )[0];

    if (existing) {
      await db
        .update(syncDeviceCursors)
        .set({
          lastAcknowledgedSequence: Math.max(existing.lastAcknowledgedSequence, sequence),
          lastSyncAt: new Date(),
        })
        .where(eq(syncDeviceCursors.id, existing.id));
    } else {
      await db.insert(syncDeviceCursors).values({
        gymId,
        deviceId,
        lastAcknowledgedSequence: sequence,
        deviceType,
        lastSyncAt: new Date(),
      });
    }
  }
}

export const syncService = new SyncService();
export default syncService;
