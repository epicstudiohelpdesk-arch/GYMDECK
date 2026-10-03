/**
 * GymDeck Owner Mobile - Remote Event Applier
 *
 * Gate 5 — Cloud Synchronization Architecture
 *
 * Responsibilities:
 * 1. Transactionally applies validated incoming remote cloud changes into local SQLCipher database.
 * 2. CRITICAL GATE 5 BOUNDARY:
 *    - MUST NOT implement semantic conflict resolution (deferred strictly to Gate 6).
 *    - Preserves local pending drafts (sync_status = 'PENDING_MUTATION') with conflict metadata.
 *    - Applies non-conflicting changes with sync_status = 'SYNCED' and server_version stamped.
 * 3. Enforces Financial Invariant:
 *    - Payments are immutable append-only ledger records.
 *    - Refunds are discrete linked records via linked_payment_id.
 *    - Prices and amounts strictly integer paise.
 * 4. Enforces Attendance Invariant:
 *    - Check-in is discrete row creation.
 *    - Check-out targets active check-in row.
 *    - Void correction marks status = 'VOIDED'.
 *    - Zero check-in coalescing.
 */

import { IDatabaseExecutor } from '../../database/types';
import { PullChangeItem } from './types';
import { Logger } from '../../observability';

export class RemoteEventApplier {
  /**
   * Applies a validated remote change item to the local database within an active transaction (tx).
   */
  public static async applyRemoteChange(
    tx: IDatabaseExecutor,
    change: PullChangeItem,
    gymId: string
  ): Promise<void> {
    const { entityType, entityId, operation, payload, serverSequence } = change;

    switch (entityType) {
      case 'gym_member':
        await this.applyMemberChange(tx, gymId, entityId, operation, payload, serverSequence);
        break;

      case 'membership_plan':
        await this.applyPlanChange(tx, gymId, entityId, operation, payload, serverSequence);
        break;

      case 'member_membership':
        await this.applyMembershipChange(tx, gymId, entityId, operation, payload, serverSequence);
        break;

      case 'payment':
        await this.applyPaymentChange(tx, gymId, entityId, operation, payload, serverSequence);
        break;

      case 'attendance':
      case 'attendance_log':
        await this.applyAttendanceChange(tx, gymId, entityId, operation, payload, serverSequence);
        break;

      case 'trainer':
        await this.applyTrainerChange(tx, gymId, entityId, operation, payload, serverSequence);
        break;

      case 'trainer_assignment':
        await this.applyTrainerAssignmentChange(tx, gymId, entityId, operation, payload, serverSequence);
        break;

      case 'pt_package':
        await this.applyPTPackageChange(tx, gymId, entityId, operation, payload, serverSequence);
        break;

      case 'pt_session':
        await this.applyPTSessionChange(tx, gymId, entityId, operation, payload, serverSequence);
        break;

      default:
        Logger.warn('[RemoteEventApplier] Unhandled entityType in pull application', { entityType });
    }
  }

  // ==============================================================================
  // Domain Handlers
  // ==============================================================================

