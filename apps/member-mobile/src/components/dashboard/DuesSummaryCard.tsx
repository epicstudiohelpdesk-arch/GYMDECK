/**
 * GymDeck Member Mobile - Dues Summary Card Component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CreditCard, CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { OutstandingDues } from '../../types';

export interface DuesSummaryCardProps {
  dues: OutstandingDues;
}

export const DuesSummaryCard: React.FC<DuesSummaryCardProps> = ({ dues }) => {
  const { colors, radii, spacing } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.lg,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.contentRow}>
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: dues.hasDues
                ? colors.status.warningBg
                : colors.status.successBg,
            },
          ]}
        >
          {dues.hasDues ? (
            <AlertTriangle size={20} color={colors.status.warning} />
          ) : (
            <CheckCircle2 size={20} color={colors.status.success} />
          )}
        </View>

        <View style={styles.textWrapper}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {dues.hasDues ? 'Pending Account Dues' : 'Account Balance Clear'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {dues.hasDues
              ? `Outstanding: ${dues.currency}${dues.amount.toFixed(2)}${
                  dues.dueDate ? ` · Due ${dues.dueDate}` : ''
                }`
              : 'All membership fees and dues are fully settled.'}
          </Text>
        </View>

        <CreditCard size={18} color={colors.textMuted} />
      </View>
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
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default DuesSummaryCard;
