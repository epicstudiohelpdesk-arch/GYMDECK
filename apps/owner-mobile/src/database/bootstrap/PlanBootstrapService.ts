/**
 * GymDeck Owner Mobile - Membership Plan Local Bootstrap Service
 *
 * Offline-First V1: Gate 3 — Controlled Cloud Data Seed for Plans
 *
 * Strict Financial Invariant:
 * Prices are converted to integer minor units (paise: price * 100).
 */

import NetInfo from '@react-native-community/netinfo';
import { LocalDatabaseManager } from '../LocalDatabaseManager';
import { MembershipPlanRepository } from '../repositories/MembershipPlanRepository';
import { CreateMembershipPlanInput } from '../repositories/interfaces';
import { OwnerBillingService } from '../../services/api/ownerBillingService';
import { useAuthStore } from '../../store/authStore';
import { MembershipPlanSummary } from '../../types';
import { Logger } from '../../observability';

export interface PlanBootstrapResult {
  success: boolean;
  count: number;
  reason?: 'SUCCESS' | 'OFFLINE' | 'UNAUTHENTICATED' | 'DATABASE_UNAVAILABLE' | 'TENANT_MISMATCH' | 'ERROR';
  bootstrappedAt?: string;
  error?: string;
}

export class PlanBootstrapService {
  private static instance: PlanBootstrapService | null = null;
  private isBootstrapping: boolean = false;

  private constructor() {}

  public static getInstance(): PlanBootstrapService {
    if (!PlanBootstrapService.instance) {
      PlanBootstrapService.instance = new PlanBootstrapService();
    }
    return PlanBootstrapService.instance;
  }

  public async bootstrapPlans(options?: { force?: boolean }): Promise<PlanBootstrapResult> {
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
      Logger.info(`[PlanBootstrapService] Hydrating plans for tenant: ${tenantGymId}`);
      const rawPlans = await OwnerBillingService.getPlans(true);

      if (!rawPlans || rawPlans.length === 0) {
        return {
          success: true,
          count: 0,
          reason: 'SUCCESS',
          bootstrappedAt: new Date().toISOString(),
        };
      }

      const validatedInputs: CreateMembershipPlanInput[] = [];
      for (const p of rawPlans) {
        if (!p.id || !p.planName) continue;
        const priceMinorUnits = Math.round(Number(p.price || 0) * 100);

        validatedInputs.push({
          id: p.id,
          gymId: tenantGymId,
          planName: p.planName.trim(),
          durationDays: Number(p.durationDays) || 30,
          priceMinorUnits,
          description: p.description || null,
          benefits: p.benefits || null,
          isActive: p.isActive !== false,
        });
      }

      const planRepo = new MembershipPlanRepository(dbManager);
      const count = await planRepo.upsertBatch(validatedInputs, tenantGymId);
      const now = new Date().toISOString();

      await dbManager.execute(
        `INSERT INTO sync_state (key, gym_id, value, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(key, gym_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
        ['plans_last_bootstrapped_at', tenantGymId, now, now]
      );

      return {
        success: true,
        count,
        reason: 'SUCCESS',
        bootstrappedAt: now,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      Logger.warn('[PlanBootstrapService] Plan bootstrap failed gracefully', { error: msg });
      return { success: false, count: 0, reason: 'ERROR', error: msg };
    } finally {
      this.isBootstrapping = false;
    }
  }
}

export const planBootstrapService = PlanBootstrapService.getInstance();
