/**
 * GymDeck Owner Mobile - Toast & Notification Banner
 *
 * Non-intrusive feedback message replacing excessive blocking alert dialogs.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react-native';
import { useTheme } from '../../theme';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

interface ToastProps {
  type: ToastType;
  title: string;
  message?: string;
  onDismiss?: () => void;
  style?: ViewStyle;
}

export const Toast: React.FC<ToastProps> = ({
  type,
  title,
  message,
  onDismiss,
  style,
}) => {
  const { colors, typography, radii, shadows } = useTheme();

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          bg: colors.successBg,
          border: colors.successBorder,
          text: colors.successText,
          icon: <CheckCircle2 size={20} color={colors.success} />,
        };
      case 'warning':
        return {
          bg: colors.warningBg,
          border: colors.warningBorder,
          text: colors.warningText,
          icon: <AlertTriangle size={20} color={colors.warning} />,
        };
      case 'error':
        return {
          bg: colors.dangerBg,
          border: colors.dangerBorder,
          text: colors.dangerText,
          icon: <AlertCircle size={20} color={colors.danger} />,
        };
      case 'info':
      default:
        return {
          bg: colors.infoBg,
          border: colors.infoBorder,
          text: colors.infoText,
          icon: <Info size={20} color={colors.info} />,
        };
    }
  };

  const config = getToastConfig();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          borderRadius: radii.md,
        },
        shadows.medium,
        style,
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.iconContainer}>{config.icon}</View>

      <View style={styles.textContainer}>
        <Text style={[typography.bodyBold, { color: config.text }]}>
          {title}
        </Text>
        {message && (
          <Text style={[typography.bodySecondary, { color: config.text, marginTop: 2 }]}>
            {message}
          </Text>
        )}
      </View>

      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.dismissBtn}
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={16} color={config.text} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginVertical: 6,
  },
  iconContainer: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  dismissBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
