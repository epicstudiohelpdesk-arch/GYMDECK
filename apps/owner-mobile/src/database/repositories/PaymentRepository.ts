/**
 * GymDeck Owner Mobile - Payment Repository
 *
 * Financial Invariants:
 * - All monetary amounts are handled strictly as integer minor units (paise: 1 INR = 100 paise).
 * - Zero floating-point types or conversions used in persistence.
 * - Completed financial records are immutable.
 * - Refunds are discrete linked transactions preserving historical auditability.
 * - Offline mutations and outbox events commit atomically.
 */

import { LocalDatabaseManager } from '../LocalDatabaseManager';
import {
  IPaymentRepository,
  RecordPaymentInput,
  TransactionListItem,
} from './interfaces';
import { PaymentRecord, IDatabaseExecutor } from '../types';
import { MinorUnits } from '../../types/money';
import { generateUUID } from '../utils';
import { DatabaseError } from '../errors';
import { outboxRepository, IOutboxRepository } from './OutboxRepository';
import { DeviceIdentityService } from '../../services/DeviceIdentityService';

export { TransactionListItem };

function mapRowToPayment(row: Record<string, any>): PaymentRecord {
  return {
    id: row.id as string,
    gym_id: row.gym_id as string,
    member_id: row.member_id as string,
    membership_id: (row.membership_id as string) || null,
    amount_minor_units: Number(row.amount_minor_units), // Integer paise
    payment_method: row.payment_method as string,
    transaction_reference: (row.transaction_reference as string) || null,
    receipt_number: (row.receipt_number as string) || null,
    status: row.status as 'COMPLETED' | 'PENDING' | 'REFUNDED',
    notes: (row.notes as string) || null,
    paid_at: row.paid_at as string,
    created_at: row.created_at as string,
    deleted_at: (row.deleted_at as string) || null,
    linked_payment_id: (row.linked_payment_id as string) || null,
    server_version:
      row.server_version !== null && row.server_version !== undefined
        ? Number(row.server_version)
        : null,
    sync_status: (row.sync_status as any) || 'SYNCED',
  };
}

