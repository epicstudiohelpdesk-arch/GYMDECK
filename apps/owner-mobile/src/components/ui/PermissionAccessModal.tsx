/**
 * GymDeck Owner Mobile - Custom Permission Access Request Modal
 *
 * Professional, clean & compact bottom sheet modal:
 * - Slides up smoothly from bottom to top (spring/timing transition)
 * - Square cross/close button with 5px curved corners
 * - Minimal, ultra-clean UI/UX with concise copy & balanced spacing
 * - High-contrast action buttons: "Allow Access" / "Open Settings" + "Not Now"
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  FolderOpen,
  Camera,
  Image as ImageIcon,
  ShieldCheck,
  ExternalLink,
  X,
} from 'lucide-react-native';

export type PermissionAccessType = 'gallery' | 'camera' | 'documents';

export interface PermissionAccessModalProps {
  visible: boolean;
  type?: PermissionAccessType;
  isDark?: boolean;
  canAskAgain?: boolean;
  onClose: () => void;
  onGrantPermission: () => Promise<void> | void;
}

export const PermissionAccessModal: React.FC<PermissionAccessModalProps> = ({
  visible,
  type = 'gallery',
  isDark = false,
  canAskAgain = true,
  onClose,
  onGrantPermission,
}) => {
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(400);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          friction: 8.5,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 400,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const config = {
    gallery: {
      title: 'Photo Library Access',
      description: 'Allow GymDeck to access your device gallery to upload member photos and identification records.',
      icon: ImageIcon,
      accentColor: '#2563EB',
    },
    camera: {
      title: 'Camera Access',
      description: 'Allow GymDeck to access your camera to take member profile photos directly on the gym floor.',
      icon: Camera,
      accentColor: '#EA580C',
    },
    documents: {
      title: 'Files & Storage Access',
      description: 'Allow GymDeck to access device documents to attach member contracts, KYC cards, and certificates.',
      icon: FolderOpen,
      accentColor: '#059669',
    },
  }[type];

  const IconComponent = config.icon;

  const handleOpenSettings = async () => {
    onClose();
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch {
      await Linking.openSettings();
    }
  };

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.overlayRoot,
        {
          opacity: backdropAnim,
          zIndex: 99999,
          elevation: 99999,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Dim stationary backdrop tap to close */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      {/* Sheet sliding up from bottom to top */}
      <Animated.View
        style={[
          styles.sheetContainer,
          isDark && styles.sheetContainerDark,
          {
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        {/* Drag Pill Handle */}
        <View style={styles.dragHandleContainer}>
          <View style={[styles.dragHandle, isDark && styles.dragHandleDark]} />
        </View>

        {/* Square Cross Button with 5px Corner Curves */}
        <TouchableOpacity
          style={[styles.squareCloseBtn, isDark && styles.squareCloseBtnDark]}
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={15} color={isDark ? '#E2E8F0' : '#475569'} strokeWidth={2.4} />
        </TouchableOpacity>

        {/* Compact Clean Header Row */}
        <View style={styles.headerRow}>
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isDark
                  ? `${config.accentColor}20`
                  : `${config.accentColor}12`,
                borderColor: isDark
                  ? `${config.accentColor}40`
                  : `${config.accentColor}25`,
              },
            ]}
          >
            <IconComponent size={20} color={config.accentColor} strokeWidth={2.2} />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={[styles.modalTitle, isDark && styles.textWhite]}>
              {config.title}
            </Text>
            <Text style={[styles.modalDesc, isDark && styles.textMutedDark]}>
              {config.description}
            </Text>
          </View>
        </View>

        {/* Notice when permission was previously denied */}
        {!canAskAgain && (
          <View style={[styles.deniedNotice, isDark && styles.deniedNoticeDark]}>
            <Text style={[styles.deniedNoticeText, isDark && { color: '#FCD34D' }]}>
              Permission was previously disabled in Settings.
            </Text>
          </View>
        )}

        {/* Action Button Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.cancelBtn, isDark && styles.cancelBtnDark]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelBtnText, isDark && styles.textMutedDark]}>
              Not Now
            </Text>
          </TouchableOpacity>

          {canAskAgain ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: '#0F172A' }]}
              onPress={async () => {
                await onGrantPermission();
              }}
              activeOpacity={0.85}
            >
              <ShieldCheck size={15} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.primaryBtnText}>Allow Access</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: '#0F172A' }]}
              onPress={handleOpenSettings}
              activeOpacity={0.85}
            >
              <ExternalLink size={15} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.primaryBtnText}>Open Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlayRoot: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheetContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
    position: 'relative',
  },
  sheetContainerDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  dragHandleDark: {
    backgroundColor: '#475569',
  },
  squareCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 18,
    width: 28,
    height: 28,
    borderRadius: 5, // Exact 5px curved corners requested
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  squareCloseBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginTop: 10,
    marginBottom: 16,
    paddingRight: 32, // space for close button
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerTextCol: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  modalDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
    color: '#64748B',
  },
  deniedNotice: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  deniedNoticeDark: {
    backgroundColor: '#78350F25',
    borderColor: '#F59E0B',
  },
  deniedNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  primaryBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
