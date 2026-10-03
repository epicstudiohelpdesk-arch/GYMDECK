/**
 * GymDeck Owner Mobile - Outbox Repository
 *
 * Implements the durable, encrypted transactional outbox queue for offline mutations.
 *
 * Guarantees:
 * - Enqueue participates in the EXACT SAME SQLite transaction as business mutations.
 * - Globally unique eventId enforced at the SQLite database constraint level.
 * - Event payload preserved with exact byte fidelity (JSON string).
 * - Multi-tenant isolation: strictly filtered by gym_id.
 * - Outbox lifecycle states prepared for Gate 5:
 *   PENDING, IN_FLIGHT, ACKNOWLEDGED, FAILED_RETRYABLE, FAILED_PERMANENT.
 * - Zero HTTP network calls.
 */

import { LocalDatabaseManager } from '../LocalDatabaseManager';
import {
  CanonicalOutboxEvent,
  OutboxRecord,
  OutboxStatus,
  IDatabaseExecutor,
} from '../types';
import { generateUUID } from '../utils';
import { DatabaseError } from '../errors';

export interface IOutboxRepository {
  enqueue<T = Record<string, any>>(
    event: CanonicalOutboxEvent<T>,
    executor?: IDatabaseExecutor
  ): Promise<OutboxRecord>;
  getPendingEvents(limit?: number, gymId?: string): Promise<OutboxRecord[]>;
  getClaimableEvents(limit?: number, gymId?: string): Promise<OutboxRecord[]>;
  getEventByEventId(eventId: string, gymId?: string): Promise<OutboxRecord | null>;
  countPending(gymId?: string): Promise<number>;
  countAllStatuses(gymId?: string): Promise<{
    pending: number;
    inFlight: number;
    acknowledged: number;
    failedRetryable: number;
    failedPermanent: number;
  }>;
  inspectFailedEvents(limit?: number, gymId?: string): Promise<OutboxRecord[]>;
  updateStatus(
    eventId: string,
    status: OutboxStatus,
    options?: {
      errorCode?: string;
      errorMessage?: string;
      workerId?: string;
      leaseExpiresAt?: string;
      nextRetryAt?: string;
    },
    executor?: IDatabaseExecutor,
    gymId?: string
  ): Promise<boolean>;
  recoverStaleInFlightEvents(olderThanIsoDate?: string, gymId?: string): Promise<number>;
  markBatchInFlight(eventIds: string[], leaseExpiresAt: string, workerId: string, gymId?: string): Promise<number>;
  deleteAcknowledged(olderThanIsoDate: string, gymId?: string): Promise<number>;
}

function mapRowToOutboxRecord(row: Record<string, any>): OutboxRecord {
  let parsedPayload: Record<string, any> | undefined;
  try {
    parsedPayload = JSON.parse(row.payload as string);
  } catch {
    parsedPayload = undefined;
  }

  return {
    id: row.id as string,
    schemaVersion: Number(row.schema_version ?? 1),
    eventId: row.event_id as string,
    gymId: row.gym_id as string,
    deviceId: (row.device_id as string) || '',
    entityType: row.entity_type as string,
    entityId: row.entity_id as string,
    operation: row.operation as any,
    baseServerSequence:
      row.base_server_sequence !== null && row.base_server_sequence !== undefined
        ? Number(row.base_server_sequence)
        : null,
    payload: row.payload as string,
    parsedPayload,
    clientTimestamp: (row.client_timestamp as string) || (row.created_at as string),
    createdAt: row.created_at as string,
    attemptCount: Number(row.attempt_count ?? 0),
    lastAttemptAt: (row.last_attempt_at as string) || null,
    nextRetryAt: (row.next_retry_at as string) || null,
    leaseExpiresAt: (row.lease_expires_at as string) || null,
    workerId: (row.worker_id as string) || null,
    status: (row.status as OutboxStatus) || 'PENDING',
    errorCode: (row.error_code as string) || null,
    errorMessage: (row.error_message as string) || null,
  };
}

