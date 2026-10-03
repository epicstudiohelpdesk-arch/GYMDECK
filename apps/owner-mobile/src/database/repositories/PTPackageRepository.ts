/**
 * GymDeck Owner Mobile - PT Package & Session Repository
 *
 * Implements local persistence for personal training packages and completed/scheduled sessions.
 * Strict financial invariant: price_minor_units is stored strictly as integer paise.
 *
 * Transactional Outbox:
 * Package creation and session recording participate in atomic SQLite transactions with outbox events.
 */

import { LocalDatabaseManager } from '../LocalDatabaseManager';
import {
  IPTPackageRepository,
  CreatePTPackageInput,
  CreatePTSessionInput,
} from './interfaces';
import { PTPackageRecord, PTSessionRecord, IDatabaseExecutor } from '../types';
import { generateUUID } from '../utils';
import { DatabaseError } from '../errors';
import { outboxRepository, IOutboxRepository } from './OutboxRepository';
import { DeviceIdentityService } from '../../services/DeviceIdentityService';

function mapRowToPackage(row: Record<string, any>): PTPackageRecord {
  return {
    id: row.id as string,
    gym_id: row.gym_id as string,
    member_id: row.member_id as string,
    trainer_id: row.trainer_id as string,
    package_name: row.package_name as string,
    total_sessions: Number(row.total_sessions),
    used_sessions: Number(row.used_sessions),
    remaining_sessions: Number(row.remaining_sessions),
    price_minor_units: Number(row.price_minor_units),
    expiry_date: row.expiry_date as string,
    status: row.status as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deleted_at: (row.deleted_at as string) || null,
    server_version:
      row.server_version !== null && row.server_version !== undefined
        ? Number(row.server_version)
        : null,
    sync_status: (row.sync_status as any) || 'SYNCED',
  };
}

function mapRowToSession(row: Record<string, any>): PTSessionRecord {
  return {
    id: row.id as string,
    package_id: row.package_id as string,
    gym_id: row.gym_id as string,
    member_id: row.member_id as string,
    trainer_id: row.trainer_id as string,
    session_date: row.session_date as string,
    duration_minutes: Number(row.duration_minutes),
    focus_area: (row.focus_area as string) || null,
    trainer_notes: (row.trainer_notes as string) || null,
    status: row.status as string,
    created_at: row.created_at as string,
    deleted_at: (row.deleted_at as string) || null,
    server_version:
      row.server_version !== null && row.server_version !== undefined
        ? Number(row.server_version)
        : null,
    sync_status: (row.sync_status as any) || 'SYNCED',
  };
}

export class PTPackageRepository implements IPTPackageRepository {
  constructor(
    private dbManager: LocalDatabaseManager = LocalDatabaseManager.getInstance(),
    private outboxRepo: IOutboxRepository = outboxRepository
  ) {}

  private resolveGymId(explicitGymId?: string): string {
    if (explicitGymId !== undefined) {
      if (!explicitGymId || explicitGymId.trim() === '') {
        throw new DatabaseError(
          'Empty or invalid explicit gym tenant context provided',
          'NO_TENANT_CONTEXT'
        );
      }
      return explicitGymId;
    }
    const gymId = this.dbManager.getActiveGymId();
    if (!gymId) {
      throw new DatabaseError(
        'No active gym tenant context found for PT operation',
        'NO_TENANT_CONTEXT'
      );
    }
    return gymId;
  }

  // ==============================================================================
  // PT Packages
  // ==============================================================================

  public async createPackage(
    input: CreatePTPackageInput,
    executor?: IDatabaseExecutor
  ): Promise<PTPackageRecord> {
    const run = async (exec: IDatabaseExecutor) => {
      const activeGymId = this.resolveGymId(input.gymId);
      const id = input.id || generateUUID();
      const now = new Date().toISOString();
      const usedSessions = input.usedSessions ?? 0;
      const status = input.status || 'ACTIVE';
      const priceMinorUnits = Math.round(Number(input.priceMinorUnits));

      await exec.execute(
        `INSERT INTO pt_packages (
          id, gym_id, member_id, trainer_id, package_name,
          total_sessions, used_sessions, remaining_sessions,
          price_minor_units, expiry_date, status, created_at, updated_at,
          server_version, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'PENDING_MUTATION');`,
        [
          id,
          activeGymId,
          input.memberId,
          input.trainerId,
          input.packageName,
          input.totalSessions,
          usedSessions,
          input.remainingSessions,
          priceMinorUnits,
          input.expiryDate,
          status,
          now,
          now,
        ]
      );

      // Enqueue outbox CREATE event
      const eventId = generateUUID();
      const deviceId = DeviceIdentityService.getDeviceIdSync();
      await this.outboxRepo.enqueue(
        {
          schemaVersion: 1,
          eventId,
          gymId: activeGymId,
          deviceId,
          entityType: 'pt_package',
          entityId: id,
          operation: 'CREATE',
          baseServerSequence: null,
          payload: {
            id,
            gymId: activeGymId,
            memberId: input.memberId,
            trainerId: input.trainerId,
            packageName: input.packageName,
            totalSessions: input.totalSessions,
            usedSessions,
            remainingSessions: input.remainingSessions,
            priceMinorUnits,
            expiryDate: input.expiryDate,
            status,
            createdAt: now,
          },
          clientTimestamp: now,
        },
        exec
      );

      const created = await this.findPackageById(id, activeGymId, exec);
      if (!created) {
        throw new DatabaseError('Failed to fetch newly created PT package', 'INSERT_FAILED');
      }
      return created;
    };

    if (executor) {
      return run(executor);
    }
    return this.dbManager.runInTransaction(run);
  }

