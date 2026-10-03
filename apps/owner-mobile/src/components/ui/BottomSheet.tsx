/**
 * GymDeck Owner Mobile - Standardized Bottom Sheet Primitive
 *
 * Replaces centered floating desktop dialogs with thumb-friendly bottom sheets:
 * - Top pull handle
 * - Safe-area aware
 * - Keyboard avoiding
 * - Accessible touch targets (>= 44pt)
 * - Tap backdrop to dismiss
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { IconButton } from './Button';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeightRatio?: number; // 0.5 to 0.9 of screen
  style?: ViewStyle;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeightRatio = 0.85,
  style,
}) => {
  const { colors, typography, radii, shadows } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardAvoider}
            >
              <View
                style={[
                  styles.sheetContainer,
                  {
                    backgroundColor: colors.surface,
                    borderTopLeftRadius: radii.xxl,
                    borderTopRightRadius: radii.xxl,
                    borderColor: colors.border,
                    paddingBottom: Math.max(insets.bottom, 16),
                    maxHeight: `${Math.round(maxHeightRatio * 100)}%`,
                  },
                  shadows.high,
                  style,
                ]}
              >
                {/* Pull Handle */}
                <View style={styles.handleContainer}>
                  <View style={[styles.pullHandle, { backgroundColor: colors.borderStrong }]} />
                </View>

                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
                  <View style={styles.headerText}>
                    <Text style={[typography.sectionTitle, { color: colors.textPrimary }]}>
                      {title}
                    </Text>
                    {subtitle && (
                      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                        {subtitle}
                      </Text>
                    )}
                  </View>
                  <IconButton
                    icon={<X size={18} color={colors.textSecondary} />}
                    onPress={onClose}
                    accessibilityLabel="Close sheet"
                    size={36}
                  />
                </View>

                {/* Body Content */}
                <ScrollView
                  style={styles.contentScroll}
                  contentContainerStyle={styles.contentPadding}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {children}
                </ScrollView>

                {/* Optional Action Footer */}
                {footer && (
                  <View style={[styles.footerContainer, { borderTopColor: colors.borderSubtle }]}>
                    {footer}
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardAvoider: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  pullHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerText: {
    flex: 1,
    marginRight: 10,
  },
  contentScroll: {
    flexShrink: 1,
  },
  contentPadding: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