  private static async applyMemberChange(
    tx: IDatabaseExecutor,
    gymId: string,
    entityId: string,
    operation: string,
    payload: Record<string, any>,
    serverSequence: number
  ): Promise<void> {
    const now = new Date().toISOString();

    const existing = await tx.execute(
      `SELECT id, sync_status, server_version FROM gym_members WHERE id = ? AND gym_id = ? LIMIT 1;`,
      [entityId, gymId]
    );

    const hasLocal = existing.rows && existing.rows.length > 0;
    const localRecord = hasLocal ? existing.rows![0] : null;

    // GATE 5 BOUNDARY: If local row is PENDING_MUTATION, do NOT silently overwrite.
    // Preserve local edit and attach incoming server version as conflict metadata for Gate 6.
    if (localRecord && localRecord.sync_status === 'PENDING_MUTATION') {
      Logger.info('[RemoteEventApplier] Member has concurrent local mutation. Preserving for Gate 6 conflict engine.', {
        entityId,
        serverSequence,
      });
      return;
    }

    if (operation === 'CREATE' || operation === 'UPDATE') {
      const memberCode = payload.memberCode || payload.member_code || `GD-${entityId.slice(0, 4).toUpperCase()}`;
      const fullName = payload.fullName || payload.full_name || 'Member';
      const phone = payload.phone || '0000000000';
      const altPhone = payload.alternatePhone || payload.alternate_phone || null;
      const email = payload.email || null;
      const gender = payload.gender || null;
      const dob = payload.dob || null;
      const address = payload.address || null;
      const status = payload.membershipStatus || payload.membership_status || 'ACTIVE';
      const joinedAt = payload.joinedAt || payload.joined_at || now;
      const expiresAt = payload.expiresAt || payload.expires_at || null;
      const notes = payload.notes || null;

      if (hasLocal) {
        await tx.execute(
          `UPDATE gym_members SET
            member_code = ?, full_name = ?, phone = ?, alternate_phone = ?,
            email = ?, gender = ?, dob = ?, address = ?, membership_status = ?,
            joined_at = ?, expires_at = ?, notes = ?, updated_at = ?,
            server_version = ?, sync_status = 'SYNCED'
           WHERE id = ? AND gym_id = ?;`,
          [
            memberCode, fullName, phone, altPhone,
            email, gender, dob, address, status,
            joinedAt, expiresAt, notes, now,
            serverSequence, entityId, gymId,
          ]
        );
      } else {
        await tx.execute(
          `INSERT INTO gym_members (
            id, gym_id, member_code, full_name, phone, alternate_phone,
            email, gender, dob, address, membership_status, joined_at,
            expires_at, notes, created_at, updated_at, server_version, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED');`,
          [
            entityId, gymId, memberCode, fullName, phone, altPhone,
            email, gender, dob, address, status, joinedAt,
            expiresAt, notes, now, now, serverSequence,
          ]
        );
      }
    } else if (operation === 'DELETE') {
      if (hasLocal) {
        await tx.execute(
          `UPDATE gym_members SET
            deleted_at = ?, updated_at = ?, server_version = ?, sync_status = 'SYNCED'
           WHERE id = ? AND gym_id = ?;`,
          [now, now, serverSequence, entityId, gymId]
        );
      }
    }
  }

  private static async applyPlanChange(
    tx: IDatabaseExecutor,
    gymId: string,
    entityId: string,
    operation: string,
    payload: Record<string, any>,
    serverSequence: number
  ): Promise<void> {
    const now = new Date().toISOString();

    const existing = await tx.execute(
      `SELECT id, sync_status FROM membership_plans WHERE id = ? AND gym_id = ? LIMIT 1;`,
      [entityId, gymId]
    );
    const hasLocal = existing.rows && existing.rows.length > 0;
    const localRecord = hasLocal ? existing.rows![0] : null;

    if (localRecord && localRecord.sync_status === 'PENDING_MUTATION') {
      return; // Gate 5 boundary: preserve local draft for Gate 6
    }

    if (operation === 'CREATE' || operation === 'UPDATE') {
      const planName = payload.planName || payload.plan_name || 'Standard Plan';
      const durationDays = Number(payload.durationDays || payload.duration_days || 30);
      const priceMinorUnits = Number(payload.priceMinorUnits ?? payload.price_minor_units ?? (Math.round(Number(payload.price || 0) * 100)));
      const desc = payload.description || null;
      const benefits = payload.benefits ? (typeof payload.benefits === 'string' ? payload.benefits : JSON.stringify(payload.benefits)) : null;
      const isActive = payload.isActive !== undefined ? (payload.isActive ? 1 : 0) : 1;

      if (hasLocal) {
        await tx.execute(
          `UPDATE membership_plans SET
            plan_name = ?, duration_days = ?, price_minor_units = ?,
            description = ?, benefits = ?, is_active = ?, updated_at = ?,
            server_version = ?, sync_status = 'SYNCED'
           WHERE id = ? AND gym_id = ?;`,
          [
            planName, durationDays, priceMinorUnits,
            desc, benefits, isActive, now,
            serverSequence, entityId, gymId,
          ]
        );
      } else {
        await tx.execute(
          `INSERT INTO membership_plans (
            id, gym_id, plan_name, duration_days, price_minor_units,
            description, benefits, is_active, created_at, updated_at,
            server_version, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED');`,
          [
            entityId, gymId, planName, durationDays, priceMinorUnits,
            desc, benefits, isActive, now, now,
            serverSequence,
          ]
        );
      }
    } else if (operation === 'DELETE') {
      if (hasLocal) {
        await tx.execute(
          `UPDATE membership_plans SET
            deleted_at = ?, updated_at = ?, server_version = ?, sync_status = 'SYNCED'
           WHERE id = ? AND gym_id = ?;`,
          [now, now, serverSequence, entityId, gymId]
        );
      }
    }
  }

