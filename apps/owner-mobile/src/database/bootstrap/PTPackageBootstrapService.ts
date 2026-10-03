/**
 * GymDeck Owner Mobile - Personal Training Package & Session Local Bootstrap Service
 *
 * Offline-First V1: Gate 3 — Controlled Cloud Data Seed for PT
 */

import NetInfo from '@react-native-community/netinfo';
import { LocalDatabaseManager } from '../LocalDatabaseManager';
import { PTPackageRepository } from '../repositories/PTPackageRepository';
import { MemberRepository } from '../repositories/MemberRepository';
import { CreatePTPackageInput } from '../repositories/interfaces';
import { OwnerTrainersService } from '../../services/api/ownerTrainersService';
import { useAuthStore } from '../../store/authStore';
import { Logger } from '../../observability';

export interface PTBootstrapResult {
  success: boolean;
  packageCount: number;
  reason?: 'SUCCESS' | 'OFFLINE' | 'UNAUTHENTICATED' | 'DATABASE_UNAVAILABLE' | 'TENANT_MISMATCH' | 'ERROR';
  bootstrappedAt?: string;
  error?: string;
}

export class PTPackageBootstrapService {
  private static instance: PTPackageBootstrapService | null = null;
  private isBootstrapping: boolean = false;

  private constructor() {}

  public static getInstance(): PTPackageBootstrapService {
    if (!PTPackageBootstrapService.instance) {
      PTPackageBootstrapService.instance = new PTPackageBootstrapService();
    }
    return PTPackageBootstrapService.instance;
  }

  public async bootstrapPTPackages(options?: { force?: boolean }): Promise<PTBootstrapResult> {
    if (this.isBootstrapping) {
      return { success: false, packageCount: 0, reason: 'SUCCESS' };
    }

    const authUser = useAuthStore.getState().user;
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (!isAuthenticated || !authUser?.gymId) {
      return { success: false, packageCount: 0, reason: 'UNAUTHENTICATED' };
    }

    const tenantGymId = authUser.gymId;
    const dbManager = LocalDatabaseManager.getInstance();
    if (!dbManager.isOpen() || dbManager.getActiveGymId() !== tenantGymId) {
      try {
        await dbManager.initialize(tenantGymId);
      } catch (err: any) {
        return { success: false, packageCount: 0, reason: 'DATABASE_UNAVAILABLE', error: err?.message };
      }
    }

    if (dbManager.getActiveGymId() !== tenantGymId) {
      return { success: false, packageCount: 0, reason: 'TENANT_MISMATCH' };
    }

    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        return { success: false, packageCount: 0, reason: 'OFFLINE' };
      }
    } catch {
      // ignore
    }

    this.isBootstrapping = true;

    try {
      Logger.info(`[PTPackageBootstrapService] Hydrating PT packages for tenant: ${tenantGymId}`);

      const memberRepo = new MemberRepository(dbManager);
      const members = await memberRepo.list({ gymId: tenantGymId, limit: 50 });

      if (!members || members.length === 0) {
        return {
          success: true,
          packageCount: 0,
          reason: 'SUCCESS',
          bootstrappedAt: new Date().toISOString(),
        };
      }

      const validatedPackages: CreatePTPackageInput[] = [];

      for (const m of members) {
        try {
          const packages = await OwnerTrainersService.getMemberPTPackages(m.id);
          for (const pkg of (packages || [])) {
            if (!pkg.id) continue;
            const priceMinorUnits = Math.round((Number(pkg.price) || 0) * 100);

            validatedPackages.push({
              id: pkg.id,
              gymId: tenantGymId,
              memberId: m.id,
              trainerId: (pkg as any).trainerId || 'trainer_unknown',
              packageName: pkg.packageName || 'Personal Training',
              totalSessions: Number(pkg.totalSessions) || 10,
              usedSessions: Number(pkg.usedSessions) || 0,
              remainingSessions: Number(pkg.remainingSessions) || 10,
              priceMinorUnits,
              expiryDate: (pkg as any).expiryDate || new Date(Date.now() + 90 * 86400000).toISOString(),
              status: pkg.status || 'ACTIVE',
            });
          }
        } catch {
          // ignore individual member error
        }
      }

      const ptRepo = new PTPackageRepository(dbManager);
      const packageCount = await ptRepo.upsertPackageBatch(validatedPackages, tenantGymId);
      const now = new Date().toISOString();

      await dbManager.execute(
        `INSERT INTO sync_state (key, gym_id, value, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(key, gym_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
        ['pt_packages_last_bootstrapped_at', tenantGymId, now, now]
      );

      return {
        success: true,
        packageCount,
        reason: 'SUCCESS',
        bootstrappedAt: now,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      Logger.warn('[PTPackageBootstrapService] PT bootstrap failed gracefully', { error: msg });
      return { success: false, packageCount: 0, reason: 'ERROR', error: msg };
    } finally {
      this.isBootstrapping = false;
    }
  }
}

export const ptPackageBootstrapService = PTPackageBootstrapService.getInstance();
