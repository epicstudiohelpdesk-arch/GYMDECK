/**
 * GymDeck Member Mobile - Main Dashboard Screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../src/theme';
import { useMemberDashboard } from '../../../src/hooks';
import {
  MemberHeader,
  MembershipCard,
  AttendanceStreakCard,
  TodayWorkoutCard,
  DuesSummaryCard,
  QuickActionGrid,
  SkeletonLoader,
  PrimaryButton,
} from '../../../src/components';

export default function DashboardScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { data: dashboard, isLoading, error, refetch, isRefetching } = useMemberDashboard();

  if (isLoading && !dashboard) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}>
          <SkeletonLoader height={60} borderRadius={12} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={160} borderRadius={16} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={90} borderRadius={12} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={140} borderRadius={16} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={100} borderRadius={16} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error && !dashboard) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.errorContainer, { padding: spacing.xl }]}>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            Couldn't load your dashboard
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            Please check your internet connection or try again shortly.
          </Text>
          <PrimaryButton
            title="Retry"
            onPress={() => refetch()}
            style={{ marginTop: 16, maxWidth: 200 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const {
    member,
    gym,
    membership,
    attendanceSummary,
    todayWorkout,
    outstandingDues,
    unreadNotificationCount,
  } = dashboard!;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
      >
        <MemberHeader
          member={member}
          gym={gym}
          unreadNotifications={unreadNotificationCount}
          onNotificationPress={() => {
            router.push('/details/notifications' as any);
          }}
        />

        <MembershipCard
          membership={membership}
          onPress={() => router.push('/(main)/(tabs)/membership')}
        />

        <QuickActionGrid />

        <TodayWorkoutCard
          workout={todayWorkout}
          onPress={() => router.push('/details/workout-session' as any)}
        />

        <AttendanceStreakCard summary={attendanceSummary} />

        <DuesSummaryCard dues={outstandingDues} />

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
