/**
 * GymDeck Member Mobile - Error Banner Component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, WifiOff, X } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { AppError } from '../../errors';

export interface ErrorBannerProps {
  error: string | AppError | null;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, onDismiss }) => {
  const { colors, radii } = useTheme();

  if (!error) return null;

  const isNetwork = error instanceof AppError && error.domain === 'NETWORK';
  const errorMessage = error instanceof AppError ? error.userMessage : String(error);

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.status.errorBg,
          borderColor: colors.status.error,
          borderRadius: radii.md,
        },
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.iconContainer}>
        {isNetwork ? (
          <WifiOff size={18} color={colors.status.error} />
        ) : (
          <AlertCircle size={18} color={colors.status.error} />
        )}
      </View>

      <Text style={[styles.text, { color: '#FEE2E2' }]}>{errorMessage}</Text>

      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.dismissButton}
          accessibilityRole="button"
          accessibilityLabel="Dismiss error"
        >
          <X size={16} color="#FCA5A5" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginVertical: 10,
    width: '100%',
  },
  iconContainer: {
    marginRight: 10,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  dismissButton: {
    padding: 4,
    marginLeft: 6,
  },
});

export default ErrorBanner;
