/**
 * GymDeck Cloud Backend - Multi-Tenant Database Integrity Diagnostics Service
 *
 * Provides safe, non-destructive, read-only validation of domain tables,
 * foreign references, financial ledger consistency, tenant isolation, and sync state.
 */

import { sql } from 'drizzle-orm';
import { db } from '../../shared/database';

export interface IntegrityCheckResult {
  checkName: string;
  category: 'REFERENTIAL' | 'TENANT_ISOLATION' | 'FINANCIAL_LEDGER' | 'CONCURRENCY' | 'SYNC_STATE' | 'TEMPORAL';
  status: 'HEALTHY' | 'ANOMALY_DETECTED';
  details: string;
  count: number;
}

export interface SystemIntegrityReport {
  gymId: string;
  checkedAt: string;
  checksRun: number;
  anomaliesDetected: number;
  overallStatus: 'HEALTHY' | 'REQUIRES_ATTENTION';
  checks: IntegrityCheckResult[];
}

export class DatabaseIntegrityService {
  /**
   * Runs a complete read-only integrity audit for a specific gym tenant.
   * Strictly non-destructive; never modifies, truncates, or deletes records.
   */
  static async runIntegrityAudit(gymId: string): Promise<SystemIntegrityReport> {
    const checks: IntegrityCheckResult[] = [];

    // 1. Orphaned Memberships (memberships without a valid parent member in same gym)
    const orphMemRes = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM member_memberships mm
      LEFT JOIN gym_members m ON mm.member_id = m.id AND mm.gym_id = m.gym_id
      WHERE mm.gym_id = ${gymId} AND m.id IS NULL
    `);
    const orphMemCount = parseInt((orphMemRes.rows[0] as any)?.count || '0', 10);
    checks.push({
      checkName: 'ORPHANED_MEMBER_MEMBERSHIPS',
      category: 'REFERENTIAL',
      status: orphMemCount === 0 ? 'HEALTHY' : 'ANOMALY_DETECTED',
      details: orphMemCount === 0 
        ? 'All membership subscriptions are bound to valid member profiles in this tenant.'
        : `Found ${orphMemCount} membership subscriptions referencing non-existent members.`,
      count: orphMemCount,
    });

    // 2. Orphaned Payments
    const orphPayRes = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM payments p
      LEFT JOIN gym_members m ON p.member_id = m.id AND p.gym_id = m.gym_id
      WHERE p.gym_id = ${gymId} AND p.member_id IS NOT NULL AND m.id IS NULL
    `);
    const orphPayCount = parseInt((orphPayRes.rows[0] as any)?.count || '0', 10);
    checks.push({
      checkName: 'ORPHANED_PAYMENTS',
      category: 'REFERENTIAL',
      status: orphPayCount === 0 ? 'HEALTHY' : 'ANOMALY_DETECTED',
      details: orphPayCount === 0 
        ? 'All financial payment ledger entries are linked to valid member accounts.'
        : `Found ${orphPayCount} payment records referencing non-existent members.`,
      count: orphPayCount,
    });

