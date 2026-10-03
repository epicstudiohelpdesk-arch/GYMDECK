/**
 * GymDeck Owner Mobile - Attendance Repository
 *
 * Implements local persistence for member check-in and check-out events.
 *
 * Attendance Safety Model:
 * - CHECK_IN is an immutable attendance event.
 * - CHECK_OUT is a separate event targeting the check-in record.
 * - Corrections use VOID/CORRECTION semantics (soft-delete with VOID outbox event).
 * - No unsafe 60-second coalescing or silent history deletion.
 * - Multi-tenant isolation enforced in all queries.
 */

import { LocalDatabaseManager } from '../LocalDatabaseManager';
import {
  IAttendanceRepository,
  RecordCheckInInput,
  AttendanceListItem,
  AttendanceStatsSummary,
} from './interfaces';
import { AttendanceLogRecord, IDatabaseExecutor } from '../types';
import { generateUUID } from '../utils';
import { DatabaseError } from '../errors';
import { outboxRepository, IOutboxRepository } from './OutboxRepository';
import { DeviceIdentityService } from '../../services/DeviceIdentityService';

export { AttendanceListItem, AttendanceStatsSummary };

function mapRowToAttendance(row: Record<string, any>): AttendanceLogRecord {
  return {
    id: row.id as string,
    gym_id: row.gym_id as string,
    member_id: row.member_id as string,
    check_in_time: row.check_in_time as string,
    check_out_time: (row.check_out_time as string) || null,
    entry_method: row.entry_method as string,
    device_metadata: (row.device_metadata as string) || null,
    notes: (row.notes as string) || null,
    recorded_by_user_id: (row.recorded_by_user_id as string) || null,
    created_at: row.created_at as string,
    deleted_at: (row.deleted_at as string) || null,
    server_version:
      row.server_version !== null && row.server_version !== undefined
        ? Number(row.server_version)
        : null,
    sync_status: (row.sync_status as any) || 'SYNCED',
  };
}

