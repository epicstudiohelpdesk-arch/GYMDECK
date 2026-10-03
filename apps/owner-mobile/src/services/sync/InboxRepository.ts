/**
 * GymDeck Owner Mobile - Inbox Repository
 *
 * Gate 5 — Cloud Synchronization Architecture
 *
 * Implements the durable, encrypted transactional inbox and sequence cursor tracker.
 *
 * Guarantees:
 * 1. Global event deduplication at SQLite constraint level (UNIQUE(gym_id, event_id)).
 * 2. Monotonic server sequence tracking (PRIMARY KEY(gym_id, server_sequence)).
 * 3. Crash-safe cursor advancement: cursor only updates within the SAME transaction as domain application.
 * 4. Multi-tenant isolation: strictly scoped by gym_id.
 */

import { LocalDatabaseManager } from '../../database/LocalDatabaseManager';
import { IDatabaseExecutor, SyncInboxRecord } from '../../database/types';
import { PullChangeItem } from './types';
import { DatabaseError } from '../../database/errors';

export class InboxRepository {
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
      throw new DatabaseError('No active gym tenant context found for inbox operation', 'NO_TENANT_CONTEXT');
    }
    return gymId;
  }

  /**
   * Checks if an incoming cloud event has already been recorded in sync_inbox.
   */
  public async isEventRecorded(eventId: string, gymId?: string, executor?: IDatabaseExecutor): Promise<boolean> {
    const activeGymId = this.resolveGymId(gymId);
    const exec = executor || this.dbManager;

    const result = await exec.execute(
      `SELECT 1 FROM sync_inbox WHERE gym_id = ? AND event_id = ? LIMIT 1;`,
      [activeGymId, eventId]
    );

    return Boolean(result.rows && result.rows.length > 0);
  }

  /**
   * Records an incoming remote change event in sync_inbox.
   * Participates in the caller's transaction if executor is provided.
   * Returns false if event was already recorded (idempotent skip), true if recorded.
   */
  public async recordInboxEvent(
    change: PullChangeItem,
    executor?: IDatabaseExecutor,
    gymId?: string
  ): Promise<boolean> {
    const activeGymId = this.resolveGymId(gymId);
    const exec = executor || this.dbManager;
    const now = new Date().toISOString();
    const payloadStr = typeof change.payload === 'string' ? change.payload : JSON.stringify(change.payload);

    try {
      await exec.execute(
        `INSERT INTO sync_inbox (
          server_sequence, gym_id, event_id, entity_type,
          entity_id, operation, payload, applied_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          change.serverSequence,
          activeGymId,
          change.eventId,
          change.entityType,
          change.entityId,
          change.operation,
          payloadStr,
          now,
        ]
      );
      return true;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('UNIQUE constraint failed') || errMsg.includes('PRIMARY KEY constraint failed')) {
        // Idempotent duplicate: already recorded
        return false;
      }
      throw new DatabaseError(`Failed to record sync_inbox event: ${errMsg}`, 'INBOX_WRITE_FAILED');
    }
  }

  /**
   * Retrieves the highest durable last-applied server sequence cursor for this tenant.
   * Stored in sync_state under key 'last_applied_server_sequence'.
   */
  public async getLastAppliedServerSequence(gymId?: string, executor?: IDatabaseExecutor): Promise<number> {
    const activeGymId = this.resolveGymId(gymId);
    const exec = executor || this.dbManager;

    const result = await exec.execute(
      `SELECT value FROM sync_state
       WHERE gym_id = ? AND key = 'last_applied_server_sequence'
       LIMIT 1;`,
      [activeGymId]
    );

    if (result.rows && result.rows.length > 0) {
      const parsed = Number(result.rows[0].value);
      return isNaN(parsed) ? 0 : parsed;
    }

    // Fallback: check max server_sequence in sync_inbox
    const inboxMax = await exec.execute(
      `SELECT COALESCE(MAX(server_sequence), 0) as max_seq
       FROM sync_inbox
       WHERE gym_id = ?;`,
      [activeGymId]
    );

    return Number(inboxMax.rows?.[0]?.max_seq ?? 0);
  }

  /**
   * Updates the durable last-applied server sequence cursor.
   * MUST be called inside the same transaction as domain application.
   */
  public async setLastAppliedServerSequence(
    sequence: number,
    executor?: IDatabaseExecutor,
    gymId?: string
  ): Promise<void> {
    const activeGymId = this.resolveGymId(gymId);
    const exec = executor || this.dbManager;
    const now = new Date().toISOString();

    await exec.execute(
      `INSERT INTO sync_state (key, gym_id, value, updated_at)
       VALUES ('last_applied_server_sequence', ?, ?, ?)
       ON CONFLICT(key, gym_id)
       DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
      [activeGymId, sequence.toString(), now]
    );
  }

  /**
   * Counts total recorded inbox events for the active tenant.
   */
  public async getInboxCount(gymId?: string): Promise<number> {
    const activeGymId = this.resolveGymId(gymId);
    const result = await this.dbManager.execute(
      `SELECT COUNT(*) as count FROM sync_inbox WHERE gym_id = ?;`,
      [activeGymId]
    );
    return Number(result.rows?.[0]?.count ?? 0);
  }

  /**
   * Retrieves recent inbox changes for debugging or inspection.
   */
  public async getRecentInboxChanges(limit: number = 50, gymId?: string): Promise<SyncInboxRecord[]> {
    const activeGymId = this.resolveGymId(gymId);
    const result = await this.dbManager.execute(
      `SELECT server_sequence, gym_id, event_id, entity_type, entity_id, operation, payload, applied_at
       FROM sync_inbox
       WHERE gym_id = ?
       ORDER BY server_sequence DESC
       LIMIT ?;`,
      [activeGymId, limit]
    );

    if (!result.rows) return [];
    return result.rows.map((row: any) => ({
      server_sequence: Number(row.server_sequence),
      gym_id: row.gym_id,
      event_id: row.event_id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      operation: row.operation,
      payload: row.payload,
      applied_at: row.applied_at,
    }));
  }
}

export const inboxRepository = new InboxRepository();
