/**
 * GymDeck Owner Mobile - Member Local Bootstrap Service
 *
 * Offline-First V1: Gate 2 — Controlled Cloud Data Seed
 *
 * Responsibilities:
 * - Populates the local encrypted SQLite database from authenticated cloud data
 * - Enforces authenticated tenant verification (no arbitrary client-supplied gym_id)
 * - Validates schema and integrity of inbound cloud records
 * - Upserts records cleanly into SQLCipher via MemberRepository
 * - Records durable bootstrap status and timestamps in sync_state
 * - SAFETY GUARANTEES:
 *   - Never wipes local database
 *   - Never overwrites another tenant's vault
 *   - Fails safely on network failure without altering existing local state
 */

import NetInfo from '@react-native-community/netinfo';
import { LocalDatabaseManager } from '../LocalDatabaseManager';
import { MemberRepository } from '../repositories/MemberRepository';
import { CreateGymMemberInput } from '../repositories/interfaces';
import { OwnerMembersService } from '../../services/api/ownerMembersService';
import { useAuthStore } from '../../store/authStore';
import { GymMemberSummary } from '../../types';
import { Logger } from '../../observability';

export interface MemberBootstrapResult {
  success: boolean;
  count: number;
  reason?: 'SUCCESS' | 'OFFLINE' | 'UNAUTHENTICATED' | 'DATABASE_UNAVAILABLE' | 'TENANT_MISMATCH' | 'ERROR';
  bootstrappedAt?: string;
  error?: string;
}

export class MemberBootstrapService {
  private static instance: MemberBootstrapService | null = null;
  private isBootstrapping: boolean = false;

  private constructor() {}

  public static getInstance(): MemberBootstrapService {
    if (!MemberBootstrapService.instance) {
      MemberBootstrapService.instance = new MemberBootstrapService();
    }
    return MemberBootstrapService.instance;
  }

  /**
   * Retrieves the last successful bootstrap timestamp from local sync_state.
   */
  public async getLastBootstrappedAt(gymId: string): Promise<string | null> {
    const dbManager = LocalDatabaseManager.getInstance();
    if (!dbManager.isOpen()) return null;

    try {
      const res = await dbManager.execute(
        "SELECT value FROM sync_state WHERE key = 'members_last_bootstrapped_at' AND gym_id = ? LIMIT 1;",
        [gymId]
      );
      return (res.rows?.[0]?.value as string) || null;
    } catch {
      return null;
    }
  }

