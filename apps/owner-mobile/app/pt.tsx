/**
 * GymDeck Owner Mobile - Personal Training (PT) Operations Screen
 *
 * Phase 10 — Trainers & Staff + Personal Training Experience
 *
 * Architecture:
 * - Clear distinction: IMPLEMENTED vs ARCHITECTURAL / FUTURE
 * - Operational shortcuts to Member Directory and Coaches Directory
 * - Honest capability presentation:
 *   ✓ Implemented: Member-level coaching packages, coach assignments, session deductions
 *   ○ Future: Gym-wide PT scheduling, recurring bookings, availability conflict management
 * - Zero fabricated data, zero fake metrics.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme';
import {
  ArrowLeft,
  Dumbbell,
  Users,
  CalendarCheck,
  Award,
  ArrowRight,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react-native';

export default function PTScreen() {
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
            Personal Training
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
            Coaching packages and member-level PT workflows
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* Architecture Overview Open Hero */}
        <View style={styles.openHero}>
          <View
            style={[
              styles.heroIconBox,
              { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder, borderRadius: radii.full },
            ]}
          >
            <Dumbbell size={22} color={colors.primary} />
          </View>

          <Text style={[typography.sectionTitle, { color: colors.textPrimary, marginTop: 10, fontSize: 17 }]}>
            Personal Training Architecture
          </Text>
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginTop: 4, textAlign: 'center', lineHeight: 18, maxWidth: 320 },
            ]}
          >
            Personal training in GymDeck operates directly through member records. Coaching packages, coach assignments, and session deductions are accessed via individual member profiles.
          </Text>
        </View>

        {/* Operational Entrypoint Shortcuts */}
        <Text style={[typography.captionBold, { color: colors.textSecondary, letterSpacing: 0.5, marginTop: 22, marginBottom: 8 }]}>
          OPERATIONAL WORKFLOWS
        </Text>

        <View style={[styles.groupedList, { borderColor: colors.borderSubtle }]}>
          {/* Member Directory Shortcut */}
          <TouchableOpacity
            style={[styles.shortcutRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => router.push('/members' as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open Member Directory to manage PT"
          >
            <View
              style={[
                styles.shortcutIconBox,
                { backgroundColor: colors.primarySoft, borderRadius: radii.full },
              ]}
            >
              <Users size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>Open Member Directory</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                Assign coaches, purchase PT packages & redeem completed sessions
              </Text>
            </View>
            <ArrowRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Trainers & Staff Shortcut */}
          <TouchableOpacity
            style={styles.shortcutRow}
            onPress={() => router.push('/trainers' as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="View Trainers and Staff"
          >
            <View
              style={[
                styles.shortcutIconBox,
                { backgroundColor: colors.successBg, borderRadius: radii.full },
              ]}
            >
              <Award size={16} color={colors.success} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>View Trainers & Staff</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                Manage coaching team, specialty disciplines & commission rates
              </Text>
            </View>
            <ArrowRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Section: Operational Capabilities (Implemented) */}
        <Text style={[typography.captionBold, { color: colors.textSecondary, letterSpacing: 0.5, marginTop: 24, marginBottom: 8 }]}>
          ACTIVE CAPABILITIES (OPERATIONAL TODAY)
        </Text>

        <View style={[styles.groupedList, { borderColor: colors.borderSubtle }]}>
          <View style={[styles.capRow, { borderBottomColor: colors.borderSubtle }]}>
            <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 10, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                Member-Level Coaching Packages
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                Create customized coaching packages with total session allowances and expiration dates.
              </Text>
            </View>
          </View>

          <View style={[styles.capRow, { borderBottomColor: colors.borderSubtle }]}>
            <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 10, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                Coach-to-Member Assignment
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                Pair active coaches to members with contextual coaching notes and tracking history.
              </Text>
            </View>
          </View>

          <View style={[styles.capRow, { borderBottomColor: colors.borderSubtle }]}>
            <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 10, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                Session Redemption & Deduction
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                1-tap session deduction with workout focus notes, duration, and remaining balance tracking.
              </Text>
            </View>
          </View>

          <View style={styles.capRow}>
            <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 10, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                Commission & Compensation Models
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                Fixed rate per session or percentage-based compensation configured per coach profile.
              </Text>
            </View>
          </View>
        </View>

        {/* Section: Architectural Roadmap (Coming Next) */}
        <Text style={[typography.captionBold, { color: colors.textSecondary, letterSpacing: 0.5, marginTop: 24, marginBottom: 8 }]}>
          PLANNED ARCHITECTURE (COMING NEXT)
        </Text>

        <View style={[styles.groupedList, { borderColor: colors.borderSubtle }]}>
          <View style={[styles.capRow, { borderBottomColor: colors.borderSubtle }]}>
            <Clock size={16} color={colors.textMuted} style={{ marginRight: 10, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: colors.textSecondary }]}>
                PT Scheduling & Calendar Bookings
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 1 }]}>
                Centralized multi-coach booking calendar with client appointment management.
              </Text>
            </View>
          </View>

          <View style={[styles.capRow, { borderBottomColor: colors.borderSubtle }]}>
            <Calendar size={16} color={colors.textMuted} style={{ marginRight: 10, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: colors.textSecondary }]}>
                Recurring Sessions & Automated Reminders
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 1 }]}>
                Recurring weekly slots and client SMS/Push session reminders.
              </Text>
            </View>
          </View>

          <View style={styles.capRow}>
            <Layers size={16} color={colors.textMuted} style={{ marginRight: 10, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: colors.textSecondary }]}>
                Coach Availability & Conflict Detection
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 1 }]}>
                Real-time clash avoidance and floor equipment availability rules.
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
  openHero: {
    alignItems: 'center',
    paddingVertical: 16,
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
  capRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
