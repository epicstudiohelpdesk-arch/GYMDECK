/**
 * GymDeck Owner Mobile - Data Convergence & Tenant Identity Auditor
 *
 * Collects runtime state from:
 * 1. Auth Store (user, status, gym_id)
 * 2. Secure Storage (JWT tokens, decoded claims)
 * 3. Local SQLCipher Vault (active gym_id, member counts, soft-deleted counts, domain counts)
 * 4. Sync State (lastAppliedServerSequence, outbox counts)
 * 5. Device Identity (hardware-backed device_id)
 *
 * Strictly read-only: Zero writes or modifications to production tables.
 */

import { useAuthStore } from '../store/authStore';
import { SecureTokenStorage } from '../services/storage/SecureTokenStorage';
import { LocalDatabaseManager } from '../database/LocalDatabaseManager';
import { DeviceIdentityService } from '../services/DeviceIdentityService';

function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // Buffer or atob
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export async function runMobileConvergenceAudit(): Promise<any> {
  const authState = useAuthStore.getState();
  const dbManager = LocalDatabaseManager.getInstance();

  let accessToken: string | null = null;
  let decodedJwt: any = null;
  try {
    accessToken = await SecureTokenStorage.getAccessToken();
    if (accessToken) {
      decodedJwt = decodeJwtPayload(accessToken);
    }
  } catch {}

  let deviceId: string = 'unknown';
  try {
    deviceId = await DeviceIdentityService.getDeviceId();
  } catch {}

  const isDbOpen = dbManager.isOpen();
  const activeGymId = dbManager.getActiveGymId();

  let memberCounts = { total: 0, nonDeleted: 0, deleted: 0 };
  let domainCounts = {
    plans: 0,
    attendance: 0,
    payments: 0,
    trainers: 0,
    outboxPending: 0,
    outboxAck: 0,
  };
  let syncCursor: number | null = null;
  let bootstrapMeta = {
    lastBootstrappedAt: null as string | null,
    bootstrappedCount: 0,
  };
  let sampleMembers: Array<{ id: string; code: string; name: string; status: string; isDeleted: boolean }> = [];

  if (isDbOpen) {
    try {
      const memRes = await dbManager.execute(
        `SELECT 
           COUNT(*) as total, 
           COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as non_deleted,
           COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted
         FROM gym_members;`
      );
      if (memRes.rows && memRes.rows[0]) {
        memberCounts = {
          total: Number(memRes.rows[0].total || 0),
          nonDeleted: Number(memRes.rows[0].non_deleted || 0),
          deleted: Number(memRes.rows[0].deleted || 0),
        };
      }

      const plansRes = await dbManager.execute('SELECT COUNT(*) as count FROM membership_plans;');
      domainCounts.plans = Number(plansRes.rows?.[0]?.count || 0);

      const attRes = await dbManager.execute('SELECT COUNT(*) as count FROM attendance_logs;');
      domainCounts.attendance = Number(attRes.rows?.[0]?.count || 0);

      const payRes = await dbManager.execute('SELECT COUNT(*) as count FROM payments;');
      domainCounts.payments = Number(payRes.rows?.[0]?.count || 0);

      const trRes = await dbManager.execute('SELECT COUNT(*) as count FROM trainers;');
      domainCounts.trainers = Number(trRes.rows?.[0]?.count || 0);

      const outboxRes = await dbManager.execute(
        `SELECT 
           COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
           COUNT(CASE WHEN status = 'ACKNOWLEDGED' THEN 1 END) as ack
         FROM sync_outbox;`
      );
      domainCounts.outboxPending = Number(outboxRes.rows?.[0]?.pending || 0);
      domainCounts.outboxAck = Number(outboxRes.rows?.[0]?.ack || 0);

      bootstrapMeta = {
        lastBootstrappedAt: null as string | null,
        bootstrappedCount: 0,
      };
      try {
        const bootAtRes = await dbManager.execute(
          "SELECT value FROM sync_state WHERE key = 'members_last_bootstrapped_at' LIMIT 1;"
        );
        if (bootAtRes.rows?.[0]?.value) {
          bootstrapMeta.lastBootstrappedAt = String(bootAtRes.rows[0].value);
        }
        const bootCountRes = await dbManager.execute(
          "SELECT value FROM sync_state WHERE key = 'members_bootstrapped_count' LIMIT 1;"
        );
        if (bootCountRes.rows?.[0]?.value) {
          bootstrapMeta.bootstrappedCount = Number(bootCountRes.rows[0].value);
        }
      } catch {}

      try {
        const cursorRes = await dbManager.execute(
          "SELECT value FROM sync_state WHERE key = 'last_applied_server_sequence' LIMIT 1;"
        );
        if (cursorRes.rows && cursorRes.rows.length > 0 && cursorRes.rows[0].value) {
          syncCursor = Number(cursorRes.rows[0].value);
        } else {
          const maxSeqRes = await dbManager.execute(
            'SELECT COALESCE(MAX(server_sequence), 0) as max_seq FROM sync_inbox;'
          );
          syncCursor = Number(maxSeqRes.rows?.[0]?.max_seq || 0);
        }
      } catch {
        syncCursor = 0;
      }

      const samplesRes = await dbManager.execute(
        `SELECT id, member_code, full_name, membership_status, (deleted_at IS NOT NULL) as is_del 
         FROM gym_members 
         ORDER BY created_at DESC 
         LIMIT 100;`
      );
      sampleMembers = (samplesRes.rows || []).map((r: any) => ({
        id: String(r.id),
        code: String(r.member_code),
        name: String(r.full_name),
        status: String(r.membership_status),
        isDeleted: Boolean(r.is_del),
      }));
    } catch (err: any) {
      console.warn('[Audit] Failed to query local database:', err?.message);
    }
  }

  const auditReport = {
    type: 'MOBILE_CONVERGENCE_AUDIT',
    timestamp: new Date().toISOString(),
    auth: {
      status: authState.status,
      isAuthenticated: authState.isAuthenticated,
      user: authState.user ? {
        id: authState.user.id,
        email: authState.user.email,
        fullName: authState.user.fullName,
        gymId: authState.user.gymId,
        gymName: authState.user.gymName,
        role: authState.user.role,
      } : null,
    },
    jwt: {
      hasToken: !!accessToken,
      gymId: decodedJwt?.gymId || null,
      sub: decodedJwt?.sub || null,
      email: decodedJwt?.email || null,
      role: decodedJwt?.role || null,
    },
    vault: {
      isOpen: isDbOpen,
      activeGymId: activeGymId,
      memberCounts,
      domainCounts,
      syncCursor,
      bootstrapMeta,
      sampleMemberCount: sampleMembers.length,
      sampleMembers,
    },
    device: {
      deviceId,
    },
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1000);
    await fetch('http://127.0.0.1:8089/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditReport),
      signal: controller.signal,
    }).catch(() => {});
    clearTimeout(timer);
  } catch {
    // Ignore diagnostic receiver failures
  }

  return auditReport;
}

