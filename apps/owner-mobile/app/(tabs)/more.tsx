/**
 * GymDeck Owner Mobile - Operations & Settings Hub
 *
 * Phase 09 — More Hub & Secondary Operations Architecture
 *
 * Information Architecture:
 * - Header & Identity Context
 * - A. OPERATIONS (Trainers & Staff, PT / Personal Training, Membership Plans)
 * - B. INSIGHTS (Reports & Analytics)
 * - C. COMMUNICATION (Notifications)
 * - D. GYM MANAGEMENT (Gym Settings)
 * - E. SYSTEM (Sync Status, Security & Devices)
 * - F. ACCOUNT & LOGOUT (Account Profile, Session Termination)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Dumbbell,
  CreditCard,
  BarChart3,
  Bell,
  Building2,
  RefreshCw,
  Shield,
  User,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { ownerNotificationService } from '../../src/services/api/ownerNotificationService';
import { ConfirmationDialog } from '../../src/components/ui/ConfirmationDialog';
import { allowDevVerificationNav } from '../../src/utils/nativeRuntimeDiagnostic';

interface HubRowProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  title: string;
  subtitle: string;
  badgeText?: string;
  badgeType?: 'notification' | 'success' | 'neutral';
  onPress: () => void;
  isLast?: boolean;
}

const HubRow: React.FC<HubRowProps> = ({
  icon,
  iconBgColor,
  title,
  subtitle,
  badgeText,
  badgeType = 'neutral',
  onPress,
  isLast = false,
}) => {
  const { colors, typography, radii } = useTheme();

  const getBadgeStyle = () => {
    switch (badgeType) {
      case 'notification':
        return {
          bg: colors.dangerBg,
          text: colors.dangerText,
          border: colors.dangerBorder,
        };
      case 'success':
        return {
          bg: colors.successBg,
          text: colors.successText,
          border: colors.successBorder,
        };
      case 'neutral':
      default:
        return {
          bg: colors.surfaceSubtle,
          text: colors.textSecondary,
          border: colors.borderSubtle,
        };
    }
  };

  const badgeStyle = getBadgeStyle();

  return (
    <TouchableOpacity
      style={[
        styles.hubRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
    >
      <View
        style={[
          styles.hubIconBox,
          {
            backgroundColor: iconBgColor || colors.primarySoft,
            borderColor: colors.borderSubtle,
            borderRadius: radii.md,
          },
        ]}
      >
        {icon}
      </View>

      <View style={styles.hubTextCol}>
        <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <Text
          style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>

      {badgeText && (
        <View
          style={[
            styles.badgePill,
            {
              backgroundColor: badgeStyle.bg,
              borderColor: badgeStyle.border,
              borderRadius: radii.xs,
            },
          ]}
        >
          <Text style={[typography.captionBold, { color: badgeStyle.text, fontSize: 11 }]}>
            {badgeText}
          </Text>
        </View>
      )}

      <ChevronRight size={18} color={colors.textMuted} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
};

export default function MoreScreen() {
  const router = useRouter();
  const { colors, typography, radii, shadows, layout } = useTheme();
  const { user, logout } = useAuthStore();
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  // Unread notifications count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['owner-unread-notifications'],
    queryFn: () => ownerNotificationService.getUnreadCount(),
    refetchInterval: 30000,
    enabled: Boolean(user?.gymId),
  });

  const handleLogout = async () => {
    setLogoutDialogVisible(false);
    await logout();
  };

  const initial = (user?.fullName || 'O').trim().charAt(0).toUpperCase();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: layout.bottomNavHeight + 52 },
        ]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* Screen Header */}
        <View style={styles.header}>
          <Text style={[typography.screenTitle, { color: colors.textPrimary, letterSpacing: -0.5 }]}>More</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            GymDeck operational hub & system settings
          </Text>
        </View>

        {/* Identity Context (Open Hero) */}
        <View style={[styles.identityHero, { borderBottomColor: colors.borderSubtle }]}>
          <View
            style={[
              styles.avatarBox,
              {
                backgroundColor: colors.primarySoft,
                borderColor: colors.primaryBorder,
                borderRadius: radii.full,
              },
            ]}
          >
            <Text style={[typography.sectionTitle, { color: colors.primary, fontSize: 18 }]}>{initial}</Text>
          </View>

          <View style={styles.identityTextGroup}>
            <Text style={[typography.cardTitle, { color: colors.textPrimary, fontSize: 16 }]}>
              {user?.fullName || 'Gym Owner'}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
              {user?.email || 'owner@gymdeck.com'}
            </Text>

            <View style={styles.identityBadgesRow}>
              <View
                style={[
                  styles.gymBadge,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderRadius: radii.full },
                ]}
              >
                <Building2 size={11} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[typography.captionBold, { color: colors.textSecondary, fontSize: 11 }]}>
                  {user?.gymName || 'Flagship Gym'} ({user?.gymCode || 'GD-HQ'})
                </Text>
              </View>

              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder, borderRadius: radii.full },
                ]}
              >
                <Text style={[typography.captionBold, { color: colors.primary, fontSize: 10 }]}>
                  {user?.role || 'OWNER'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION A: OPERATIONS */}
        <Text style={[typography.captionBold, { color: colors.textSecondary, letterSpacing: 0.5, marginTop: 16, marginBottom: 8 }]}>
          OPERATIONS
        </Text>
        <View style={[styles.groupedList, { borderColor: colors.borderSubtle }]}>
          <HubRow
            icon={<Users size={18} color={colors.primary} />}
            title="Trainers & Staff"
            subtitle="Manage trainers, staff and assignments"
            onPress={() => router.push('/trainers' as any)}
          />
          <HubRow
            icon={<Dumbbell size={18} color={colors.primary} />}
            title="PT / Personal Training"
            subtitle="Manage PT clients, packages and sessions"
            onPress={() => router.push('/pt' as any)}
          />
          <HubRow
            icon={<CreditCard size={18} color={colors.primary} />}
            title="Membership Plans"
            subtitle="Manage plans and pricing"
            onPress={() => router.push('/plans' as any)}
            isLast={true}
          />
        </View>

        {/* SECTION B: INSIGHTS & COMMUNICATION */}
        <Text style={[typography.captionBold, { color: colors.textSecondary, letterSpacing: 0.5, marginTop: 20, marginBottom: 8 }]}>
          INSIGHTS & UPDATES
        </Text>
        <View style={[styles.groupedList, { borderColor: colors.borderSubtle }]}>
          <HubRow
            icon={<BarChart3 size={18} color={colors.primary} />}
            title="Reports & Analytics"
            subtitle="View revenue, attendance and membership insights"
            onPress={() => router.push('/reports' as any)}
          />
          <HubRow
            icon={<Bell size={18} color={colors.primary} />}
            title="Notifications"
            subtitle="Operational push alerts and system updates"
            badgeText={unreadCount > 0 ? `${unreadCount} Unread` : undefined}
            badgeType={unreadCount > 0 ? 'notification' : 'neutral'}
            onPress={() => router.push('/notifications' as any)}
            isLast={true}
          />
        </View>

        {/* SECTION C: SYSTEM & PREFERENCES */}
        <Text style={[typography.captionBold, { color: colors.textSecondary, letterSpacing: 0.5, marginTop: 20, marginBottom: 8 }]}>
          SYSTEM & PREFERENCES
        </Text>
        <View style={[styles.groupedList, { borderColor: colors.borderSubtle }]}>
          <HubRow
            icon={<Building2 size={18} color={colors.primary} />}
            title="Gym Settings"
            subtitle="Manage gym information and preferences"
            onPress={() => router.push('/settings' as any)}
          />
          <HubRow
            icon={<RefreshCw size={18} color={colors.primary} />}
            title="Sync Status"
            subtitle="View cloud connection and synchronization state"
            badgeText="Connected"
            badgeType="success"
            onPress={() => router.push('/sync' as any)}
          />
          <HubRow
            icon={<Shield size={18} color={colors.primary} />}
            title="Security & Devices"
            subtitle="Login session security & active credentials"
            onPress={() => router.push('/security' as any)}
            isLast={true}
          />
        </View>

        {/* SECTION D: ACCOUNT */}
        <Text style={[typography.captionBold, { color: colors.textSecondary, letterSpacing: 0.5, marginTop: 20, marginBottom: 8 }]}>
          ACCOUNT
        </Text>
        <View style={[styles.groupedList, { borderColor: colors.borderSubtle }]}>
          <HubRow
            icon={<User size={18} color={colors.primary} />}
            title="Account Profile"
            subtitle="Profile details, credentials and security"
            onPress={() => router.push('/account' as any)}
            isLast={true}
          />
        </View>

        {__DEV__ && (
          <>
            <Text style={[typography.captionBold, { color: colors.warning, letterSpacing: 0.5, marginTop: 24, marginBottom: 8 }]}>
              DEVELOPMENT DIAGNOSTICS
            </Text>
            <View style={[styles.groupedList, { borderColor: colors.borderSubtle }]}>
              <HubRow
                icon={<ShieldCheck size={18} color={colors.warning} />}
                title="Native Verification"
                subtitle="Offline dependencies & SQLCipher test suite"
                badgeText="DEV ONLY"
                badgeType="notification"
                onPress={() => {
                  allowDevVerificationNav();
                  router.push('/dev-verification' as any);
                }}
                isLast={true}
              />
            </View>
          </>
        )}

        {/* Logout Action Button */}
        <View style={styles.logoutArea}>
          <TouchableOpacity
            style={[
              styles.logoutBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.borderSubtle,
                borderRadius: radii.full,
              },
            ]}
            onPress={() => setLogoutDialogVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Log out of GymDeck"
          >
            <LogOut size={16} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={[typography.captionBold, { color: colors.danger }]}>
              Log Out of GymDeck
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Dialog for Secure Logout */}
      <ConfirmationDialog
        visible={logoutDialogVisible}
        onClose={() => setLogoutDialogVisible(false)}
        onConfirm={handleLogout}
        title="Log Out of Session?"
        message={`Are you sure you want to end your current session for ${user?.fullName || 'this account'} on this device?`}
        confirmLabel="Confirm Log Out"
        cancelLabel="Cancel"
        isDestructive={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    marginBottom: 14,
  },
  identityHero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#E6F8F9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B2EBF2',
    marginBottom: 16,
  },
  avatarBox: {
    width: 46,
    height: 46,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  identityTextGroup: {
    flex: 1,
  },
  identityBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
    flexWrap: 'wrap',
  },
  gymBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  groupedList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  hubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 48,
  },
  hubIconBox: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  hubTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    marginRight: 4,
  },
  logoutArea: {
    marginTop: 20,
    marginBottom: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderWidth: 1,
  },
});
