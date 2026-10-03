/**
 * GymDeck Owner Mobile - Member Membership Repository
 *
 * Manages active and historical membership subscriptions for gym members.
 *
 * Transactional Outbox:
 * Subscriptions and status changes participate in atomic SQLite transactions with outbox events.
 */

import { LocalDatabaseManager } from '../LocalDatabaseManager';
import {
  IMemberMembershipRepository,
  CreateMemberMembershipInput,
} from './interfaces';
import { MemberMembershipRecord, IDatabaseExecutor } from '../types';
import { generateUUID } from '../utils';
import { DatabaseError } from '../errors';
import { outboxRepository, IOutboxRepository } from './OutboxRepository';
import { DeviceIdentityService } from '../../services/DeviceIdentityService';

function mapRowToMembership(row: Record<string, any>): MemberMembershipRecord {
  return {
    id: row.id as string,
    gym_id: row.gym_id as string,
    member_id: row.member_id as string,
    plan_id: row.plan_id as string,
    status: row.status as string,
    start_date: row.start_date as string,
    end_date: row.end_date as string,
    price_at_purchase_minor_units: Number(row.price_at_purchase_minor_units),
    auto_renew: Number(row.auto_renew),
    frozen_at: (row.frozen_at as string) || null,
    freeze_reason: (row.freeze_reason as string) || null,
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

export class MemberMembershipRepository implements IMemberMembershipRepository {
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
        'No active gym tenant context found for membership operation',
        'NO_TENANT_CONTEXT'
      );
    }
    return gymId;
  }

  public async findById(id: string, gymId?: string, executor?: IDatabaseExecutor): Promise<MemberMembershipRecord | null> {
    const activeGymId = this.resolveGymId(gymId);
    const exec = executor || this.dbManager;
    const result = await exec.execute(
      'SELECT * FROM member_memberships WHERE id = ? AND gym_id = ? LIMIT 1;',
      [id, activeGymId]
    );
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return mapRowToMembership(result.rows[0]);
  }

  public async findActiveByMemberId(memberId: string, gymId?: string): Promise<MemberMembershipRecord | null> {
    const activeGymId = this.resolveGymId(gymId);
    const result = await this.dbManager.execute(
      "SELECT * FROM member_memberships WHERE member_id = ? AND gym_id = ? AND status = 'ACTIVE' ORDER BY end_date DESC LIMIT 1;",
      [memberId, activeGymId]
    );
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return mapRowToMembership(result.rows[0]);
  }

  public async listByMemberId(memberId: string, gymId?: string): Promise<MemberMembershipRecord[]> {
    const activeGymId = this.resolveGymId(gymId);
    const result = await this.dbManager.execute(
      'SELECT * FROM member_memberships WHERE member_id = ? AND gym_id = ? ORDER BY start_date DESC;',
      [memberId, activeGymId]
    );
    if (!result.rows) return [];
    return result.rows.map(mapRowToMembership);
  }

  public async list(params?: { gymId?: string; status?: string; limit?: number; offset?: number }): Promise<MemberMembershipRecord[]> {
    const activeGymId = this.resolveGymId(params?.gymId);
    let sql = 'SELECT * FROM member_memberships WHERE gym_id = ?';
    const queryParams: any[] = [activeGymId];

    if (params?.status && params.status !== 'ALL') {
      sql += ' AND status = ?';
      queryParams.push(params.status);
    }

    sql += ' ORDER BY start_date DESC';

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
    return result.rows.map(mapRowToMembership);
  }

  public async create(
    input: CreateMemberMembershipInput,
    executor?: IDatabaseExecutor
  ): Promise<MemberMembershipRecord> {
    const run = async (exec: IDatabaseExecutor) => {
      const activeGymId = this.resolveGymId(input.gymId);
      const id = input.id || generateUUID();
      const now = new Date().toISOString();
      const status = input.status || 'ACTIVE';
      const autoRenew = input.autoRenew ? 1 : 0;
      const priceMinorUnits = Math.round(Number(input.priceAtPurchaseMinorUnits));

      await exec.execute(
        `INSERT INTO member_memberships (
          id, gym_id, member_id, plan_id, status, start_date,
          end_date, price_at_purchase_minor_units, auto_renew,
          frozen_at, freeze_reason, created_at, updated_at,
          server_version, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'PENDING_MUTATION');`,
        [
          id,
          activeGymId,
          input.memberId,
          input.planId,
          status,
          input.startDate,
          input.endDate,
          priceMinorUnits,
          autoRenew,
          input.frozenAt ?? null,
          input.freezeReason ?? null,
          now,
          now,
        ]
      );

      // Update member's status and expiration in local database
      await exec.execute(
        `UPDATE gym_members
         SET membership_status = ?, expires_at = ?, sync_status = 'PENDING_MUTATION', updated_at = ?
         WHERE id = ? AND gym_id = ?;`,
        [status, input.endDate, now, input.memberId, activeGymId]
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
          entityType: 'member_membership',
          entityId: id,
          operation: 'CREATE',
          baseServerSequence: null,
          payload: {
            id,
            gymId: activeGymId,
            memberId: input.memberId,
            planId: input.planId,
            status,
            startDate: input.startDate,
            endDate: input.endDate,
            priceAtPurchaseMinorUnits: priceMinorUnits,
            autoRenew: autoRenew === 1,
            createdAt: now,
          },
          clientTimestamp: now,
        },
        exec
      );

      const created = await this.findById(id, activeGymId, exec);
      if (!created) {
        throw new DatabaseError('Failed to fetch newly created membership', 'INSERT_FAILED');
      }
      return created;
    };

    if (executor) {
      return run(executor);
    }
    return this.dbManager.runInTransaction(run);
  }

  public async upsert(input: CreateMemberMembershipInput, gymId?: string): Promise<MemberMembershipRecord> {
    const activeGymId = this.resolveGymId(gymId || input.gymId);
    const id = input.id || generateUUID();
    const now = new Date().toISOString();
    const status = input.status || 'ACTIVE';
    const autoRenew = input.autoRenew ? 1 : 0;
    const priceMinorUnits = Math.round(Number(input.priceAtPurchaseMinorUnits));

    await this.dbManager.execute(
      `INSERT INTO member_memberships (
        id, gym_id, member_id, plan_id, status, start_date,
        end_date, price_at_purchase_minor_units, auto_renew,
        frozen_at, freeze_reason, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED')
      ON CONFLICT(id) DO UPDATE SET
        plan_id = excluded.plan_id,
        status = excluded.status,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        price_at_purchase_minor_units = excluded.price_at_purchase_minor_units,
        auto_renew = excluded.auto_renew,
        frozen_at = excluded.frozen_at,
        freeze_reason = excluded.freeze_reason,
        sync_status = 'SYNCED',
        updated_at = excluded.updated_at
      WHERE gym_id = excluded.gym_id;`,
      [
        id,
        activeGymId,
        input.memberId,
        input.planId,
        status,
        input.startDate,
        input.endDate,
        priceMinorUnits,
        autoRenew,
        input.frozenAt ?? null,
        input.freezeReason ?? null,
        now,
        now,
      ]
    );

    const record = await this.findById(id, activeGymId);
    if (!record) {
      throw new DatabaseError('Failed to fetch upserted membership', 'UPSERT_FAILED');
    }
    return record;
  }

  public async upsertBatch(inputs: CreateMemberMembershipInput[], gymId?: string): Promise<number> {
    if (!inputs || inputs.length === 0) return 0;
    const activeGymId = this.resolveGymId(gymId);
    const now = new Date().toISOString();

    let count = 0;
    await this.dbManager.transaction(async (tx) => {
      for (const input of inputs) {
        const id = input.id || generateUUID();
        const status = input.status || 'ACTIVE';
        const autoRenew = input.autoRenew ? 1 : 0;
        const priceMinorUnits = Math.round(Number(input.priceAtPurchaseMinorUnits));

        await tx.execute(
          `INSERT INTO member_memberships (
            id, gym_id, member_id, plan_id, status, start_date,
            end_date, price_at_purchase_minor_units, auto_renew,
            frozen_at, freeze_reason, created_at, updated_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED')
          ON CONFLICT(id) DO UPDATE SET
            plan_id = excluded.plan_id,
            status = excluded.status,
            start_date = excluded.start_date,
            end_date = excluded.end_date,
            price_at_purchase_minor_units = excluded.price_at_purchase_minor_units,
            auto_renew = excluded.auto_renew,
            frozen_at = excluded.frozen_at,
            freeze_reason = excluded.freeze_reason,
            sync_status = 'SYNCED',
            updated_at = excluded.updated_at
          WHERE gym_id = excluded.gym_id;`,
          [
            id,
            activeGymId,
            input.memberId,
            input.planId,
            status,
            input.startDate,
            input.endDate,
            priceMinorUnits,
            autoRenew,
            input.frozenAt ?? null,
            input.freezeReason ?? null,
            now,
            now,
          ]
        );
        count++;
      }
    });

    return count;
  }

  public async updateStatus(
    id: string,
    status: string,
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

      const result = await exec.execute(
        `UPDATE member_memberships
         SET status = ?, sync_status = 'PENDING_MUTATION', updated_at = ?
         WHERE id = ? AND gym_id = ?;`,
        [status, now, id, activeGymId]
      );

      const rowsAffected = result.rowsAffected ?? 0;
      if (rowsAffected > 0) {
        const eventId = generateUUID();
        const deviceId = DeviceIdentityService.getDeviceIdSync();
        const operation = status === 'CANCELLED' ? 'VOID' : 'UPDATE';

        await this.outboxRepo.enqueue(
          {
            schemaVersion: 1,
            eventId,
            gymId: activeGymId,
            deviceId,
            entityType: 'member_membership',
            entityId: id,
            operation,
            baseServerSequence: existing.server_version ?? null,
            payload: {
              id,
              status,
              updatedAt: now,
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
