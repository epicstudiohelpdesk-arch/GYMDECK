/**
 * GymDeck Member Mobile - Empty State Component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { PrimaryButton } from './PrimaryButton';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionTitle?: string;
  onActionPress?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionTitle,
  onActionPress,
}) => {
  const { colors, spacing, radii } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.xl }]}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.surfaceSubtle,
            borderRadius: radii.full,
          },
        ]}
      >
        {icon}
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>

      {actionTitle && onActionPress && (
        <PrimaryButton
          title={actionTitle}
          onPress={onActionPress}
          variant="outline"
          style={{ marginTop: spacing.lg, maxWidth: 220 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});

export default EmptyState;
