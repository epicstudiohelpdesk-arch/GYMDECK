/**
 * GymDeck Owner Mobile - Account & Owner Profile Screen
 *
 * Phase 12 — Settings + Security + Account + Sync Experience
 *
 * Requirements:
 * - Read-only display of owner session identity
 * - Explicit confirmation-gated logout flow
 * - Section header "SESSION"
 * - ConfirmationDialog: "Sign out?", "You'll need to sign in again to access this gym."
 * - Preserves existing authStore.logout() behavior
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme';
import { useAuthStore } from '../src/store/authStore';
import { ConfirmationDialog } from '../src/components/ui/ConfirmationDialog';
import {
  ArrowLeft,
  User,
  Mail,
  Building2,
  LogOut,
  CheckCircle2,
  Phone,
  Shield,
} from 'lucide-react-native';

export default function AccountScreen() {
  const router = useRouter();
  const { colors, typography, radii, shadows } = useTheme();
  const { user, logout } = useAuthStore();
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  const initial = (user?.fullName || 'O').trim().charAt(0).toUpperCase();

  const handleLogout = async () => {
    setLogoutDialogVisible(false);
    await logout();
  };

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
          <Text style={[typography.screenTitle, { color: colors.textPrimary, letterSpacing: -0.5 }]}>
            Account Profile
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
            Owner credentials and session details
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* SECTION 1: PROFILE IDENTITY (Open Hero) */}
        <View style={styles.openHero}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder, borderRadius: radii.full },
            ]}
          >
            <Text style={[typography.display, { color: colors.primary, fontSize: 24 }]}>{initial}</Text>
          </View>

          <Text style={[typography.sectionTitle, { color: colors.textPrimary, marginTop: 10, fontSize: 18 }]}>
            {user?.fullName || 'Gym Owner'}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            {user?.email || 'owner@gymdeck.com'}
          </Text>

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.rolePill,
                { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder, borderRadius: radii.full },
              ]}
            >
              <Text style={[typography.captionBold, { color: colors.primary, fontSize: 10 }]}>
                {user?.role || 'OWNER'}
              </Text>
            </View>
            <View
              style={[
                styles.verifiedPill,
                { backgroundColor: colors.successBg, borderColor: colors.successBorder, borderRadius: radii.full },
              ]}
            >
              <CheckCircle2 size={11} color={colors.success} style={{ marginRight: 4 }} />
              <Text style={[typography.captionBold, { color: colors.successText, fontSize: 10 }]}>
                Verified Administrator
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: CREDENTIALS & TENANT INFO */}
        <Text style={[typography.captionBold, { color: colors.textSecondary, letterSpacing: 0.5, marginTop: 20, marginBottom: 8 }]}>
          CREDENTIALS & TENANT
        </Text>

        <View style={[styles.groupedList, { borderColor: colors.borderSubtle }]}>
          {/* Full Name */}
          <View style={styles.row}>
            <View style={styles.iconLabelRow}>
              <User size={15} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Full Name</Text>
            </View>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              {user?.fullName || 'Gym Owner'}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Email */}
          <View style={styles.row}>
            <View style={styles.iconLabelRow}>
              <Mail size={15} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Login Email</Text>
            </View>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              {user?.email || 'owner@gymdeck.com'}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Phone */}
          <View style={styles.row}>
            <View style={styles.iconLabelRow}>
              <Phone size={15} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Contact Phone</Text>
            </View>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              {user?.phoneNumber || 'Not provided'}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Gym Tenant */}
          <View style={styles.row}>
            <View style={styles.iconLabelRow}>
              <Building2 size={15} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Gym Tenant</Text>
            </View>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              {user?.gymName || 'Flagship Gym'} ({user?.gymCode || 'GD-HQ'})
            </Text>
          </View>
        </View>

        {/* SECTION 3: SESSION MANAGEMENT */}
        <Text style={[typography.captionBold, { color: colors.textSecondary, letterSpacing: 0.5, marginTop: 24, marginBottom: 8 }]}>
          SESSION
        </Text>

        <View style={styles.logoutContainer}>
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
            accessibilityLabel="Sign out of GymDeck"
          >
            <LogOut size={16} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={[typography.captionBold, { color: colors.danger }]}>
              Sign out of GymDeck
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Dialog (Preserves authStore.logout()) */}
      <ConfirmationDialog
        visible={logoutDialogVisible}
        onClose={() => setLogoutDialogVisible(false)}
        onConfirm={handleLogout}
        title="Sign out?"
        message="You'll need to sign in again to access this gym."
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        isDestructive={true}
      />
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
  openHero: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  groupedList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 46,
  },
  iconLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
  },
  logoutContainer: {
    marginTop: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderWidth: 1,
  },
});
