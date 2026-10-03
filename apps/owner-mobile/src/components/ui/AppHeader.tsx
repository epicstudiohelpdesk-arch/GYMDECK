/**
 * GymDeck Owner Mobile - Standardized App Header
 *
 * Provides persistent top context:
 * - Branch / gym badge
 * - Unread notifications access (accessible target >= 44pt)
 * - Profile / account shortcut
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell, Shield, User } from 'lucide-react-native';
import { useTheme } from '../../theme';

interface AppHeaderProps {
  gymName: string;
  gymCode?: string;
  role?: string;
  unreadNotificationsCount?: number;
  onNotificationsPress: () => void;
  onAccountPress?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  gymName,
  gymCode,
  role = 'OWNER',
  unreadNotificationsCount = 0,
  onNotificationsPress,
  onAccountPress,
}) => {
  const { colors, typography, radii } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle }]}>
      {/* Left: Gym Identity Context */}
      <TouchableOpacity
        style={styles.gymContext}
        onPress={onAccountPress}
        disabled={!onAccountPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Gym: ${gymName}`}
      >
        <View style={[styles.brandIconBox, { backgroundColor: colors.primarySoft }]}>
          <Shield size={16} color={colors.primary} />
        </View>
        <View style={styles.gymInfo}>
          <Text style={[typography.cardTitle, { color: colors.textPrimary, fontSize: 16 }]} numberOfLines={1}>
            {gymName}
          </Text>
          <View style={styles.badgeRow}>
            {gymCode && (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {gymCode}
              </Text>
            )}
            {gymCode && <Text style={[typography.caption, { color: colors.textMuted }]}>•</Text>}
            <Text style={[typography.captionBold, { color: colors.primary, fontSize: 11 }]}>
              {role}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Right: Notifications & Account Touch Targets */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onNotificationsPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Notifications, ${unreadNotificationsCount} unread`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Bell size={20} color={colors.textPrimary} />
          {unreadNotificationsCount > 0 && (
            <View style={[styles.notifBadge, { backgroundColor: colors.danger, borderColor: colors.surface }]}>
              <Text style={[styles.notifBadgeText, { color: colors.textOnPrimary }]}>
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {onAccountPress && (
          <TouchableOpacity
            style={[styles.actionBtn, { marginLeft: 4 }]}
            onPress={onAccountPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Account and security settings"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <User size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  gymContext: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  brandIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  gymInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  gymBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
});