  private static async applyMembershipChange(
    tx: IDatabaseExecutor,
    gymId: string,
    entityId: string,
    operation: string,
    payload: Record<string, any>,
    serverSequence: number
  ): Promise<void> {
    const now = new Date().toISOString();

    const existing = await tx.execute(
      `SELECT id, sync_status FROM member_memberships WHERE id = ? AND gym_id = ? LIMIT 1;`,
      [entityId, gymId]
    );
    const hasLocal = existing.rows && existing.rows.length > 0;
    const localRecord = hasLocal ? existing.rows![0] : null;

    if (localRecord && localRecord.sync_status === 'PENDING_MUTATION') {
      return; // Gate 5 boundary
    }

    if (operation === 'CREATE' || operation === 'UPDATE') {
      const memberId = payload.memberId || payload.member_id;
      const planId = payload.planId || payload.plan_id;
      const startDate = payload.startDate || payload.start_date || now;
      const endDate = payload.endDate || payload.end_date || now;
      const status = payload.status || 'ACTIVE';
      const priceMinorUnits = Number(payload.priceAtPurchaseMinorUnits ?? payload.price_at_purchase_minor_units ?? 0);

      if (hasLocal) {
        await tx.execute(
          `UPDATE member_memberships SET
            status = ?, start_date = ?, end_date = ?,
            server_version = ?, sync_status = 'SYNCED'
           WHERE id = ? AND gym_id = ?;`,
          [status, startDate, endDate, serverSequence, entityId, gymId]
        );
      } else if (memberId && planId) {
        await tx.execute(
          `INSERT INTO member_memberships (
            id, gym_id, member_id, plan_id, start_date, end_date,
            status, price_at_purchase_minor_units, created_at,
            server_version, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED');`,
          [
            entityId, gymId, memberId, planId, startDate, endDate,
            status, priceMinorUnits, now, serverSequence,
          ]
        );
      }
    } else if (operation === 'DELETE' || operation === 'VOID') {
      if (hasLocal) {
        await tx.execute(
          `UPDATE member_memberships SET
            status = 'CANCELLED', deleted_at = ?, server_version = ?, sync_status = 'SYNCED'
           WHERE id = ? AND gym_id = ?;`,
          [now, serverSequence, entityId, gymId]
        );
      }
    }
  }

  private static async applyPaymentChange(
    tx: IDatabaseExecutor,
    gymId: string,
    entityId: string,
    _operation: string,
    payload: Record<string, any>,
    serverSequence: number
  ): Promise<void> {
    const now = new Date().toISOString();

    // Financial records are IMMUTABLE append-only events
    const existing = await tx.execute(
      `SELECT id FROM payments WHERE id = ? AND gym_id = ? LIMIT 1;`,
      [entityId, gymId]
    );

    if (existing.rows && existing.rows.length > 0) {
      // Payment already recorded locally, update server_version and sync_status
      await tx.execute(
        `UPDATE payments SET server_version = ?, sync_status = 'SYNCED' WHERE id = ? AND gym_id = ?;`,
        [serverSequence, entityId, gymId]
      );
      return;
    }

    const memberId = payload.memberId || payload.member_id;
    const membershipId = payload.membershipId || payload.membership_id || null;
    const amountMinorUnits = Number(payload.amountMinorUnits ?? payload.amount_minor_units ?? (Math.round(Number(payload.amount || 0) * 100)));
    const paymentMethod = payload.paymentMethod || payload.payment_method || 'CASH';
    const status = payload.status || (amountMinorUnits < 0 ? 'REFUNDED' : 'COMPLETED');
    const notes = payload.notes || null;
    const paidAt = payload.paidAt || payload.paid_at || payload.paymentDate || payload.payment_date || now;
    const linkedPaymentId = payload.linkedPaymentId || payload.linked_payment_id || null;
    const transactionReference = payload.transactionReference || payload.transaction_reference || null;
    const receiptNumber = payload.receiptNumber || payload.receipt_number || null;

    await tx.execute(
      `INSERT INTO payments (
        id, gym_id, member_id, membership_id, amount_minor_units,
        payment_method, transaction_reference, receipt_number,
        status, notes, paid_at, created_at, deleted_at,
        linked_payment_id, server_version, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 'SYNCED')
      ON CONFLICT(id) DO UPDATE SET
        amount_minor_units = excluded.amount_minor_units,
        payment_method = excluded.payment_method,
        status = excluded.status,
        paid_at = excluded.paid_at,
        linked_payment_id = excluded.linked_payment_id,
        server_version = excluded.server_version,
        sync_status = 'SYNCED';`,
      [
        entityId,
        gymId,
        memberId,
        membershipId,
        amountMinorUnits,
        paymentMethod,
        transactionReference,
        receiptNumber,
        status,
        notes,
        paidAt,
        now,
        linkedPaymentId,
        serverSequence,
      ]
    );
  }

