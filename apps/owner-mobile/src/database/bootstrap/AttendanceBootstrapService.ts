/**
 * GymDeck Owner Mobile - Attendance Local Bootstrap Service
 *
 * Offline-First V1: Gate 3 — Controlled Cloud Data Seed for Attendance
 */

import NetInfo from '@react-native-community/netinfo';
import { LocalDatabaseManager } from '../LocalDatabaseManager';
import { AttendanceRepository } from '../repositories/AttendanceRepository';
import { RecordCheckInInput } from '../repositories/interfaces';
import { OwnerAttendanceService } from '../../services/api/ownerAttendanceService';
import { useAuthStore } from '../../store/authStore';
import { Logger } from '../../observability';

export interface AttendanceBootstrapResult {
  success: boolean;
  count: number;
  reason?: 'SUCCESS' | 'OFFLINE' | 'UNAUTHENTICATED' | 'DATABASE_UNAVAILABLE' | 'TENANT_MISMATCH' | 'ERROR';
  bootstrappedAt?: string;
  error?: string;
}

export class AttendanceBootstrapService {
  private static instance: AttendanceBootstrapService | null = null;
  private isBootstrapping: boolean = false;

  private constructor() {}

  public static getInstance(): AttendanceBootstrapService {
    if (!AttendanceBootstrapService.instance) {
      AttendanceBootstrapService.instance = new AttendanceBootstrapService();
    }
    return AttendanceBootstrapService.instance;
  }

  public async bootstrapAttendance(options?: { force?: boolean }): Promise<AttendanceBootstrapResult> {
    if (this.isBootstrapping) {
      return { success: false, count: 0, reason: 'SUCCESS' };
    }

    const authUser = useAuthStore.getState().user;
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (!isAuthenticated || !authUser?.gymId) {
      return { success: false, count: 0, reason: 'UNAUTHENTICATED' };
    }

    const tenantGymId = authUser.gymId;
    const dbManager = LocalDatabaseManager.getInstance();
    if (!dbManager.isOpen() || dbManager.getActiveGymId() !== tenantGymId) {
      try {
        await dbManager.initialize(tenantGymId);
      } catch (err: any) {
        return { success: false, count: 0, reason: 'DATABASE_UNAVAILABLE', error: err?.message };
      }
    }

    if (dbManager.getActiveGymId() !== tenantGymId) {
      return { success: false, count: 0, reason: 'TENANT_MISMATCH' };
    }

    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        return { success: false, count: 0, reason: 'OFFLINE' };
      }
    } catch {
      // ignore
    }

    this.isBootstrapping = true;

    try {
      Logger.info(`[AttendanceBootstrapService] Hydrating daily attendance for tenant: ${tenantGymId}`);
      const res = await OwnerAttendanceService.getDailyAttendance(undefined, 100, 0);
      const rawLogs = res?.items || [];

      if (!rawLogs || rawLogs.length === 0) {
        return {
          success: true,
          count: 0,
          reason: 'SUCCESS',
          bootstrappedAt: new Date().toISOString(),
        };
      }

      const validatedInputs: RecordCheckInInput[] = [];
      for (const log of rawLogs) {
        if (!log.id || !log.memberId) continue;

        validatedInputs.push({
          id: log.id,
          gymId: tenantGymId,
          memberId: log.memberId,
          checkInTime: log.checkInTime || new Date().toISOString(),
          checkOutTime: log.checkOutTime || null,
          entryMethod: log.entryMethod || 'MANUAL',
          deviceMetadata: log.deviceMetadata || null,
          notes: log.notes || null,
          recordedByUserId: log.recordedByUserId || null,
        });
      }

      const attendanceRepo = new AttendanceRepository(dbManager);
      const count = await attendanceRepo.upsertBatch(validatedInputs, tenantGymId);
      const now = new Date().toISOString();

      await dbManager.execute(
        `INSERT INTO sync_state (key, gym_id, value, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(key, gym_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
        ['attendance_last_bootstrapped_at', tenantGymId, now, now]
      );

      return {
        success: true,
        count,
        reason: 'SUCCESS',
        bootstrappedAt: now,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      Logger.warn('[AttendanceBootstrapService] Attendance bootstrap failed gracefully', { error: msg });
      return { success: false, count: 0, reason: 'ERROR', error: msg };
    } finally {
      this.isBootstrapping = false;
    }
  }
}

export const attendanceBootstrapService = AttendanceBootstrapService.getInstance();
