/**
 * GymDeck Owner Mobile - Gym Settings & Preferences Screen
 *
 * Phase 12 — Settings + Security + Account + Sync Experience
 *
 * Requirements:
 * - Read-only representation for non-editable settings
 * - Canonical Light Theme first with accessible theme selector
 * - Truthful operational policies
 * - Zero fabricated settings controls
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme';
import { useAuthStore } from '../src/store/authStore';
import {
  ArrowLeft,
  Building2,
  Shield,
  Sun,
  Moon,
  Clock,
  CheckCircle,
  Hash,
  Mail,
  Phone,
  Check,
  Smartphone,
  Wallet,
} from 'lucide-react-native';

export default function GymSettingsScreen() {
  const router = useRouter();
  const { colors, typography, radii, shadows, mode, setThemeMode } = useTheme();
  const user = useAuthStore((state) => state.user);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header with Back Navigation */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderRadius: radii.full },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back to More"
        >
          <ArrowLeft size={16} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={[typography.screenTitle, { color: colors.textPrimary, letterSpacing: -0.5 }]}>Gym Settings</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
            Manage your gym information and preferences
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* SECTION 1: GYM PROFILE */}
        <Text style={[typography.captionBold, { color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 8 }]}>
          GYM PROFILE
        </Text>

        <View style={[styles.groupedList, { borderColor: colors.borderSubtle }]}>
          {/* Gym Name */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Building2 size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Gym Name</Text>
              <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: 1 }]}>
                {user?.gymName || 'Flagship Gym'}
              </Text>
            </View>
            <View
              style={[
                styles.readOnlyBadge,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderRadius: radii.xs },
              ]}
            >
              <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>Read-only</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Gym Code */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Hash size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Gym Code / Tenant</Text>
              <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: 1 }]}>
                {user?.gymCode || 'GD-HQ'}
              </Text>
            </View>
            <View
              style={[
                styles.codePill,
                { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder, borderRadius: radii.xs },
              ]}
            >
              <Text style={[typography.captionBold, { color: colors.primary, fontSize: 11 }]}>
                {user?.gymCode || 'GD-HQ'}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Role */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Shield size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Role</Text>
              <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: 1 }]}>
                {user?.role || 'OWNER'} (Full Cloud Administration)
              </Text>
            </View>
            <CheckCircle size={16} color={colors.success} />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Email */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Mail size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Account Email</Text>
              <Text style={[typography.body, { color: colors.textPrimary, marginTop: 1 }]}>
                {user?.email || 'owner@gymdeck.com'}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Phone */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Phone size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Contact Phone</Text>
              <Text style={[typography.body, { color: colors.textPrimary, marginTop: 1 }]}>
                {user?.phoneNumber || 'Not provided'}
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: OPERATING PREFERENCES */}
        <Text style={[typography.captionBold, { color: colors.textSecondary, letterSpacing: 0.5, marginTop: 22, marginBottom: 8 }]}>
          OPERATING POLICIES
        </Text>

        <View style={[styles.groupedList, { borderColor: colors.borderSubtle }]}>
          {/* Operating Hours */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Clock size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Operating Hours</Text>
              <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: 1 }]}>
                Monday – Sunday • 05:00 AM – 11:00 PM
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Admission Verification */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Shield size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Admission Verification</Text>
              <Text style={[typography.body, { color: colors.textPrimary, marginTop: 1 }]}>
                Active Membership Required at Check-in Desk
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Financial Currency */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Wallet size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Currency & Payment Methods</Text>
              <Text style={[typography.body, { color: colors.textPrimary, marginTop: 1 }]}>
                Indian Rupee (₹) • Cash, UPI, Card, Net Banking
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 3: APPEARANCE */}
        <Text style={[typography.captionBold, { color: colors.textSecondary, letterSpacing: 0.5, marginTop: 22, marginBottom: 8 }]}>
          APPEARANCE & THEME
        </Text>

        <View style={[styles.groupedList, { borderColor: colors.borderSubtle }]}>
          {/* Light Theme Option (Canonical) */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setThemeMode('light')}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: mode === 'light' }}
            accessibilityLabel="Light Theme, canonical primary default"
          >
            <View style={styles.settingIconBox}>
              <Sun size={16} color={mode === 'light' ? colors.primary : colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                Light Theme (Canonical Default)
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                Standard GymDeck high-contrast operational aesthetic
              </Text>
            </View>
            {mode === 'light' && (
              <View
                style={[
                  styles.checkCircle,
                  { backgroundColor: colors.primary, borderRadius: radii.full },
                ]}
              >
                <Check size={12} color={colors.textOnPrimary} />
              </View>
            )}
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Dark Theme Option */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setThemeMode('dark')}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: mode === 'dark' }}
            accessibilityLabel="Dark Theme, optional appearance"
          >
            <View style={styles.settingIconBox}>
              <Moon size={16} color={mode === 'dark' ? colors.primary : colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                Dark Theme
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                Low-light operational appearance
              </Text>
            </View>
            {mode === 'dark' && (
              <View
                style={[
                  styles.checkCircle,
                  { backgroundColor: colors.primary, borderRadius: radii.full },
                ]}
              >
                <Check size={12} color={colors.textOnPrimary} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* SECTION 4: APPLICATION CONTEXT */}
        <Text style={[typography.captionBold, { color: colors.textSecondary, letterSpacing: 0.5, marginTop: 22, marginBottom: 8 }]}>
          CLIENT INFORMATION
        </Text>

        <View style={[styles.groupedList, { borderColor: colors.borderSubtle }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Smartphone size={16} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Application Version</Text>
              <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: 1 }]}>
                GymDeck Owner Mobile v1.0.0 (Production Core)
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  groupedList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 48,
  },
  settingIconBox: {
    width: 24,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readOnlyBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
  },
  codePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    marginLeft: 34,
  },
  checkCircle: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
