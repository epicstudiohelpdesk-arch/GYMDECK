import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { colors, typography, radii } = useTheme();
  const normalized = (status || 'ACTIVE').toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'ACTIVE':
      case 'PAID':
      case 'COMPLETED':
      case 'CHECKED_IN':
      case 'CHECKED IN':
      case 'ON_FLOOR':
      case 'ON FLOOR':
        return {
          bg: colors.successBg,
          text: colors.successText,
          border: colors.successBorder,
        };
      case 'EXPIRING':
      case 'PENDING':
      case 'PARTIALLY PAID':
      case 'PARTIALLY_PAID':
        return {
          bg: colors.warningBg,
          text: colors.warningText,
          border: colors.warningBorder,
        };
      case 'EXPIRED':
      case 'OVERDUE':
      case 'DUE':
      case 'REFUNDED':
      case 'REFUND':
        return {
          bg: colors.dangerBg,
          text: colors.dangerText,
          border: colors.dangerBorder,
        };
      case 'FROZEN':
        return {
          bg: colors.specialBg,
          text: colors.specialText,
          border: colors.specialBorder,
        };
      case 'INACTIVE':
      case 'CHECKED_OUT':
      case 'CHECKED OUT':
      default:
        return {
          bg: colors.surfaceSubtle,
          text: colors.textSecondary,
          border: colors.border,
        };
    }
  };

  const style = getStyle();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: style.bg,
          borderColor: style.border,
          borderRadius: radii.sm,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${normalized}`}
    >
      <Text style={[typography.badgeText, { color: style.text }]}>
        {normalized}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