  public async findPackageById(id: string, gymId?: string, executor?: IDatabaseExecutor): Promise<PTPackageRecord | null> {
    const activeGymId = this.resolveGymId(gymId);
    const exec = executor || this.dbManager;
    const result = await exec.execute(
      'SELECT * FROM pt_packages WHERE id = ? AND gym_id = ? AND (deleted_at IS NULL OR deleted_at = "") LIMIT 1;',
      [id, activeGymId]
    );
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return mapRowToPackage(result.rows[0]);
  }

  public async listPackages(params?: {
    gymId?: string;
    memberId?: string;
    trainerId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PTPackageRecord[]> {
    const activeGymId = this.resolveGymId(params?.gymId);
    let sql = 'SELECT * FROM pt_packages WHERE gym_id = ? AND (deleted_at IS NULL OR deleted_at = "")';
    const queryParams: any[] = [activeGymId];

    if (params?.memberId) {
      sql += ' AND member_id = ?';
      queryParams.push(params.memberId);
    }
    if (params?.trainerId) {
      sql += ' AND trainer_id = ?';
      queryParams.push(params.trainerId);
    }
    if (params?.status && params.status !== 'ALL') {
      sql += ' AND status = ?';
      queryParams.push(params.status);
    }

    sql += ' ORDER BY created_at DESC';

    if (params?.limit !== undefined) {
      sql += ' LIMIT ?';
      queryParams.push(params.limit);
      if (params?.offset !== undefined) {
        sql += ' OFFSET ?';
        queryParams.push(params.offset);
      }
    }

    const result = await this.dbManager.execute(sql, queryParams);
    if (!result.rows) return [];
    return result.rows.map(mapRowToPackage);
  }

  public async upsertPackage(input: CreatePTPackageInput, gymId?: string): Promise<PTPackageRecord> {
    const activeGymId = this.resolveGymId(gymId || input.gymId);
    const id = input.id || generateUUID();
    const now = new Date().toISOString();
    const usedSessions = input.usedSessions ?? 0;
    const status = input.status || 'ACTIVE';
    const priceMinorUnits = Math.round(Number(input.priceMinorUnits));

    await this.dbManager.execute(
      `INSERT INTO pt_packages (
        id, gym_id, member_id, trainer_id, package_name,
        total_sessions, used_sessions, remaining_sessions,
        price_minor_units, expiry_date, status, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED')
      ON CONFLICT(id) DO UPDATE SET
        member_id = excluded.member_id,
        trainer_id = excluded.trainer_id,
        package_name = excluded.package_name,
        total_sessions = excluded.total_sessions,
        used_sessions = excluded.used_sessions,
        remaining_sessions = excluded.remaining_sessions,
        price_minor_units = excluded.price_minor_units,
        expiry_date = excluded.expiry_date,
        status = excluded.status,
        sync_status = 'SYNCED',
        updated_at = excluded.updated_at
      WHERE gym_id = excluded.gym_id;`,
      [
        id,
        activeGymId,
        input.memberId,
        input.trainerId,
        input.packageName,
        input.totalSessions,
        usedSessions,
        input.remainingSessions,
        priceMinorUnits,
        input.expiryDate,
        status,
        now,
        now,
      ]
    );

    const record = await this.findPackageById(id, activeGymId);
    if (!record) {
      throw new DatabaseError('Failed to fetch upserted PT package', 'UPSERT_FAILED');
    }
    return record;
  }

  public async upsertPackageBatch(inputs: CreatePTPackageInput[], gymId?: string): Promise<number> {
    if (!inputs || inputs.length === 0) return 0;
    const activeGymId = this.resolveGymId(gymId);
    const now = new Date().toISOString();

    let count = 0;
    await this.dbManager.transaction(async (tx) => {
      for (const input of inputs) {
        const id = input.id || generateUUID();
        const usedSessions = input.usedSessions ?? 0;
        const status = input.status || 'ACTIVE';
        const priceMinorUnits = Math.round(Number(input.priceMinorUnits));

        await tx.execute(
          `INSERT INTO pt_packages (
            id, gym_id, member_id, trainer_id, package_name,
            total_sessions, used_sessions, remaining_sessions,
            price_minor_units, expiry_date, status, created_at, updated_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED')
          ON CONFLICT(id) DO UPDATE SET
            member_id = excluded.member_id,
            trainer_id = excluded.trainer_id,
            package_name = excluded.package_name,
            total_sessions = excluded.total_sessions,
            used_sessions = excluded.used_sessions,
            remaining_sessions = excluded.remaining_sessions,
            price_minor_units = excluded.price_minor_units,
            expiry_date = excluded.expiry_date,
            status = excluded.status,
            sync_status = 'SYNCED',
            updated_at = excluded.updated_at
          WHERE gym_id = excluded.gym_id;`,
          [
            id,
            activeGymId,
            input.memberId,
            input.trainerId,
            input.packageName,
            input.totalSessions,
            usedSessions,
            input.remainingSessions,
            priceMinorUnits,
            input.expiryDate,
            status,
            now,
            now,
          ]
        );
        count++;
      }
    });

    return count;
  }

  // ==============================================================================
  // PT Sessions
  // ==============================================================================

  public async createSession(
    input: CreatePTSessionInput,
    executor?: IDatabaseExecutor
  ): Promise<PTSessionRecord> {
    const run = async (exec: IDatabaseExecutor) => {
      const activeGymId = this.resolveGymId(input.gymId);
      const id = input.id || generateUUID();
      const now = new Date().toISOString();
      const durationMinutes = input.durationMinutes ?? 60;
      const status = input.status || 'COMPLETED';

      // 1. Insert the session row
      await exec.execute(
        `INSERT INTO pt_sessions (
          id, package_id, gym_id, member_id, trainer_id,
          session_date, duration_minutes, focus_area, trainer_notes,
          status, created_at, server_version, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'PENDING_MUTATION');`,
        [
          id,
          input.packageId,
          activeGymId,
          input.memberId,
          input.trainerId,
          input.sessionDate,
          durationMinutes,
          input.focusArea ?? null,
          input.trainerNotes ?? null,
          status,
          now,
        ]
      );

      // 2. Decrement package remaining sessions / increment used
      const existingPkg = await this.findPackageById(input.packageId, activeGymId, exec);
      if (existingPkg) {
        await exec.execute(
          `UPDATE pt_packages
           SET used_sessions = used_sessions + 1,
               remaining_sessions = MAX(0, remaining_sessions - 1),
               sync_status = 'PENDING_MUTATION',
               updated_at = ?
           WHERE id = ? AND gym_id = ?;`,
          [now, input.packageId, activeGymId]
        );
      }

      // 3. Enqueue outbox event for the session
      const eventId = generateUUID();
      const deviceId = DeviceIdentityService.getDeviceIdSync();
      await this.outboxRepo.enqueue(
        {
          schemaVersion: 1,
          eventId,
          gymId: activeGymId,
          deviceId,
          entityType: 'pt_session',
          entityId: id,
          operation: 'CREATE',
          baseServerSequence: null,
          payload: {
            id,
            packageId: input.packageId,
            gymId: activeGymId,
            memberId: input.memberId,
            trainerId: input.trainerId,
            sessionDate: input.sessionDate,
            durationMinutes,
            focusArea: input.focusArea ?? null,
            trainerNotes: input.trainerNotes ?? null,
            status,
            createdAt: now,
          },
          clientTimestamp: now,
        },
        exec
      );

      // 4. If package was updated, enqueue outbox event for package update
      if (existingPkg) {
        const pkgEventId = generateUUID();
        await this.outboxRepo.enqueue(
          {
            schemaVersion: 1,
            eventId: pkgEventId,
            gymId: activeGymId,
            deviceId,
            entityType: 'pt_package',
            entityId: input.packageId,
            operation: 'UPDATE',
            baseServerSequence: existingPkg.server_version ?? null,
            payload: {
              id: input.packageId,
              usedSessions: existingPkg.used_sessions + 1,
              remainingSessions: Math.max(0, existingPkg.remaining_sessions - 1),
              updatedAt: now,
            },
            clientTimestamp: now,
          },
          exec
        );
      }

      const created = await this.findSessionById(id, activeGymId, exec);
      if (!created) {
        throw new DatabaseError('Failed to fetch newly created PT session', 'INSERT_FAILED');
      }
      return created;
    };

    if (executor) {
      return run(executor);
    }
    return this.dbManager.runInTransaction(run);
  }

  public async findSessionById(id: string, gymId?: string, executor?: IDatabaseExecutor): Promise<PTSessionRecord | null> {
    const activeGymId = this.resolveGymId(gymId);
    const exec = executor || this.dbManager;
    const result = await exec.execute(
      'SELECT * FROM pt_sessions WHERE id = ? AND gym_id = ? AND (deleted_at IS NULL OR deleted_at = "") LIMIT 1;',
      [id, activeGymId]
    );
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return mapRowToSession(result.rows[0]);
  }

  public async listSessions(params?: {
    gymId?: string;
    packageId?: string;
    memberId?: string;
    trainerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PTSessionRecord[]> {
    const activeGymId = this.resolveGymId(params?.gymId);
    let sql = 'SELECT * FROM pt_sessions WHERE gym_id = ? AND (deleted_at IS NULL OR deleted_at = "")';
    const queryParams: any[] = [activeGymId];

    if (params?.packageId) {
      sql += ' AND package_id = ?';
      queryParams.push(params.packageId);
    }
    if (params?.memberId) {
      sql += ' AND member_id = ?';
      queryParams.push(params.memberId);
    }
    if (params?.trainerId) {
      sql += ' AND trainer_id = ?';
      queryParams.push(params.trainerId);
    }

    sql += ' ORDER BY session_date DESC';

    if (params?.limit !== undefined) {
      sql += ' LIMIT ?';
      queryParams.push(params.limit);
      if (params?.offset !== undefined) {
        sql += ' OFFSET ?';
        queryParams.push(params.offset);
      }
    }

    const result = await this.dbManager.execute(sql, queryParams);
    if (!result.rows) return [];
    return result.rows.map(mapRowToSession);
  }

  public async upsertSession(input: CreatePTSessionInput, gymId?: string): Promise<PTSessionRecord> {
    const activeGymId = this.resolveGymId(gymId || input.gymId);
    const id = input.id || generateUUID();
    const now = new Date().toISOString();
    const durationMinutes = input.durationMinutes ?? 60;
    const status = input.status || 'COMPLETED';

    await this.dbManager.execute(
      `INSERT INTO pt_sessions (
        id, package_id, gym_id, member_id, trainer_id,
        session_date, duration_minutes, focus_area, trainer_notes,
        status, created_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED')
      ON CONFLICT(id) DO UPDATE SET
        package_id = excluded.package_id,
        member_id = excluded.member_id,
        trainer_id = excluded.trainer_id,
        session_date = excluded.session_date,
        duration_minutes = excluded.duration_minutes,
        focus_area = excluded.focus_area,
        trainer_notes = excluded.trainer_notes,
        status = excluded.status,
        sync_status = 'SYNCED'
      WHERE gym_id = excluded.gym_id;`,
      [
        id,
        input.packageId,
        activeGymId,
        input.memberId,
        input.trainerId,
        input.sessionDate,
        durationMinutes,
        input.focusArea ?? null,
        input.trainerNotes ?? null,
        status,
        now,
      ]
    );

    const record = await this.findSessionById(id, activeGymId);
    if (!record) {
      throw new DatabaseError('Failed to fetch upserted PT session', 'UPSERT_FAILED');
    }
    return record;
  }

  public async upsertSessionBatch(inputs: CreatePTSessionInput[], gymId?: string): Promise<number> {
    if (!inputs || inputs.length === 0) return 0;
    const activeGymId = this.resolveGymId(gymId);
    const now = new Date().toISOString();

    let count = 0;
    await this.dbManager.transaction(async (tx) => {
      for (const input of inputs) {
        const id = input.id || generateUUID();
        const durationMinutes = input.durationMinutes ?? 60;
        const status = input.status || 'COMPLETED';

        await tx.execute(
          `INSERT INTO pt_sessions (
            id, package_id, gym_id, member_id, trainer_id,
            session_date, duration_minutes, focus_area, trainer_notes,
            status, created_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED')
          ON CONFLICT(id) DO UPDATE SET
            package_id = excluded.package_id,
            member_id = excluded.member_id,
            trainer_id = excluded.trainer_id,
            session_date = excluded.session_date,
            duration_minutes = excluded.duration_minutes,
            focus_area = excluded.focus_area,
            trainer_notes = excluded.trainer_notes,
            status = excluded.status,
            sync_status = 'SYNCED'
          WHERE gym_id = excluded.gym_id;`,
          [
            id,
            input.packageId,
            activeGymId,
            input.memberId,
            input.trainerId,
            input.sessionDate,
            durationMinutes,
            input.focusArea ?? null,
            input.trainerNotes ?? null,
            status,
            now,
          ]
        );
        count++;
      }
    });

    return count;
  }
}