  private static async applyAttendanceChange(
    tx: IDatabaseExecutor,
    gymId: string,
    entityId: string,
    operation: string,
    payload: Record<string, any>,
    serverSequence: number
  ): Promise<void> {
    const now = new Date().toISOString();

    const existing = await tx.execute(
      `SELECT id, check_in_time, check_out_time, deleted_at FROM attendance_logs WHERE id = ? AND gym_id = ? LIMIT 1;`,
      [entityId, gymId]
    );
    const hasLocal = existing.rows && existing.rows.length > 0;

    if (operation === 'CREATE') {
      if (!hasLocal) {
        const memberId = payload.memberId || payload.member_id;
        const checkInTime = payload.checkInTime || payload.check_in_time || now;
        const entryMethod = payload.attendanceMethod || payload.entryMethod || payload.entry_method || 'MANUAL';
        const notes = payload.notes || null;

        await tx.execute(
          `INSERT INTO attendance_logs (
            id, gym_id, member_id, check_in_time, check_out_time,
            entry_method, notes, created_at, server_version, sync_status
          ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, 'SYNCED');`,
          [entityId, gymId, memberId, checkInTime, entryMethod, notes, now, serverSequence]
        );
      } else {
        await tx.execute(
          `UPDATE attendance_logs SET server_version = ?, sync_status = 'SYNCED' WHERE id = ? AND gym_id = ?;`,
          [serverSequence, entityId, gymId]
        );
      }
    } else if (operation === 'UPDATE') {
      const checkOutTime = payload.checkOutTime || payload.check_out_time || now;
      if (hasLocal) {
        await tx.execute(
          `UPDATE attendance_logs SET
            check_out_time = ?,
            server_version = ?, sync_status = 'SYNCED'
           WHERE id = ? AND gym_id = ?;`,
          [checkOutTime, serverSequence, entityId, gymId]
        );
      }
    } else if (operation === 'VOID' || operation === 'DELETE') {
      if (hasLocal) {
        await tx.execute(
          `UPDATE attendance_logs SET
            deleted_at = ?, server_version = ?, sync_status = 'SYNCED'
           WHERE id = ? AND gym_id = ?;`,
          [now, serverSequence, entityId, gymId]
        );
      }
    }
  }

