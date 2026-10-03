/**
 * GymDeck Owner Mobile - Payment & Ledger Local Bootstrap Service
 *
 * Offline-First V1: Gate 3 — Controlled Cloud Data Seed for Payments
 *
 * Strict Financial Invariant:
 * All monetary amounts are handled and stored strictly as integer minor units (paise).
 */

import NetInfo from '@react-native-community/netinfo';
import { LocalDatabaseManager } from '../LocalDatabaseManager';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { MemberRepository } from '../repositories/MemberRepository';
import { RecordPaymentInput } from '../repositories/interfaces';
import { OwnerMembersService } from '../../services/api/ownerMembersService';
import { useAuthStore } from '../../store/authStore';
import { Logger } from '../../observability';

export interface PaymentBootstrapResult {
  success: boolean;
  count: number;
  reason?: 'SUCCESS' | 'OFFLINE' | 'UNAUTHENTICATED' | 'DATABASE_UNAVAILABLE' | 'TENANT_MISMATCH' | 'ERROR';
  bootstrappedAt?: string;
  error?: string;
}

export class PaymentBootstrapService {
  private static instance: PaymentBootstrapService | null = null;
  private isBootstrapping: boolean = false;

  private constructor() {}

  public static getInstance(): PaymentBootstrapService {
    if (!PaymentBootstrapService.instance) {
      PaymentBootstrapService.instance = new PaymentBootstrapService();
    }
    return PaymentBootstrapService.instance;
  }

  public async bootstrapPayments(options?: { force?: boolean }): Promise<PaymentBootstrapResult> {
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
      Logger.info(`[PaymentBootstrapService] Hydrating payments ledger for tenant: ${tenantGymId}`);

      // Query members from local database to fetch payment ledgers
      const memberRepo = new MemberRepository(dbManager);
      const members = await memberRepo.list({ gymId: tenantGymId, limit: 100 });

      if (!members || members.length === 0) {
        return {
          success: true,
          count: 0,
          reason: 'SUCCESS',
          bootstrappedAt: new Date().toISOString(),
        };
      }

      const validatedInputs: RecordPaymentInput[] = [];

      // Query member payment records (batches of 10)
      for (let i = 0; i < members.length; i += 10) {
        const batch = members.slice(i, i + 10);
        await Promise.all(
          batch.map(async (m) => {
            try {
              const res = await OwnerMembersService.getMemberPayments(m.id, 50, 0);
              const payments = res?.payments || [];
              for (const p of payments) {
                if (!p.id) continue;
                // Amount in paise: if cloud returns string or float e.g. "500.00" or 500, multiply by 100
                const rawAmount = Number(p.amount) || 0;
                const amountMinorUnits = Math.round(rawAmount * 100);

                validatedInputs.push({
                  id: p.id,
                  gymId: tenantGymId,
                  memberId: m.id,
                  amountMinorUnits,
                  paymentMethod: p.paymentMethod || 'OTHER',
                  transactionReference: p.transactionReference || null,
                  receiptNumber: p.receiptNumber || null,
                  status: (p.status as any) || 'COMPLETED',
                  notes: p.notes || null,
                  paidAt: p.paidAt || new Date().toISOString(),
                });
              }
            } catch {
              // individual member payment fetch failed; continue with other members
            }
          })
        );
      }

      const paymentRepo = new PaymentRepository(dbManager);
      const count = await paymentRepo.upsertBatch(validatedInputs, tenantGymId);
      const now = new Date().toISOString();

      await dbManager.execute(
        `INSERT INTO sync_state (key, gym_id, value, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(key, gym_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
        ['payments_last_bootstrapped_at', tenantGymId, now, now]
      );

      return {
        success: true,
        count,
        reason: 'SUCCESS',
        bootstrappedAt: now,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      Logger.warn('[PaymentBootstrapService] Payment bootstrap failed gracefully', { error: msg });
      return { success: false, count: 0, reason: 'ERROR', error: msg };
    } finally {
      this.isBootstrapping = false;
    }
  }
}

export const paymentBootstrapService = PaymentBootstrapService.getInstance();
