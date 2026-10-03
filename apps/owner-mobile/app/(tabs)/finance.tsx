/**
 * GymDeck Owner Mobile - High-Speed Financial Operations Workspace
 *
 * Phase 08 — Finance & Billing Redesign
 * Principles: SEE -> UNDERSTAND -> COLLECT -> VERIFY
 * Real transactional ledger metrics, pending dues, fast collections, and digital receipts.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../src/theme';
import { OwnerBillingService } from '../../src/services/api/ownerBillingService';
import { OwnerAnalyticsService } from '../../src/services/api/ownerAnalyticsService';
import { OwnerMembersService } from '../../src/services/api/ownerMembersService';
import { useLocalTransactions } from '../../src/hooks/useLocalTransactions';
import { useLocalMembers } from '../../src/hooks/useLocalMembers';
import { OfflineBanner } from '../../src/components/ui/ConnectivityBanner';
import { useAuthStore } from '../../src/store/authStore';
import { formatCurrency } from '../../src/utils/currency';
import { TransactionRow, TransactionRowItem } from '../../src/components/TransactionRow';
import { PendingDueRow, PendingDueItem } from '../../src/components/PendingDueRow';
import { CollectPaymentModal } from '../../src/components/CollectPaymentModal';
import { ReceiptModal } from '../../src/components/ReceiptModal';
import { RenewMembershipModal } from '../../src/components/RenewMembershipModal';
import { FilterPills } from '../../src/components/FilterPills';
import { StatusBadge } from '../../src/components/StatusBadge';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { ConfirmationDialog } from '../../src/components/ui/ConfirmationDialog';
import {
  MetricCardSkeleton,
  TransactionRowSkeleton,
  PendingDueRowSkeleton,
} from '../../src/components/ui/LoadingSkeleton';
import {
  Wallet,
  Plus,
  RotateCw,
  TrendingUp,
  AlertCircle,
  Receipt,
  CheckCircle2,
  Calendar,
  CreditCard,
  ArrowDownLeft,
  Search,
} from 'lucide-react-native';

type PeriodFilter = 'today' | 'this_week' | 'this_month';
type TransactionStatusFilter = 'ALL' | 'COMPLETED' | 'REFUNDED';

export default function FinanceScreen() {
  const router = useRouter();
  const { colors, typography, radii, shadows, layout } = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  // Filter States
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('today');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<TransactionStatusFilter>('ALL');

  // Modal States
  const [collectModalVisible, setCollectModalVisible] = useState(false);
  const [selectedMemberForCollect, setSelectedMemberForCollect] = useState<{
    id: string;
    fullName: string;
    memberCode: string;
    amount?: number;
  } | null>(null);

  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [selectedMemberForRenew, setSelectedMemberForRenew] = useState<string | null>(null);

  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [activeReceiptData, setActiveReceiptData] = useState<any | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // ==============================================================================
  // 1. Authoritative Backend Queries
  // ==============================================================================

  const isAuthed = Boolean(user?.gymId);

  // A. Executive Analytics Overview (Authoritative Financial Metrics)
  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['owner-analytics-overview', selectedPeriod],
    queryFn: () => OwnerAnalyticsService.getOverview(selectedPeriod),
    refetchInterval: 30000,
    enabled: isAuthed,
  });

  // B. Financial Dashboard (Today Revenue, Month Revenue, Expiring Counts)
  const {
    data: financialDashboard,
    isLoading: dashboardLoading,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ['owner-financial-dashboard'],
    queryFn: () => OwnerBillingService.getFinancialDashboard(),
    refetchInterval: 30000,
    enabled: isAuthed,
  });

  // C. Local-First Gym Members Directory (For Dues Identification)
  const {
    members: localMembers = [],
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useLocalMembers();

  // D. Local-First Gym Transactions Feed (SQLCipher via PaymentRepository)
  const {
    transactions = [],
    revenueAmount,
    isLoading: transactionsLoading,
    isOffline,
    refetch: refetchTransactions,
  } = useLocalTransactions({
    period: selectedPeriod,
    status: selectedStatusFilter,
  });

  // ==============================================================================
  // 2. Computed Metrics & Data Transformations
  // ==============================================================================

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchOverview().catch(() => {}),
      refetchDashboard().catch(() => {}),
      refetchMembers(),
      refetchTransactions(),
    ]);
    setRefreshing(false);
  }, [refetchOverview, refetchDashboard, refetchMembers, refetchTransactions]);

  // Sourced KPI metrics from real endpoints or local calculated revenue
  const totalCollected = useMemo(() => {
    if (overview?.metrics?.financial?.netPaid !== undefined) {
      return overview.metrics.financial.netPaid;
    }
    if (financialDashboard?.todayRevenue !== undefined && selectedPeriod === 'today') {
      return financialDashboard.todayRevenue;
    }
    if (financialDashboard?.monthRevenue !== undefined && selectedPeriod === 'this_month') {
      return financialDashboard.monthRevenue;
    }
    return revenueAmount;
  }, [overview, financialDashboard, selectedPeriod, revenueAmount]);

  const transactionCount = overview?.metrics?.financial?.transactionCount ?? transactions.length;
  const totalRefunds = overview?.metrics?.financial?.refunds ?? 0;
  const expiringCount = financialDashboard?.expiringSoonCount ?? (overview?.metrics?.memberships?.expiringSoon ?? 0);

  // Pending Dues & Expired Subscriptions
  const pendingDuesList: PendingDueItem[] = useMemo(() => {
    return localMembers
      .filter((m) => m.membershipStatus === 'EXPIRED' || m.membershipStatus === 'INACTIVE')
      .map((m) => ({
        id: m.id,
        fullName: m.fullName,
        memberCode: m.memberCode,
        phone: m.phone,
        membershipStatus: m.membershipStatus,
        outstandingBalance: 0,
        expiresAt: m.expiresAt,
      }));
  }, [localMembers]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    if (selectedStatusFilter === 'ALL') return transactions;
    if (selectedStatusFilter === 'REFUNDED') {
      return transactions.filter(
        (t) => t.type === 'REFUND' || t.status === 'REFUNDED' || Number(t.amount) < 0
      );
    }
    return transactions.filter(
      (t) => t.status === 'COMPLETED' && t.type !== 'REFUND' && Number(t.amount) >= 0
    );
  }, [transactions, selectedStatusFilter]);

  // ==============================================================================
  // 3. User Handlers
  // ==============================================================================

  const handleOpenReceipt = async (item: TransactionRowItem) => {
    try {
      setReceiptLoading(true);
      const receipt = await OwnerBillingService.getReceipt(item.id);
      setActiveReceiptData(receipt);
      setReceiptModalVisible(true);
    } catch (err: any) {
      Alert.alert('Receipt Notice', 'Unable to retrieve official digital receipt for this transaction.');
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleCollectForDue = (item: PendingDueItem) => {
    setSelectedMemberForCollect({
      id: item.id,
      fullName: item.fullName,
      memberCode: item.memberCode,
      amount: item.outstandingBalance || undefined,
    });
    setCollectModalVisible(true);
  };

  const handleOpenGlobalCollect = () => {
    setSelectedMemberForCollect(null);
    setCollectModalVisible(true);
  };

  // Period Filter Pills
  const periodPillItems = useMemo(
    () => [
      { label: 'Today', value: 'today' },
      { label: 'This Week', value: 'this_week' },
      { label: 'This Month', value: 'this_month' },
    ],
    []
  );

  // Transaction Filter Pills
  const statusPillItems = useMemo(
    () => [
      { label: 'All', value: 'ALL', count: transactions.length },
      {
        label: 'Completed',
        value: 'COMPLETED',
        count: transactions.filter((t) => t.status === 'COMPLETED' && t.type !== 'REFUND').length,
      },
      {
        label: 'Refunds',
        value: 'REFUNDED',
        count: transactions.filter((t) => t.type === 'REFUND' || t.status === 'REFUNDED').length,
      },
    ],
    [transactions]
  );

  // Initial Loading Screen
  const isInitialLoading =
    (overviewLoading || dashboardLoading) && !overview && !financialDashboard;

  if (isInitialLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.screenHeader, { borderBottomColor: colors.borderSubtle }]}>
          <View style={styles.headerTextGroup}>
            <Text style={[typography.screenTitle, { color: colors.textPrimary }]}>Finance</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Loading financial operations...
            </Text>
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <View style={styles.skeletonKpiRow}>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </View>
          <View style={[styles.skeletonKpiRow, { marginTop: 8 }]}>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </View>
          <View style={{ marginTop: 20 }}>
            <PendingDueRowSkeleton />
            <PendingDueRowSkeleton />
          </View>
          <View style={{ marginTop: 20 }}>
            <TransactionRowSkeleton />
            <TransactionRowSkeleton />
            <TransactionRowSkeleton />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Error Screen (Only shown when online and everything fails, or offline with zero cached transactions)
  if (!isOffline && overviewError && !overview && !financialDashboard && transactions.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <ErrorState
            title="Couldn't load financial information"
            message="Please verify your connection and tap retry to load the financial ledger."
            onRetry={handleRefresh}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ==============================================================================
  // 4. Header Component (Overview, Hero, KPIs, Dues)
  // ==============================================================================

  const renderHeader = () => (
    <View style={styles.listHeaderArea}>
      {/* 1. Period Selector Chips */}
      <View style={styles.periodRow}>
        <FilterPills
          options={periodPillItems}
          selectedStatus={selectedPeriod}
          onSelect={(id) => setSelectedPeriod(id as PeriodFilter)}
        />
      </View>

      {/* 2. Open Collections Hero (Phase 15-R2: Continuous Canvas, Dominant Numbers) */}
      <View style={styles.collectionsHero}>
        <Text style={[typography.captionBold, { color: colors.textSecondary, letterSpacing: 0.6 }]}>
          {selectedPeriod === 'today'
            ? "TODAY'S COLLECTIONS"
            : selectedPeriod === 'this_week'
            ? 'THIS WEEK COLLECTIONS'
            : 'MONTHLY COLLECTIONS'}
        </Text>

        <Text
          style={[
            typography.display,
            styles.collectionsDisplayAmount,
            { color: colors.textPrimary },
          ]}
          numberOfLines={1}
        >
          {formatCurrency(totalCollected)}
        </Text>

        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
          {transactionCount} transactions recorded in authoritative ledger
        </Text>

        {/* Inline Secondary Metrics (No boxed cards) */}
        <View style={[styles.inlineFinanceStats, { borderColor: colors.borderSubtle }]}>
          <View style={styles.inlineFinanceStatItem}>
            <Text style={[typography.cardTitle, styles.inlineStatValue, { color: colors.textPrimary }]}>
              {transactionCount}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Transactions</Text>
          </View>

          <View style={[styles.inlineStatDivider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.inlineFinanceStatItem}>
            <Text style={[typography.cardTitle, styles.inlineStatValue, { color: totalRefunds > 0 ? colors.danger : colors.textMuted }]}>
              {formatCurrency(totalRefunds)}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Refunds</Text>
          </View>

          <View style={[styles.inlineStatDivider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.inlineFinanceStatItem}>
            <Text style={[typography.cardTitle, styles.inlineStatValue, { color: expiringCount > 0 ? colors.warningText : colors.textMuted }]}>
              {expiringCount}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Expiring Soon</Text>
          </View>
        </View>
      </View>

      {/* 3. Action Rail */}
      <View style={styles.actionRailContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionRailContent}
        >
          <TouchableOpacity
            style={[
              styles.actionRailItem,
              { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
            ]}
            onPress={handleOpenGlobalCollect}
            activeOpacity={0.7}
          >
            <Plus size={15} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[typography.captionBold, { color: colors.primary }]}>Collect Fees</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionRailItem,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
            ]}
            onPress={() => router.push('/members' as any)}
            activeOpacity={0.7}
          >
            <RotateCw size={14} color={colors.textPrimary} style={{ marginRight: 6 }} />
            <Text style={[typography.captionBold, { color: colors.textPrimary }]}>Renewals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionRailItem,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
            ]}
            onPress={() => router.push('/reports' as any)}
            activeOpacity={0.7}
          >
            <Receipt size={14} color={colors.textPrimary} style={{ marginRight: 6 }} />
            <Text style={[typography.captionBold, { color: colors.textPrimary }]}>Financial Reports</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 4. Pending Dues & Expiring Section */}
      <View style={styles.sectionArea}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[typography.sectionTitle, { color: colors.textPrimary }]}>
              Pending Dues & Expiring
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              Members requiring renewal or outstanding fee collection
            </Text>
          </View>
          {pendingDuesList.length > 0 && (
            <View
              style={[
                styles.countBadge,
                { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
              ]}
            >
              <Text style={[typography.captionBold, { color: colors.dangerText }]}>
                {pendingDuesList.length}
              </Text>
            </View>
          )}
        </View>

        {pendingDuesList.length > 0 ? (
          <View style={styles.duesContainer}>
            {pendingDuesList.slice(0, 4).map((item) => (
              <PendingDueRow
                key={item.id}
                item={item}
                onPressMember={(id) => router.push(`/members/${id}` as any)}
                onCollect={handleCollectForDue}
              />
            ))}
            {pendingDuesList.length > 4 && (
              <TouchableOpacity
                style={[
                  styles.viewAllDuesBtn,
                  { borderBottomColor: colors.borderSubtle },
                ]}
                onPress={() => router.push('/members' as any)}
                activeOpacity={0.7}
              >
                <Text style={[typography.captionBold, { color: colors.primary }]}>
                  View All {pendingDuesList.length} Expired Members in Directory →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.allCaughtUpBanner,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.borderSubtle,
                borderRadius: radii.md,
              },
            ]}
          >
            <CheckCircle2 size={18} color={colors.success} style={{ marginRight: 8 }} />
            <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
              All caught up · No overdue or expiring memberships requiring immediate attention.
            </Text>
          </View>
        )}
      </View>

      {/* 5. Recent Transactions Section Header & Filters */}
      <View style={[styles.sectionArea, { marginTop: 20 }]}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[typography.sectionTitle, { color: colors.textPrimary }]}>
              Recent Transactions
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              Authoritative ledger feed of completed receipts and refunds
            </Text>
          </View>
        </View>

        <View style={styles.transactionFiltersRow}>
          <FilterPills
            options={statusPillItems}
            selectedStatus={selectedStatusFilter}
            onSelect={(id) => setSelectedStatusFilter(id as TransactionStatusFilter)}
          />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Screen Header */}
      <View style={[styles.screenHeader, { borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.headerTextGroup}>
          <Text style={[typography.screenTitle, { color: colors.textPrimary, letterSpacing: -0.5 }]}>
            Finance
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            {user?.gymName || 'GymDeck'} · Authoritative Ledger
          </Text>
        </View>

        <View style={styles.headerActionsGroup}>
          <TouchableOpacity
            style={[
              styles.iconPillBtn,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderRadius: radii.full },
            ]}
            onPress={handleRefresh}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Refresh financial feed"
          >
            <RotateCw size={14} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryHeaderBtn,
              { backgroundColor: colors.primary, borderRadius: radii.full },
            ]}
            onPress={handleOpenGlobalCollect}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Collect Payment"
          >
            <Plus size={15} color={colors.textOnPrimary} style={{ marginRight: 4 }} />
            <Text style={[typography.buttonSmall, { color: colors.textOnPrimary }]}>Collect</Text>
          </TouchableOpacity>
        </View>
      </View>

      <OfflineBanner isOffline={isOffline} />

      {/* Virtualized Transactions Feed */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionRow
            item={item}
            onPressReceipt={handleOpenReceipt}
            onPressMember={(memberId) => router.push(`/members/${memberId}` as any)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          transactionsLoading ? (
            <View style={styles.emptyContainer}>
              <TransactionRowSkeleton />
              <TransactionRowSkeleton />
            </View>
          ) : (
            <EmptyState
              icon={<Receipt size={32} color={colors.textMuted} />}
              title={
                selectedStatusFilter === 'REFUNDED'
                  ? 'No refunds recorded'
                  : 'No transactions yet'
              }
              description={
                selectedStatusFilter === 'REFUNDED'
                  ? 'No refund reversals have been recorded in the financial ledger.'
                  : 'Fee collections and memberships purchased for this gym will appear here.'
              }
              actionLabel={selectedStatusFilter !== 'REFUNDED' ? '+ Collect Payment' : undefined}
              onActionPress={selectedStatusFilter !== 'REFUNDED' ? handleOpenGlobalCollect : undefined}
            />
          )
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: layout.bottomNavHeight + 52 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        initialNumToRender={10}
        windowSize={5}
        maxToRenderPerBatch={10}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />

      {/* Collect Payment Modal (BottomSheet) */}
      <CollectPaymentModal
        visible={collectModalVisible}
        memberId={selectedMemberForCollect?.id}
        memberName={selectedMemberForCollect?.fullName}
        memberCode={selectedMemberForCollect?.memberCode}
        defaultAmount={selectedMemberForCollect?.amount}
        onClose={() => {
          setCollectModalVisible(false);
          setSelectedMemberForCollect(null);
        }}
        onSuccess={(payment) => {
          handleRefresh();
          if (payment?.id) {
            // Auto open receipt on successful collection
            OwnerBillingService.getReceipt(payment.id)
              .then((receipt) => {
                setActiveReceiptData(receipt);
                setReceiptModalVisible(true);
              })
              .catch(() => {});
          }
        }}
      />

      {/* Official Receipt Modal */}
      <ReceiptModal
        visible={receiptModalVisible}
        receipt={activeReceiptData}
        onClose={() => {
          setReceiptModalVisible(false);
          setActiveReceiptData(null);
        }}
      />

      {/* Renew Membership Modal */}
      {selectedMemberForRenew && (
        <RenewMembershipModal
          visible={renewModalVisible}
          memberId={selectedMemberForRenew}
          onClose={() => {
            setRenewModalVisible(false);
            setSelectedMemberForRenew(null);
          }}
          onSuccess={() => handleRefresh()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTextGroup: {
    flex: 1,
    marginRight: 8,
  },
  headerActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconPillBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primaryHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    minHeight: 34,
  },
  listHeaderArea: {
    paddingTop: 12,
  },
  periodRow: {
    marginBottom: 12,
  },
  collectionsHero: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  collectionsDisplayAmount: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  inlineFinanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginTop: 14,
  },
  inlineFinanceStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  inlineStatValue: {
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 2,
  },
  inlineStatDivider: {
    width: 1,
    height: 24,
  },
  actionRailContainer: {
    marginBottom: 18,
  },
  actionRailContent: {
    gap: 8,
    paddingVertical: 2,
  },
  actionRailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  sectionArea: {
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
  },
  duesContainer: {
    marginTop: 2,
  },
  viewAllDuesBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  allCaughtUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  transactionFiltersRow: {
    marginTop: 8,
    marginBottom: 6,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  skeletonKpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyContainer: {
    paddingVertical: 16,
  },
});