  /**
   * Performs controlled bootstrap from authenticated cloud API into local SQLCipher database.
   */
  public async bootstrapMembers(options?: { force?: boolean }): Promise<MemberBootstrapResult> {
    if (this.isBootstrapping) {
      return { success: false, count: 0, reason: 'SUCCESS' };
    }

    // 1. Validate Authenticated Context
    const authUser = useAuthStore.getState().user;
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (!isAuthenticated || !authUser?.gymId) {
      Logger.warn('[MemberBootstrapService] Cannot bootstrap: User not authenticated');
      return { success: false, count: 0, reason: 'UNAUTHENTICATED' };
    }

    const tenantGymId = authUser.gymId;

    // 2. Ensure Local Encrypted Database is Ready
    const dbManager = LocalDatabaseManager.getInstance();
    if (!dbManager.isOpen() || dbManager.getActiveGymId() !== tenantGymId) {
      try {
        await dbManager.initialize(tenantGymId);
      } catch (err: any) {
        Logger.warn('[MemberBootstrapService] Database initialization failed', { error: err?.message });
        return { success: false, count: 0, reason: 'DATABASE_UNAVAILABLE', error: err?.message };
      }
    }

    const activeGymId = dbManager.getActiveGymId();
    if (activeGymId !== tenantGymId) {
      Logger.warn('[MemberBootstrapService] Tenant mismatch detected between auth and vault', {
        authGymId: tenantGymId,
        vaultGymId: activeGymId,
      });
      return { success: false, count: 0, reason: 'TENANT_MISMATCH' };
    }

    // 3. Verify Network State
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        Logger.info('[MemberBootstrapService] Skipping bootstrap: Device is offline');
        return { success: false, count: 0, reason: 'OFFLINE' };
      }
    } catch {
      // NetInfo fetch failed; attempt bootstrap anyway if network responds
    }

    this.isBootstrapping = true;

    try {
      Logger.info(`[MemberBootstrapService] Fetching member directory for tenant: ${tenantGymId}`);
      // Query members using paginated loop (limit <= 100 strictly enforced by cloud gateway schema)
      const PAGE_SIZE = 100;
      let offset = 0;
      const rawMembers: GymMemberSummary[] = [];

      while (true) {
        const cloudData = await OwnerMembersService.getMembers(undefined, 'ALL', PAGE_SIZE, offset);
        const pageMembers: GymMemberSummary[] = cloudData?.members || [];
        rawMembers.push(...pageMembers);

        const totalInCloud = cloudData?.total ?? rawMembers.length;
        if (pageMembers.length < PAGE_SIZE || rawMembers.length >= totalInCloud) {
          break;
        }
        offset += PAGE_SIZE;
      }

      if (rawMembers.length === 0) {
        Logger.info('[MemberBootstrapService] Cloud returned 0 members to bootstrap');
        await this.recordBootstrapMetadata(tenantGymId, 0);
        return {
          success: true,
          count: 0,
          reason: 'SUCCESS',
          bootstrappedAt: new Date().toISOString(),
        };
      }

      // 4. Validate and Sanitize Records
      const validatedInputs: CreateGymMemberInput[] = [];
      for (const m of rawMembers) {
        if (!m.id || !m.fullName || !m.phone) {
          Logger.warn('[MemberBootstrapService] Skipping malformed cloud member record', { id: m?.id });
          continue;
        }

        validatedInputs.push({
          id: m.id,
          gymId: tenantGymId, // Strictly bound to active tenant
          memberCode: m.memberCode || `MEM-${m.id.slice(0, 4)}`,
          fullName: m.fullName.trim(),
          phone: m.phone.trim(),
          alternatePhone: m.alternatePhone || null,
          email: m.email || null,
          gender: m.gender || null,
          dob: m.dob || null,
          address: m.address || null,
          membershipStatus: m.membershipStatus || 'ACTIVE',
          joinedAt: m.joinedAt || m.createdAt || new Date().toISOString(),
          expiresAt: m.expiresAt || null,
          notes: m.notes || null,
        });
      }

      // 5. Atomic Upsert into Local SQLCipher
      const memberRepo = new MemberRepository(dbManager);
      const upsertedCount = await memberRepo.upsertBatch(validatedInputs);

      // 6. Record Durable Sync Metadata in sync_state
      const now = new Date().toISOString();
      await this.recordBootstrapMetadata(tenantGymId, upsertedCount, now);

      Logger.info(
        `[MemberBootstrapService] Successfully bootstrapped ${upsertedCount} member(s) into local encrypted vault`
      );

      return {
        success: true,
        count: upsertedCount,
        reason: 'SUCCESS',
        bootstrappedAt: now,
      };
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      Logger.warn('[MemberBootstrapService] Cloud member bootstrap failed gracefully', { error: errorMsg });
      return {
        success: false,
        count: 0,
        reason: 'ERROR',
        error: errorMsg,
      };
    } finally {
      this.isBootstrapping = false;
    }
  }

  /**
   * Persists bootstrap tracking keys into local sync_state table.
   */
  private async recordBootstrapMetadata(gymId: string, count: number, timestamp?: string): Promise<void> {
    const dbManager = LocalDatabaseManager.getInstance();
    const now = timestamp || new Date().toISOString();

    try {
      await dbManager.execute(
        `INSERT INTO sync_state (key, gym_id, value, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(key, gym_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
        ['members_last_bootstrapped_at', gymId, now, now]
      );

      await dbManager.execute(
        `INSERT INTO sync_state (key, gym_id, value, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(key, gym_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
        ['members_bootstrapped_count', gymId, String(count), now]
      );
    } catch (err: any) {
      Logger.warn('[MemberBootstrapService] Failed to record bootstrap sync_state', { error: err?.message });
    }
  }
}

export const memberBootstrapService = MemberBootstrapService.getInstance();
