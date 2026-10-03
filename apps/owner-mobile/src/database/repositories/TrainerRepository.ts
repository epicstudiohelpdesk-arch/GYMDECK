/**
 * GymDeck Owner Mobile - Trainer Repository
 *
 * Implements local persistence for gym trainers and coaches.
 *
 * Transactional Outbox:
 * Create, Update, and SoftDelete participate in atomic SQLite transactions with outbox events.
 */

import { LocalDatabaseManager } from '../LocalDatabaseManager';
import {
  ITrainerRepository,
  CreateTrainerInput,
} from './interfaces';
import { TrainerRecord, TrainerAssignmentRecord, IDatabaseExecutor } from '../types';
import { generateUUID } from '../utils';
import { DatabaseError } from '../errors';
import { outboxRepository, IOutboxRepository } from './OutboxRepository';
import { DeviceIdentityService } from '../../services/DeviceIdentityService';

function mapRowToTrainer(row: Record<string, any>): TrainerRecord {
  return {
    id: row.id as string,
    gym_id: row.gym_id as string,
    full_name: row.full_name as string,
    phone: row.phone as string,
    email: (row.email as string) || null,
    specialization: (row.specialization as string) || null,
    experience_years: row.experience_years !== null ? Number(row.experience_years) : null,
    bio: (row.bio as string) || null,
    is_active: Number(row.is_active),
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

export class TrainerRepository implements ITrainerRepository {
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
        'No active gym tenant context found for trainer operation',
        'NO_TENANT_CONTEXT'
      );
    }
    return gymId;
  }

  public async findById(id: string, gymId?: string, executor?: IDatabaseExecutor): Promise<TrainerRecord | null> {
    const activeGymId = this.resolveGymId(gymId);
    const exec = executor || this.dbManager;
    const result = await exec.execute(
      'SELECT * FROM trainers WHERE id = ? AND gym_id = ? AND deleted_at IS NULL LIMIT 1;',
      [id, activeGymId]
    );
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return mapRowToTrainer(result.rows[0]);
  }

  public async list(params?: { gymId?: string; onlyActive?: boolean; search?: string }): Promise<TrainerRecord[]> {
    const activeGymId = this.resolveGymId(params?.gymId);
    let sql = 'SELECT * FROM trainers WHERE gym_id = ? AND deleted_at IS NULL';
    const queryParams: any[] = [activeGymId];

    if (params?.onlyActive !== false) {
      sql += ' AND is_active = 1';
    }

    if (params?.search && params.search.trim().length > 0) {
      sql += ' AND (full_name LIKE ? OR phone LIKE ? OR specialization LIKE ?)';
      const term = `%${params.search.trim()}%`;
      queryParams.push(term, term, term);
    }

    sql += ' ORDER BY full_name ASC;';

    const result = await this.dbManager.execute(sql, queryParams);
    if (!result.rows) return [];
    return result.rows.map(mapRowToTrainer);
  }

  public async create(
    input: CreateTrainerInput,
    executor?: IDatabaseExecutor
  ): Promise<TrainerRecord> {
    const run = async (exec: IDatabaseExecutor) => {
      const activeGymId = this.resolveGymId(input.gymId);
      const id = input.id || generateUUID();
      const now = new Date().toISOString();
      const isActive = input.isActive === false ? 0 : 1;

      await exec.execute(
        `INSERT INTO trainers (
          id, gym_id, full_name, phone, email, specialization,
          experience_years, bio, is_active, created_at, updated_at, deleted_at,
          server_version, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'PENDING_MUTATION');`,
        [
          id,
          activeGymId,
          input.fullName,
          input.phone,
          input.email ?? null,
          input.specialization ?? null,
          input.experienceYears ?? null,
          input.bio ?? null,
          isActive,
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
          entityType: 'trainer',
          entityId: id,
          operation: 'CREATE',
          baseServerSequence: null,
          payload: {
            id,
            gymId: activeGymId,
            fullName: input.fullName,
            phone: input.phone,
            email: input.email ?? null,
            specialization: input.specialization ?? null,
            experienceYears: input.experienceYears ?? null,
            bio: input.bio ?? null,
            isActive: isActive === 1,
            createdAt: now,
          },
          clientTimestamp: now,
        },
        exec
      );

      const created = await this.findById(id, activeGymId, exec);
      if (!created) {
        throw new DatabaseError('Failed to fetch newly created trainer', 'INSERT_FAILED');
      }
      return created;
    };

    if (executor) {
      return run(executor);
    }
    return this.dbManager.runInTransaction(run);
  }

  public async upsert(input: CreateTrainerInput, gymId?: string): Promise<TrainerRecord> {
    const activeGymId = this.resolveGymId(gymId || input.gymId);
    const id = input.id || generateUUID();
    const now = new Date().toISOString();
    const isActive = input.isActive === false ? 0 : 1;

    await this.dbManager.execute(
      `INSERT INTO trainers (
        id, gym_id, full_name, phone, email, specialization,
        experience_years, bio, is_active, created_at, updated_at, deleted_at,
        sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'SYNCED')
      ON CONFLICT(id) DO UPDATE SET
        gym_id = excluded.gym_id,
        full_name = excluded.full_name,
        phone = excluded.phone,
        email = excluded.email,
        specialization = excluded.specialization,
        experience_years = excluded.experience_years,
        bio = excluded.bio,
        is_active = excluded.is_active,
        sync_status = 'SYNCED',
        updated_at = excluded.updated_at;`,
      [
        id,
        activeGymId,
        input.fullName,
        input.phone,
        input.email ?? null,
        input.specialization ?? null,
        input.experienceYears ?? null,
        input.bio ?? null,
        isActive,
        now,
        now,
      ]
    );

    const saved = await this.findById(id, activeGymId);
    if (!saved) {
      throw new DatabaseError('Failed to fetch upserted trainer', 'UPSERT_FAILED');
    }
    return saved;
  }

  public async upsertBatch(inputs: CreateTrainerInput[], gymId?: string): Promise<number> {
    if (!inputs || inputs.length === 0) return 0;
    const activeGymId = this.resolveGymId(gymId);
    const now = new Date().toISOString();

    let count = 0;
    await this.dbManager.transaction(async (tx) => {
      for (const input of inputs) {
        const id = input.id || generateUUID();
        const isActive = input.isActive === false ? 0 : 1;

        await tx.execute(
          `INSERT INTO trainers (
            id, gym_id, full_name, phone, email, specialization,
            experience_years, bio, is_active, created_at, updated_at, deleted_at,
            sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'SYNCED')
          ON CONFLICT(id) DO UPDATE SET
            gym_id = excluded.gym_id,
            full_name = excluded.full_name,
            phone = excluded.phone,
            email = excluded.email,
            specialization = excluded.specialization,
            experience_years = excluded.experience_years,
            bio = excluded.bio,
            is_active = excluded.is_active,
            sync_status = 'SYNCED',
            updated_at = excluded.updated_at;`,
          [
            id,
            activeGymId,
            input.fullName,
            input.phone,
            input.email ?? null,
            input.specialization ?? null,
            input.experienceYears ?? null,
            input.bio ?? null,
            isActive,
            now,
            now,
          ]
        );
        count++;
      }
    });

    return count;
  }

  public async update(
    id: string,
    updates: Partial<CreateTrainerInput>,
    gymId?: string,
    executor?: IDatabaseExecutor
  ): Promise<TrainerRecord> {
    const run = async (exec: IDatabaseExecutor) => {
      const activeGymId = this.resolveGymId(gymId);
      const existing = await this.findById(id, activeGymId, exec);
      if (!existing) {
        throw new DatabaseError(`Trainer with id '${id}' not found`, 'NOT_FOUND');
      }

      const setClauses: string[] = [];
      const queryParams: any[] = [];
      const now = new Date().toISOString();

      if (updates.fullName !== undefined) {
        setClauses.push('full_name = ?');
        queryParams.push(updates.fullName);
      }
      if (updates.phone !== undefined) {
        setClauses.push('phone = ?');
        queryParams.push(updates.phone);
      }
      if (updates.email !== undefined) {
        setClauses.push('email = ?');
        queryParams.push(updates.email);
      }
      if (updates.specialization !== undefined) {
        setClauses.push('specialization = ?');
        queryParams.push(updates.specialization);
      }
      if (updates.experienceYears !== undefined) {
        setClauses.push('experience_years = ?');
        queryParams.push(updates.experienceYears);
      }
      if (updates.bio !== undefined) {
        setClauses.push('bio = ?');
        queryParams.push(updates.bio);
      }
      if (updates.isActive !== undefined) {
        setClauses.push('is_active = ?');
        queryParams.push(updates.isActive ? 1 : 0);
      }

      setClauses.push('updated_at = ?');
      queryParams.push(now);

      setClauses.push("sync_status = 'PENDING_MUTATION'");

      queryParams.push(id, activeGymId);

      await exec.execute(
        `UPDATE trainers SET ${setClauses.join(', ')} WHERE id = ? AND gym_id = ? AND deleted_at IS NULL;`,
        queryParams
      );

      // Enqueue outbox UPDATE event
      const eventId = generateUUID();
      const deviceId = DeviceIdentityService.getDeviceIdSync();
      await this.outboxRepo.enqueue(
        {
          schemaVersion: 1,
          eventId,
          gymId: activeGymId,
          deviceId,
          entityType: 'trainer',
          entityId: id,
          operation: 'UPDATE',
          baseServerSequence: existing.server_version ?? null,
          payload: {
            ...updates,
            id,
            updatedAt: now,
          },
          clientTimestamp: now,
        },
        exec
      );

      const updated = await this.findById(id, activeGymId, exec);
      if (!updated) {
        throw new DatabaseError('Failed to fetch updated trainer', 'UPDATE_FAILED');
      }
      return updated;
    };

    if (executor) {
      return run(executor);
    }
    return this.dbManager.runInTransaction(run);
  }

  public async softDelete(id: string, gymId?: string, executor?: IDatabaseExecutor): Promise<boolean> {
    const run = async (exec: IDatabaseExecutor) => {
      const activeGymId = this.resolveGymId(gymId);
      const existing = await this.findById(id, activeGymId, exec);
      if (!existing) {
        return false;
      }
      const now = new Date().toISOString();
      const result = await exec.execute(
        `UPDATE trainers SET deleted_at = ?, is_active = 0, sync_status = 'PENDING_MUTATION', updated_at = ?
         WHERE id = ? AND gym_id = ? AND deleted_at IS NULL;`,
        [now, now, id, activeGymId]
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
            entityType: 'trainer',
            entityId: id,
            operation: 'DELETE',
            baseServerSequence: existing.server_version ?? null,
            payload: {
              id,
              deletedAt: now,
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

  public async assignTrainer(
    input: { id?: string; gymId?: string; memberId: string; trainerId: string; notes?: string },
    executor?: IDatabaseExecutor
  ): Promise<TrainerAssignmentRecord> {
    const run = async (exec: IDatabaseExecutor) => {
      const activeGymId = this.resolveGymId(input.gymId);
      const id = input.id || generateUUID();
      const now = new Date().toISOString();

      // End any previous active assignment for this member
      await exec.execute(
        `UPDATE trainer_assignments SET status = 'ENDED', ended_at = ?, updated_at = ?, sync_status = 'PENDING_MUTATION'
         WHERE member_id = ? AND gym_id = ? AND status = 'ACTIVE';`,
        [now, now, input.memberId, activeGymId]
      );

      // Insert new assignment
      await exec.execute(
        `INSERT INTO trainer_assignments (
          id, gym_id, member_id, trainer_id, assigned_at, ended_at,
          status, notes, created_at, updated_at, deleted_at,
          server_version, sync_status
        ) VALUES (?, ?, ?, ?, ?, NULL, 'ACTIVE', ?, ?, ?, NULL, NULL, 'PENDING_MUTATION');`,
        [id, activeGymId, input.memberId, input.trainerId, now, input.notes ?? null, now, now]
      );

      // Enqueue canonical outbox event
      const eventId = generateUUID();
      const deviceId = DeviceIdentityService.getDeviceIdSync();
      await this.outboxRepo.enqueue(
        {
          schemaVersion: 1,
          eventId,
          gymId: activeGymId,
          deviceId,
          entityType: 'trainer_assignment',
          entityId: id,
          operation: 'CREATE',
          baseServerSequence: null,
          payload: {
            id,
            gymId: activeGymId,
            memberId: input.memberId,
            trainerId: input.trainerId,
            assignedAt: now,
            notes: input.notes ?? null,
            status: 'ACTIVE',
            createdAt: now,
          },
          clientTimestamp: now,
        },
        exec
      );

      return {
        id,
        gym_id: activeGymId,
        member_id: input.memberId,
        trainer_id: input.trainerId,
        assigned_at: now,
        ended_at: null,
        status: 'ACTIVE',
        notes: input.notes ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        server_version: null,
        sync_status: 'PENDING_MUTATION' as const,
      };
    };

    if (executor) {
      return run(executor);
    }
    return this.dbManager.runInTransaction(run);
  }

  public async getActiveAssignment(
    memberId: string,
    gymId?: string,
    executor?: IDatabaseExecutor
  ): Promise<TrainerAssignmentRecord | null> {
    const activeGymId = this.resolveGymId(gymId);
    const exec = executor || this.dbManager;
    const res = await exec.execute(
      `SELECT * FROM trainer_assignments WHERE member_id = ? AND gym_id = ? AND status = 'ACTIVE' ORDER BY assigned_at DESC LIMIT 1;`,
      [memberId, activeGymId]
    );
    if (!res.rows || res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id as string,
      gym_id: row.gym_id as string,
      member_id: row.member_id as string,
      trainer_id: row.trainer_id as string,
      assigned_at: row.assigned_at as string,
      ended_at: (row.ended_at as string) || null,
      status: row.status as string,
      notes: (row.notes as string) || null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      deleted_at: (row.deleted_at as string) || null,
      server_version: row.server_version ? Number(row.server_version) : null,
      sync_status: (row.sync_status as any) || 'SYNCED',
    };
  }
}