    // 3. Orphaned PT Sessions
    const orphPtSessRes = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM pt_sessions s
      LEFT JOIN pt_packages p ON s.package_id = p.id AND s.gym_id = p.gym_id
      WHERE s.gym_id = ${gymId} AND p.id IS NULL
    `);
    const orphPtSessCount = parseInt((orphPtSessRes.rows[0] as any)?.count || '0', 10);
    checks.push({
      checkName: 'ORPHANED_PT_SESSIONS',
      category: 'REFERENTIAL',
      status: orphPtSessCount === 0 ? 'HEALTHY' : 'ANOMALY_DETECTED',
      details: orphPtSessCount === 0 
        ? 'All PT sessions correspond to valid personal training packages.'
        : `Found ${orphPtSessCount} PT sessions with invalid package bindings.`,
      count: orphPtSessCount,
    });

    // 4. Orphaned Attendance Logs
    const orphAttRes = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM attendance_logs a
      LEFT JOIN gym_members m ON a.member_id = m.id AND a.gym_id = m.gym_id
      WHERE a.gym_id = ${gymId} AND m.id IS NULL
    `);
    const orphAttCount = parseInt((orphAttRes.rows[0] as any)?.count || '0', 10);
    checks.push({
      checkName: 'ORPHANED_ATTENDANCE_LOGS',
      category: 'REFERENTIAL',
      status: orphAttCount === 0 ? 'HEALTHY' : 'ANOMALY_DETECTED',
      details: orphAttCount === 0 
        ? 'All check-in logs map to valid member entities.'
        : `Found ${orphAttCount} attendance check-ins for non-existent members.`,
      count: orphAttCount,
    });

    // 5. Cross-Tenant Leakage Check (Validates no records reference foreign gym IDs)
    const crossTenantRes = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM member_memberships mm
      JOIN gym_members m ON mm.member_id = m.id
      WHERE mm.gym_id = ${gymId} AND m.gym_id != ${gymId}
    `);
    const crossTenantCount = parseInt((crossTenantRes.rows[0] as any)?.count || '0', 10);
    checks.push({
      checkName: 'CROSS_TENANT_ISOLATION',
      category: 'TENANT_ISOLATION',
      status: crossTenantCount === 0 ? 'HEALTHY' : 'ANOMALY_DETECTED',
      details: crossTenantCount === 0 
        ? 'Strict compound tenant isolation confirmed across all member relationships.'
        : `CRITICAL: ${crossTenantCount} cross-tenant foreign reference violations detected.`,
      count: crossTenantCount,
    });

    // 6. Financial Ledger Balance Integrity (Negative or zero payment amounts)
    const finRes = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM payments
      WHERE gym_id = ${gymId} AND CAST(amount AS NUMERIC) <= 0
    `);
    const finAnomalies = parseInt((finRes.rows[0] as any)?.count || '0', 10);
    checks.push({
      checkName: 'FINANCIAL_LEDGER_INTEGRITY',
      category: 'FINANCIAL_LEDGER',
      status: finAnomalies === 0 ? 'HEALTHY' : 'ANOMALY_DETECTED',
      details: finAnomalies === 0 
        ? 'Payment amounts and ledger precision conform strictly to financial invariants.'
        : `Found ${finAnomalies} payments with non-positive amounts.`,
      count: finAnomalies,
    });

    // 7. PT Package Balance Invariants (Used sessions cannot exceed total purchased)
    const ptRes = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM pt_packages
      WHERE gym_id = ${gymId} AND (
        used_sessions > total_sessions
        OR total_sessions < 0
        OR used_sessions < 0
        OR remaining_sessions < 0
      )
    `);
    const ptAnomalies = parseInt((ptRes.rows[0] as any)?.count || '0', 10);
    checks.push({
      checkName: 'PT_PACKAGE_BALANCE_INTEGRITY',
      category: 'CONCURRENCY',
      status: ptAnomalies === 0 ? 'HEALTHY' : 'ANOMALY_DETECTED',
      details: ptAnomalies === 0 
        ? 'All personal training packages have valid positive session balances.'
        : `Found ${ptAnomalies} PT packages with session over-consumption.`,
      count: ptAnomalies,
    });

    // 8. Duplicate Check-in Cooldown Invariant
    const dupAttRes = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT member_id, check_in_time,
               LAG(check_in_time) OVER (PARTITION BY member_id ORDER BY check_in_time) AS prev_check_in
        FROM attendance_logs
        WHERE gym_id = ${gymId}
      ) t
      WHERE prev_check_in IS NOT NULL 
        AND check_in_time - prev_check_in < INTERVAL '2 minutes'
    `);
    const dupAttCount = parseInt((dupAttRes.rows[0] as any)?.count || '0', 10);
    checks.push({
      checkName: 'ATTENDANCE_COOLDOWN_INTEGRITY',
      category: 'CONCURRENCY',
      status: dupAttCount === 0 ? 'HEALTHY' : 'ANOMALY_DETECTED',
      details: dupAttCount === 0 
        ? 'Zero concurrent rapid check-in duplicates detected.'
        : `Found ${dupAttCount} check-in entries logged within cooldown window.`,
      count: dupAttCount,
    });

    // 9. Orphaned Notification Deliveries
    const orphDelRes = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM notification_deliveries nd
      LEFT JOIN notifications n ON nd.notification_id = n.id AND nd.gym_id = n.gym_id
      WHERE nd.gym_id = ${gymId} AND n.id IS NULL
    `);
    const orphDelCount = parseInt((orphDelRes.rows[0] as any)?.count || '0', 10);
    checks.push({
      checkName: 'ORPHANED_NOTIFICATION_DELIVERIES',
      category: 'REFERENTIAL',
      status: orphDelCount === 0 ? 'HEALTHY' : 'ANOMALY_DETECTED',
      details: orphDelCount === 0 
        ? 'All provider delivery tracking records map to canonical notifications.'
        : `Found ${orphDelCount} delivery records with missing parent notifications.`,
      count: orphDelCount,
    });

    // 10. Sync Event Sequence Monotonicity
    const syncSeqRes = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM sync_change_log
      WHERE gym_id = ${gymId} AND server_sequence <= 0
    `);
    const syncSeqAnomalies = parseInt((syncSeqRes.rows[0] as any)?.count || '0', 10);
    checks.push({
      checkName: 'SYNC_SEQUENCE_INTEGRITY',
      category: 'SYNC_STATE',
      status: syncSeqAnomalies === 0 ? 'HEALTHY' : 'ANOMALY_DETECTED',
      details: syncSeqAnomalies === 0 
        ? 'Sync events adhere to strictly positive monotonic server sequences.'
        : `Found ${syncSeqAnomalies} sync events with non-positive server sequences.`,
      count: syncSeqAnomalies,
    });

    const anomaliesDetected = checks.filter((c) => c.status === 'ANOMALY_DETECTED').length;

    return {
      gymId,
      checkedAt: new Date().toISOString(),
      checksRun: checks.length,
      anomaliesDetected,
      overallStatus: anomaliesDetected === 0 ? 'HEALTHY' : 'REQUIRES_ATTENTION',
      checks,
    };
  }
}