export class OutboxRepository implements IOutboxRepository {
  constructor(private dbManager: LocalDatabaseManager = LocalDatabaseManager.getInstance()) {}

  private resolveGymId(explicitGymId?: string): string {
    if (explicitGymId !== undefined) {
      if (!explicitGymId || explicitGymId.trim() === '') {
        throw new DatabaseError('Invalid or empty explicit gymId', 'NO_TENANT_CONTEXT');
      }
      return explicitGymId;
    }
    const gymId = this.dbManager.getActiveGymId();
    if (!gymId) {
      throw new DatabaseError('No active gym tenant context found for outbox operation', 'NO_TENANT_CONTEXT');
    }
    return gymId;
  }

  /**
   * Atomically enqueues a canonical outbox event.
   * If an executor is provided (active transaction), writes within that transaction.
   * Enforces database-level uniqueness of event_id.
   */
  public async enqueue<T = Record<string, any>>(
    event: CanonicalOutboxEvent<T>,
    executor?: IDatabaseExecutor
  ): Promise<OutboxRecord> {
    const activeGymId = this.resolveGymId(event.gymId);
    const exec = executor || this.dbManager;
    const now = new Date().toISOString();
    const id = generateUUID();
    const payloadStr = typeof event.payload === 'string' ? event.payload : JSON.stringify(event.payload);

    try {
      await exec.execute(
        `INSERT INTO sync_outbox (
          id, schema_version, event_id, gym_id, device_id,
          entity_type, entity_id, operation, base_server_sequence,
          payload, client_timestamp, created_at, attempt_count,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'PENDING');`,
        [
          id,
          event.schemaVersion ?? 1,
          event.eventId,
          activeGymId,
          event.deviceId,
          event.entityType,
          event.entityId,
          event.operation,
          event.baseServerSequence !== undefined ? event.baseServerSequence : null,
          payloadStr,
          event.clientTimestamp || now,
          now,
        ]
      );
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('UNIQUE constraint failed') && errMsg.includes('event_id')) {
        throw new DatabaseError(
          `Outbox event with eventId '${event.eventId}' already exists`,
          'DUPLICATE_EVENT_ID'
        );
      }
      throw new DatabaseError(`Failed to enqueue outbox event: ${errMsg}`, 'ENQUEUE_FAILED');
    }

