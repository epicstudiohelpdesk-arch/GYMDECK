/**
 * GymDeck Owner Mobile - Real-Time KPI Dashboard Screen
 */

import React from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/authStore';
import { OwnerDashboardService } from '../../src/services/api/ownerDashboardService';
import {
  Users,
  Activity,
  DollarSign,
  Award,
  LogOut,
  Dumbbell,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react-native';

export default function OwnerDashboardScreen() {
  const { user, logout } = useAuthStore();

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: () => OwnerDashboardService.getDashboard(),
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
          <View>
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

          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
            <LogOut size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Cloud Status Pill */}
        <View style={styles.statusPill}>
          <ShieldCheck size={16} color="#10B981" style={styles.statusIcon} />
          <Text style={styles.statusText}>Cloud Synchronized & Authorized</Text>
        </View>

        {/* Metrics Grid */}
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#EAB308" />
            <Text style={styles.loaderText}>Loading live gym metrics...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Failed to load metrics</Text>
            <Text style={styles.errorSubtitle}>Please pull down to retry.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <RefreshCw size={16} color="#0A0D14" style={{ marginRight: 6 }} />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {/* Active Members */}
            <View style={styles.card}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Users size={22} color="#3B82F6" />
              </View>
              <Text style={styles.cardValue}>{data?.metrics.activeMembersCount ?? 0}</Text>
              <Text style={styles.cardLabel}>Active Members</Text>
            </View>

            {/* Today's Attendance */}
            <View style={styles.card}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Activity size={22} color="#10B981" />
              </View>
              <Text style={styles.cardValue}>{data?.metrics.todayAttendanceCount ?? 0}</Text>
              <Text style={styles.cardLabel}>Today Check-ins</Text>
            </View>

            {/* Today's Revenue */}
            <View style={styles.card}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
                <DollarSign size={22} color="#EAB308" />
              </View>
              <Text style={styles.cardValue}>
                ${Number(data?.metrics.todayRevenue ?? 0).toFixed(2)}
              </Text>
              <Text style={styles.cardLabel}>Today Revenue</Text>
            </View>

            {/* Active Plans */}
            <View style={styles.card}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                <Award size={22} color="#A855F7" />
              </View>
              <Text style={styles.cardValue}>{data?.metrics.activePlansCount ?? 0}</Text>
              <Text style={styles.cardLabel}>Active Plans</Text>
            </View>

            {/* Trainers */}
            <View style={[styles.card, styles.fullWidthCard]}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
                <Dumbbell size={22} color="#F97316" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardValue}>{data?.metrics.activeTrainersCount ?? 0}</Text>
                <Text style={styles.cardLabel}>Active Trainers on Duty</Text>
              </View>
            </View>
          </View>
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
  logoutBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#131823',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 20,
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
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
  },
  errorCard: {
    backgroundColor: '#131823',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 24,
    alignItems: 'center',
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
  errorSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#0A0D14',
    fontWeight: '700',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    backgroundColor: '#131823',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
  },
  fullWidthCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
  },
});
