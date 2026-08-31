/**
 * GymDeck Member Mobile - Workout History Screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Dumbbell, Calendar, Clock, Flame, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { useWorkoutHistory } from '../../src/hooks';
import { SkeletonLoader, EmptyState, PrimaryButton } from '../../src/components';

export default function WorkoutHistoryScreen() {
  const { colors, radii, spacing } = useTheme();
  const router = useRouter();
  const { data: history, isLoading, error, refetch, isRefetching } = useWorkoutHistory();

  if (isLoading && !history) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: spacing.lg }}>
          <SkeletonLoader height={36} width={160} style={{ marginBottom: 20 }} />
          <SkeletonLoader height={100} borderRadius={16} style={{ marginBottom: 14 }} />
          <SkeletonLoader height={100} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  const items = history || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.lg,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Workout History
        </Text>
      </View>

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
        {items.length === 0 ? (
          <EmptyState
            icon={<Dumbbell size={32} color={colors.brand.primary} />}
            title="No Workout History"
            description="You haven't completed any tracked workout sessions yet. Start a session from the Workouts tab to record your sets."
          />
        ) : (
          <View style={[styles.historyList, { gap: spacing.md }]}>
            {items.map((item) => {
              const formattedDate = new Date(item.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <View
                  key={item.id}
                  style={[
                    styles.historyCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radii.lg,
                      padding: spacing.lg,
                    },
                  ]}
                >
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.routineTitle, { color: colors.textPrimary }]}>
                      {item.routineTitle}
                    </Text>
                    <View
                      style={[
                        styles.completedPill,
                        { backgroundColor: colors.status.successBg },
                      ]}
                    >
                      <CheckCircle size={12} color={colors.status.success} />
                      <Text style={[styles.completedText, { color: colors.status.success }]}>
                        LOGGED
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Calendar size={13} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        {formattedDate}
                      </Text>
                    </View>

                    <View style={styles.metaItem}>
                      <Clock size={13} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        {item.durationMinutes} mins
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statsBanner,
                      { backgroundColor: colors.surfaceSubtle, borderRadius: radii.md },
                    ]}
                  >
                    <View style={styles.statCol}>
                      <Text style={[styles.statNum, { color: colors.brand.primary }]}>
                        {item.totalSetsCompleted}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                        Sets Completed
                      </Text>
                    </View>

                    <View style={styles.statCol}>
                      <Text style={[styles.statNum, { color: colors.brand.secondary }]}>
                        {item.totalVolumeKg.toLocaleString()} kg
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                        Total Volume
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    flexGrow: 1,
  },
  historyList: {
    width: '100%',
  },
  historyCard: {
    width: '100%',
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  routineTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  completedText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  statsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  statCol: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
