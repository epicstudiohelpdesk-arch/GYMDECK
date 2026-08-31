/**
 * GymDeck Member Mobile - Active Membership Card Component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Award, ChevronRight, Calendar } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { MemberMembership } from '../../types';

export interface MembershipCardProps {
  membership: MemberMembership;
  onPress?: () => void;
}

export const MembershipCard: React.FC<MembershipCardProps> = ({
  membership,
  onPress,
}) => {
  const { colors, radii, spacing } = useTheme();

  const isExpired = membership.status === 'EXPIRED';
  const isFrozen = membership.status === 'FROZEN';

  const statusBg = isExpired
    ? colors.status.errorBg
    : isFrozen
    ? colors.status.warningBg
    : colors.status.successBg;

  const statusColor = isExpired
    ? colors.status.error
    : isFrozen
    ? colors.status.warning
    : colors.status.success;

  const formattedExpiry = new Date(membership.expiresAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const totalDays = 365;
  const progressRatio = Math.max(0, Math.min(1, membership.daysRemaining / totalDays));

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
      accessibilityLabel={`Membership: ${membership.planName}, Status: ${membership.status}`}
    >
      <View style={styles.topRow}>
        <View style={styles.planHeader}>
          <View style={[styles.iconPill, { backgroundColor: colors.surfaceSubtle }]}>
            <Award size={16} color={colors.brand.primary} />
          </View>
          <View>
            <Text style={[styles.planLabel, { color: colors.textSecondary }]}>ACTIVE PLAN</Text>
            <Text style={[styles.planName, { color: colors.textPrimary }]}>
              {membership.planName}
            </Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {membership.status}
          </Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.daysRow}>
          <Text style={[styles.daysCount, { color: colors.brand.primary }]}>
            {membership.daysRemaining}{' '}
            <Text style={[styles.daysLabel, { color: colors.textSecondary }]}>days remaining</Text>
          </Text>
          <View style={styles.expiryRow}>
            <Calendar size={13} color={colors.textMuted} />
            <Text style={[styles.expiryText, { color: colors.textMuted }]}>
              Expires {formattedExpiry}
            </Text>
          </View>
        </View>

        <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceSubtle }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: colors.brand.primary,
                width: `${progressRatio * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={[styles.footerRow, { borderTopColor: colors.borderSubtle }]}>
        <Text style={[styles.viewDetailsText, { color: colors.brand.secondary }]}>
          View Plan Benefits & Perks
        </Text>
        <ChevronRight size={16} color={colors.brand.secondary} />
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  progressSection: {
    marginBottom: 14,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  daysCount: {
    fontSize: 20,
    fontWeight: '800',
  },
  daysLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryText: {
    fontSize: 12,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default MembershipCard;
