/**
 * GymDeck Owner Mobile - Button Primitives
 *
 * Enforces accessible minimum touch targets (>= 44pt).
 * Provides clear visual feedback on pressed, disabled, and loading states.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { useTheme } from '../../theme';

interface BaseButtonProps {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  size?: 'sm' | 'md' | 'lg';
  accessibilityLabel?: string;
}

export const PrimaryButton: React.FC<BaseButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconRight,
  style,
  textStyle,
  size = 'md',
  accessibilityLabel,
}) => {
  const { colors, typography, layout, radii } = useTheme();

  const height = size === 'sm' ? layout.buttonHeightSmall : layout.buttonHeight;
  const isInteractive = !disabled && !loading;

  return (
    <TouchableOpacity
      style={[
        styles.baseButton,
        {
          height,
          borderRadius: size === 'sm' ? radii.sm : radii.md,
          backgroundColor: isInteractive ? colors.primary : colors.surfaceSubtle,
          borderColor: isInteractive ? colors.primary : colors.border,
        },
        style,
      ]}
      onPress={onPress}
      disabled={!isInteractive}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isInteractive ? colors.textOnPrimary : colors.textMuted} />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconLeft}>{icon}</View>}
          {label && (
            <Text
              style={[
                size === 'sm' ? typography.buttonSmall : typography.button,
                { color: isInteractive ? colors.textOnPrimary : colors.textDisabled },
                textStyle,
              ]}
            >
              {label}
            </Text>
          )}
          {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

export const SecondaryButton: React.FC<BaseButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconRight,
  style,
  textStyle,
  size = 'md',
  accessibilityLabel,
}) => {
  const { colors, typography, layout, radii } = useTheme();

  const height = size === 'sm' ? layout.buttonHeightSmall : layout.buttonHeight;
  const isInteractive = !disabled && !loading;

  return (
    <TouchableOpacity
      style={[
        styles.baseButton,
        {
          height,
          borderRadius: size === 'sm' ? radii.sm : radii.md,
          backgroundColor: colors.surface,
          borderColor: isInteractive ? colors.borderStrong : colors.borderSubtle,
          borderWidth: 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={!isInteractive}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconLeft}>{icon}</View>}
          {label && (
            <Text
              style={[
                size === 'sm' ? typography.buttonSmall : typography.button,
                { color: isInteractive ? colors.textPrimary : colors.textDisabled },
                textStyle,
              ]}
            >
              {label}
            </Text>
          )}
          {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  size?: number; // Visual box size (hitbox is always >= 44x44)
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'filled' | 'primary' | 'danger';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  disabled = false,
  accessibilityLabel,
  size = 40,
  style,
  variant = 'default',
}) => {
  const { colors, radii, layout } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return { backgroundColor: colors.surfaceSubtle, borderColor: colors.border };
      case 'primary':
        return { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder };
      case 'danger':
        return { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder };
      case 'default':
      default:
        return { backgroundColor: 'transparent', borderColor: 'transparent' };
    }
  };

  const vStyle = getVariantStyles();

  return (
    <TouchableOpacity
      style={[
        styles.iconButtonWrapper,
        {
          minWidth: layout.touchTargetMin,
          minHeight: layout.touchTargetMin,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.65}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View
        style={[
          styles.iconBox,
          {
            width: size,
            height: size,
            borderRadius: radii.md,
            backgroundColor: vStyle.backgroundColor,
            borderColor: vStyle.borderColor,
            borderWidth: variant === 'default' ? 0 : 1,
            opacity: disabled ? 0.4 : 1,
          },
          style,
        ]}
      >
        {icon}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  iconButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
