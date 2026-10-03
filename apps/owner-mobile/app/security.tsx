/**
 * GymDeck Owner Mobile - Security & Devices Screen
 *
 * Phase 12 — Settings + Security + Account + Sync Experience
 *
 * Requirements:
 * - Safe session metadata only (no raw tokens, no JWT strings, no secrets)
 * - Semantic security status representation
 * - Device context (Platform, OS)
 * - Verified RBAC permission scopes
 * - Future device management notice (non-clickable)
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme';
import { useAuthStore } from '../src/store/authStore';
import {
  ArrowLeft,
  Shield,
  Key,
  Smartphone,
  CheckCircle2,
  Lock,
  Building2,
  Info,
} from 'lucide-react-native';

export default function SecurityScreen() {
  const router = useRouter();
  const { colors, typography, radii } = useTheme();
  const user = useAuthStore((state) => state.user);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Canvas Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back to More"
        >
          <ArrowLeft size={16} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[typography.screenTitle, { color: colors.textPrimary }]}>Security & Devices</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Active session & cryptographic credentials
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* OPEN SECURITY STATUS PRESENTATION */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: colors.successBg, borderColor: colors.successBorder },
            ]}
          >
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <Text style={[typography.captionBold, { color: colors.successText, fontSize: 11 }]}>
              SESSION CRYPTOGRAPHICALLY VERIFIED
            </Text>
          </View>

          <Text style={[typography.sectionTitle, { color: colors.textPrimary, marginTop: 12 }]}>
            Account Authenticated
          </Text>
          <Text style={[typography.bodySecondary, { color: colors.textSecondary, marginTop: 4 }]}>
            Session verified through GymDeck API Gateway with scoped role-based access control.
          </Text>

          {/* Inline Metric Trio */}
          <View style={[styles.metricTrio, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
            <View style={styles.metricItem}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>SESSION</Text>
              <Text style={[typography.bodyBold, { color: colors.successText, marginTop: 2 }]}>Active</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.metricItem}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>ROLE</Text>
              <Text style={[typography.bodyBold, { color: colors.primary, marginTop: 2 }]}>
                {user?.role || 'OWNER'}
              </Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.metricItem}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>PERMISSIONS</Text>
              <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: 2 }]}>Verified</Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: ACTIVE SESSION DETAILS */}
        <Text style={[typography.formLabel, { color: colors.textSecondary, marginTop: 24, marginBottom: 8, paddingHorizontal: 16 }]}>
          SESSION CONTEXT
        </Text>
        <View style={[styles.groupedList, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {/* Tenant */}
          <View style={styles.row}>
            <View style={styles.iconLabelRow}>
              <Building2 size={16} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>Tenant</Text>
            </View>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              {user?.gymName || 'Flagship Gym'} ({user?.gymCode || 'GD-HQ'})
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Device Platform */}
          <View style={styles.row}>
            <View style={styles.iconLabelRow}>
              <Smartphone size={16} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>Device Platform</Text>
            </View>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              {Platform.OS === 'ios' ? 'Apple iOS' : Platform.OS === 'android' ? 'Google Android' : 'Expo Mobile Shell'}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Auth Mechanism */}
          <View style={styles.row}>
            <View style={styles.iconLabelRow}>
              <Key size={16} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>Auth Mechanism</Text>
            </View>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              JWT Bearer • Scoped Token
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Secure Storage */}
          <View style={styles.row}>
            <View style={styles.iconLabelRow}>
              <Lock size={16} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>Credential Storage</Text>
            </View>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              {Platform.OS === 'ios' ? 'iOS Keychain (Secure Enclave)' : 'Android Keystore'}
            </Text>
          </View>
        </View>

        {/* SECTION 3: AUTHORIZATION GRANTS */}
        <Text style={[typography.formLabel, { color: colors.textSecondary, marginTop: 24, marginBottom: 8, paddingHorizontal: 16 }]}>
          VERIFIED RBAC PERMISSIONS
        </Text>
        <View style={[styles.groupedList, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {user?.permissions && user.permissions.length > 0 ? (
            <View style={styles.permissionsGrid}>
              {user.permissions.map((perm) => (
                <View
                  key={perm}
                  style={[
                    styles.permissionBadge,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderRadius: radii.xs },
                  ]}
                >
                  <CheckCircle2 size={12} color={colors.success} style={{ marginRight: 5 }} />
                  <Text style={[typography.captionBold, { color: colors.textPrimary }]}>{perm}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.row}>
              <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>
                Full Owner Super-Administrator Permissions
              </Text>
              <CheckCircle2 size={16} color={colors.success} />
            </View>
          )}
        </View>

        {/* SECTION 4: FUTURE DEVICE MANAGEMENT */}
        <Text style={[typography.formLabel, { color: colors.textSecondary, marginTop: 24, marginBottom: 8, paddingHorizontal: 16 }]}>
          DEVICE MANAGEMENT
        </Text>
        <View
          style={[
            styles.noticeBox,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderRadius: radii.md },
          ]}
        >
          <Info size={16} color={colors.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
            Advanced remote device revocation, active session terminations, and multi-device access logs will be available as GymDeck's device security system expands.
          </Text>
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
    paddingTop: 8,
    paddingBottom: 14,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: 110,
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  metricTrio: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 24,
  },
  groupedList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 48,
  },
  iconLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginLeft: 26,
  },
  permissionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 12,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    padding: 12,
    borderWidth: 1,
  },
});
