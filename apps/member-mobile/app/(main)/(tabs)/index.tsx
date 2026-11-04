/**
 * GymDeck Member Mobile - Main Dashboard Screen
 * High-End Light Theme Redesign matching the reference UX Lab / Modern Bento Grid Aesthetic
 * Periwinkle, Pastel Lilac, Warm Tangerine, and Pure Charcoal Black palette
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  Search,
  Dumbbell,
  Zap,
  Sparkles,
  Utensils,
  Flame,
  Camera,
  Check,
  ChevronRight,
  QrCode,
  Activity,
  Award,
} from 'lucide-react-native';
import { useMemberDashboard } from '../../../src/hooks';
import { SkeletonLoader, PrimaryButton } from '../../../src/components';

type FilterCategory = 'STRENGTH' | 'VISION_AI' | 'NUTRITION' | 'POSE_COACH';

export default function DashboardScreen() {
  const router = useRouter();
  const { data: dashboard, isLoading, error, refetch, isRefetching } = useMemberDashboard();

  const [activeFilter, setActiveFilter] = useState<FilterCategory>('STRENGTH');
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading && !dashboard) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SkeletonLoader height={60} borderRadius={16} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={48} borderRadius={24} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={220} borderRadius={28} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={50} borderRadius={20} style={{ marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <SkeletonLoader height={170} borderRadius={24} style={{ flex: 1 }} />
            <SkeletonLoader height={170} borderRadius={24} style={{ flex: 1 }} />
          </View>
          <SkeletonLoader height={90} borderRadius={24} style={{ marginBottom: 12 }} />
          <SkeletonLoader height={76} borderRadius={22} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error && !dashboard) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>
            Couldn't load your dashboard
          </Text>
          <Text style={styles.errorSubtitle}>
            Please check your internet connection or try again shortly.
          </Text>
          <PrimaryButton
            title="Retry"
            onPress={() => refetch()}
            style={{ marginTop: 16, maxWidth: 200 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const {
    member,
    gym,
    membership,
    attendanceSummary,
    todayWorkout,
    unreadNotificationCount,
  } = dashboard!;

  const firstName = member?.fullName?.split(' ')[0] || 'Member';
  const streakDays = attendanceSummary?.currentStreak ?? 5;
  const currentPlan = membership?.planName || 'Gold Annual';

  // Days of week for consistency streak bar
  const weekDays = [
    { label: 'Sun', completed: true, isToday: false },
    { label: 'Mon', completed: true, isToday: false },
    { label: 'Tue', completed: true, isToday: false },
    { label: 'Wed', completed: true, isToday: true },
    { label: 'Thu', completed: false, isToday: false },
    { label: 'Fri', completed: false, isToday: false },
    { label: 'Sat', completed: false, isToday: false },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
      >
        {/* 1. TOP HEADER (Avatar, Greeting, Subtitle, Circular Notification Bell with Orange Dot) */}
        <View style={styles.topHeader}>
          <View style={styles.userInfoRow}>
            {/* 3D Character Avatar Circle */}
            <View style={styles.avatarCircle}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarInitial}>{firstName.charAt(0)}</Text>
              </View>
            </View>

            <View style={styles.greetingCol}>
              <Text style={styles.greetingTitle}>Hello, {firstName}</Text>
              <View style={styles.levelRow}>
                <Text style={styles.levelSubtitle}>Level Up</Text>
                <View style={styles.verifiedDot} />
                <Text style={styles.gymBrandText}>{gym?.name || 'GymDeck Fitness'}</Text>
              </View>
            </View>
          </View>

          {/* Circular Bell Button with Orange Alert Dot */}
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => router.push('/details/notifications' as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={20} color="#111827" />
            {unreadNotificationCount > 0 && <View style={styles.orangeAlertDot} />}
          </TouchableOpacity>
        </View>

        {/* 2. SLEEK PILL SEARCH BAR */}
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search workouts, exercises, equipment..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>

        {/* 3. HERO FEATURED CARD (Soft Periwinkle Blue Bento Card - exact match to UX Lab card) */}
        <View style={styles.heroPeriwinkleCard}>
          {/* Top Row: Squircle Badge + Fractional Progress Circle (2/3) */}
          <View style={styles.heroTopRow}>
            <View style={styles.heroSquircleIcon}>
              <Dumbbell size={18} color="#0F172A" />
            </View>

            <View style={styles.heroFractionPill}>
              <Text style={styles.heroFractionText}>2/3</Text>
            </View>
          </View>

          {/* Middle: Title & Subtitle */}
          <Text style={styles.heroTitle}>
            {todayWorkout?.title || 'UX Lab: Power Motion Edition'}
          </Text>
          <Text style={styles.heroSubtitle}>
            Coach Alex Rivera • 45 mins • 6 Exercises
          </Text>

          {/* Bottom Row: High-Contrast Pure Black Pill Button + Avatar Community Stack */}
          <View style={styles.heroBottomRow}>
            <TouchableOpacity
              style={styles.heroJoinBtn}
              onPress={() => router.push('/details/workout-session' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.heroJoinBtnText}>JOIN NOW</Text>
            </TouchableOpacity>

            <View style={styles.heroAvatarStack}>
              <View style={[styles.miniAvatar, { backgroundColor: '#38BDF8', zIndex: 3 }]}>
                <Text style={styles.miniAvatarText}>JD</Text>
              </View>
              <View style={[styles.miniAvatar, { backgroundColor: '#F472B6', marginLeft: -10, zIndex: 2 }]}>
                <Text style={styles.miniAvatarText}>AL</Text>
              </View>
              <View style={[styles.miniAvatar, { backgroundColor: '#FB923C', marginLeft: -10, zIndex: 1 }]}>
                <Text style={styles.miniAvatarText}>MK</Text>
              </View>
            </View>
          </View>

          {/* Subtle Decorative Line-Art Corner Graphic */}
          <View style={styles.heroDecorativeGraphic} pointerEvents="none">
            <View style={styles.decorativeDumbbellBar} />
            <View style={styles.decorativeDumbbellCircle} />
          </View>
        </View>

        {/* 4. CATEGORY / FILTER PILL CHIPS ("Logic", "Visual", "Focus") */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              activeFilter === 'STRENGTH' ? styles.filterPillActive : styles.filterPillInactive,
            ]}
            onPress={() => setActiveFilter('STRENGTH')}
            activeOpacity={0.8}
          >
            <Zap size={14} color={activeFilter === 'STRENGTH' ? '#FFFFFF' : '#111827'} />
            <Text
              style={[
                styles.filterPillText,
                { color: activeFilter === 'STRENGTH' ? '#FFFFFF' : '#111827' },
              ]}
            >
              Logic
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              activeFilter === 'VISION_AI' ? styles.filterPillActive : styles.filterPillInactive,
            ]}
            onPress={() => {
              setActiveFilter('VISION_AI');
              router.push('/details/ai-equipment' as any);
            }}
            activeOpacity={0.8}
          >
            <Camera size={14} color={activeFilter === 'VISION_AI' ? '#FFFFFF' : '#111318'} />
            <Text
              style={[
                styles.filterPillText,
                { color: activeFilter === 'VISION_AI' ? '#FFFFFF' : '#111318' },
              ]}
            >
              Visual
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              activeFilter === 'NUTRITION' ? styles.filterPillActive : styles.filterPillInactive,
            ]}
            onPress={() => {
              setActiveFilter('NUTRITION');
              router.push('/details/ai-nutrition' as any);
            }}
            activeOpacity={0.8}
          >
            <Flame size={14} color={activeFilter === 'NUTRITION' ? '#FFFFFF' : '#111318'} />
            <Text
              style={[
                styles.filterPillText,
                { color: activeFilter === 'NUTRITION' ? '#FFFFFF' : '#111318' },
              ]}
            >
              Focus
            </Text>
          </TouchableOpacity>
        </View>

        {/* 5. SIDE-BY-SIDE DUAL BENTO CARDS (Pastel Lilac & Warm Tangerine) */}
        <View style={styles.dualBentoRow}>
          {/* Left Card: Pastel Lilac / Soft Orchid (#DBA6F4) -> Machine Vision AI */}
          <TouchableOpacity
            style={[styles.bentoCard, styles.lilacCard]}
            onPress={() => router.push('/details/ai-equipment' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.bentoTopRow}>
              <View style={styles.bentoCircleBadgeDark}>
                <Camera size={15} color="#FFFFFF" />
              </View>

              <View style={styles.bentoFractionPillDark}>
                <Text style={styles.bentoFractionText}>1/3</Text>
              </View>
            </View>

            {/* Author / Tag */}
            <View style={styles.bentoAuthorRow}>
              <View style={styles.bentoAuthorAvatar}>
                <Text style={styles.bentoAuthorInitial}>G</Text>
              </View>
              <Text style={styles.bentoAuthorName}>by GymDeck AI</Text>
            </View>

            {/* Title & Brief Tag */}
            <Text style={styles.bentoTitle}>Design Odyssey</Text>
            <View style={styles.bentoBriefRow}>
              <Award size={12} color="#111318" />
              <Text style={styles.bentoBriefText}>Brief 001</Text>
            </View>
          </TouchableOpacity>

          {/* Right Card: Warm Tangerine / Golden Amber (#F59D42) -> Focus Mode & Plate Macro Scan */}
          <TouchableOpacity
            style={[styles.bentoCard, styles.tangerineCard]}
            onPress={() => router.push('/details/ai-nutrition' as any)}
            activeOpacity={0.85}
          >
            <View style={styles.bentoTopRow}>
              <View style={styles.bentoCircleBadgeDark}>
                <Flame size={15} color="#FFFFFF" />
              </View>

              <View style={styles.bentoFractionPillDark}>
                <Text style={styles.bentoFractionText}>1</Text>
              </View>
            </View>

            {/* Author / Tag */}
            <View style={styles.bentoAuthorRow}>
              <View style={[styles.bentoAuthorAvatar, { backgroundColor: '#0F172A' }]}>
                <Text style={styles.bentoAuthorInitial}>C</Text>
              </View>
              <Text style={styles.bentoAuthorName}>by Calorie AI</Text>
            </View>

            {/* Title & Brief Tag */}
            <Text style={styles.bentoTitle}>Focus Mode</Text>
            <View style={styles.bentoBriefRow}>
              <Utensils size={12} color="#111318" />
              <Text style={styles.bentoBriefText}>Brief 002</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 6. WEEKLY ATTENDANCE / CONSISTENCY STRIP (Sun Mon Tue Wed Thu Fri Sat) */}
        <View style={styles.streakStripCard}>
          <View style={styles.streakHeaderRow}>
            <Text style={styles.streakHeaderTitle}>Weekly Learning & Workout Streak</Text>
            <View style={styles.streakPillBadge}>
              <Flame size={12} color="#EA580C" />
              <Text style={styles.streakPillBadgeText}>{streakDays} Days</Text>
            </View>
          </View>

          {/* Day Pills Row */}
          <View style={styles.weekDaysRow}>
            {weekDays.map((d, idx) => (
              <View key={idx} style={styles.dayCol}>
                <Text style={styles.dayColLabel}>{d.label}</Text>
                <View
                  style={[
                    styles.dayCircle,
                    d.completed && !d.isToday && styles.dayCircleCompleted,
                    d.isToday && styles.dayCircleToday,
                    !d.completed && !d.isToday && styles.dayCirclePending,
                  ]}
                >
                  {d.completed && !d.isToday && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  {d.isToday && <Dumbbell size={13} color="#FFFFFF" />}
                  {!d.completed && !d.isToday && <View style={styles.dayDotInactive} />}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 7. MY TRAINING & PASSES (Course List Cards matching left screen) */}
        <View style={styles.coursesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>My Courses & Access</Text>
            <TouchableOpacity onPress={() => router.push('/(main)/(tabs)/workouts' as any)}>
              <Search size={18} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Item 1: Pure Black Rounded Card (Unlock the Grid / QR Entrance Pass) */}
          <TouchableOpacity
            style={styles.courseItemDark}
            onPress={() => router.push('/(main)/(tabs)/check-in' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.courseIconCircleWhite}>
              <QrCode size={20} color="#111318" />
            </View>

            <View style={styles.courseMetaCol}>
              <Text style={styles.courseTitleWhite}>Path</Text>
              <Text style={styles.courseSubWhite}>Unlock the Grid (Turnstile Pass)</Text>
            </View>

            <View style={styles.courseChevronCircleDark}>
              <ChevronRight size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Item 2: Soft Light Periwinkle Card (Mode / AI Pose & Rep Coach) */}
          <TouchableOpacity
            style={styles.courseItemLight}
            onPress={() => router.push('/details/ai-rep-counter' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.courseIconCircleDark}>
              <Activity size={20} color="#FFFFFF" />
            </View>

            <View style={styles.courseMetaCol}>
              <Text style={styles.courseTitleDark}>Mode</Text>
              <Text style={styles.courseSubDark}>Focus Mode (AI Kinematics & Pose)</Text>
            </View>

            <View style={styles.courseChevronCircleLight}>
              <ChevronRight size={18} color="#0F172A" />
            </View>
          </TouchableOpacity>

          {/* Item 3: Pure White Card (Membership Plan & Dues) */}
          <TouchableOpacity
            style={styles.courseItemWhite}
            onPress={() => router.push('/(main)/(tabs)/membership' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.courseIconCircleDark, { backgroundColor: '#FEF3C7' }]}>
              <Award size={20} color="#D97706" />
            </View>

            <View style={styles.courseMetaCol}>
              <Text style={styles.courseTitleDark}>Plan</Text>
              <Text style={styles.courseSubDark}>{currentPlan} • Dues Clear</Text>
            </View>

            <View style={styles.courseChevronCircleWhite}>
              <ChevronRight size={18} color="#111827" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 8. AI ASSISTANT PROMPT BAR (Matching Right Screen Teaser) */}
        <TouchableOpacity
          style={styles.aiAssistantBanner}
          onPress={() => router.push('/details/ai-hub' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.aiAssistantHeader}>
            <View style={styles.aiAssistantTagRow}>
              <Sparkles size={14} color="#3B82F6" />
              <Text style={styles.aiAssistantTag}>AI Assistant</Text>
            </View>
            <Text style={styles.aiAssistantSub}>Powered by GPT-4.5 ML</Text>
          </View>

          <View style={styles.promptChipsRow}>
            <View style={styles.promptChip}>
              <Text style={styles.promptChipText}>Week Summary</Text>
            </View>
            <View style={styles.promptChip}>
              <Text style={styles.promptChipText}>Create New Plan</Text>
            </View>
            <View style={styles.promptChip}>
              <Text style={styles.promptChipText}>Apply Stats</Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F6',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 110, // Generous space so content scrolls freely above the modern floating/docked tab bar
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    color: '#111827',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    color: '#6B7280',
  },

  /* 1. TOP HEADER */
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#93C5FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  greetingCol: {
    justifyContent: 'center',
  },
  greetingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  levelSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  verifiedDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
  },
  gymBrandText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  orangeAlertDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  /* 2. SEARCH BAR */
  searchBar: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    paddingVertical: 8,
  },

  /* 3. HERO PERIWINKLE CARD */
  heroPeriwinkleCard: {
    backgroundColor: '#9BB6F6',
    borderRadius: 28,
    padding: 22,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#7C9DE8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroSquircleIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  heroFractionPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroFractionText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(15, 23, 42, 0.75)',
    marginTop: 4,
    marginBottom: 18,
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroJoinBtn: {
    backgroundColor: '#111318',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  heroJoinBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroAvatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#9BB6F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  heroDecorativeGraphic: {
    position: 'absolute',
    bottom: -15,
    right: 80,
    opacity: 0.12,
    transform: [{ rotate: '25deg' }],
  },
  decorativeDumbbellBar: {
    width: 90,
    height: 10,
    backgroundColor: '#000000',
    borderRadius: 5,
  },
  decorativeDumbbellCircle: {
    position: 'absolute',
    right: -10,
    top: -15,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 6,
    borderColor: '#000000',
  },

  /* 4. FILTER PILLS */
  filterPillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  filterPillActive: {
    backgroundColor: '#111318',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  filterPillInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* 5. DUAL BENTO CARDS */
  dualBentoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  bentoCard: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    minHeight: 160,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  lilacCard: {
    backgroundColor: '#DBA6F4',
  },
  tangerineCard: {
    backgroundColor: '#F59D42',
  },
  bentoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bentoCircleBadgeDark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111318',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bentoFractionPillDark: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(17, 19, 24, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bentoFractionText: {
    color: '#111318',
    fontSize: 11,
    fontWeight: '800',
  },
  bentoAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  bentoAuthorAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#111318',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  bentoAuthorInitial: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  bentoAuthorName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111318',
  },
  bentoTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111318',
    marginTop: 10,
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  bentoBriefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  bentoBriefText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(17, 19, 24, 0.8)',
  },

  /* 6. WEEKLY ATTENDANCE / CONSISTENCY STRIP */
  streakStripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  streakHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  streakHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  streakPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  streakPillBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCol: {
    alignItems: 'center',
    gap: 8,
  },
  dayColLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleCompleted: {
    backgroundColor: '#111318',
  },
  dayCircleToday: {
    backgroundColor: '#EA580C',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  dayCirclePending: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayDotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },

  /* 7. MY TRAINING & ACCESS SECTION */
  coursesSection: {
    marginBottom: 16,
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  courseItemDark: {
    backgroundColor: '#111318',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  courseIconCircleWhite: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  courseMetaCol: {
    flex: 1,
  },
  courseTitleWhite: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  courseSubWhite: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 2,
  },
  courseChevronCircleDark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#232630',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseItemLight: {
    backgroundColor: '#E0E9FD',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseIconCircleDark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#111318',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  courseTitleDark: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  courseSubDark: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  courseChevronCircleLight: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseItemWhite: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  courseChevronCircleWhite: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* 8. AI ASSISTANT BANNER */
  aiAssistantBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  aiAssistantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiAssistantTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiAssistantTag: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  aiAssistantSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
  promptChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  promptChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  promptChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
});
