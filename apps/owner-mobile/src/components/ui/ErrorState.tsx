/**
 * GymDeck Owner Mobile - Standardized Error Presentation
 *
 * Provides contextual error presentation with inline retry.
 * Masks technical stack traces from gym owners.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { AlertCircle, WifiOff, ShieldX, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SecondaryButton } from './Button';

export type ErrorKind = 'network' | 'permission' | 'validation' | 'general';

interface ErrorStateProps {
  title?: string;
  message?: string;
  kind?: ErrorKind;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  kind = 'general',
  onRetry,
  style,
}) => {
  const { colors, typography, radii, shadows } = useTheme();

  const getErrorConfig = () => {
    switch (kind) {
      case 'network':
        return {
          defaultTitle: 'Connection Problem',
          defaultMessage: 'Unable to reach GymDeck cloud. Please check your internet connection.',
          icon: <WifiOff size={28} color={colors.warning} />,
          iconBg: colors.warningBg,
          iconBorder: colors.warningBorder,
        };
      case 'permission':
        return {
          defaultTitle: 'Access Restricted',
          defaultMessage: 'You do not have administrative permission to perform this action.',
          icon: <ShieldX size={28} color={colors.danger} />,
          iconBg: colors.dangerBg,
          iconBorder: colors.dangerBorder,
        };
      case 'validation':
        return {
          defaultTitle: 'Invalid Information',
          defaultMessage: 'Please review the entered information and try again.',
          icon: <AlertCircle size={28} color={colors.warning} />,
          iconBg: colors.warningBg,
          iconBorder: colors.warningBorder,
        };
      case 'general':
      default:
        return {
          defaultTitle: 'Operation Encountered an Issue',
          defaultMessage: 'An unexpected problem occurred. Please retry.',
          icon: <AlertCircle size={28} color={colors.danger} />,
          iconBg: colors.dangerBg,
          iconBorder: colors.dangerBorder,
        };
    }
  };

  const config = getErrorConfig();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.lg,
        },
        shadows.low,
        style,
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: config.iconBg,
            borderColor: config.iconBorder,
            borderRadius: radii.full,
          },
        ]}
      >
        {config.icon}
      </View>

      <Text style={[typography.cardTitle, { color: colors.textPrimary, textAlign: 'center', marginTop: 12 }]}>
        {title || config.defaultTitle}
      </Text>

      <Text
        style={[
          typography.bodySecondary,
          { color: colors.textSecondary, textAlign: 'center', marginTop: 4, maxWidth: 280 },
        ]}
      >
        {message || config.defaultMessage}
      </Text>

      {onRetry && (
        <SecondaryButton
          label="Retry"
          icon={<RefreshCw size={14} color={colors.textPrimary} />}
          onPress={onRetry}
          style={styles.retryBtn}
          size="sm"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1,
    marginVertical: 8,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    marginTop: 16,
    minWidth: 120,
  },
});