export class AttendanceRepository implements IAttendanceRepository {
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
        'No active gym tenant context found for attendance operation',
        'NO_TENANT_CONTEXT'
      );
    }
    return gymId;
  }

  public async findById(id: string, gymId?: string, executor?: IDatabaseExecutor): Promise<AttendanceLogRecord | null> {
    const activeGymId = this.resolveGymId(gymId);
    const exec = executor || this.dbManager;
    const result = await exec.execute(
      'SELECT * FROM attendance_logs WHERE id = ? AND gym_id = ? AND deleted_at IS NULL LIMIT 1;',
      [id, activeGymId]
    );
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return mapRowToAttendance(result.rows[0]);
  }

  public async recordCheckIn(
    input: RecordCheckInInput,
    executor?: IDatabaseExecutor
  ): Promise<AttendanceLogRecord> {
    const run = async (exec: IDatabaseExecutor) => {
      const activeGymId = this.resolveGymId(input.gymId);
      const id = input.id || generateUUID();
      const now = new Date().toISOString();
      const checkInTime = input.checkInTime || now;
      const entryMethod = input.entryMethod || 'MANUAL';

      await exec.execute(
        `INSERT INTO attendance_logs (
          id, gym_id, member_id, check_in_time, check_out_time,
          entry_method, device_metadata, notes, recorded_by_user_id,
          created_at, deleted_at, server_version, sync_status
        ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, NULL, NULL, 'PENDING_MUTATION');`,
        [
          id,
          activeGymId,
          input.memberId,
          checkInTime,
          entryMethod,
          input.deviceMetadata ?? null,
          input.notes ?? null,
          input.recordedByUserId ?? null,
          now,
        ]
      );

      // Enqueue canonical outbox CREATE event
      const eventId = generateUUID();
      const deviceId = DeviceIdentityService.getDeviceIdSync();
      await this.outboxRepo.enqueue(
        {
          schemaVersion: 1,
          eventId,
          gymId: activeGymId,
          deviceId,
          entityType: 'attendance_log',
          entityId: id,
          operation: 'CREATE',
          baseServerSequence: null,
          payload: {
            id,
            gymId: activeGymId,
            memberId: input.memberId,
            checkInTime,
            entryMethod,
            deviceMetadata: input.deviceMetadata ?? null,
            notes: input.notes ?? null,
            recordedByUserId: input.recordedByUserId ?? null,
            createdAt: now,
          },
          clientTimestamp: now,
        },
        exec
      );

      const created = await this.findById(id, activeGymId, exec);
      if (!created) {
        throw new DatabaseError('Failed to fetch newly recorded attendance log', 'INSERT_FAILED');
      }
      return created;
    };

    if (executor) {
      return run(executor);
    }
    return this.dbManager.runInTransaction(run);
  }

  public async recordCheckOut(
    id: string,
    checkOutTime?: string,
    gymId?: string,
    executor?: IDatabaseExecutor
  ): Promise<boolean> {
    const run = async (exec: IDatabaseExecutor) => {
      const activeGymId = this.resolveGymId(gymId);
      const existing = await this.findById(id, activeGymId, exec);
      if (!existing) {
        return false;
      }
      const outTime = checkOutTime || new Date().toISOString();

      const result = await exec.execute(
        `UPDATE attendance_logs
         SET check_out_time = ?, sync_status = 'PENDING_MUTATION'
         WHERE id = ? AND gym_id = ? AND deleted_at IS NULL;`,
        [outTime, id, activeGymId]
      );

      const rowsAffected = result.rowsAffected ?? 0;
      if (rowsAffected > 0) {
        const eventId = generateUUID();
        const deviceId = DeviceIdentityService.getDeviceIdSync();
        await this.outboxRepo.enqueue(
          {
            schemaVersion: 1,
            eventId,
            gymId: activeGymId,
            deviceId,
            entityType: 'attendance_log',
            entityId: id,
            operation: 'UPDATE',
            baseServerSequence: existing.server_version ?? null,
            payload: {
              id,
              checkOutTime: outTime,
            },
            clientTimestamp: outTime,
          },
          exec
        );
      }

      return rowsAffected > 0;
    };

    if (executor) {
      return run(executor);
    }
    return this.dbManager.runInTransaction(run);
  }

  public async voidAttendance(
    id: string,
    reason?: string,
    gymId?: string,
    executor?: IDatabaseExecutor
  ): Promise<boolean> {
    const run = async (exec: IDatabaseExecutor) => {
      const activeGymId = this.resolveGymId(gymId);
      const existing = await this.findById(id, activeGymId, exec);
      if (!existing) {
        return false;
      }
      const now = new Date().toISOString();
      const updatedNotes = existing.notes
        ? `${existing.notes} [VOIDED: ${reason || 'Correction'}]`
        : `[VOIDED: ${reason || 'Correction'}]`;

      const result = await exec.execute(
        `UPDATE attendance_logs
         SET deleted_at = ?, notes = ?, sync_status = 'PENDING_MUTATION'
         WHERE id = ? AND gym_id = ? AND deleted_at IS NULL;`,
        [now, updatedNotes, id, activeGymId]
      );

      const rowsAffected = result.rowsAffected ?? 0;
      if (rowsAffected > 0) {
        const eventId = generateUUID();
        const deviceId = DeviceIdentityService.getDeviceIdSync();
        await this.outboxRepo.enqueue(
          {
            schemaVersion: 1,
            eventId,
            gymId: activeGymId,
            deviceId,
            entityType: 'attendance_log',
            entityId: id,
            operation: 'VOID',
            baseServerSequence: existing.server_version ?? null,
            payload: {
              id,
              reason: reason || 'Correction',
              voidedAt: now,
            },
            clientTimestamp: now,
          },
          exec
        );
      }

      return rowsAffected > 0;
    };

    if (executor) {
      return run(executor);
    }
    return this.dbManager.runInTransaction(run);
  }

  public async listByMember(memberId: string, limit: number = 50, gymId?: string): Promise<AttendanceLogRecord[]> {
    const activeGymId = this.resolveGymId(gymId);
    const result = await this.dbManager.execute(
      'SELECT * FROM attendance_logs WHERE member_id = ? AND gym_id = ? AND deleted_at IS NULL ORDER BY check_in_time DESC LIMIT ?;',
      [memberId, activeGymId, limit]
    );
    if (!result.rows) return [];
    return result.rows.map(mapRowToAttendance);
  }

  public async listRecent(limit: number = 50, gymId?: string): Promise<AttendanceLogRecord[]> {
    const activeGymId = this.resolveGymId(gymId);
    const result = await this.dbManager.execute(
      'SELECT * FROM attendance_logs WHERE gym_id = ? AND deleted_at IS NULL ORDER BY check_in_time DESC LIMIT ?;',
      [activeGymId, limit]
    );
    if (!result.rows) return [];
    return result.rows.map(mapRowToAttendance);
  }

  public async listDaily(params?: {
    date?: string;
    query?: string;
    limit?: number;
    offset?: number;
    gymId?: string;
  }): Promise<{ items: AttendanceListItem[]; totalCount: number }> {
    const activeGymId = this.resolveGymId(params?.gymId);
    const datePrefix = params?.date || new Date().toISOString().slice(0, 10);
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    let sql = `
      SELECT 
        a.id,
        a.gym_id,
        a.member_id,
        COALESCE(m.member_code, 'N/A') as member_code,
        COALESCE(m.full_name, 'Unknown Member') as full_name,
        COALESCE(m.phone, 'N/A') as phone,
        COALESCE(m.membership_status, 'ACTIVE') as membership_status,
        a.check_in_time,
        a.check_out_time,
        a.entry_method,
        a.device_metadata,
        a.notes,
        a.recorded_by_user_id,
        a.created_at
      FROM attendance_logs a
      LEFT JOIN gym_members m ON a.member_id = m.id AND a.gym_id = m.gym_id
      WHERE a.gym_id = ? 
        AND a.deleted_at IS NULL
        AND a.check_in_time LIKE ?
    `;
    const queryParams: any[] = [activeGymId, `${datePrefix}%`];

    if (params?.query && params.query.trim().length > 0) {
      const term = `%${params.query.trim()}%`;
      sql += ` AND (m.full_name LIKE ? OR m.phone LIKE ? OR m.member_code LIKE ?)`;
      queryParams.push(term, term, term);
    }

    sql += ' ORDER BY a.check_in_time DESC';

    const countSql = `SELECT COUNT(*) as count FROM (${sql}) as filtered_attendance;`;
    const countResult = await this.dbManager.execute(countSql, queryParams);
    const totalCount = Number(countResult.rows?.[0]?.count ?? 0);

    sql += ' LIMIT ? OFFSET ?;';
    queryParams.push(limit, offset);

    const result = await this.dbManager.execute(sql, queryParams);
    const items: AttendanceListItem[] = (result.rows || []).map((row) => ({
      id: row.id as string,
      gymId: row.gym_id as string,
      memberId: row.member_id as string,
      memberCode: row.member_code as string,
      fullName: row.full_name as string,
      phone: row.phone as string,
      membershipStatus: row.membership_status as string,
      checkInTime: row.check_in_time as string,
      checkOutTime: (row.check_out_time as string) || null,
      entryMethod: row.entry_method as string,
      deviceMetadata: (row.device_metadata as string) || null,
      notes: (row.notes as string) || null,
      recordedByUserId: (row.recorded_by_user_id as string) || null,
      createdAt: row.created_at as string,
    }));

    return { items, totalCount };
  }

  public async countToday(gymId?: string): Promise<number> {
    const activeGymId = this.resolveGymId(gymId);
    const today = new Date().toISOString().slice(0, 10);
    const result = await this.dbManager.execute(
      `SELECT COUNT(*) as count FROM attendance_logs
       WHERE gym_id = ? AND deleted_at IS NULL AND check_in_time LIKE ?;`,
      [activeGymId, `${today}%`]
    );
    return Number(result.rows?.[0]?.count ?? 0);
  }

  public async getStats(date?: string, gymId?: string): Promise<AttendanceStatsSummary> {
    const activeGymId = this.resolveGymId(gymId);
    const datePrefix = date || new Date().toISOString().slice(0, 10);

    const result = await this.dbManager.execute(
      `SELECT 
         COUNT(*) as total_check_ins,
         SUM(CASE WHEN check_out_time IS NULL THEN 1 ELSE 0 END) as on_floor,
         SUM(CASE WHEN check_out_time IS NOT NULL THEN 1 ELSE 0 END) as checked_out
       FROM attendance_logs
       WHERE gym_id = ? AND deleted_at IS NULL AND check_in_time LIKE ?;`,
      [activeGymId, `${datePrefix}%`]
    );

    const row = result.rows?.[0] || {};
    return {
      todayTotalCheckIns: Number(row.total_check_ins ?? 0),
      onFloorCount: Number(row.on_floor ?? 0),
      todayCheckedOut: Number(row.checked_out ?? 0),
    };
  }

  public async upsert(input: RecordCheckInInput, gymId?: string): Promise<AttendanceLogRecord> {
    const activeGymId = this.resolveGymId(gymId || input.gymId);
    const id = input.id || generateUUID();
    const now = new Date().toISOString();
    const checkInTime = input.checkInTime || now;
    const entryMethod = input.entryMethod || 'MANUAL';

    await this.dbManager.execute(
      `INSERT INTO attendance_logs (
        id, gym_id, member_id, check_in_time, check_out_time,
        entry_method, device_metadata, notes, recorded_by_user_id,
        created_at, deleted_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'SYNCED')
      ON CONFLICT(id) DO UPDATE SET
        member_id = excluded.member_id,
        check_in_time = excluded.check_in_time,
        check_out_time = excluded.check_out_time,
        entry_method = excluded.entry_method,
        device_metadata = excluded.device_metadata,
        notes = excluded.notes,
        sync_status = 'SYNCED';`,
      [
        id,
        activeGymId,
        input.memberId,
        checkInTime,
        input.checkOutTime ?? null,
        entryMethod,
        input.deviceMetadata ?? null,
        input.notes ?? null,
        input.recordedByUserId ?? null,
        now,
      ]
    );

    const record = await this.findById(id, activeGymId);
    if (!record) {
      throw new DatabaseError('Failed to fetch upserted attendance log', 'UPSERT_FAILED');
    }
    return record;
  }

  public async upsertBatch(inputs: RecordCheckInInput[], gymId?: string): Promise<number> {
    if (!inputs || inputs.length === 0) return 0;
    const activeGymId = this.resolveGymId(gymId);
    const now = new Date().toISOString();

    let count = 0;
    await this.dbManager.transaction(async (tx) => {
      for (const input of inputs) {
        const id = input.id || generateUUID();
        const checkInTime = input.checkInTime || now;
        const entryMethod = input.entryMethod || 'MANUAL';

        await tx.execute(
          `INSERT INTO attendance_logs (
            id, gym_id, member_id, check_in_time, check_out_time,
            entry_method, device_metadata, notes, recorded_by_user_id,
            created_at, deleted_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'SYNCED')
          ON CONFLICT(id) DO UPDATE SET
            member_id = excluded.member_id,
            check_in_time = excluded.check_in_time,
            check_out_time = excluded.check_out_time,
            entry_method = excluded.entry_method,
            device_metadata = excluded.device_metadata,
            notes = excluded.notes,
            sync_status = 'SYNCED';`,
          [
            id,
            activeGymId,
            input.memberId,
            checkInTime,
            input.checkOutTime ?? null,
            entryMethod,
            input.deviceMetadata ?? null,
            input.notes ?? null,
            input.recordedByUserId ?? null,
            now,
          ]
        );
        count++;
      }
    });

    return count;
  }
}