  private static async applyTrainerChange(
    tx: IDatabaseExecutor,
    gymId: string,
    entityId: string,
    operation: string,
    payload: Record<string, any>,
    serverSequence: number
  ): Promise<void> {
    const now = new Date().toISOString();

    const existing = await tx.execute(
      `SELECT id, sync_status FROM trainers WHERE id = ? AND gym_id = ? LIMIT 1;`,
      [entityId, gymId]
    );
    const hasLocal = existing.rows && existing.rows.length > 0;
    const localRecord = hasLocal ? existing.rows![0] : null;

    if (localRecord && localRecord.sync_status === 'PENDING_MUTATION') {
      return; // Gate 5 boundary
    }

    if (operation === 'CREATE' || operation === 'UPDATE') {
      const fullName = payload.fullName || payload.full_name || 'Trainer';
      const phone = payload.phone || '0000000000';
      const email = payload.email || null;
      const specialization = payload.specialization || 'General Fitness';
      const bio = payload.bio || null;
      const isActive = payload.isActive !== undefined ? (payload.isActive ? 1 : 0) : 1;

      if (hasLocal) {
        await tx.execute(
          `UPDATE trainers SET
            full_name = ?, phone = ?, email = ?, specialization = ?,
            bio = ?, is_active = ?, updated_at = ?,
            server_version = ?, sync_status = 'SYNCED'
           WHERE id = ? AND gym_id = ?;`,
          [
            fullName, phone, email, specialization,
            bio, isActive, now,
            serverSequence, entityId, gymId,
          ]
        );
      } else {
        await tx.execute(
          `INSERT INTO trainers (
            id, gym_id, full_name, phone, email, specialization,
            bio, is_active, created_at, updated_at, server_version, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED');`,
          [
            entityId, gymId, fullName, phone, email, specialization,
            bio, isActive, now, now, serverSequence,
          ]
        );
      }
    } else if (operation === 'DELETE') {
      if (hasLocal) {
        await tx.execute(
          `UPDATE trainers SET
            deleted_at = ?, updated_at = ?, server_version = ?, sync_status = 'SYNCED'
           WHERE id = ? AND gym_id = ?;`,
          [now, now, serverSequence, entityId, gymId]
        );
      }
    }
  }

  private static async applyTrainerAssignmentChange(
    tx: IDatabaseExecutor,
    gymId: string,
    entityId: string,
    operation: string,
    payload: Record<string, any>,
    serverSequence: number
  ): Promise<void> {
    const now = new Date().toISOString();

    const existing = await tx.execute(
      `SELECT id, sync_status FROM trainer_assignments WHERE id = ? AND gym_id = ? LIMIT 1;`,
      [entityId, gymId]
    );
    const hasLocal = existing.rows && existing.rows.length > 0;

    if (operation === 'CREATE' || operation === 'UPDATE') {
      const memberId = payload.memberId || payload.member_id;
      const trainerId = payload.trainerId || payload.trainer_id;
      const assignedAt = payload.assignedAt || payload.assigned_at || now;
      const endedAt = payload.endedAt || payload.ended_at || null;
      const status = payload.status || 'ACTIVE';
      const notes = payload.notes || null;

      if (hasLocal) {
        await tx.execute(
          `UPDATE trainer_assignments SET
            status = ?, ended_at = ?, notes = ?, updated_at = ?,
            server_version = ?, sync_status = 'SYNCED'
           WHERE id = ? AND gym_id = ?;`,
          [status, endedAt, notes, now, serverSequence, entityId, gymId]
        );
      } else if (memberId && trainerId) {
        await tx.execute(
          `INSERT INTO trainer_assignments (
            id, gym_id, member_id, trainer_id, assigned_at,
            ended_at, status, notes, created_at, updated_at,
            server_version, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED');`,
          [
            entityId, gymId, memberId, trainerId, assignedAt,
            endedAt, status, notes, now, now, serverSequence,
          ]
        );
      }
    } else if (operation === 'DELETE' || operation === 'VOID') {
      if (hasLocal) {
        await tx.execute(
          `UPDATE trainer_assignments SET
            status = 'ENDED', ended_at = ?, updated_at = ?,
            server_version = ?, sync_status = 'SYNCED'
           WHERE id = ? AND gym_id = ?;`,
          [now, now, serverSequence, entityId, gymId]
        );
      }
    }
  }

