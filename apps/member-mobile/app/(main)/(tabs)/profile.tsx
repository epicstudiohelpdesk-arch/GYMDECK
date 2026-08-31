/**
 * GymDeck Member Mobile - Profile & Account Settings Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Mail,
  Phone,
  Building2,
  Moon,
  Sun,
  Laptop,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Award,
} from 'lucide-react-native';
import { useTheme } from '../../../src/theme';
import { useAuthStore, useThemeStore, queryClient } from '../../../src/store';
import { authService } from '../../../src/services/api';
import { PrimaryButton } from '../../../src/components';

export default function ProfileScreen() {
  const { colors, radii, spacing, themeMode } = useTheme();
  const router = useRouter();
  const { user, clearSession } = useAuthStore();
  const { setThemeMode } = useThemeStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'M';

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your member account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await authService.logout();
          } finally {
            // Critical Cache Isolation: Wipe all member queries so Member B never sees Member A data
            queryClient.clear();
            await clearSession();
            setLoggingOut(false);
            router.replace('/(auth)/login');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
            Member Profile
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
            Account credentials, club affiliations, and app preferences.
          </Text>
        </View>

        {/* User Card */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.xl,
              padding: spacing.xl,
            },
          ]}
        >
          <View style={styles.profileTop}>
            <View
              style={[
                styles.largeAvatar,
                {
                  backgroundColor: colors.brand.primary,
                  borderRadius: radii.full,
                },
              ]}
            >
              <Text style={styles.largeAvatarText}>{initials}</Text>
            </View>

            <View style={styles.profileDetails}>
              <Text style={[styles.fullNameText, { color: colors.textPrimary }]}>
                {user?.fullName || 'Athlete Member'}
              </Text>
              <View style={[styles.verifiedPill, { backgroundColor: colors.status.successBg }]}>
                <ShieldCheck size={12} color={colors.status.success} />
                <Text style={[styles.verifiedPillText, { color: colors.status.success }]}>
                  MEMBER VERIFIED
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Mail size={16} color={colors.textMuted} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email:</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {user?.email || 'N/A'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Phone size={16} color={colors.textMuted} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone:</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {user?.phone || 'Unset'}{' '}
                <Text style={{ fontSize: 10, color: colors.textMuted }}>(Unverified)</Text>
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Building2 size={16} color={colors.textMuted} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Gym ID:</Text>
              <Text style={[styles.infoValue, { color: colors.brand.secondary }]}>
                {user?.gymId || 'Unlinked'}
              </Text>
            </View>
          </View>
        </View>

        {/* Member Services & Portals */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Member Portals & Services
          </Text>

          <View
            style={[
              styles.portalLinksCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.lg,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => router.push('/details/trainer' as any)}
              style={[styles.portalRow, { borderBottomColor: colors.borderSubtle }]}
              accessibilityRole="button"
              accessibilityLabel="View assigned personal trainer"
            >
              <User size={18} color={colors.brand.primary} />
              <Text style={[styles.portalText, { color: colors.textPrimary }]}>
                Assigned Personal Trainer
              </Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/details/pt-packages' as any)}
              style={[styles.portalRow, { borderBottomColor: colors.borderSubtle }]}
              accessibilityRole="button"
              accessibilityLabel="View PT packages and sessions"
            >
              <Building2 size={18} color={colors.brand.secondary} />
              <Text style={[styles.portalText, { color: colors.textPrimary }]}>
                PT Packages & Session Credits
              </Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/details/documents' as any)}
              style={[styles.portalRow, { borderBottomColor: colors.borderSubtle }]}
              accessibilityRole="button"
              accessibilityLabel="Open document vault"
            >
              <ShieldCheck size={18} color={colors.status.success} />
              <Text style={[styles.portalText, { color: colors.textPrimary }]}>
                Document Vault & Agreements
              </Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/details/progress' as any)}
              style={[styles.portalRow, { borderBottomColor: colors.borderSubtle }]}
              accessibilityRole="button"
              accessibilityLabel="View fitness progress and measurements"
            >
              <Award size={18} color="#38BDF8" />
              <Text style={[styles.portalText, { color: colors.textPrimary }]}>
                Body Weight & Measurements Log
              </Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/details/notifications' as any)}
              style={styles.portalRow}
              accessibilityRole="button"
              accessibilityLabel="Open notification center"
            >
              <Mail size={18} color="#F59E0B" />
              <Text style={[styles.portalText, { color: colors.textPrimary }]}>
                Notifications & Announcements
              </Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Theme & Appearance
          </Text>

          <View
            style={[
              styles.themeSelector,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.lg,
                padding: spacing.sm,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setThemeMode('dark')}
              style={[
                styles.themeOption,
                themeMode === 'dark' && {
                  backgroundColor: colors.brand.primary,
                  borderRadius: radii.md,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Dark theme"
            >
              <Moon
                size={16}
                color={themeMode === 'dark' ? '#FFFFFF' : colors.textMuted}
              />
              <Text
                style={[
                  styles.themeText,
                  { color: themeMode === 'dark' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Dark
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setThemeMode('light')}
              style={[
                styles.themeOption,
                themeMode === 'light' && {
                  backgroundColor: colors.brand.primary,
                  borderRadius: radii.md,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Light theme"
            >
              <Sun
                size={16}
                color={themeMode === 'light' ? '#FFFFFF' : colors.textMuted}
              />
              <Text
                style={[
                  styles.themeText,
                  { color: themeMode === 'light' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Light
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setThemeMode('system')}
              style={[
                styles.themeOption,
                themeMode === 'system' && {
                  backgroundColor: colors.brand.primary,
                  borderRadius: radii.md,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="System theme"
            >
              <Laptop
                size={16}
                color={themeMode === 'system' ? '#FFFFFF' : colors.textMuted}
              />
              <Text
                style={[
                  styles.themeText,
                  { color: themeMode === 'system' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                System
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Actions */}
        <View style={[styles.section, { marginTop: spacing.xl }]}>
          <PrimaryButton
            title="Sign Out of GymDeck"
            variant="outline"
            icon={<LogOut size={18} color={colors.status.error} />}
            textStyle={{ color: colors.status.error }}
            onPress={handleLogout}
            loading={loggingOut}
          />
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  profileCard: {
    width: '100%',
    borderWidth: 1,
    marginBottom: 24,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  largeAvatar: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeAvatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  profileDetails: {
    flex: 1,
  },
  fullNameText: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  infoList: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    width: 65,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  section: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  portalLinksCard: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  portalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  portalText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  themeSelector: {
    flexDirection: 'row',
    borderWidth: 1,
    gap: 6,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  themeText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
