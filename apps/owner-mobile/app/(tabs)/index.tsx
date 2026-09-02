/**
 * GymDeck Owner Mobile - Real-Time Executive Analytics & KPI Dashboard
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/authStore';
import { OwnerAnalyticsService } from '../../src/services/api/ownerAnalyticsService';
import { ownerNotificationService } from '../../src/services/api/ownerNotificationService';
import {
  Users,
  Activity,
  DollarSign,
  Award,
  LogOut,
  Dumbbell,
  ShieldCheck,
  RefreshCw,
  Bell,
  Calendar,
  TrendingUp,
} from 'lucide-react-native';

const RANGE_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'this_year', label: 'This Year' },
];

export default function OwnerDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [selectedRange, setSelectedRange] = useState<string>('this_month');

  const {
    data: overview,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ['owner-analytics-overview', selectedRange],
    queryFn: () => OwnerAnalyticsService.getOverview(selectedRange),
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['owner-unread-notifications'],
    queryFn: () => ownerNotificationService.getUnreadCount(),
    refetchInterval: 30000,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#EAB308"
            colors={['#EAB308']}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.ownerName}>{user?.fullName || 'Gym Owner'}</Text>
            <View style={styles.gymBadgeRow}>
              <Text style={styles.gymName}>{user?.gymName || 'Gym Flagship'}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{user?.gymCode || 'GD-HQ'}</Text>
              </View>
              <View style={[styles.badge, styles.roleBadge]}>
                <Text style={styles.roleBadgeText}>{user?.role || 'OWNER'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => router.push('/notifications')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Bell size={20} color="#F8FAFC" />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
              <LogOut size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Range Selector */}
        <View style={styles.rangeSelector}>
          {RANGE_OPTIONS.map((opt) => {
            const isSelected = selectedRange === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.rangePill, isSelected && styles.rangePillActive]}
                onPress={() => setSelectedRange(opt.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.rangePillText, isSelected && styles.rangePillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Cloud Status Pill */}
        <View style={styles.statusPill}>
          <ShieldCheck size={16} color="#10B981" style={styles.statusIcon} />
          <Text style={styles.statusText}>Cloud Synchronized & Authorized</Text>
        </View>

        {/* Metrics Section */}
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#EAB308" />
            <Text style={styles.loaderText}>Loading live gym analytics...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Failed to load analytics</Text>
            <Text style={styles.errorSubtitle}>Please pull down to retry.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <RefreshCw size={16} color="#0A0D14" style={{ marginRight: 6 }} />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Primary KPI Grid */}
            <View style={styles.grid}>
              {/* Active Members */}
              <View style={styles.card}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Users size={20} color="#3B82F6" />
                </View>
                <Text style={styles.cardValue}>{overview?.metrics.members.active ?? 0}</Text>
                <Text style={styles.cardLabel}>Active Members</Text>
                <Text style={styles.cardSubtext}>
                  +{overview?.metrics.members.newInPeriod ?? 0} new in period
                </Text>
              </View>

              {/* Net Revenue */}
              <View style={styles.card}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
                  <DollarSign size={20} color="#EAB308" />
                </View>
                <Text style={styles.cardValue}>
                  ${Number(overview?.metrics.financial.netPaid ?? 0).toFixed(2)}
                </Text>
                <Text style={styles.cardLabel}>Net Revenue</Text>
                <Text style={styles.cardSubtext}>
                  {overview?.metrics.financial.transactionCount ?? 0} transactions
                </Text>
              </View>

              {/* Attendance Check-Ins */}
              <View style={styles.card}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Activity size={20} color="#10B981" />
                </View>
                <Text style={styles.cardValue}>{overview?.metrics.attendance.totalCheckins ?? 0}</Text>
                <Text style={styles.cardLabel}>Check-Ins</Text>
                <Text style={styles.cardSubtext}>
                  {overview?.metrics.attendance.uniqueAttendees ?? 0} unique members
                </Text>
              </View>

              {/* Active Subscriptions */}
              <View style={styles.card}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                  <Award size={20} color="#A855F7" />
                </View>
                <Text style={styles.cardValue}>
                  {overview?.metrics.memberships.activeSubscriptions ?? 0}
                </Text>
                <Text style={styles.cardLabel}>Active Subscriptions</Text>
                <Text style={styles.cardSubtext}>
                  {overview?.metrics.memberships.expiringSoon ?? 0} expiring soon
                </Text>
              </View>
            </View>

            {/* Trainer & PT Summary Card */}
            <View style={[styles.card, styles.fullWidthCard]}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
                <Dumbbell size={22} color="#F97316" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.cardValue}>{overview?.metrics.trainers.activeTrainers ?? 0}</Text>
                  <Text style={styles.earningsPill}>
                    ${Number(overview?.metrics.trainers.accruedEarnings ?? 0).toFixed(2)} Accrued
                  </Text>
                </View>
                <Text style={styles.cardLabel}>Active Personal Trainers</Text>
                <Text style={styles.cardSubtext}>
                  {overview?.metrics.trainers.completedSessions ?? 0} PT sessions completed in period
                </Text>
              </View>
            </View>

            {/* Attendance & Revenue Trend Summary */}
            <View style={styles.trendSection}>
              <View style={styles.trendHeader}>
                <TrendingUp size={18} color="#EAB308" />
                <Text style={styles.trendTitle}>Operational Trends ({selectedRange.replace('_', ' ')})</Text>
              </View>
              <View style={styles.trendRow}>
                <View style={styles.trendMetricBox}>
                  <Text style={styles.trendMetricLabel}>Daily Avg Attendance</Text>
                  <Text style={styles.trendMetricVal}>{overview?.metrics.attendance.dailyAverage ?? 0}</Text>
                </View>
                <View style={styles.trendMetricBox}>
                  <Text style={styles.trendMetricLabel}>Avg Transaction</Text>
                  <Text style={styles.trendMetricVal}>
                    ${Number(overview?.metrics.financial.averageTransaction ?? 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  ownerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  gymBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  gymName: {
    fontSize: 14,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  roleBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  roleBadgeText: {
    color: '#EAB308',
    fontSize: 11,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  logoutBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  rangePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  rangePillActive: {
    backgroundColor: '#EAB308',
  },
  rangePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  rangePillTextActive: {
    color: '#0A0D14',
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  loaderContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loaderText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  errorCard: {
    backgroundColor: '#1E1B18',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  errorSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#0A0D14',
    fontWeight: '700',
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  fullWidthCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  cardLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  cardSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  earningsPill: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trendSection: {
    marginTop: 16,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  trendTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  trendRow: {
    flexDirection: 'row',
    gap: 12,
  },
  trendMetricBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  trendMetricLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  trendMetricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
});
