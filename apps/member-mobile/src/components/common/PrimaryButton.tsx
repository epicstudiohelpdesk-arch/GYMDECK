/**
 * GymDeck Member Mobile - Accessible Primary Button Component
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { useTheme } from '../../theme';

export interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  style,
  textStyle,
}) => {
  const { colors, radii } = useTheme();

  const isInteractive = !loading && !disabled;

  let backgroundColor = colors.brand.primary;
  let textColor = '#FFFFFF';
  let borderWidth = 0;
  let borderColor = 'transparent';

  if (variant === 'secondary') {
    backgroundColor = colors.surfaceElevated;
    textColor = colors.textPrimary;
  } else if (variant === 'outline') {
    backgroundColor = 'transparent';
    textColor = colors.textPrimary;
    borderWidth = 1.5;
    borderColor = colors.border;
  } else if (variant === 'ghost') {
    backgroundColor = 'transparent';
    textColor = colors.brand.primary;
  }

  if (disabled) {
    backgroundColor = colors.surfaceSubtle;
    textColor = colors.textMuted;
    borderColor = 'transparent';
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor,
          borderRadius: radii.md,
          borderWidth,
          borderColor,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={!isInteractive}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.text, { color: textColor }, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 6,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default PrimaryButton;
