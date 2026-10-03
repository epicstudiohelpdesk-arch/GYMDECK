/**
 * GymDeck Owner Mobile - Membership Plan Repository
 *
 * Strict Financial Invariant:
 * Prices are persisted strictly in integer minor units (paise: 1 INR = 100 paise).
 *
 * Transactional Outbox:
 * Create, Update, and SoftDelete participate in atomic SQLite transactions with outbox events.
 */

import { LocalDatabaseManager } from '../LocalDatabaseManager';
import {
  IMembershipPlanRepository,
  CreateMembershipPlanInput,
  UpdateMembershipPlanInput,
} from './interfaces';
import { MembershipPlanRecord, IDatabaseExecutor } from '../types';
import { generateUUID } from '../utils';
import { DatabaseError } from '../errors';
import { outboxRepository, IOutboxRepository } from './OutboxRepository';
import { DeviceIdentityService } from '../../services/DeviceIdentityService';

function mapRowToPlan(row: Record<string, any>): MembershipPlanRecord {
  return {
    id: row.id as string,
    gym_id: row.gym_id as string,
    plan_name: row.plan_name as string,
    duration_days: Number(row.duration_days),
    price_minor_units: Number(row.price_minor_units), // Integer paise
    description: (row.description as string) || null,
    benefits: (row.benefits as string) || null,
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

export class MembershipPlanRepository implements IMembershipPlanRepository {
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
        'No active gym tenant context found for plan operation',
        'NO_TENANT_CONTEXT'
      );
    }
    return gymId;
  }

  public async findById(id: string, gymId?: string, executor?: IDatabaseExecutor): Promise<MembershipPlanRecord | null> {
    const activeGymId = this.resolveGymId(gymId);
    const exec = executor || this.dbManager;
    const result = await exec.execute(
      'SELECT * FROM membership_plans WHERE id = ? AND gym_id = ? AND deleted_at IS NULL LIMIT 1;',
      [id, activeGymId]
    );
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return mapRowToPlan(result.rows[0]);
  }

  public async list(params?: { gymId?: string; onlyActive?: boolean; search?: string }): Promise<MembershipPlanRecord[]> {
    const activeGymId = this.resolveGymId(params?.gymId);
    let sql = 'SELECT * FROM membership_plans WHERE gym_id = ? AND deleted_at IS NULL';
    const queryParams: any[] = [activeGymId];

    if (params?.onlyActive !== false) {
      sql += ' AND is_active = 1';
    }

    if (params?.search && params.search.trim().length > 0) {
      sql += ' AND plan_name LIKE ?';
      queryParams.push(`%${params.search.trim()}%`);
    }

    sql += ' ORDER BY duration_days ASC, price_minor_units ASC;';

    const result = await this.dbManager.execute(sql, queryParams);
    if (!result.rows) return [];
    return result.rows.map(mapRowToPlan);
  }

  public async create(
    input: CreateMembershipPlanInput,
    executor?: IDatabaseExecutor
  ): Promise<MembershipPlanRecord> {
    const run = async (exec: IDatabaseExecutor) => {
      const activeGymId = this.resolveGymId(input.gymId);
      const id = input.id || generateUUID();
      const now = new Date().toISOString();
      const isActive = input.isActive === false ? 0 : 1;

      const priceMinorUnits = Math.round(Number(input.priceMinorUnits));
      if (isNaN(priceMinorUnits) || priceMinorUnits < 0) {
        throw new DatabaseError('Membership plan price must be a non-negative integer (paise)', 'INVALID_PRICE');
      }

      await exec.execute(
        `INSERT INTO membership_plans (
          id, gym_id, plan_name, duration_days, price_minor_units,
          description, benefits, is_active, created_at, updated_at, deleted_at,
          server_version, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'PENDING_MUTATION');`,
        [
          id,
          activeGymId,
          input.planName,
          input.durationDays,
          priceMinorUnits,
          input.description ?? null,
          input.benefits ?? null,
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
          entityType: 'membership_plan',
          entityId: id,
          operation: 'CREATE',
          baseServerSequence: null,
          payload: {
            id,
            gymId: activeGymId,
            planName: input.planName,
            durationDays: input.durationDays,
            priceMinorUnits,
            description: input.description ?? null,
            benefits: input.benefits ?? null,
            isActive: isActive === 1,
            createdAt: now,
          },
          clientTimestamp: now,
        },
        exec
      );

      const created = await this.findById(id, activeGymId, exec);
      if (!created) {
        throw new DatabaseError('Failed to fetch newly created membership plan', 'INSERT_FAILED');
      }
      return created;
    };

    if (executor) {
      return run(executor);
    }
    return this.dbManager.runInTransaction(run);
  }

  public async upsert(input: CreateMembershipPlanInput, gymId?: string): Promise<MembershipPlanRecord> {
    const activeGymId = this.resolveGymId(gymId || input.gymId);
    const id = input.id || generateUUID();
    const now = new Date().toISOString();
    const isActive = input.isActive === false ? 0 : 1;

    const priceMinorUnits = Math.round(Number(input.priceMinorUnits));
    if (isNaN(priceMinorUnits) || priceMinorUnits < 0) {
      throw new DatabaseError('Membership plan price must be a non-negative integer (paise)', 'INVALID_PRICE');
    }

    await this.dbManager.execute(
      `INSERT INTO membership_plans (
        id, gym_id, plan_name, duration_days, price_minor_units,
        description, benefits, is_active, created_at, updated_at, deleted_at,
        sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'SYNCED')
      ON CONFLICT(id) DO UPDATE SET
        gym_id = excluded.gym_id,
        plan_name = excluded.plan_name,
        duration_days = excluded.duration_days,
        price_minor_units = excluded.price_minor_units,
        description = excluded.description,
        benefits = excluded.benefits,
        is_active = excluded.is_active,
        sync_status = 'SYNCED',
        updated_at = excluded.updated_at;`,
      [
        id,
        activeGymId,
        input.planName,
        input.durationDays,
        priceMinorUnits,
        input.description ?? null,
        input.benefits ?? null,
        isActive,
        now,
        now,
      ]
    );

    const saved = await this.findById(id, activeGymId);
    if (!saved) {
      throw new DatabaseError('Failed to fetch upserted membership plan', 'UPSERT_FAILED');
    }
    return saved;
  }

  public async upsertBatch(inputs: CreateMembershipPlanInput[], gymId?: string): Promise<number> {
    if (!inputs || inputs.length === 0) return 0;
    const activeGymId = this.resolveGymId(gymId);
    const now = new Date().toISOString();

    let count = 0;
    await this.dbManager.transaction(async (tx) => {
      for (const input of inputs) {
        const id = input.id || generateUUID();
        const isActive = input.isActive === false ? 0 : 1;
        const priceMinorUnits = Math.round(Number(input.priceMinorUnits));

        await tx.execute(
          `INSERT INTO membership_plans (
            id, gym_id, plan_name, duration_days, price_minor_units,
            description, benefits, is_active, created_at, updated_at, deleted_at,
            sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'SYNCED')
          ON CONFLICT(id) DO UPDATE SET
            gym_id = excluded.gym_id,
            plan_name = excluded.plan_name,
            duration_days = excluded.duration_days,
            price_minor_units = excluded.price_minor_units,
            description = excluded.description,
            benefits = excluded.benefits,
            is_active = excluded.is_active,
            sync_status = 'SYNCED',
            updated_at = excluded.updated_at;`,
          [
            id,
            activeGymId,
            input.planName,
            input.durationDays,
            priceMinorUnits,
            input.description ?? null,
            input.benefits ?? null,
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
    updates: UpdateMembershipPlanInput,
    gymId?: string,
    executor?: IDatabaseExecutor
  ): Promise<MembershipPlanRecord> {
    const run = async (exec: IDatabaseExecutor) => {
      const activeGymId = this.resolveGymId(gymId);
      const existing = await this.findById(id, activeGymId, exec);
      if (!existing) {
        throw new DatabaseError(`Membership plan with id '${id}' not found`, 'NOT_FOUND');
      }

      const setClauses: string[] = [];
      const queryParams: any[] = [];
      const now = new Date().toISOString();

      if (updates.planName !== undefined) {
        setClauses.push('plan_name = ?');
        queryParams.push(updates.planName);
      }
      if (updates.durationDays !== undefined) {
        setClauses.push('duration_days = ?');
        queryParams.push(updates.durationDays);
      }
      if (updates.priceMinorUnits !== undefined) {
        const priceMinorUnits = Math.round(Number(updates.priceMinorUnits));
        setClauses.push('price_minor_units = ?');
        queryParams.push(priceMinorUnits);
      }
      if (updates.description !== undefined) {
        setClauses.push('description = ?');
        queryParams.push(updates.description);
      }
      if (updates.benefits !== undefined) {
        setClauses.push('benefits = ?');
        queryParams.push(updates.benefits);
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
        `UPDATE membership_plans SET ${setClauses.join(', ')} WHERE id = ? AND gym_id = ? AND deleted_at IS NULL;`,
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
          entityType: 'membership_plan',
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
        throw new DatabaseError('Failed to fetch updated membership plan', 'UPDATE_FAILED');
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
        `UPDATE membership_plans SET deleted_at = ?, is_active = 0, sync_status = 'PENDING_MUTATION', updated_at = ?
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
            entityType: 'membership_plan',
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
}
