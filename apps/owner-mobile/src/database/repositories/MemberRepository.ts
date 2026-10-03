/**
 * GymDeck Owner Mobile - Member Repository
 *
 * Implements local-first persistence for gym members.
 *
 * Strict Multi-Tenant Isolation:
 * Every single read, write, count, and search query is scoped strictly to the active gym_id.
 */

import { LocalDatabaseManager } from '../LocalDatabaseManager';
import {
  IMemberRepository,
  CreateGymMemberInput,
  UpdateGymMemberInput,
} from './interfaces';
import { GymMemberRecord, MembershipStatusType, IDatabaseExecutor } from '../types';
import {
  MemberProfileData,
  GymMemberSummary,
  MemberActiveMembership,
  AttendanceRecord,
  PaymentRecord,
} from '../../types';
import { generateUUID } from '../utils';
import { DatabaseError } from '../errors';
import { outboxRepository, IOutboxRepository } from './OutboxRepository';
import { DeviceIdentityService } from '../../services/DeviceIdentityService';

function mapRowToMember(row: Record<string, any>): GymMemberRecord {
  return {
    id: row.id as string,
    gym_id: row.gym_id as string,
    member_code: row.member_code as string,
    full_name: row.full_name as string,
    phone: row.phone as string,
    alternate_phone: (row.alternate_phone as string) || null,
    email: (row.email as string) || null,
    gender: (row.gender as string) || null,
    dob: (row.dob as string) || null,
    address: (row.address as string) || null,
    membership_status: row.membership_status as MembershipStatusType,
    joined_at: row.joined_at as string,
    expires_at: (row.expires_at as string) || null,
    notes: (row.notes as string) || null,
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

function mapMemberToSummary(record: GymMemberRecord): GymMemberSummary {
  return {
    id: record.id,
    memberCode: record.member_code,
    fullName: record.full_name,
    phone: record.phone,
    alternatePhone: record.alternate_phone,
    email: record.email,
    gender: record.gender,
    dob: record.dob,
    address: record.address,
    membershipStatus: record.membership_status,
    joinedAt: record.joined_at,
    expiresAt: record.expires_at,
    notes: record.notes,
    createdAt: record.created_at,
  };
}

export class MemberRepository implements IMemberRepository {
  constructor(
    private dbManager: LocalDatabaseManager = LocalDatabaseManager.getInstance(),
    private outboxRepo: IOutboxRepository = outboxRepository
  ) {}


  /**
   * Resolves the authoritative gym tenant context.
   */
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
        'No active gym tenant context found for member operation',
        'NO_TENANT_CONTEXT'
      );
    }
    return gymId;
  }

  public async findById(id: string, gymId?: string, executor?: IDatabaseExecutor): Promise<GymMemberRecord | null> {
    const activeGymId = this.resolveGymId(gymId);
    const exec = executor || this.dbManager;
    const result = await exec.execute(
      'SELECT * FROM gym_members WHERE id = ? AND gym_id = ? AND deleted_at IS NULL LIMIT 1;',
      [id, activeGymId]
    );
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return mapRowToMember(result.rows[0]);
  }

  public async findByMemberCode(memberCode: string, gymId?: string): Promise<GymMemberRecord | null> {
    const activeGymId = this.resolveGymId(gymId);
    const result = await this.dbManager.execute(
      'SELECT * FROM gym_members WHERE member_code = ? AND gym_id = ? AND deleted_at IS NULL LIMIT 1;',
      [memberCode, activeGymId]
    );
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return mapRowToMember(result.rows[0]);
  }

  public async list(params?: {
    gymId?: string;
    status?: MembershipStatusType | string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<GymMemberRecord[]> {
    const activeGymId = this.resolveGymId(params?.gymId);
    let sql = 'SELECT * FROM gym_members WHERE gym_id = ? AND deleted_at IS NULL';
    const queryParams: any[] = [activeGymId];

    if (params?.status && params.status !== 'ALL') {
      sql += ' AND membership_status = ?';
      queryParams.push(params.status);
    }

    if (params?.search && params.search.trim().length > 0) {
      const term = `%${params.search.trim()}%`;
      sql += ' AND (full_name LIKE ? OR phone LIKE ? OR member_code LIKE ?)';
      queryParams.push(term, term, term);
    }

    sql += ' ORDER BY created_at DESC';

    if (params?.limit) {
      sql += ' LIMIT ?';
      queryParams.push(params.limit);
      if (params?.offset) {
        sql += ' OFFSET ?';
        queryParams.push(params.offset);
      }
    }

    const result = await this.dbManager.execute(sql, queryParams);
    if (!result.rows) return [];
    return result.rows.map(mapRowToMember);
  }

  public async create(
    input: CreateGymMemberInput,
    executor?: IDatabaseExecutor
  ): Promise<GymMemberRecord> {
    const run = async (exec: IDatabaseExecutor) => {
      const id = input.id || generateUUID();
      const now = new Date().toISOString();
      const joinedAt = input.joinedAt || now;
      const status = input.membershipStatus || 'ACTIVE';
      const activeGymId = input.gymId || this.resolveGymId();
      const deviceId = DeviceIdentityService.getDeviceIdSync();

      await exec.execute(
        `INSERT INTO gym_members (
          id, gym_id, member_code, full_name, phone, alternate_phone,
          email, gender, dob, address, membership_status, joined_at,
          expires_at, notes, created_at, updated_at, deleted_at,
          server_version, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'PENDING_MUTATION');`,
        [
          id,
          activeGymId,
          input.memberCode,
          input.fullName,
          input.phone,
          input.alternatePhone ?? null,
          input.email ?? null,
          input.gender ?? null,
          input.dob ?? null,
          input.address ?? null,
          status,
          joinedAt,
          input.expiresAt ?? null,
          input.notes ?? null,
          now,
          now,
        ]
      );

      // Enqueue canonical outbox event atomically
      const eventId = generateUUID();
      await this.outboxRepo.enqueue(
        {
          schemaVersion: 1,
          eventId,
          gymId: activeGymId,
          deviceId,
          entityType: 'gym_member',
          entityId: id,
          operation: 'CREATE',
          baseServerSequence: null,
          payload: {
            id,
            gymId: activeGymId,
            memberCode: input.memberCode,
            fullName: input.fullName,
            phone: input.phone,
            alternatePhone: input.alternatePhone ?? null,
            email: input.email ?? null,
            gender: input.gender ?? null,
            dob: input.dob ?? null,
            address: input.address ?? null,
            membershipStatus: status,
            joinedAt,
            expiresAt: input.expiresAt ?? null,
            notes: input.notes ?? null,
            createdAt: now,
          },
          clientTimestamp: now,
        },
        exec
      );

      const created = await this.findById(id, activeGymId, exec);
      if (!created) {
        throw new DatabaseError('Failed to fetch newly created member', 'INSERT_FAILED');
      }
      return created;
    };

    if (executor) {
      return run(executor);
    }
    return this.dbManager.runInTransaction(run);
  }

  public async upsert(input: CreateGymMemberInput): Promise<GymMemberRecord> {
    const id = input.id || generateUUID();
    const now = new Date().toISOString();
    const joinedAt = input.joinedAt || now;
    const status = input.membershipStatus || 'ACTIVE';
    const activeGymId = input.gymId || this.resolveGymId();

    await this.dbManager.execute(
      `INSERT INTO gym_members (
        id, gym_id, member_code, full_name, phone, alternate_phone,
        email, gender, dob, address, membership_status, joined_at,
        expires_at, notes, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      ON CONFLICT(id) DO UPDATE SET
        gym_id = excluded.gym_id,
        member_code = excluded.member_code,
        full_name = excluded.full_name,
        phone = excluded.phone,
        alternate_phone = excluded.alternate_phone,
        email = excluded.email,
        gender = excluded.gender,
        dob = excluded.dob,
        address = excluded.address,
        membership_status = excluded.membership_status,
        joined_at = excluded.joined_at,
        expires_at = excluded.expires_at,
        notes = excluded.notes,
        updated_at = excluded.updated_at;`,
      [
        id,
        activeGymId,
        input.memberCode,
        input.fullName,
        input.phone,
        input.alternatePhone ?? null,
        input.email ?? null,
        input.gender ?? null,
        input.dob ?? null,
        input.address ?? null,
        status,
        joinedAt,
        input.expiresAt ?? null,
        input.notes ?? null,
        now,
        now,
      ]
    );

    const saved = await this.findById(id, activeGymId);
    if (!saved) {
      throw new DatabaseError('Failed to fetch upserted member', 'UPSERT_FAILED');
    }
    return saved;
  }

  public async upsertBatch(inputs: CreateGymMemberInput[]): Promise<number> {
    if (!inputs || inputs.length === 0) return 0;
    const now = new Date().toISOString();

    let upsertedCount = 0;
    await this.dbManager.transaction(async (tx) => {
      for (const input of inputs) {
        const id = input.id || generateUUID();
        const joinedAt = input.joinedAt || now;
        const status = input.membershipStatus || 'ACTIVE';
        const activeGymId = input.gymId || this.resolveGymId();

        await tx.execute(
          `INSERT INTO gym_members (
            id, gym_id, member_code, full_name, phone, alternate_phone,
            email, gender, dob, address, membership_status, joined_at,
            expires_at, notes, created_at, updated_at, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
          ON CONFLICT(id) DO UPDATE SET
            gym_id = excluded.gym_id,
            member_code = excluded.member_code,
            full_name = excluded.full_name,
            phone = excluded.phone,
            alternate_phone = excluded.alternate_phone,
            email = excluded.email,
            gender = excluded.gender,
            dob = excluded.dob,
            address = excluded.address,
            membership_status = excluded.membership_status,
            joined_at = excluded.joined_at,
            expires_at = excluded.expires_at,
            notes = excluded.notes,
            updated_at = excluded.updated_at;`,
          [
            id,
            activeGymId,
            input.memberCode,
            input.fullName,
            input.phone,
            input.alternatePhone ?? null,
            input.email ?? null,
            input.gender ?? null,
            input.dob ?? null,
            input.address ?? null,
            status,
            joinedAt,
            input.expiresAt ?? null,
            input.notes ?? null,
            now,
            now,
          ]
        );
        upsertedCount++;
      }
    });

    return upsertedCount;
  }

  public async update(
    id: string,
    updates: UpdateGymMemberInput,
    gymId?: string,
    executor?: IDatabaseExecutor
  ): Promise<GymMemberRecord> {
    const run = async (exec: IDatabaseExecutor) => {
      const activeGymId = this.resolveGymId(gymId);
      const existing = await this.findById(id, activeGymId, exec);
      if (!existing) {
        throw new DatabaseError(`Member with id '${id}' not found in gym '${activeGymId}'`, 'NOT_FOUND');
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
      if (updates.alternatePhone !== undefined) {
        setClauses.push('alternate_phone = ?');
        queryParams.push(updates.alternatePhone);
      }
      if (updates.email !== undefined) {
        setClauses.push('email = ?');
        queryParams.push(updates.email);
      }
      if (updates.gender !== undefined) {
        setClauses.push('gender = ?');
        queryParams.push(updates.gender);
      }
      if (updates.dob !== undefined) {
        setClauses.push('dob = ?');
        queryParams.push(updates.dob);
      }
      if (updates.address !== undefined) {
        setClauses.push('address = ?');
        queryParams.push(updates.address);
      }
      if (updates.membershipStatus !== undefined) {
        setClauses.push('membership_status = ?');
        queryParams.push(updates.membershipStatus);
      }
      if (updates.expiresAt !== undefined) {
        setClauses.push('expires_at = ?');
        queryParams.push(updates.expiresAt);
      }
      if (updates.notes !== undefined) {
        setClauses.push('notes = ?');
        queryParams.push(updates.notes);
      }

      setClauses.push('updated_at = ?');
      queryParams.push(now);

      setClauses.push("sync_status = 'PENDING_MUTATION'");

      queryParams.push(id);
      queryParams.push(activeGymId);

      await exec.execute(
        `UPDATE gym_members SET ${setClauses.join(', ')} WHERE id = ? AND gym_id = ? AND deleted_at IS NULL;`,
        queryParams
      );

      // Enqueue outbox UPDATE event atomically
      const eventId = generateUUID();
      const deviceId = DeviceIdentityService.getDeviceIdSync();
      await this.outboxRepo.enqueue(
        {
          schemaVersion: 1,
          eventId,
          gymId: activeGymId,
          deviceId,
          entityType: 'gym_member',
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
        throw new DatabaseError('Failed to fetch updated member', 'UPDATE_FAILED');
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
        `UPDATE gym_members SET deleted_at = ?, membership_status = 'INACTIVE', sync_status = 'PENDING_MUTATION', updated_at = ?
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
            entityType: 'gym_member',
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

  public async count(params?: { gymId?: string; status?: MembershipStatusType | string }): Promise<number> {
    const activeGymId = this.resolveGymId(params?.gymId);
    let sql = 'SELECT COUNT(*) as count FROM gym_members WHERE gym_id = ? AND deleted_at IS NULL';
    const queryParams: any[] = [activeGymId];

    if (params?.status && params.status !== 'ALL') {
      sql += ' AND membership_status = ?';
      queryParams.push(params.status);
    }

    const result = await this.dbManager.execute(sql, queryParams);
    return Number(result.rows?.[0]?.count ?? 0);
  }

  /**
   * Reads complete materialized local member profile from SQLCipher.
   * Completely functional offline without network requests.
   */
  public async getMemberProfile(id: string, gymId?: string): Promise<MemberProfileData | null> {
    const activeGymId = this.resolveGymId(gymId);
    const memberRecord = await this.findById(id, activeGymId);
    if (!memberRecord) {
      return null;
    }

    const memberSummary = mapMemberToSummary(memberRecord);

    // 1. Resolve active membership from local database
    let activeMembership: MemberActiveMembership | null = null;
    const memQuery = await this.dbManager.execute(
      `SELECT mm.*, mp.plan_name, mp.duration_days as plan_duration, mp.price_minor_units as plan_price
       FROM member_memberships mm
       LEFT JOIN membership_plans mp ON mm.plan_id = mp.id
       WHERE mm.member_id = ? AND mm.gym_id = ?
       ORDER BY mm.end_date DESC LIMIT 1;`,
      [id, activeGymId]
    );

    if (memQuery.rows && memQuery.rows.length > 0) {
      const row = memQuery.rows[0];
      const endDate = new Date(row.end_date as string);
      const now = new Date();
      const diffTime = endDate.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      activeMembership = {
        id: row.id as string,
        planId: row.plan_id as string,
        planName: (row.plan_name as string) || 'Membership Plan',
        status: row.status as string,
        startDate: row.start_date as string,
        endDate: row.end_date as string,
        autoRenew: Boolean(row.auto_renew),
        price: String(Number(row.price_at_purchase_minor_units) / 100),
        priceAtPurchase: String(Number(row.price_at_purchase_minor_units) / 100),
        durationDays: Number(row.plan_duration || 30),
        daysRemaining,
        frozenAt: (row.frozen_at as string) || null,
        freezeReason: (row.freeze_reason as string) || null,
        frozenDaysRemaining: null,
        unfrozenAt: null,
      };
    }

    // 2. Resolve attendance history
    const attCountRes = await this.dbManager.execute(
      'SELECT COUNT(*) as count FROM attendance_logs WHERE member_id = ? AND gym_id = ? AND deleted_at IS NULL;',
      [id, activeGymId]
    );
    const totalCheckIns = Number(attCountRes.rows?.[0]?.count ?? 0);

    const attRecentRes = await this.dbManager.execute(
      'SELECT * FROM attendance_logs WHERE member_id = ? AND gym_id = ? AND deleted_at IS NULL ORDER BY check_in_time DESC LIMIT 10;',
      [id, activeGymId]
    );
    const recentCheckIns: AttendanceRecord[] = (attRecentRes.rows || []).map((r) => ({
      id: r.id as string,
      checkInTime: r.check_in_time as string,
      checkOutTime: (r.check_out_time as string) || null,
      entryMethod: r.entry_method as string,
    }));

    // 3. Resolve payment history
    const paySumRes = await this.dbManager.execute(
      "SELECT COALESCE(SUM(amount_minor_units), 0) as total FROM payments WHERE member_id = ? AND gym_id = ? AND status = 'COMPLETED' AND deleted_at IS NULL;",
      [id, activeGymId]
    );
    const totalPaidMinor = Number(paySumRes.rows?.[0]?.total ?? 0);
    const totalPaid = totalPaidMinor / 100;

    const payRecentRes = await this.dbManager.execute(
      'SELECT * FROM payments WHERE member_id = ? AND gym_id = ? AND deleted_at IS NULL ORDER BY paid_at DESC LIMIT 10;',
      [id, activeGymId]
    );
    const recentPayments: PaymentRecord[] = (payRecentRes.rows || []).map((r) => ({
      id: r.id as string,
      membershipId: (r.membership_id as string) || null,
      amount: String(Number(r.amount_minor_units) / 100),
      paymentMethod: r.payment_method as string,
      transactionReference: (r.transaction_reference as string) || null,
      receiptNumber: (r.receipt_number as string) || null,
      type: 'MEMBERSHIP',
      status: r.status as string,
      notes: (r.notes as string) || null,
      paidAt: r.paid_at as string,
    }));

    // 4. Resolve trainer assignment
    let assignedTrainer: any = null;
    try {
      const trainerRes = await this.dbManager.execute(
        `SELECT ta.id as assignment_id, ta.trainer_id, t.full_name, t.phone, t.specialization
         FROM trainer_assignments ta
         LEFT JOIN trainers t ON ta.trainer_id = t.id AND ta.gym_id = t.gym_id
         WHERE ta.member_id = ? AND ta.gym_id = ? AND ta.status = 'ACTIVE'
         ORDER BY ta.assigned_at DESC LIMIT 1;`,
        [id, activeGymId]
      );
      if (trainerRes.rows && trainerRes.rows.length > 0) {
        const trRow = trainerRes.rows[0];
        assignedTrainer = {
          assignmentId: trRow.assignment_id as string,
          trainerId: trRow.trainer_id as string,
          trainerName: (trRow.full_name as string) || 'Trainer',
          trainerPhone: (trRow.phone as string) || '',
          specialization: (trRow.specialization as string) || null,
        };
      }
    } catch {
      // Non-fatal if table not yet migrated or empty
    }

    return {
      member: memberSummary,
      membership: activeMembership,
      attendanceSummary: {
        totalCheckIns,
        recentCheckIns,
      },
      paymentSummary: {
        totalPaid,
        recentPayments,
      },
      trainer: assignedTrainer,
      invite: null,
    };
  }
}
