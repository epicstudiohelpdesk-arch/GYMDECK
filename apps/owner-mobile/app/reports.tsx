/**
 * GymDeck Owner Mobile - Reports & Analytics Screen
 *
 * Phase 11 — Reports & Analytics + Notifications Experience
 *
 * Principles:
 * - REAL DATA ONLY. Zero fabricated metrics, charts, or percentages.
 * - Clear distinction: AVAILABLE NOW vs PLANNED ARCHITECTURE
 * - Operational shortcuts to live data-backed systems:
 *   → Financial Ledger (/finance)
 *   → Attendance Roster (/attendance)
 *   → Member Directory (/members)
 *   → Coaching Staff (/trainers)
 * - Transparent description of upcoming cloud BI capabilities.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme';
import {
  ArrowLeft,
  BarChart3,
  Wallet,
  CalendarCheck,
  Users,
  Award,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Clock,
  Info,
  Layers,
} from 'lucide-react-native';

interface OperationalShortcutProps {
  icon: React.ReactNode;
  iconBgColor: string;
  iconBorderColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const OperationalShortcut: React.FC<OperationalShortcutProps> = ({
  icon,
  iconBgColor,
  iconBorderColor,
  title,
  subtitle,
  onPress,
}) => {
  const { colors, typography, radii } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.shortcutRow,
        {
          borderBottomColor: colors.borderSubtle,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
    >
      <View
        style={[
          styles.shortcutIconBox,
          { backgroundColor: iconBgColor, borderRadius: radii.full },
        ]}
      >
        {icon}
      </View>

      <View style={styles.shortcutTextCol}>
        <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <ArrowRight size={16} color={colors.textMuted} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
};

export default function ReportsScreen() {
  const router = useRouter();
  const { colors, typography, radii, shadows } = useTheme();

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
            Reports & Analytics
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
            Gym performance and operational activity
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* Architecture Status Open Hero */}
        <View style={styles.openHero}>
          <View
            style={[
              styles.heroIconBox,
              { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder, borderRadius: radii.full },
            ]}
          >
            <BarChart3 size={22} color={colors.primary} />
          </View>

          <Text style={[typography.sectionTitle, { color: colors.textPrimary, marginTop: 10, fontSize: 17 }]}>
            Reports & Business Intelligence
          </Text>
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginTop: 4, textAlign: 'center', lineHeight: 18, maxWidth: 320 },
            ]}
          >
            Detailed analytics and exportable reporting will appear here. In the meantime, inspect real operational data through existing workspaces below.
          </Text>
        </View>

        {/* SECTION A: AVAILABLE NOW (Operational Shortcuts) */}
        <Text style={[typography.captionBold, { color: colors.textSecondary, letterSpacing: 0.5, marginTop: 20, marginBottom: 8 }]}>
          AVAILABLE NOW (LIVE OPERATIONAL SOURCES)
        </Text>

        <View style={[styles.groupedList, { borderColor: colors.borderSubtle }]}>
          {/* 1. Financial Ledger */}
          <OperationalShortcut
            icon={<Wallet size={16} color={colors.primary} />}
            iconBgColor={colors.primarySoft}
            iconBorderColor={colors.primaryBorder}
            title="Financial Ledger"
            subtitle="Collections, refunds, dues & receipts"
            onPress={() => router.push('/finance' as any)}
          />

          {/* 2. Attendance Roster */}
          <OperationalShortcut
            icon={<CalendarCheck size={16} color={colors.success} />}
            iconBgColor={colors.successBg}
            iconBorderColor={colors.successBorder}
            title="Attendance Roster"
            subtitle="Live floor occupancy & daily headcounts"
            onPress={() => router.push('/attendance' as any)}
          />

          {/* 3. Member Directory */}
          <OperationalShortcut
            icon={<Users size={16} color={colors.primary} />}
            iconBgColor={colors.primarySoft}
            iconBorderColor={colors.primaryBorder}
            title="Member Directory"
            subtitle="Subscription tiers, expiry & rosters"
            onPress={() => router.push('/members' as any)}
          />

          {/* 4. Coaching Staff */}
          <OperationalShortcut
            icon={<Award size={16} color={colors.warning} />}
            iconBgColor={colors.warningBg}
            iconBorderColor={colors.warningBorder}
            title="Coaching Staff"
            subtitle="Trainer rosters, PT packages & rates"
            onPress={() => router.push('/trainers' as any)}
          />
        </View>

        {/* SECTION B: PLANNED REPORTING CATEGORIES */}
        <Text style={[typography.captionBold, { color: colors.textSecondary, letterSpacing: 0.5, marginTop: 24, marginBottom: 8 }]}>
          PLANNED REPORT CATEGORIES (COMING LATER)
        </Text>

        <View style={[styles.groupedList, { borderColor: colors.borderSubtle }]}>
          {/* Financial Category */}
          <View style={[styles.categoryRow, { borderBottomColor: colors.borderSubtle }]}>
            <View style={styles.categoryHeader}>
              <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>Financial Reporting</Text>
              <View
                style={[
                  styles.plannedBadge,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderRadius: radii.full },
                ]}
              >
                <Text style={[typography.captionBold, { color: colors.textSecondary, fontSize: 10 }]}>
                  Planned
                </Text>
              </View>
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              Revenue trends, fee collections, refund reconciliations, and outstanding dues tracking.
            </Text>
          </View>

          {/* Membership Category */}
          <View style={[styles.categoryRow, { borderBottomColor: colors.borderSubtle }]}>
            <View style={styles.categoryHeader}>
              <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>Membership Intelligence</Text>
              <View
                style={[
                  styles.plannedBadge,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderRadius: radii.full },
                ]}
              >
                <Text style={[typography.captionBold, { color: colors.textSecondary, fontSize: 10 }]}>
                  Planned
                </Text>
              </View>
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              Active subscription distributions, renewal velocities, churn rates, and retention cohorts.
            </Text>
          </View>

          {/* Attendance Category */}
          <View style={[styles.categoryRow, { borderBottomColor: colors.borderSubtle }]}>
            <View style={styles.categoryHeader}>
              <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>Attendance Patterns</Text>
              <View
                style={[
                  styles.plannedBadge,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderRadius: radii.full },
                ]}
              >
                <Text style={[typography.captionBold, { color: colors.textSecondary, fontSize: 10 }]}>
                  Planned
                </Text>
              </View>
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              Daily peak-hour occupancy curves, weekday traffic volume, and entry method distribution.
            </Text>
          </View>

          {/* Trainers Category */}
          <View style={styles.categoryRow}>
            <View style={styles.categoryHeader}>
              <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>Trainer Performance</Text>
              <View
                style={[
                  styles.plannedBadge,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderRadius: radii.full },
                ]}
              >
                <Text style={[typography.captionBold, { color: colors.textSecondary, fontSize: 10 }]}>
                  Planned
                </Text>
              </View>
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              PT session redemption rates, coach client loads, and payout commission audits.
            </Text>
          </View>
        </View>

        {/* Informative Notice */}
        <View
          style={[
            styles.noticeBox,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderRadius: radii.md },
          ]}
        >
          <Info size={16} color={colors.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
            Exportable CSV, Excel, and structured PDF reports will be downloadable directly from this workspace once the cloud reporting worker is deployed.
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
    paddingVertical: 14,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupedList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  shortcutIconBox: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  categoryRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plannedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderWidth: 1,
    marginTop: 20,
  },
});
