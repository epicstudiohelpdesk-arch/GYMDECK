/**
 * GymDeck Member Mobile - Member Dashboard Header Component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { UserProfile, GymTenant } from '../../types';

export interface MemberHeaderProps {
  member: UserProfile;
  gym?: GymTenant;
  unreadNotifications?: number;
  onNotificationPress?: () => void;
}

export const MemberHeader: React.FC<MemberHeaderProps> = ({
  member,
  gym,
  unreadNotifications = 0,
  onNotificationPress,
}) => {
  const { colors, radii, spacing } = useTheme();

  const firstName = member.fullName.split(' ')[0] || 'Member';
  const initials = member.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.container, { marginBottom: spacing.md }]}>
      <View style={styles.topRow}>
        <View style={styles.userSection}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: colors.brand.primary,
                borderRadius: radii.full,
              },
            ]}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.nameWrapper}>
            <View style={styles.greetingRow}>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>
                Welcome back,
              </Text>
              <View style={[styles.verifiedBadge, { backgroundColor: colors.status.successBg }]}>
                <ShieldCheck size={12} color={colors.status.success} />
              </View>
            </View>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              {firstName}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onNotificationPress}
          style={[
            styles.notificationButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.md,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Notifications, ${unreadNotifications} unread`}
        >
          <Bell size={20} color={colors.textPrimary} />
          {unreadNotifications > 0 && (
            <View style={[styles.badgeDot, { backgroundColor: colors.brand.primary }]} />
          )}
        </TouchableOpacity>
      </View>

      {gym && (
        <View style={[styles.gymBanner, { backgroundColor: colors.surfaceSubtle, borderRadius: radii.sm }]}>
          <Text style={[styles.gymText, { color: colors.brand.secondary }]}>
            {gym.name}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nameWrapper: {
    justifyContent: 'center',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '500',
  },
  verifiedBadge: {
    padding: 2,
    borderRadius: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gymBanner: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  gymText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default MemberHeader;