    return {
      id,
      schemaVersion: event.schemaVersion ?? 1,
      eventId: event.eventId,
      gymId: activeGymId,
      deviceId: event.deviceId,
      entityType: event.entityType,
      entityId: event.entityId,
      operation: event.operation,
      baseServerSequence: event.baseServerSequence ?? null,
      payload: payloadStr,
      parsedPayload: (event.payload && typeof event.payload === 'object') ? (event.payload as Record<string, any>) : undefined,
      clientTimestamp: event.clientTimestamp || now,
      createdAt: now,
      attemptCount: 0,
      lastAttemptAt: null,
      nextRetryAt: null,
      leaseExpiresAt: null,
      workerId: null,
      status: 'PENDING',
      errorCode: null,
      errorMessage: null,
    };
  }

  /**
   * Retrieves pending outbox events ordered chronologically for delivery.
   */
  public async getPendingEvents(limit: number = 100, gymId?: string): Promise<OutboxRecord[]> {
    const activeGymId = this.resolveGymId(gymId);
    const result = await this.dbManager.execute(
      `SELECT * FROM sync_outbox
       WHERE gym_id = ? AND status = 'PENDING'
       ORDER BY created_at ASC
       LIMIT ?;`,
      [activeGymId, limit]
    );

    if (!result.rows) return [];
    return result.rows.map(mapRowToOutboxRecord);
  }

  /**
   * Retrieves events eligible for sync delivery:
   * - status = 'PENDING'
   * - status = 'FAILED_RETRYABLE' with next_retry_at <= now (or NULL)
   */
  public async getClaimableEvents(limit: number = 50, gymId?: string): Promise<OutboxRecord[]> {
    const activeGymId = this.resolveGymId(gymId);
    const now = new Date().toISOString();
    const result = await this.dbManager.execute(
      `SELECT * FROM sync_outbox
       WHERE gym_id = ?
         AND (
           status = 'PENDING'
           OR (status = 'FAILED_RETRYABLE' AND (next_retry_at IS NULL OR next_retry_at <= ?))
         )
       ORDER BY created_at ASC
       LIMIT ?;`,
      [activeGymId, now, limit]
    );

    if (!result.rows) return [];
    return result.rows.map(mapRowToOutboxRecord);
  }

  /**
   * Counts outbox events across all states for diagnostics and observability.
   */
  public async countAllStatuses(gymId?: string): Promise<{
    pending: number;
    inFlight: number;
    acknowledged: number;
    failedRetryable: number;
    failedPermanent: number;
  }> {
    const activeGymId = this.resolveGymId(gymId);
    const result = await this.dbManager.execute(
      `SELECT status, COUNT(*) as count FROM sync_outbox
       WHERE gym_id = ?
       GROUP BY status;`,
      [activeGymId]
    );

    const counts = {
      pending: 0,
      inFlight: 0,
      acknowledged: 0,
      failedRetryable: 0,
      failedPermanent: 0,
    };

    if (result.rows) {
      for (const row of result.rows) {
        const count = Number(row.count ?? 0);
        switch (row.status) {
          case 'PENDING':
            counts.pending = count;
            break;
          case 'IN_FLIGHT':
            counts.inFlight = count;
            break;
          case 'ACKNOWLEDGED':
            counts.acknowledged = count;
            break;
          case 'FAILED_RETRYABLE':
            counts.failedRetryable = count;
            break;
          case 'FAILED_PERMANENT':
            counts.failedPermanent = count;
            break;
        }
      }
    }

    return counts;
  }

  /**
   * Retrieves an outbox event by its globally unique eventId.
   */
  public async getEventByEventId(eventId: string, gymId?: string): Promise<OutboxRecord | null> {
    const activeGymId = this.resolveGymId(gymId);
    const result = await this.dbManager.execute(
      `SELECT * FROM sync_outbox WHERE event_id = ? AND gym_id = ? LIMIT 1;`,
      [eventId, activeGymId]
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return mapRowToOutboxRecord(result.rows[0]);
  }

  /**
   * Counts total pending outbox events for the active tenant.
   */
  public async countPending(gymId?: string): Promise<number> {
    const activeGymId = this.resolveGymId(gymId);
    const result = await this.dbManager.execute(
      `SELECT COUNT(*) as count FROM sync_outbox WHERE gym_id = ? AND status = 'PENDING';`,
      [activeGymId]
    );
    return Number(result.rows?.[0]?.count ?? 0);
  }

  /**
   * Inspects failed outbox events (failed retryable or permanent).
   */
  public async inspectFailedEvents(limit: number = 50, gymId?: string): Promise<OutboxRecord[]> {
    const activeGymId = this.resolveGymId(gymId);
    const result = await this.dbManager.execute(
      `SELECT * FROM sync_outbox
       WHERE gym_id = ? AND status IN ('FAILED_RETRYABLE', 'FAILED_PERMANENT')
       ORDER BY created_at DESC
       LIMIT ?;`,
      [activeGymId, limit]
    );

    if (!result.rows) return [];
    return result.rows.map(mapRowToOutboxRecord);
  }

  /**
   * Updates state of an outbox event for sync engine processing (Gate 5 preparation).
   */
  public async updateStatus(
    eventId: string,
    status: OutboxStatus,
    options?: {
      errorCode?: string;
      errorMessage?: string;
      workerId?: string;
      leaseExpiresAt?: string;
      nextRetryAt?: string;
    },
    executor?: IDatabaseExecutor,
    gymId?: string
  ): Promise<boolean> {
    const activeGymId = this.resolveGymId(gymId);
    const exec = executor || this.dbManager;
    const now = new Date().toISOString();

    const setClauses: string[] = ['status = ?', 'last_attempt_at = ?', 'attempt_count = attempt_count + 1'];
    const params: any[] = [status, now];

    if (options?.errorCode !== undefined) {
      setClauses.push('error_code = ?');
      params.push(options.errorCode);
    }
    if (options?.errorMessage !== undefined) {
      setClauses.push('error_message = ?');
      params.push(options.errorMessage);
    }
    if (options?.workerId !== undefined) {
      setClauses.push('worker_id = ?');
      params.push(options.workerId);
    }
    if (options?.leaseExpiresAt !== undefined) {
      setClauses.push('lease_expires_at = ?');
      params.push(options.leaseExpiresAt);
    }
    if (options?.nextRetryAt !== undefined) {
      setClauses.push('next_retry_at = ?');
      params.push(options.nextRetryAt);
    }

    params.push(eventId);
    params.push(activeGymId);

    const result = await exec.execute(
      `UPDATE sync_outbox SET ${setClauses.join(', ')} WHERE event_id = ? AND gym_id = ?;`,
      params
    );

    return (result.rowsAffected ?? 0) > 0;
  }

  /**
   * Recovers events stranded in 'IN_FLIGHT' due to app termination or network freeze.
   * Resets them back to 'PENDING' so they can be retransmitted safely.
   */
  public async recoverStaleInFlightEvents(olderThanIsoDate?: string, gymId?: string): Promise<number> {
    const activeGymId = this.resolveGymId(gymId);
    const threshold = olderThanIsoDate || new Date().toISOString();

    const result = await this.dbManager.execute(
      `UPDATE sync_outbox
       SET status = 'PENDING',
           worker_id = NULL,
           lease_expires_at = NULL
       WHERE gym_id = ?
         AND status = 'IN_FLIGHT'
         AND (lease_expires_at IS NULL OR lease_expires_at <= ?);`,
      [activeGymId, threshold]
    );

    return Number(result.rowsAffected ?? 0);
  }

  /**
   * Atomically claims a batch of events as IN_FLIGHT with a lease expiration.
   */
  public async markBatchInFlight(
    eventIds: string[],
    leaseExpiresAt: string,
    workerId: string,
    gymId?: string
  ): Promise<number> {
    if (eventIds.length === 0) return 0;
    const activeGymId = this.resolveGymId(gymId);
    const now = new Date().toISOString();

    const placeholders = eventIds.map(() => '?').join(', ');
    const params = [leaseExpiresAt, workerId, now, activeGymId, ...eventIds];

    const result = await this.dbManager.execute(
      `UPDATE sync_outbox
       SET status = 'IN_FLIGHT',
           lease_expires_at = ?,
           worker_id = ?,
           last_attempt_at = ?,
           attempt_count = attempt_count + 1
       WHERE gym_id = ?
         AND event_id IN (${placeholders});`,
      params
    );

    return Number(result.rowsAffected ?? 0);
  }

  /**
   * Deletes acknowledged outbox events older than a retention threshold.
   */
  public async deleteAcknowledged(olderThanIsoDate: string, gymId?: string): Promise<number> {
    const activeGymId = this.resolveGymId(gymId);
    const result = await this.dbManager.execute(
      `DELETE FROM sync_outbox
       WHERE gym_id = ? AND status = 'ACKNOWLEDGED' AND created_at < ?;`,
      [activeGymId, olderThanIsoDate]
    );
    return Number(result.rowsAffected ?? 0);
  }
}

export const outboxRepository = new OutboxRepository();