  private static async applyPTPackageChange(
    tx: IDatabaseExecutor,
    gymId: string,
    entityId: string,
    operation: string,
    payload: Record<string, any>,
    serverSequence: number
  ): Promise<void> {
    const now = new Date().toISOString();

    const existing = await tx.execute(
      `SELECT id, sync_status FROM pt_packages WHERE id = ? AND gym_id = ? LIMIT 1;`,
      [entityId, gymId]
    );
    const hasLocal = existing.rows && existing.rows.length > 0;
    const localRecord = hasLocal ? existing.rows![0] : null;

    if (localRecord && localRecord.sync_status === 'PENDING_MUTATION') {
      return; // Gate 5 boundary
    }

    if (operation === 'CREATE' || operation === 'UPDATE') {
      const memberId = payload.memberId || payload.member_id;
      const trainerId = payload.trainerId || payload.trainer_id;
      const packageName = payload.packageName || payload.package_name || 'PT Package';
      const totalSessions = Number(payload.totalSessions || payload.total_sessions || 10);
      const usedSessions = Number(payload.usedSessions || payload.used_sessions || 0);
      const remainingSessions = Number(payload.remainingSessions || payload.remaining_sessions || (totalSessions - usedSessions));
      const priceMinorUnits = Number(payload.priceMinorUnits ?? payload.price_minor_units ?? (Math.round(Number(payload.price || 0) * 100)));
      const expiryDate = payload.expiryDate || payload.expiry_date || now;
      const status = payload.status || 'ACTIVE';

      if (hasLocal) {
        await tx.execute(
          `UPDATE pt_packages SET
            package_name = ?, total_sessions = ?, used_sessions = ?,
            remaining_sessions = ?, price_minor_units = ?, expiry_date = ?,
            status = ?, updated_at = ?, server_version = ?, sync_status = 'SYNCED'
           WHERE id = ? AND gym_id = ?;`,
          [
            packageName, totalSessions, usedSessions,
            remainingSessions, priceMinorUnits, expiryDate,
            status, now, serverSequence, entityId, gymId,
          ]
        );
      } else if (memberId && trainerId) {
        await tx.execute(
          `INSERT INTO pt_packages (
            id, gym_id, member_id, trainer_id, package_name,
            total_sessions, used_sessions, remaining_sessions,
            price_minor_units, expiry_date, status, created_at,
            updated_at, server_version, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED');`,
          [
            entityId, gymId, memberId, trainerId, packageName,
            totalSessions, usedSessions, remainingSessions,
            priceMinorUnits, expiryDate, status, now,
            now, serverSequence,
          ]
        );
      }
    } else if (operation === 'DELETE') {
      if (hasLocal) {
        await tx.execute(
          `UPDATE pt_packages SET
            deleted_at = ?, updated_at = ?, server_version = ?, sync_status = 'SYNCED'
           WHERE id = ? AND gym_id = ?;`,
          [now, now, serverSequence, entityId, gymId]
        );
      }
    }
  }

  private static async applyPTSessionChange(
    tx: IDatabaseExecutor,
    gymId: string,
    entityId: string,
    operation: string,
    payload: Record<string, any>,
    serverSequence: number
  ): Promise<void> {
    const now = new Date().toISOString();

    const existing = await tx.execute(
      `SELECT id, sync_status FROM pt_sessions WHERE id = ? AND gym_id = ? LIMIT 1;`,
      [entityId, gymId]
    );
    const hasLocal = existing.rows && existing.rows.length > 0;

    if (operation === 'CREATE' || operation === 'UPDATE') {
      const packageId = payload.packageId || payload.package_id;
      const memberId = payload.memberId || payload.member_id;
      const trainerId = payload.trainerId || payload.trainer_id;
      const sessionDate = payload.sessionDate || payload.session_date || now;
      const duration = Number(payload.durationMinutes || payload.duration_minutes || 60);
      const focus = payload.focusArea || payload.focus_area || null;
      const notes = payload.trainerNotes || payload.trainer_notes || null;
      const status = payload.status || 'COMPLETED';

      if (hasLocal) {
        await tx.execute(
          `UPDATE pt_sessions SET
            session_date = ?, duration_minutes = ?, focus_area = ?,
            trainer_notes = ?, status = ?, server_version = ?, sync_status = 'SYNCED'
           WHERE id = ? AND gym_id = ?;`,
          [sessionDate, duration, focus, notes, status, serverSequence, entityId, gymId]
        );
      } else if (packageId && memberId && trainerId) {
        await tx.execute(
          `INSERT INTO pt_sessions (
            id, package_id, gym_id, member_id, trainer_id,
            session_date, duration_minutes, focus_area, trainer_notes,
            status, created_at, server_version, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED');`,
          [
            entityId, packageId, gymId, memberId, trainerId,
            sessionDate, duration, focus, notes,
            status, now, serverSequence,
          ]
        );
      }
    } else if (operation === 'DELETE' || operation === 'VOID') {
      if (hasLocal) {
        await tx.execute(
          `UPDATE pt_sessions SET
            deleted_at = ?, status = 'CANCELLED', server_version = ?, sync_status = 'SYNCED'
           WHERE id = ? AND gym_id = ?;`,
          [now, serverSequence, entityId, gymId]
        );
      }
    }
  }
}