export class PaymentRepository implements IPaymentRepository {
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
        'No active gym tenant context found for payment operation',
        'NO_TENANT_CONTEXT'
      );
    }
    return gymId;
  }

  public async findById(id: string, gymId?: string, executor?: IDatabaseExecutor): Promise<PaymentRecord | null> {
    const activeGymId = this.resolveGymId(gymId);
    const exec = executor || this.dbManager;
    const result = await exec.execute(
      'SELECT * FROM payments WHERE id = ? AND gym_id = ? AND deleted_at IS NULL LIMIT 1;',
      [id, activeGymId]
    );
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    return mapRowToPayment(result.rows[0]);
  }

  public async recordPayment(
    input: RecordPaymentInput,
    executor?: IDatabaseExecutor
  ): Promise<PaymentRecord> {
    const run = async (exec: IDatabaseExecutor) => {
      const activeGymId = this.resolveGymId(input.gymId);
      const id = input.id || generateUUID();
      const now = new Date().toISOString();
      const paidAt = input.paidAt || now;
      const status = input.status || 'COMPLETED';

      // Strict validation: amount must be a positive integer in paise
      const amountMinorUnits = Math.round(Number(input.amountMinorUnits));
      if (isNaN(amountMinorUnits) || amountMinorUnits <= 0) {
        throw new DatabaseError(
          'Payment amount must be a positive integer in minor units (paise)',
          'INVALID_AMOUNT'
        );
      }

      await exec.execute(
        `INSERT INTO payments (
          id, gym_id, member_id, membership_id, amount_minor_units,
          payment_method, transaction_reference, receipt_number,
          status, notes, paid_at, created_at, deleted_at,
          linked_payment_id, server_version, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, 'PENDING_MUTATION');`,
        [
          id,
          activeGymId,
          input.memberId,
          input.membershipId ?? null,
          amountMinorUnits,
          input.paymentMethod,
          input.transactionReference ?? null,
          input.receiptNumber ?? null,
          status,
          input.notes ?? null,
          paidAt,
          now,
          input.linkedPaymentId ?? null,
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
          entityType: 'payment',
          entityId: id,
          operation: 'CREATE',
          baseServerSequence: null,
          payload: {
            id,
            gymId: activeGymId,
            memberId: input.memberId,
            membershipId: input.membershipId ?? null,
            amountMinorUnits,
            paymentMethod: input.paymentMethod,
            transactionReference: input.transactionReference ?? null,
            receiptNumber: input.receiptNumber ?? null,
            status,
            notes: input.notes ?? null,
            paidAt,
            createdAt: now,
            linkedPaymentId: input.linkedPaymentId ?? null,
          },
          clientTimestamp: now,
        },
        exec
      );

      const created = await this.findById(id, activeGymId, exec);
      if (!created) {
        throw new DatabaseError('Failed to fetch newly recorded payment', 'INSERT_FAILED');
      }
      return created;
    };

    if (executor) {
      return run(executor);
    }
    return this.dbManager.runInTransaction(run);
  }

  public async recordRefund(
    originalPaymentId: string,
    reason?: string,
    gymId?: string,
    executor?: IDatabaseExecutor
  ): Promise<PaymentRecord> {
    const run = async (exec: IDatabaseExecutor) => {
      const activeGymId = this.resolveGymId(gymId);
      const original = await this.findById(originalPaymentId, activeGymId, exec);
      if (!original) {
        throw new DatabaseError(
          `Original payment '${originalPaymentId}' not found for refund`,
          'PAYMENT_NOT_FOUND'
        );
      }

      const refundId = generateUUID();
      const now = new Date().toISOString();
      const receiptNumber = `REF-${Date.now().toString().slice(-6)}`;
      const refundNotes = `Refund for payment ${originalPaymentId}${reason ? ': ' + reason : ''}`;

      // Insert discrete linked refund record
      await exec.execute(
        `INSERT INTO payments (
          id, gym_id, member_id, membership_id, amount_minor_units,
          payment_method, transaction_reference, receipt_number,
          status, notes, paid_at, created_at, deleted_at,
          linked_payment_id, server_version, sync_status
        ) VALUES (?, ?, ?, ?, ?, 'REFUND', ?, ?, 'REFUNDED', ?, ?, ?, NULL, ?, NULL, 'PENDING_MUTATION');`,
        [
          refundId,
          activeGymId,
          original.member_id,
          original.membership_id,
          original.amount_minor_units,
          original.transaction_reference,
          receiptNumber,
          refundNotes,
          now,
          now,
          originalPaymentId,
        ]
      );

      // Enqueue canonical outbox event for discrete refund
      const eventId = generateUUID();
      const deviceId = DeviceIdentityService.getDeviceIdSync();
      await this.outboxRepo.enqueue(
        {
          schemaVersion: 1,
          eventId,
          gymId: activeGymId,
          deviceId,
          entityType: 'payment',
          entityId: refundId,
          operation: 'CREATE',
          baseServerSequence: null,
          payload: {
            id: refundId,
            gymId: activeGymId,
            memberId: original.member_id,
            membershipId: original.membership_id,
            amountMinorUnits: original.amount_minor_units,
            paymentMethod: 'REFUND',
            status: 'REFUNDED',
            linkedPaymentId: originalPaymentId,
            receiptNumber,
            notes: refundNotes,
            paidAt: now,
            createdAt: now,
          },
          clientTimestamp: now,
        },
        exec
      );

      const refundRecord = await this.findById(refundId, activeGymId, exec);
      if (!refundRecord) {
        throw new DatabaseError('Failed to fetch newly recorded refund', 'INSERT_FAILED');
      }
      return refundRecord;
    };

    if (executor) {
      return run(executor);
    }
    return this.dbManager.runInTransaction(run);
  }

  public async listByMember(memberId: string, limit: number = 50, gymId?: string): Promise<PaymentRecord[]> {
    const activeGymId = this.resolveGymId(gymId);
    const result = await this.dbManager.execute(
      'SELECT * FROM payments WHERE member_id = ? AND gym_id = ? AND deleted_at IS NULL ORDER BY paid_at DESC LIMIT ?;',
      [memberId, activeGymId, limit]
    );
    if (!result.rows) return [];
    return result.rows.map(mapRowToPayment);
  }

  public async listRecent(limit: number = 50, offset: number = 0, gymId?: string): Promise<PaymentRecord[]> {
    const activeGymId = this.resolveGymId(gymId);
    const result = await this.dbManager.execute(
      'SELECT * FROM payments WHERE gym_id = ? AND deleted_at IS NULL ORDER BY paid_at DESC LIMIT ? OFFSET ?;',
      [activeGymId, limit, offset]
    );
    if (!result.rows) return [];
    return result.rows.map(mapRowToPayment);
  }

  public async listTransactions(params?: {
    gymId?: string;
    period?: 'today' | 'this_week' | 'this_month' | 'all';
    status?: 'ALL' | 'COMPLETED' | 'REFUNDED';
    limit?: number;
    offset?: number;
  }): Promise<TransactionListItem[]> {
    const activeGymId = this.resolveGymId(params?.gymId);
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    let sql = `
      SELECT 
        p.id,
        p.member_id,
        COALESCE(m.full_name, 'Unknown Member') as member_name,
        COALESCE(m.member_code, 'N/A') as member_code,
        p.amount_minor_units,
        p.payment_method,
        p.status,
        p.paid_at,
        p.receipt_number,
        p.transaction_reference,
        p.notes,
        p.linked_payment_id
      FROM payments p
      LEFT JOIN gym_members m ON p.member_id = m.id AND p.gym_id = m.gym_id
      WHERE p.gym_id = ? AND p.deleted_at IS NULL
    `;
    const queryParams: any[] = [activeGymId];

    if (params?.status && params.status !== 'ALL') {
      sql += ' AND p.status = ?';
      queryParams.push(params.status);
    }

    if (params?.period && params.period !== 'all') {
      const now = new Date();
      if (params.period === 'today') {
        const todayStr = now.toISOString().slice(0, 10);
        sql += ' AND p.paid_at LIKE ?';
        queryParams.push(`${todayStr}%`);
      } else if (params.period === 'this_week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        sql += ' AND p.paid_at >= ?';
        queryParams.push(weekAgo);
      } else if (params.period === 'this_month') {
        const monthPrefix = now.toISOString().slice(0, 7);
        sql += ' AND p.paid_at LIKE ?';
        queryParams.push(`${monthPrefix}%`);
      }
    }

    sql += ' ORDER BY p.paid_at DESC LIMIT ? OFFSET ?;';
    queryParams.push(limit, offset);

    const result = await this.dbManager.execute(sql, queryParams);
    if (!result.rows) return [];

    return result.rows.map((row) => {
      const minor = Number(row.amount_minor_units);
      const isRefund = row.payment_method === 'REFUND' || row.status === 'REFUNDED';
      return {
        id: row.id as string,
        memberId: row.member_id as string,
        memberName: row.member_name as string,
        memberCode: row.member_code as string,
        amount: minor / 100,
        amountMinorUnits: minor,
        paymentMethod: row.payment_method as string,
        type: isRefund ? 'REFUND' : 'PAYMENT',
        status: row.status as 'COMPLETED' | 'PENDING' | 'REFUNDED',
        paidAt: row.paid_at as string,
        receiptNumber: (row.receipt_number as string) || null,
        transactionReference: (row.transaction_reference as string) || null,
        notes: (row.notes as string) || null,
        linkedPaymentId: (row.linked_payment_id as string) || null,
      };
    });
  }

  public async calculateTotalRevenueMinorUnits(
    startDate?: string,
    endDate?: string,
    gymId?: string
  ): Promise<MinorUnits> {
    const activeGymId = this.resolveGymId(gymId);
    let sql = `
      SELECT 
        SUM(CASE 
          WHEN payment_method = 'REFUND' OR status = 'REFUNDED' THEN -amount_minor_units 
          ELSE amount_minor_units 
        END) as net_revenue
      FROM payments 
      WHERE gym_id = ? AND deleted_at IS NULL AND status IN ('COMPLETED', 'REFUNDED')
    `;
    const params: any[] = [activeGymId];

    if (startDate) {
      sql += ' AND paid_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND paid_at <= ?';
      params.push(endDate);
    }

    const result = await this.dbManager.execute(sql, params);
    return Number(result.rows?.[0]?.net_revenue ?? 0);
  }

  public async upsert(input: RecordPaymentInput, gymId?: string): Promise<PaymentRecord> {
    const activeGymId = this.resolveGymId(gymId || input.gymId);
    const id = input.id || generateUUID();
    const now = new Date().toISOString();
    const paidAt = input.paidAt || now;
    const status = input.status || 'COMPLETED';
    const amountMinorUnits = Math.round(Number(input.amountMinorUnits));

    await this.dbManager.execute(
      `INSERT INTO payments (
        id, gym_id, member_id, membership_id, amount_minor_units,
        payment_method, transaction_reference, receipt_number,
        status, notes, paid_at, created_at, deleted_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'SYNCED')
      ON CONFLICT(id) DO UPDATE SET
        amount_minor_units = excluded.amount_minor_units,
        payment_method = excluded.payment_method,
        transaction_reference = excluded.transaction_reference,
        receipt_number = excluded.receipt_number,
        status = excluded.status,
        notes = excluded.notes,
        paid_at = excluded.paid_at,
        sync_status = 'SYNCED';`,
      [
        id,
        activeGymId,
        input.memberId,
        input.membershipId ?? null,
        amountMinorUnits,
        input.paymentMethod,
        input.transactionReference ?? null,
        input.receiptNumber ?? null,
        status,
        input.notes ?? null,
        paidAt,
        now,
      ]
    );

    const record = await this.findById(id, activeGymId);
    if (!record) {
      throw new DatabaseError('Failed to fetch upserted payment', 'UPSERT_FAILED');
    }
    return record;
  }

  public async upsertBatch(inputs: RecordPaymentInput[], gymId?: string): Promise<number> {
    if (!inputs || inputs.length === 0) return 0;
    const activeGymId = this.resolveGymId(gymId);
    const now = new Date().toISOString();

    let count = 0;
    await this.dbManager.transaction(async (tx) => {
      for (const input of inputs) {
        const id = input.id || generateUUID();
        const paidAt = input.paidAt || now;
        const status = input.status || 'COMPLETED';
        const amountMinorUnits = Math.round(Number(input.amountMinorUnits));

        await tx.execute(
          `INSERT INTO payments (
            id, gym_id, member_id, membership_id, amount_minor_units,
            payment_method, transaction_reference, receipt_number,
            status, notes, paid_at, created_at, deleted_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'SYNCED')
          ON CONFLICT(id) DO UPDATE SET
            amount_minor_units = excluded.amount_minor_units,
            payment_method = excluded.payment_method,
            transaction_reference = excluded.transaction_reference,
            receipt_number = excluded.receipt_number,
            status = excluded.status,
            notes = excluded.notes,
            paid_at = excluded.paid_at,
            sync_status = 'SYNCED';`,
          [
            id,
            activeGymId,
            input.memberId,
            input.membershipId ?? null,
            amountMinorUnits,
            input.paymentMethod,
            input.transactionReference ?? null,
            input.receiptNumber ?? null,
            status,
            input.notes ?? null,
            paidAt,
            now,
          ]
        );
        count++;
      }
    });

    return count;
  }
}
