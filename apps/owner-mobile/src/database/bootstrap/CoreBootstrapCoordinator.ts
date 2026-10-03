/**
 * GymDeck Owner Mobile - Core Bootstrap Coordinator
 *
 * Offline-First V1: Gate 3 — Multi-Domain Local-First Data Seed
 *
 * Coordinates non-destructive, authenticated cloud data hydration for:
 * 1. Members
 * 2. Membership Plans
 * 3. Member Memberships / Subscriptions
 * 4. Trainers
 * 5. Attendance records
 * 6. Payments / Financial ledger
 * 7. PT Packages & Sessions
 *
 * Safety guarantees:
 * - Runs in parallel using allSettled to ensure failure in one domain does not abort others
 * - Non-destructive upserts only
 * - Zero mutations of offline state when offline
 */

import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../../store/authStore';
import { Logger } from '../../observability';
import { MemberBootstrapService } from './MemberBootstrapService';
import { PlanBootstrapService } from './PlanBootstrapService';
import { TrainerBootstrapService } from './TrainerBootstrapService';
import { AttendanceBootstrapService } from './AttendanceBootstrapService';
import { PaymentBootstrapService } from './PaymentBootstrapService';
import { PTPackageBootstrapService } from './PTPackageBootstrapService';
import { LocalDatabaseManager } from '../LocalDatabaseManager';

export interface CoreBootstrapSummary {
  success: boolean;
  isOffline: boolean;
  results: {
    members?: { success: boolean; count: number; error?: string };
    plans?: { success: boolean; count: number; error?: string };
    trainers?: { success: boolean; count: number; error?: string };
    attendance?: { success: boolean; count: number; error?: string };
    payments?: { success: boolean; count: number; error?: string };
    ptPackages?: { success: boolean; count: number; error?: string };
  };
  durationMs: number;
}

export class CoreBootstrapCoordinator {
  private static instance: CoreBootstrapCoordinator | null = null;
  private isRunning: boolean = false;

  private constructor() {}

  public static getInstance(): CoreBootstrapCoordinator {
    if (!CoreBootstrapCoordinator.instance) {
      CoreBootstrapCoordinator.instance = new CoreBootstrapCoordinator();
    }
    return CoreBootstrapCoordinator.instance;
  }

  public async bootstrapAll(options?: { force?: boolean }): Promise<CoreBootstrapSummary> {
    const startTime = Date.now();

    if (this.isRunning) {
      return {
        success: false,
        isOffline: false,
        results: {},
        durationMs: 0,
      };
    }

    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      return {
        success: false,
        isOffline: true,
        results: {},
        durationMs: 0,
      };
    }

    const authUser = useAuthStore.getState().user;
    if (!authUser?.gymId) {
      return {
        success: false,
        isOffline: false,
        results: {},
        durationMs: 0,
      };
    }

    this.isRunning = true;
    Logger.info(`[CoreBootstrapCoordinator] Initiating full core bootstrap for gym: ${authUser.gymId}`);

    const dbManager = LocalDatabaseManager.getInstance();
    if (!dbManager.isOpen() || dbManager.getActiveGymId() !== authUser.gymId) {
      try {
        await dbManager.initialize(authUser.gymId);
      } catch (dbErr: any) {
        Logger.warn('[CoreBootstrapCoordinator] Database init failed before bootstrap', { error: dbErr?.message });
      }
    }

    try {
      // Phase 1: Core foundational entities (Members, Plans, Trainers)
      const [mRes, plRes, trRes] = await Promise.allSettled([
        MemberBootstrapService.getInstance().bootstrapMembers(options),
        PlanBootstrapService.getInstance().bootstrapPlans(options),
        TrainerBootstrapService.getInstance().bootstrapTrainers(options),
      ]);

      // Phase 2: Relational dependent entities (Attendance, Payments, PT Packages)
      // These rely on local members and plans existing for foreign keys & batch queries
      const [atRes, payRes, ptRes] = await Promise.allSettled([
        AttendanceBootstrapService.getInstance().bootstrapAttendance(options),
        PaymentBootstrapService.getInstance().bootstrapPayments(options),
        PTPackageBootstrapService.getInstance().bootstrapPTPackages(options),
      ]);

      const summary: CoreBootstrapSummary = {
        success: true,
        isOffline: false,
        results: {
          members: mRes.status === 'fulfilled' ? { success: mRes.value.success, count: mRes.value.count, error: mRes.value.error } : { success: false, count: 0, error: String(mRes.reason) },
          plans: plRes.status === 'fulfilled' ? { success: plRes.value.success, count: plRes.value.count, error: plRes.value.error } : { success: false, count: 0, error: String(plRes.reason) },
          trainers: trRes.status === 'fulfilled' ? { success: trRes.value.success, count: trRes.value.count, error: trRes.value.error } : { success: false, count: 0, error: String(trRes.reason) },
          attendance: atRes.status === 'fulfilled' ? { success: atRes.value.success, count: atRes.value.count, error: atRes.value.error } : { success: false, count: 0, error: String(atRes.reason) },
          payments: payRes.status === 'fulfilled' ? { success: payRes.value.success, count: payRes.value.count, error: payRes.value.error } : { success: false, count: 0, error: String(payRes.reason) },
          ptPackages: ptRes.status === 'fulfilled' ? { success: ptRes.value.success, count: ptRes.value.packageCount, error: ptRes.value.error } : { success: false, count: 0, error: String(ptRes.reason) },
        },
        durationMs: Date.now() - startTime,
      };

      Logger.info(`[CoreBootstrapCoordinator] Full core bootstrap completed in ${summary.durationMs}ms`);
      return summary;
    } catch (err: any) {
      Logger.error('[CoreBootstrapCoordinator] Unexpected error during core bootstrap', { error: err?.message });
      return {
        success: false,
        isOffline: false,
        results: {},
        durationMs: Date.now() - startTime,
      };
    } finally {
      this.isRunning = false;
    }
  }
}

export const coreBootstrapCoordinator = CoreBootstrapCoordinator.getInstance();
