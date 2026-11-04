/**
 * GymDeck Member Mobile - Profile & Account Settings Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Sparkles,
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg, paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <View style={[styles.badgePill, { backgroundColor: '#E0E9FD' }]}>
              <Sparkles size={12} color="#4F75E3" />
              <Text style={[styles.badgePillText, { color: '#4F75E3' }]}>ATHLETE ACCOUNT • GYMDECK</Text>
            </View>
          </View>
          <Text style={[styles.screenTitle, { color: '#111827' }]}>
            Member Profile
          </Text>
          <Text style={[styles.screenSubtitle, { color: '#6B7280' }]}>
            Account credentials, club affiliations, and app preferences.
          </Text>
        </View>

        {/* User Card */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: '#FFFFFF',
              borderColor: '#E5E7EB',
              borderRadius: 28,
              padding: spacing.xl,
            },
          ]}
        >
          <View style={styles.profileTop}>
            <View
              style={[
                styles.largeAvatar,
                {
                  backgroundColor: '#4F75E3',
                  borderRadius: radii.full,
                },
              ]}
            >
              <Text style={styles.largeAvatarText}>{initials}</Text>
            </View>

            <View style={styles.profileDetails}>
              <Text style={[styles.fullNameText, { color: '#111827' }]}>
                {user?.fullName || 'Athlete Member'}
              </Text>
              <View style={[styles.verifiedPill, { backgroundColor: '#ECFDF5' }]}>
                <ShieldCheck size={12} color="#10B981" />
                <Text style={[styles.verifiedPillText, { color: '#10B981' }]}>
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
                backgroundColor: '#FFFFFF',
                borderColor: '#E5E7EB',
                borderRadius: 26,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => router.push('/details/trainer' as any)}
              style={[styles.portalRow, { borderBottomColor: '#F3F4F6' }]}
              accessibilityRole="button"
              accessibilityLabel="View assigned personal trainer"
            >
              <User size={18} color="#4F75E3" />
              <Text style={[styles.portalText, { color: '#111827' }]}>
                Assigned Personal Trainer
              </Text>
              <ChevronRight size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/details/pt-packages' as any)}
              style={[styles.portalRow, { borderBottomColor: '#F3F4F6' }]}
              accessibilityRole="button"
              accessibilityLabel="View PT packages and sessions"
            >
              <Building2 size={18} color="#F59D42" />
              <Text style={[styles.portalText, { color: '#111827' }]}>
                PT Packages & Session Credits
              </Text>
              <ChevronRight size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/details/documents' as any)}
              style={[styles.portalRow, { borderBottomColor: '#F3F4F6' }]}
              accessibilityRole="button"
              accessibilityLabel="Open document vault"
            >
              <ShieldCheck size={18} color="#10B981" />
              <Text style={[styles.portalText, { color: '#111827' }]}>
                Document Vault & Agreements
              </Text>
              <ChevronRight size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/details/progress' as any)}
              style={[styles.portalRow, { borderBottomColor: '#F3F4F6' }]}
              accessibilityRole="button"
              accessibilityLabel="View fitness progress and measurements"
            >
              <Award size={18} color="#38BDF8" />
              <Text style={[styles.portalText, { color: '#111827' }]}>
                Body Weight & Measurements Log
              </Text>
              <ChevronRight size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/details/notifications' as any)}
              style={styles.portalRow}
              accessibilityRole="button"
              accessibilityLabel="Open notification center"
            >
              <Mail size={18} color="#F59D42" />
              <Text style={[styles.portalText, { color: '#111827' }]}>
                Notifications & Announcements
              </Text>
              <ChevronRight size={16} color="#9CA3AF" />
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
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  screenTitle: {
    fontSize: 26,
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  largeAvatar: {
    width: 64,
    height: 64,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
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
    fontWeight: '700',
    width: 65,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  section: {
    width: '100%',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  portalLinksCard: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
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
    fontWeight: '700',
    flex: 1,
  },
  themeSelector: {
    flexDirection: 'row',
    borderWidth: 1,
    gap: 6,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    padding: 6,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderRadius: 18,
  },
  themeText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
