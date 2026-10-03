/**
 * GymDeck Owner Mobile - Standardized Confirmation Sheet
 *
 * Dedicated to destructive actions (Logout, Deactivate, Revoke):
 * - Clear warning iconography
 * - Prevents accidental triggers
 * - Thumb-friendly confirmation buttons
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { BottomSheet } from './BottomSheet';
import { PrimaryButton, SecondaryButton } from './Button';
import { useTheme } from '../../theme';

interface ConfirmationDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  loading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  loading = false,
}) => {
  const { colors, typography, radii } = useTheme();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      maxHeightRatio={0.5}
      footer={
        <View style={styles.buttonRow}>
          <SecondaryButton
            label={cancelLabel}
            onPress={onClose}
            disabled={loading}
            style={styles.flexBtn}
          />
          <PrimaryButton
            label={confirmLabel}
            onPress={onConfirm}
            loading={loading}
            style={
              isDestructive
                ? [styles.flexBtn, { backgroundColor: colors.danger, borderColor: colors.danger }]
                : styles.flexBtn
            }
          />
        </View>
      }
    >
      <View style={styles.body}>
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: isDestructive ? colors.dangerBg : colors.warningBg,
              borderColor: isDestructive ? colors.dangerBorder : colors.warningBorder,
              borderRadius: radii.full,
            },
          ]}
        >
          <AlertTriangle
            size={28}
            color={isDestructive ? colors.danger : colors.warning}
          />
        </View>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 12 }]}>
          {message}
        </Text>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flexBtn: {
    flex: 1,
  },
});
