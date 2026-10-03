/**
 * GymDeck Owner Mobile - Standardized Metric / KPI Card
 *
 * Implements strict visual hierarchy:
 * Metric value visually dominates the supporting description.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  trendText?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  onPress?: () => void;
  style?: ViewStyle;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon,
  iconBgColor,
  trendText,
  trendType = 'positive',
  onPress,
  style,
}) => {
  const { colors, typography, radii, shadows } = useTheme();

  const Container = onPress ? TouchableOpacity : View;

  const getTrendColor = () => {
    switch (trendType) {
      case 'positive':
        return colors.successText;
      case 'negative':
        return colors.dangerText;
      case 'neutral':
      default:
        return colors.textSecondary;
    }
  };

  return (
    <Container
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.lg,
        },
        shadows.low,
        style,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}${subtext ? `, ${subtext}` : ''}`}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: iconBgColor || colors.primarySoft,
              borderRadius: radii.md,
            },
          ]}
        >
          {icon}
        </View>

        {trendText && (
          <View style={[styles.trendBadge, { backgroundColor: colors.surfaceSubtle }]}>
            <Text style={[typography.captionBold, { color: getTrendColor() }]}>
              {trendText}
            </Text>
          </View>
        )}
      </View>

      {/* Dominant Metric Value */}
      <Text style={[typography.kpiNumber, { color: colors.textPrimary, marginTop: 10 }]}>
        {value}
      </Text>

      {/* Supporting Label */}
      <Text style={[typography.kpiLabel, { color: colors.textSecondary, marginTop: 2 }]}>
        {label}
      </Text>

      {/* Detail / Contextual Subtext */}
      {subtext && (
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]} numberOfLines={1}>
          {subtext}
        </Text>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderWidth: 1,
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
