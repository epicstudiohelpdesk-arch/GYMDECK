/**
 * GymDeck Owner Mobile - Trainer Local Bootstrap Service
 *
 * Offline-First V1: Gate 3 — Controlled Cloud Data Seed for Trainers
 */

import NetInfo from '@react-native-community/netinfo';
import { LocalDatabaseManager } from '../LocalDatabaseManager';
import { TrainerRepository } from '../repositories/TrainerRepository';
import { CreateTrainerInput } from '../repositories/interfaces';
import { OwnerTrainersService } from '../../services/api/ownerTrainersService';
import { useAuthStore } from '../../store/authStore';
import { Logger } from '../../observability';

export interface TrainerBootstrapResult {
  success: boolean;
  count: number;
  reason?: 'SUCCESS' | 'OFFLINE' | 'UNAUTHENTICATED' | 'DATABASE_UNAVAILABLE' | 'TENANT_MISMATCH' | 'ERROR';
  bootstrappedAt?: string;
  error?: string;
}

export class TrainerBootstrapService {
  private static instance: TrainerBootstrapService | null = null;
  private isBootstrapping: boolean = false;

  private constructor() {}

  public static getInstance(): TrainerBootstrapService {
    if (!TrainerBootstrapService.instance) {
      TrainerBootstrapService.instance = new TrainerBootstrapService();
    }
    return TrainerBootstrapService.instance;
  }

  public async bootstrapTrainers(options?: { force?: boolean }): Promise<TrainerBootstrapResult> {
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
      Logger.info(`[TrainerBootstrapService] Hydrating trainers for tenant: ${tenantGymId}`);
      const rawTrainers = await OwnerTrainersService.getTrainers(true);

      if (!rawTrainers || rawTrainers.length === 0) {
        return {
          success: true,
          count: 0,
          reason: 'SUCCESS',
          bootstrappedAt: new Date().toISOString(),
        };
      }

      const validatedInputs: CreateTrainerInput[] = [];
      for (const t of rawTrainers) {
        if (!t.id || !t.fullName) continue;

        validatedInputs.push({
          id: t.id,
          gymId: tenantGymId,
          fullName: t.fullName.trim(),
          phone: t.phone || '',
          email: t.email || null,
          specialization: t.specialization || null,
          experienceYears: t.experienceYears ?? null,
          bio: t.bio || null,
          isActive: t.isActive !== false,
        });
      }

      const trainerRepo = new TrainerRepository(dbManager);
      const count = await trainerRepo.upsertBatch(validatedInputs, tenantGymId);
      const now = new Date().toISOString();

      await dbManager.execute(
        `INSERT INTO sync_state (key, gym_id, value, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(key, gym_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
        ['trainers_last_bootstrapped_at', tenantGymId, now, now]
      );

      return {
        success: true,
        count,
        reason: 'SUCCESS',
        bootstrappedAt: now,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      Logger.warn('[TrainerBootstrapService] Trainer bootstrap failed gracefully', { error: msg });
      return { success: false, count: 0, reason: 'ERROR', error: msg };
    } finally {
      this.isBootstrapping = false;
    }
  }
}

export const trainerBootstrapService = TrainerBootstrapService.getInstance();
