/**
 * GymDeck Member Mobile - Attendance Streak Card Component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { AttendanceSummary } from '../../types';

export interface AttendanceStreakCardProps {
  summary: AttendanceSummary;
}

export const AttendanceStreakCard: React.FC<AttendanceStreakCardProps> = ({ summary }) => {
  const { colors, radii, spacing } = useTheme();

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
      <View style={styles.contentRow}>
        <View style={[styles.streakIconCircle, { backgroundColor: '#7C2D12' }]}>
          <Flame size={24} color="#F97316" />
        </View>

        <View style={styles.infoWrapper}>
          <View style={styles.streakHeader}>
            <Text style={[styles.streakTitle, { color: colors.textPrimary }]}>
              {summary.currentStreak} Day Streak 🔥
            </Text>
          </View>
          <Text style={[styles.streakSubtitle, { color: colors.textSecondary }]}>
            {summary.totalCheckinsThisMonth} floor check-ins recorded this month
          </Text>
        </View>
      </View>

      {summary.lastCheckin && (
        <View style={[styles.lastCheckinRow, { borderTopColor: colors.borderSubtle }]}>
          <CheckCircle2 size={14} color={colors.status.success} />
          <Text style={[styles.lastCheckinText, { color: colors.textMuted }]}>
            Last check-in:{' '}
            {new Date(summary.lastCheckin).toLocaleDateString('en-US', {
              weekday: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1,
    marginVertical: 6,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  streakIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoWrapper: {
    flex: 1,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  streakTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  streakSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  lastCheckinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    marginTop: 12,
    borderTopWidth: 1,
  },
  lastCheckinText: {
    fontSize: 12,
  },
});

export default AttendanceStreakCard;
