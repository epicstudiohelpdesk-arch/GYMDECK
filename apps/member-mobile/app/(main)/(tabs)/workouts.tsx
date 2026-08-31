/**
 * GymDeck Member Mobile - Workouts & Exercises Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Dumbbell, Clock, ChevronDown, ChevronUp, UserCheck, Flame } from 'lucide-react-native';
import { useTheme } from '../../../src/theme';
import { useWorkouts } from '../../../src/hooks';
import { SkeletonLoader, EmptyState, PrimaryButton } from '../../../src/components';
import { WorkoutRoutine } from '../../../src/types';

export default function WorkoutsScreen() {
  const { colors, radii, spacing } = useTheme();
  const router = useRouter();
  const { data: workouts, isLoading, error, refetch, isRefetching } = useWorkouts();
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null);

  const toggleRoutine = (id: string) => {
    setExpandedRoutineId((prev) => (prev === id ? null : id));
  };

  if (isLoading && !workouts) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: spacing.lg }}>
          <SkeletonLoader height={32} width={180} style={{ marginBottom: 20 }} />
          <SkeletonLoader height={140} borderRadius={16} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={140} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !workouts) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.centerContainer, { padding: spacing.xl }]}>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            Couldn't load workouts
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

  const routines = workouts || [];

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
        <View style={styles.header}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
            Assigned Workouts
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
            Custom routines designed for your strength & hypertrophy goals.
          </Text>

          {/* Quick Action Navigation */}
          <View style={styles.topActionsRow}>
            <TouchableOpacity
              onPress={() => router.push('/details/workout-session' as any)}
              style={[styles.actionChip, { backgroundColor: colors.brand.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Start active workout session"
            >
              <Flame size={15} color="#FFFFFF" />
              <Text style={styles.actionChipText}>Live Tracker</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/details/workout-history' as any)}
              style={[
                styles.actionChip,
                { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="View workout history"
            >
              <Clock size={15} color={colors.textPrimary} />
              <Text style={[styles.actionChipText, { color: colors.textPrimary }]}>
                Workout History
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {routines.length === 0 ? (
          <EmptyState
            icon={<Dumbbell size={32} color={colors.brand.primary} />}
            title="No Assigned Programs"
            description="Your trainer has not published a workout program yet. Check back soon or request a routine at the front desk."
          />
        ) : (
          <View style={[styles.routinesList, { gap: spacing.md }]}>
            {routines.map((routine) => {
              const isExpanded = expandedRoutineId === routine.id;

              return (
                <View
                  key={routine.id}
                  style={[
                    styles.routineCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isExpanded ? colors.brand.primary : colors.border,
                      borderRadius: radii.lg,
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => toggleRoutine(routine.id)}
                    style={[styles.routineHeader, { padding: spacing.lg }]}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Workout: ${routine.title}, ${routine.exerciseCount} exercises`}
                  >
                    <View style={styles.routineTitleSection}>
                      {routine.dayOfWeek && (
                        <Text style={[styles.dayBadge, { color: colors.brand.secondary }]}>
                          {routine.dayOfWeek.toUpperCase()}
                        </Text>
                      )}
                      <Text style={[styles.routineTitle, { color: colors.textPrimary }]}>
                        {routine.title}
                      </Text>

                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Dumbbell size={13} color={colors.textSecondary} />
                          <Text style={[styles.statText, { color: colors.textSecondary }]}>
                            {routine.exerciseCount} Exercises
                          </Text>
                        </View>

                        <View style={styles.statItem}>
                          <Clock size={13} color={colors.textSecondary} />
                          <Text style={[styles.statText, { color: colors.textSecondary }]}>
                            ~{routine.estimatedMinutes} Mins
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.expandButton,
                        { backgroundColor: colors.surfaceSubtle },
                      ]}
                    >
                      {isExpanded ? (
                        <ChevronUp size={18} color={colors.textPrimary} />
                      ) : (
                        <ChevronDown size={18} color={colors.textPrimary} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Muscle Group Tags */}
                  <View style={[styles.pillsRow, { paddingHorizontal: spacing.lg }]}>
                    {routine.muscleGroups.map((group, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.musclePill,
                          { backgroundColor: colors.surfaceSubtle },
                        ]}
                      >
                        <Text
                          style={[styles.musclePillText, { color: colors.textSecondary }]}
                        >
                          {group}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {routine.assignedByTrainerName && (
                    <View style={[styles.trainerAttribution, { paddingHorizontal: spacing.lg }]}>
                      <UserCheck size={13} color={colors.brand.primary} />
                      <Text style={[styles.trainerNameText, { color: colors.textMuted }]}>
                        Coach: {routine.assignedByTrainerName}
                      </Text>
                    </View>
                  )}

                  {/* Expandable Exercise Details List */}
                  {isExpanded && (
                    <View
                      style={[
                        styles.exercisesContainer,
                        {
                          borderTopColor: colors.borderSubtle,
                          padding: spacing.lg,
                        },
                      ]}
                    >
                      <Text style={[styles.exercisesHeader, { color: colors.textPrimary }]}>
                        Exercise Breakdown
                      </Text>

                      {routine.exercises.map((exercise, index) => (
                        <View
                          key={exercise.id}
                          style={[
                            styles.exerciseCard,
                            {
                              backgroundColor: colors.surfaceSubtle,
                              borderRadius: radii.md,
                              padding: spacing.md,
                            },
                          ]}
                        >
                          <View style={styles.exerciseTopRow}>
                            <View style={styles.exerciseIndexCircle}>
                              <Text style={styles.exerciseIndexText}>{index + 1}</Text>
                            </View>
                            <View style={styles.exerciseMainInfo}>
                              <Text
                                style={[
                                  styles.exerciseName,
                                  { color: colors.textPrimary },
                                ]}
                              >
                                {exercise.name}
                              </Text>
                              <Text
                                style={[
                                  styles.exerciseTarget,
                                  { color: colors.brand.primary },
                                ]}
                              >
                                {exercise.targetMuscle}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.setsRepsRow}>
                            <View style={styles.setCol}>
                              <Text style={[styles.setLabel, { color: colors.textMuted }]}>
                                SETS
                              </Text>
                              <Text
                                style={[styles.setValue, { color: colors.textPrimary }]}
                              >
                                {exercise.sets}
                              </Text>
                            </View>

                            <View style={styles.setCol}>
                              <Text style={[styles.setLabel, { color: colors.textMuted }]}>
                                REPS
                              </Text>
                              <Text
                                style={[styles.setValue, { color: colors.textPrimary }]}
                              >
                                {exercise.reps}
                              </Text>
                            </View>

                            {exercise.weightRecommendation && (
                              <View style={styles.setCol}>
                                <Text
                                  style={[styles.setLabel, { color: colors.textMuted }]}
                                >
                                  INTENSITY
                                </Text>
                                <Text
                                  style={[
                                    styles.setValue,
                                    { color: colors.brand.secondary },
                                  ]}
                                >
                                  {exercise.weightRecommendation}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  topActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  routinesList: {
    width: '100%',
  },
  routineCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routineTitleSection: {
    flex: 1,
    paddingRight: 12,
  },
  dayBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  routineTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expandButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  musclePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  musclePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  trainerAttribution: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 14,
  },
  trainerNameText: {
    fontSize: 12,
  },
  exercisesContainer: {
    borderTopWidth: 1,
    gap: 10,
  },
  exercisesHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  exerciseCard: {
    width: '100%',
  },
  exerciseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  exerciseIndexCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF5E62',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseIndexText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  exerciseMainInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseTarget: {
    fontSize: 11,
    fontWeight: '600',
  },
  setsRepsRow: {
    flexDirection: 'row',
    gap: 24,
    paddingLeft: 34,
  },
  setCol: {
    alignItems: 'flex-start',
  },
  setLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  setValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
