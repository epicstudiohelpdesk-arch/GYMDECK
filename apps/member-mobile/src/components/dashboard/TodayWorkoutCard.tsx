/**
 * GymDeck Member Mobile - Today's Workout Card Component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Dumbbell, Clock, ChevronRight, UserCheck } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { WorkoutRoutine } from '../../types';

export interface TodayWorkoutCardProps {
  workout?: WorkoutRoutine;
  onPress?: () => void;
}

export const TodayWorkoutCard: React.FC<TodayWorkoutCardProps> = ({
  workout,
  onPress,
}) => {
  const { colors, radii, spacing } = useTheme();

  if (!workout) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.lg,
            padding: spacing.lg,
          },
        ]}
      >
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TODAY'S WORKOUT</Text>
        <Text style={[styles.restDayText, { color: colors.textPrimary }]}>
          Rest & Recovery Day 🧘
        </Text>
        <Text style={[styles.restDaySub, { color: colors.textSecondary }]}>
          No workout scheduled for today. Take time to stretch, hydrate, and recover.
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.lg,
          padding: spacing.lg,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Today's Workout: ${workout.title}`}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.sectionLabel, { color: colors.brand.secondary }]}>
            TODAY'S WORKOUT PROGRAM
          </Text>
          <Text style={[styles.workoutTitle, { color: colors.textPrimary }]}>
            {workout.title}
          </Text>
        </View>

        <View style={[styles.iconCircle, { backgroundColor: colors.surfaceSubtle }]}>
          <Dumbbell size={20} color={colors.brand.primary} />
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Dumbbell size={14} color={colors.textSecondary} />
          <Text style={[styles.metricText, { color: colors.textSecondary }]}>
            {workout.exerciseCount} Exercises
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Clock size={14} color={colors.textSecondary} />
          <Text style={[styles.metricText, { color: colors.textSecondary }]}>
            ~{workout.estimatedMinutes} Mins
          </Text>
        </View>
      </View>

      <View style={styles.pillsContainer}>
        {workout.muscleGroups.map((group, idx) => (
          <View
            key={idx}
            style={[styles.musclePill, { backgroundColor: colors.surfaceSubtle }]}
          >
            <Text style={[styles.musclePillText, { color: colors.textPrimary }]}>
              {group}
            </Text>
          </View>
        ))}
      </View>

      {workout.assignedByTrainerName && (
        <View style={styles.trainerRow}>
          <UserCheck size={13} color={colors.brand.primary} />
          <Text style={[styles.trainerText, { color: colors.textMuted }]}>
            Assigned by {workout.assignedByTrainerName}
          </Text>
        </View>
      )}

      <View style={[styles.footerRow, { borderTopColor: colors.borderSubtle }]}>
        <Text style={[styles.startText, { color: colors.brand.primary }]}>
          Start Workout Session
        </Text>
        <ChevronRight size={16} color={colors.brand.primary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1,
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  workoutTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
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
  trainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  trainerText: {
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  startText: {
    fontSize: 14,
    fontWeight: '700',
  },
  restDayText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 4,
  },
  restDaySub: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default TodayWorkoutCard;
