/**
 * GymDeck Owner Mobile - Local-First Financial Transactions & Revenue Query Hook
 *
 * Offline-First V1: Gate 3 — Payments Domain Local-First Reads
 *
 * Operational Model:
 * 1. Reads authoritative transaction ledger directly from local SQLCipher database via PaymentRepository.
 * 2. Operates 100% offline with zero network calls.
 * 3. Joins member details locally in SQLite; eliminates legacy N+1 member payment HTTP requests.
 * 4. In the background when online, performs non-destructive hydration via PaymentBootstrapService.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { LocalDatabaseManager } from '../database/LocalDatabaseManager';
import { PaymentRepository } from '../database/repositories/PaymentRepository';
import { PaymentBootstrapService } from '../database/bootstrap/PaymentBootstrapService';
import { useAuthStore } from '../store/authStore';
import { TransactionRowItem } from '../components/TransactionRow';

export interface UseLocalTransactionsParams {
  period?: 'today' | 'this_week' | 'this_month';
  status?: 'ALL' | 'COMPLETED' | 'REFUNDED';
  limit?: number;
  offset?: number;
}

export interface UseLocalTransactionsResult {
  transactions: TransactionRowItem[];
  revenueMinorUnits: number;
  revenueAmount: number;
  isLoading: boolean;
  isRefetching: boolean;
  isOffline: boolean;
  isBootstrapping: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useLocalTransactions(params?: UseLocalTransactionsParams): UseLocalTransactionsResult {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const gymId = user?.gymId;

  const [isOffline, setIsOffline] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    NetInfo.fetch().then((state) => {
      setIsOffline(!state.isConnected);
    });
    return () => unsub();
  }, []);

  const period = params?.period || 'today';
  const status = params?.status || 'ALL';

  const {
    data: transactionData,
    isLoading: isLoadingTxns,
    isRefetching: isRefetchingTxns,
    refetch: queryRefetchTxns,
    error,
  } = useQuery({
    queryKey: ['local-transactions', gymId, period, status, params?.limit, params?.offset],
    queryFn: async () => {
      if (!gymId) {
        return { transactions: [], revenueMinorUnits: 0, revenueAmount: 0 };
      }

      const dbManager = LocalDatabaseManager.getInstance();
      if (!dbManager.isOpen()) {
        await dbManager.initialize(gymId);
      }

      const repo = new PaymentRepository(dbManager);
      const rows = await repo.listTransactions({
        gymId,
        period,
        status,
        limit: params?.limit || 100,
        offset: params?.offset || 0,
      });

      // Calculate start date for revenue
      let startDate: string | undefined;
      const now = new Date();
      if (period === 'today') {
        startDate = `${now.toISOString().slice(0, 10)}T00:00:00`;
      } else if (period === 'this_week') {
        const d = new Date(now);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        startDate = `${d.toISOString().slice(0, 10)}T00:00:00`;
      } else if (period === 'this_month') {
        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00`;
      }

      const revenueMinor = await repo.calculateTotalRevenueMinorUnits(startDate, undefined, gymId);

      const items: TransactionRowItem[] = rows.map((r) => ({
        id: r.id,
        memberId: r.memberId,
        memberName: r.memberName,
        memberCode: r.memberCode,
        amount: r.amount,
        paymentMethod: r.paymentMethod,
        type: r.type,
        status: r.status,
        paidAt: r.paidAt,
        receiptNumber: r.receiptNumber,
        transactionReference: r.transactionReference,
        notes: r.notes,
      }));

      return {
        transactions: items,
        revenueMinorUnits: revenueMinor,
        revenueAmount: revenueMinor / 100,
      };
    },
    staleTime: 5000,
    enabled: Boolean(gymId),
  });

  const runBackgroundBootstrap = useCallback(
    async (force: boolean = false) => {
      if (!gymId || isOffline) return;

      setIsBootstrapping(true);
      try {
        const result = await PaymentBootstrapService.getInstance().bootstrapPayments({ force });
        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ['local-transactions', gymId] });
        }
      } catch {
        // Safe fail: local queries continue uninterrupted
      } finally {
        setIsBootstrapping(false);
      }
    },
    [gymId, isOffline, queryClient]
  );

  useEffect(() => {
    if (gymId && !isOffline) {
      runBackgroundBootstrap(false);
    }
  }, [gymId, isOffline, runBackgroundBootstrap]);

  const handleRefetch = async () => {
    await queryRefetchTxns();
    if (!isOffline) {
      await runBackgroundBootstrap(true);
    }
  };

  return {
    transactions: transactionData?.transactions || [],
    revenueMinorUnits: transactionData?.revenueMinorUnits || 0,
    revenueAmount: transactionData?.revenueAmount || 0,
    isLoading: isLoadingTxns,
    isRefetching: isRefetchingTxns,
    isOffline,
    isBootstrapping,
    error: error instanceof Error ? error : null,
    refetch: handleRefetch,
  };
}
