/**
 * GymDeck Owner Mobile - Member Registered Success Modal
 *
 * Professional, clean & compact bottom-sheet modal:
 * - Slides smoothly from bottom to top
 * - Square close button with 5px curved corners
 * - Concise, uncluttered typography and design
 * - Displays member details (Name, Contact, Plan/Membership status)
 * - Clear primary call-to-actions (View Profile / Done)
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
  Modal,
} from 'react-native';
import { Check, X, User, Phone, Sparkles, ShieldCheck } from 'lucide-react-native';

export interface MemberSuccessData {
  memberId?: string;
  fullName: string;
  phone?: string;
  planName?: string;
  isEdit?: boolean;
}

export interface MemberRegisteredSuccessModalProps {
  visible: boolean;
  data: MemberSuccessData | null;
  isDark?: boolean;
  onClose: () => void;
  onViewProfile?: (memberId: string) => void;
}

export const MemberRegisteredSuccessModal: React.FC<MemberRegisteredSuccessModalProps> = ({
  visible,
  data,
  isDark = false,
  onClose,
  onViewProfile,
}) => {
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(350)).current;

  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(350);
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
          toValue: 350,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible && !data) return null;

  const isEdit = data?.isEdit ?? false;
  const memberName = data?.fullName?.trim() || 'Member';
  const phone = data?.phone?.trim();
  const plan = data?.planName?.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        {/* Backdrop */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            { opacity: backdropAnim },
          ]}
        >
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* Bottom Sheet Card */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Subtle Pull Indicator */}
          <View style={styles.pullIndicatorWrapper}>
            <View
              style={[
                styles.pullIndicator,
                { backgroundColor: isDark ? '#334155' : '#CBD5E1' },
              ]}
            />
          </View>

          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.badgeIconBox,
                  { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' },
                ]}
              >
                <Check
                  size={16}
                  color={isDark ? '#34D399' : '#059669'}
                  strokeWidth={2.5}
                />
              </View>
              <View style={styles.headerTextCol}>
                <Text
                  style={[
                    styles.title,
                    { color: isDark ? '#F8FAFC' : '#0F172A' },
                  ]}
                  numberOfLines={1}
                >
                  {isEdit ? 'Profile Updated' : 'Member Enrolled'}
                </Text>
                <Text
                  style={[
                    styles.caption,
                    { color: isDark ? '#94A3B8' : '#64748B' },
                  ]}
                >
                  Active & Synced to Roster
                </Text>
              </View>
            </View>

            {/* Square Close Button with 5px curved corners */}
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                styles.squareCloseBtn,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
              activeOpacity={0.7}
            >
              <X
                size={14}
                color={isDark ? '#94A3B8' : '#64748B'}
                strokeWidth={2.4}
              />
            </TouchableOpacity>
          </View>

          {/* Member Card Summary */}
          <View
            style={[
              styles.memberSummaryBox,
              {
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.summaryTop}>
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                ]}
              >
                <User
                  size={18}
                  color={isDark ? '#94A3B8' : '#64748B'}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.summaryInfo}>
                <Text
                  style={[
                    styles.summaryName,
                    { color: isDark ? '#FFFFFF' : '#0F172A' },
                  ]}
                  numberOfLines={1}
                >
                  {memberName}
                </Text>
                <View style={styles.summaryTags}>
                  <View
                    style={[
                      styles.tagBadge,
                      { backgroundColor: isDark ? '#052E16' : '#DCFCE7' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagBadgeText,
                        { color: isDark ? '#4ADE80' : '#16A34A' },
                      ]}
                    >
                      Active
                    </Text>
                  </View>
                  {plan ? (
                    <Text
                      style={[
                        styles.summaryMeta,
                        { color: isDark ? '#94A3B8' : '#64748B' },
                      ]}
                      numberOfLines={1}
                    >
                      • {plan}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            {phone ? (
              <View
                style={[
                  styles.summaryContactRow,
                  { borderTopColor: isDark ? '#334155' : '#E2E8F0' },
                ]}
              >
                <Phone
                  size={12}
                  color={isDark ? '#94A3B8' : '#64748B'}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.summaryContactText,
                    { color: isDark ? '#CBD5E1' : '#475569' },
                  ]}
                >
                  {phone}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            {onViewProfile && data?.memberId ? (
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
                onPress={() => {
                  onClose();
                  if (data.memberId) {
                    onViewProfile(data.memberId);
                  }
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.secondaryBtnText,
                    { color: isDark ? '#E2E8F0' : '#334155' },
                  ]}
                >
                  View Profile
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: '#0F172A',
                  flex: 1,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetContainer: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 20,
  },
  pullIndicatorWrapper: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  pullIndicator: {
    width: 32,
    height: 3.5,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  badgeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  squareCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberSummaryBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryName: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  summaryTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  summaryMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summaryContactText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryBtn: {
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
