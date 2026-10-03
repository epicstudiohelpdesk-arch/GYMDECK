/**
 * GymDeck Owner Mobile - Standardized Empty State
 *
 * Explains:
 * 1. What is empty
 * 2. Why it matters
 * 3. What the owner can do next
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { PrimaryButton } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onActionPress,
  style,
}) => {
  const { colors, typography, radii } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.surfaceSubtle,
            borderColor: colors.border,
            borderRadius: radii.full,
          },
        ]}
      >
        {icon}
      </View>

      <Text style={[typography.sectionTitle, { color: colors.textPrimary, textAlign: 'center', marginTop: 14 }]}>
        {title}
      </Text>

      <Text
        style={[
          typography.bodySecondary,
          { color: colors.textSecondary, textAlign: 'center', marginTop: 6, maxWidth: 280 },
        ]}
      >
        {description}
      </Text>

      {actionLabel && onActionPress && (
        <PrimaryButton
          label={actionLabel}
          onPress={onActionPress}
          style={styles.actionButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    marginTop: 20,
    minWidth: 160,
  },
});
