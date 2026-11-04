/**
 * GymDeck Member Mobile - AI Fitness & Nutrition Hub Screen
 * Unified central command center integrating models from GYMDECK_AI_ML_MODEL:
 * - Computer Vision Calorie & Nutrition Scanner
 * - Gym Machine Classifier & Video Tutorials
 * - Real-Time AI Pose Form Coach & Repetition Counter
 * - ExerciseDB Encyclopedia & Movement Catalog
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Sparkles,
  Camera,
  Utensils,
  Dumbbell,
  PlayCircle,
  Activity,
  Flame,
  ChevronRight,
  ShieldCheck,
  BookOpen,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { useNutritionStore } from '../../src/store/nutritionStore';

export default function AiHubScreen() {
  const { colors, radii, spacing, mode } = useTheme();
  const router = useRouter();
  const getDailySummary = useNutritionStore((s) => s.getDailySummary);
  const summary = getDailySummary();

  const isDark = mode === 'dark';

  const caloriePercent = Math.min(
    Math.round((summary.consumedCalories / summary.targetCalories) * 100),
    100
  );
  const proteinPercent = Math.min(
    Math.round((summary.consumedProtein / summary.targetProtein) * 100),
    100
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: '#FFFFFF',
            borderBottomColor: '#E5E7EB',
            paddingHorizontal: spacing.lg,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={18} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: '#111827' }]}>
            GymDeck AI Studio
          </Text>
          <View style={[styles.badgePill, { backgroundColor: '#E0E9FD' }]}>
            <Sparkles size={11} color="#4F75E3" />
            <Text style={[styles.badgeText, { color: '#4F75E3' }]}>ML v2.4 Active</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg, paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: '#9BB6F6',
              borderColor: '#9BB6F6',
              borderRadius: 28,
              padding: spacing.xl,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={[styles.heroIconBox, { backgroundColor: '#FFFFFF' }]}>
              <Sparkles size={22} color="#4F75E3" />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={[styles.heroHeading, { color: '#111318' }]}>
                AI-Powered Gym Intelligence
              </Text>
              <Text style={[styles.heroSub, { color: 'rgba(17, 19, 24, 0.75)' }]}>
                Real-time pose estimation, machine visual recognition, and smart calorie vision.
              </Text>
            </View>
          </View>

          {/* Quick Daily Stats Row */}
          <View
            style={[
              styles.quickStatsRow,
              {
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                padding: spacing.md,
                borderColor: 'rgba(255, 255, 255, 0.5)',
              },
            ]}
          >
            <View style={styles.statCol}>
              <View style={styles.statLabelRow}>
                <Flame size={14} color="#FF9966" />
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Calories</Text>
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {summary.consumedCalories}{' '}
                <Text style={{ fontSize: 11, color: colors.textMuted }}>/ {summary.targetCalories} kcal</Text>
              </Text>
              <View style={[styles.statProgressTrack, { backgroundColor: colors.surfaceSubtle }]}>
                <View
                  style={[
                    styles.statProgressBar,
                    { width: `${caloriePercent}%`, backgroundColor: '#FF5E62' },
                  ]}
                />
              </View>
            </View>

            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

            <View style={styles.statCol}>
              <View style={styles.statLabelRow}>
                <Activity size={14} color="#10B981" />
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Protein</Text>
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {summary.consumedProtein}{' '}
                <Text style={{ fontSize: 11, color: colors.textMuted }}>/ {summary.targetProtein} g</Text>
              </Text>
              <View style={[styles.statProgressTrack, { backgroundColor: colors.surfaceSubtle }]}>
                <View
                  style={[
                    styles.statProgressBar,
                    { width: `${proteinPercent}%`, backgroundColor: '#10B981' },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Feature Grid Header */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.xl }]}>
          AI Technologies & Models
        </Text>

        {/* Module 1: AI Nutrition & Calorie Scanner */}
        <TouchableOpacity
          style={[
            styles.featureCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.lg,
              padding: spacing.lg,
            },
          ]}
          onPress={() => router.push('/details/ai-nutrition' as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.featureIconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Utensils size={24} color="#D97706" />
          </View>
          <View style={styles.featureTextCol}>
            <View style={styles.featureTitleRow}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                AI Calorie & Meal Scanner
              </Text>
              <View style={[styles.statusPill, { backgroundColor: '#ECFDF5' }]}>
                <Text style={[styles.statusPillText, { color: '#059669' }]}>Cal AI / Fud AI</Text>
              </View>
            </View>
            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
              Snap a meal photo or type a dish to get automatic calorie, protein, carbs, and fat breakdowns.
            </Text>
            <View style={styles.featureActionRow}>
              <Text style={[styles.featureActionText, { color: '#D97706' }]}>
                Scan Meal ({summary.meals.length} logged today)
              </Text>
              <ChevronRight size={16} color="#D97706" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Module 2: Gym Machine Visual Classifier & Video Tutorials */}
        <TouchableOpacity
          style={[
            styles.featureCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.lg,
              padding: spacing.lg,
            },
          ]}
          onPress={() => router.push('/details/ai-equipment' as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.featureIconWrap, { backgroundColor: '#E0F2FE' }]}>
            <Camera size={24} color="#0284C7" />
          </View>
          <View style={styles.featureTextCol}>
            <View style={styles.featureTitleRow}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                Gym Equipment Scanner
              </Text>
              <View style={[styles.statusPill, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.statusPillText, { color: '#2563EB' }]}>EfficientNet-B0</Text>
              </View>
            </View>
            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
              Point camera at any machine or weight to identify it, learn setup steps, and watch curated video tutorials.
            </Text>
            <View style={styles.featureActionRow}>
              <Text style={[styles.featureActionText, { color: '#0284C7' }]}>
                Identify Equipment (16 Machines)
              </Text>
              <ChevronRight size={16} color="#0284C7" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Module 3: AI Real-Time Pose Coach & Rep Counter */}
        <TouchableOpacity
          style={[
            styles.featureCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.lg,
              padding: spacing.lg,
            },
          ]}
          onPress={() => router.push('/details/ai-rep-counter' as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.featureIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Activity size={24} color="#DC2626" />
          </View>
          <View style={styles.featureTextCol}>
            <View style={styles.featureTitleRow}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                AI Pose Coach & Rep Counter
              </Text>
              <View style={[styles.statusPill, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[styles.statusPillText, { color: '#DC2626' }]}>MediaPipe Pose</Text>
              </View>
            </View>
            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
              Automated kinematic rep counting with live joint angle HUD, tempo timing, and form cues.
            </Text>
            <View style={styles.featureActionRow}>
              <Text style={[styles.featureActionText, { color: '#DC2626' }]}>
                Launch Pose Coach (Squats, Push-ups, Curls)
              </Text>
              <ChevronRight size={16} color="#DC2626" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Module 4: ExerciseDB Movement Encyclopedia */}
        <TouchableOpacity
          style={[
            styles.featureCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.lg,
              padding: spacing.lg,
            },
          ]}
          onPress={() => router.push('/details/exercise-library' as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.featureIconWrap, { backgroundColor: '#F3E8FF' }]}>
            <BookOpen size={24} color="#7C3AED" />
          </View>
          <View style={styles.featureTextCol}>
            <View style={styles.featureTitleRow}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                ExerciseDB Encyclopedia
              </Text>
              <View style={[styles.statusPill, { backgroundColor: '#FAF5FF' }]}>
                <Text style={[styles.statusPillText, { color: '#7C3AED' }]}>ExerciseDB API</Text>
              </View>
            </View>
            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
              Explore thousands of structured gym exercises categorized by muscle group, difficulty, and equipment.
            </Text>
            <View style={styles.featureActionRow}>
              <Text style={[styles.featureActionText, { color: '#7C3AED' }]}>
                Browse Movement Catalog
              </Text>
              <ChevronRight size={16} color="#7C3AED" />
            </View>
          </View>
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF5E62',
    letterSpacing: 0.3,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroCard: {
    borderWidth: 1.5,
    gap: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE5E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextCol: {
    flex: 1,
  },
  heroHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  quickStatsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    gap: 4,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  statProgressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  statProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  statDivider: {
    width: 1,
    height: 38,
    marginHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderWidth: 1,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  featureIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  featureActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
