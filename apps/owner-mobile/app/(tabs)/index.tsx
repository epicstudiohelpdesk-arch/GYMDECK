import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Animated,
  Easing,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Activity,
  Award,
  Wallet,
  UserPlus,
  UserCheck,
  RotateCcw,
  Clock,
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Dumbbell,
  Heart,
  Calendar,
  Sparkles,
} from 'lucide-react-native';

import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { OwnerAnalyticsService } from '../../src/services/api/ownerAnalyticsService';
import { OwnerAttendanceService } from '../../src/services/api/ownerAttendanceService';
import { OwnerMembersService } from '../../src/services/api/ownerMembersService';
import { ownerNotificationService } from '../../src/services/api/ownerNotificationService';
import { AttendanceItem, GymMemberSummary } from '../../src/types';
import { formatCurrency } from '../../src/utils/currency';
import { runMobileConvergenceAudit } from '../../src/utils/auditConvergence';
import Svg, { Path, Rect, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';

import {
  SearchBar,
  StatusBadge,
  Avatar,
} from '../../src/components/ui';

// 1. All Icon (Sparkle star with warm yellow fill on active)
const renderAllIcon = (isDark: boolean, active: boolean) => {
  const strokeColor = isDark ? '#F8FAFC' : '#000000';
  if (active) {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"
          fill="#FACC15"
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <Path
          d="M19 2l.8 2.2L22 5l-2.2.8L19 8l-.8-2.2L16 5l2.2-.8L19 2z"
          fill="#FACC15"
          stroke={strokeColor}
          strokeWidth={1.3}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M19 2l.8 2.2L22 5l-2.2.8L19 8l-.8-2.2L16 5l2.2-.8L19 2z"
        stroke={strokeColor}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// 2. Attendance Icon (Calendar card with binder rings and checkmark)
const renderAttendanceCategoryIcon = (isDark: boolean, active: boolean) => {
  const strokeColor = isDark ? '#F8FAFC' : '#000000';
  if (active) {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        {/* Calendar body in warm yellow */}
        <Rect
          x="3"
          y="4"
          width="18"
          height="17"
          rx="3.5"
          fill="#FACC15"
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        {/* Binder rings */}
        <Path d="M8 2v4M16 2v4" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" />
        {/* Dividing header line */}
        <Path d="M3 9.5h18" stroke={strokeColor} strokeWidth={1.4} />
        {/* Crisp, high-contrast dark checkmark */}
        <Path
          d="M8 15.2l2.8 2.8 5.2-5.4"
          stroke={strokeColor}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="3.5"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M8 2v4M16 2v4" stroke={strokeColor} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M3 9.5h18" stroke={strokeColor} strokeWidth={1.4} />
      <Path
        d="M8.5 15l2.5 2.5 5-5"
        stroke={strokeColor}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// 3. Members Icon (Two-tone avatars with depth)
const renderMembersCategoryIcon = (isDark: boolean, active: boolean) => {
  const strokeColor = isDark ? '#F8FAFC' : '#000000';
  if (active) {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path d="M16.5 3.3a3.8 3.8 0 0 1 0 7.4" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" />
        <Path d="M16 14.5a4.2 4.2 0 0 1 4.5 4.5v1.5" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" />
        <Circle cx="8.5" cy="7" r="3.8" fill="#FACC15" stroke={strokeColor} strokeWidth={1.5} />
        <Path d="M3.5 20.5v-.5a4.8 4.8 0 0 1 4.8-4.8h.4a4.8 4.8 0 0 1 4.8 4.8v.5H3.5z" fill="#FACC15" stroke={strokeColor} strokeWidth={1.5} strokeLinejoin="round" />
      </Svg>
    );
  }
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="9" cy="7" r="4" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

// 4. Dues & Fees Icon (Wallet with yellow body & dark clasp flap)
const renderFinanceCategoryIcon = (isDark: boolean, active: boolean) => {
  const strokeColor = isDark ? '#F8FAFC' : '#000000';
  if (active) {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path d="M6.5 6V4.5a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5V6" stroke={strokeColor} strokeWidth={1.4} fill="#FEF9C3" strokeLinecap="round" strokeLinejoin="round" />
        <Rect x="2.5" y="6" width="19" height="14" rx="3.5" fill="#FACC15" stroke={strokeColor} strokeWidth={1.5} strokeLinejoin="round" />
        <Path d="M14 9.8h5.2a2.2 2.2 0 0 1 2.2 2.2v0a2.2 2.2 0 0 1-2.2 2.2H14a1 1 0 0 1-1-1v-2.4a1 1 0 0 1 1-1z" fill={strokeColor} stroke={strokeColor} strokeWidth={1.2} />
        <Circle cx="18.5" cy="12" r="1.3" fill="#FACC15" />
      </Svg>
    );
  }
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x="2.5" y="6" width="19" height="14" rx="3.5" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 6V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V6" stroke={strokeColor} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15 10.5h4.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H15" stroke={strokeColor} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="18" cy="12.5" r="1.4" fill={strokeColor} />
    </Svg>
  );
};

// 5. Trainers Icon (Award medal with yellow ribbon)
const renderTrainersCategoryIcon = (isDark: boolean, active: boolean) => {
  const strokeColor = isDark ? '#F8FAFC' : '#000000';
  if (active) {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path d="M8.5 14.5l-2 7 5.5-3 5.5 3-2-7" fill="#FACC15" stroke={strokeColor} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx="12" cy="9" r="6" fill="#FACC15" stroke={strokeColor} strokeWidth={1.5} />
        <Circle cx="12" cy="9" r="2.2" fill={strokeColor} />
      </Svg>
    );
  }
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M8.5 14.5l-2 7 5.5-3 5.5 3-2-7" stroke={strokeColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx="12" cy="9" r="6" stroke={strokeColor} strokeWidth={1.5} />
      <Circle cx="12" cy="9" r="2.2" stroke={strokeColor} strokeWidth={1.3} />
    </Svg>
  );
};

// 6. Plans Icon (Membership tier card with badge)
const renderPlansCategoryIcon = (isDark: boolean, active: boolean) => {
  const strokeColor = isDark ? '#F8FAFC' : '#000000';
  if (active) {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Rect
          x="2.5"
          y="5"
          width="19"
          height="14"
          rx="3.5"
          fill="#FACC15"
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <Path d="M2.5 9.5h19" stroke={strokeColor} strokeWidth={1.4} />
        <Rect x="5.5" y="12.5" width="4.5" height="3.5" rx="1" fill={strokeColor} />
        <Path d="M13 14.5h5.5" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" />
      </Svg>
    );
  }
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2.5"
        y="5"
        width="19"
        height="14"
        rx="3.5"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M2.5 9.5h19" stroke={strokeColor} strokeWidth={1.4} />
      <Rect x="5.5" y="12.5" width="4.5" height="3.5" rx="1" stroke={strokeColor} strokeWidth={1.2} />
      <Path d="M13 14.5h5.5" stroke={strokeColor} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
};

/**
 * Idea 3: Gentle Curved Arch Boundary (The Bespoke Architectural Cut)
 * Transitions the colored TODAY'S OPERATIONS wash into the neutral body using an
 * elegant, shallow architectural arch notch with a subtle 1px border gradient
 * and a center minimalist accent pill & micro-dot.
 */
function CuratedSectionBottomDivider({ isDark }: { isDark: boolean }) {
  const { width } = useWindowDimensions();
  const cx = width / 2;
  const height = 24;
  const baseY = 5;
  const dipY = 16;

  const washColor = isDark ? '#0F172A' : '#E6F8F9';
  const bodyColor = isDark ? '#0B0F19' : '#F8FAFC';
  const accentColor = isDark ? '#38BDF8' : '#00838F';

  // Arch notch geometry
  const notchLeft = cx - 55;
  const notchRight = cx + 55;
  const flatLeft = cx - 15;
  const flatRight = cx + 15;
  const cpLeft = cx - 35;
  const cpRight = cx + 35;

  // Closed path for the color wash area
  const washFillPath = `M 0,0 L ${width},0 L ${width},${baseY} L ${notchRight},${baseY} C ${cpRight},${baseY} ${cpRight},${dipY} ${flatRight},${dipY} L ${flatLeft},${dipY} C ${cpLeft},${dipY} ${cpLeft},${baseY} ${notchLeft},${baseY} L 0,${baseY} Z`;

  // Continuous stroke line tracing the architectural boundary
  const strokePath = `M 0,${baseY} L ${notchLeft},${baseY} C ${cpLeft},${baseY} ${cpLeft},${dipY} ${flatLeft},${dipY} L ${flatRight},${dipY} C ${cpRight},${dipY} ${cpRight},${baseY} ${notchRight},${baseY} L ${width},${baseY}`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          {/* Subtle gradient fading the arch border stroke softly at the screen edges */}
          <LinearGradient id="archBorderGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={accentColor} stopOpacity="0" />
            <Stop offset="8%" stopColor={accentColor} stopOpacity="0.15" />
            <Stop offset="25%" stopColor={accentColor} stopOpacity="0.45" />
            <Stop offset="50%" stopColor={accentColor} stopOpacity="0.8" />
            <Stop offset="75%" stopColor={accentColor} stopOpacity="0.45" />
            <Stop offset="92%" stopColor={accentColor} stopOpacity="0.15" />
            <Stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* 1. Base fill with main body neutral background */}
        <Rect x={0} y={0} width={width} height={height} fill={bodyColor} />

        {/* 2. Architectural curved wash fill */}
        <Path d={washFillPath} fill={washColor} />

        {/* 3. 1px architectural boundary line */}
        <Path
          d={strokePath}
          stroke="url(#archBorderGradient)"
          strokeWidth={1.2}
          fill="none"
        />

        {/* 4. Center minimalist accent pill & micro-dot nested inside the arch dip */}
        <Rect
          x={cx - 14}
          y={dipY - 1}
          width={9}
          height={2}
          rx={1}
          fill={accentColor}
          opacity={0.85}
        />
        <Circle cx={cx} cy={dipY} r={2} fill={accentColor} />
        <Rect
          x={cx + 5}
          y={dipY - 1}
          width={9}
          height={2}
          rx={1}
          fill={accentColor}
          opacity={0.85}
        />
      </Svg>
    </View>
  );
}

interface TwinRingsRefreshSpinnerProps {
  isRefreshing: boolean;
  isDark: boolean;
  scrollY: Animated.Value;
}

/**
 * Custom GymDeck Pull-To-Refresh Loading Symbol Animation:
 * Twin Kinetic Energy Rings & Live Pulse Core.
 * Size: Exactly 30x30px (standard native refresh spinner diameter).
 * Features dual counter-rotating athletic energy arcs around an emerald live floor pulse core.
 */
function TwinRingsRefreshSpinner({
  isRefreshing,
  isDark,
  scrollY,
}: TwinRingsRefreshSpinnerProps) {
  const outerSpinAnim = useRef(new Animated.Value(0)).current;
  const innerSpinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const androidDropAnim = useRef(new Animated.Value(0)).current;
  const spinLoopsRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isRefreshing) {
      outerSpinAnim.setValue(0);
      innerSpinAnim.setValue(0);
      pulseAnim.setValue(0);

      const outerLoop = Animated.loop(
        Animated.timing(outerSpinAnim, {
          toValue: 1,
          duration: 750,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      const innerLoop = Animated.loop(
        Animated.timing(innerSpinAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      spinLoopsRef.current = Animated.parallel([outerLoop, innerLoop, pulseLoop]);
      spinLoopsRef.current.start();

      if (Platform.OS === 'android') {
        Animated.spring(androidDropAnim, {
          toValue: 1,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }).start();
      }
    } else {
      spinLoopsRef.current?.stop();
      outerSpinAnim.setValue(0);
      innerSpinAnim.setValue(0);
      pulseAnim.setValue(0);

      if (Platform.OS === 'android') {
        Animated.timing(androidDropAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    }

    return () => {
      spinLoopsRef.current?.stop();
    };
  }, [isRefreshing]);

  // Outer ring rotation (clockwise)
  const outerContinuous = outerSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const outerPull = scrollY.interpolate({
    inputRange: [-90, 0],
    outputRange: ['360deg', '0deg'],
    extrapolate: 'clamp',
  });
  const outerRotate = isRefreshing ? outerContinuous : outerPull;

  // Inner ring rotation (counter-clockwise)
  const innerContinuous = innerSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });
  const innerPull = scrollY.interpolate({
    inputRange: [-90, 0],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'clamp',
  });
  const innerRotate = isRefreshing ? innerContinuous : innerPull;

  // Core pulse scale
  const coreScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.25],
  });

  // Opacity on pull down
  const pullOpacity = scrollY.interpolate({
    inputRange: [-45, -10, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });
  const opacity = isRefreshing ? 1 : pullOpacity;

  // Android drop offset
  const androidTranslateY = androidDropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-45, 12],
  });
  const translateY = Platform.OS === 'android' ? androidTranslateY : 0;

  const outerColor = isDark ? '#38BDF8' : '#00838F';
  const innerColor = isDark ? '#0284C7' : '#00ACC1';
  const coreColor = '#10B981'; // Emerald pulse dot (matching livePulseDot)

  return (
    <Animated.View
      style={[
        styles.ringContainer,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Outer Clockwise Ring */}
      <Animated.View
        style={{
          position: 'absolute',
          transform: [{ rotate: outerRotate }],
        }}
      >
        <Svg width={30} height={30} viewBox="0 0 30 30" fill="none">
          {/* 260° Active Arc */}
          <Path
            d="M 15 2.5 A 12.5 12.5 0 1 1 5.3 22.8"
            stroke={outerColor}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          {/* Orbit Beacon Dot */}
          <Circle cx={15} cy={2.5} r={1.6} fill={outerColor} />
        </Svg>
      </Animated.View>

      {/* Inner Counter-Clockwise Ring */}
      <Animated.View
        style={{
          position: 'absolute',
          transform: [{ rotate: innerRotate }],
        }}
      >
        <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
          {/* 210° Active Arc */}
          <Path
            d="M 10 2 A 8 8 0 1 1 3.2 14.5"
            stroke={innerColor}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      {/* Center Live Floor Pulse Core */}
      <Animated.View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: coreColor,
          transform: [{ scale: isRefreshing ? coreScale : 1 }],
          shadowColor: coreColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 3,
          elevation: 2,
        }}
      />
    </Animated.View>
  );
}

const CATEGORIES = [
  { id: 'all', label: 'All', renderIcon: renderAllIcon },
  { id: 'attendance', label: 'Attendance', renderIcon: renderAttendanceCategoryIcon },
  { id: 'members', label: 'Members', renderIcon: renderMembersCategoryIcon },
  { id: 'finance', label: 'Dues & Fees', renderIcon: renderFinanceCategoryIcon },
  { id: 'trainers', label: 'Trainers', renderIcon: renderTrainersCategoryIcon },
  { id: 'plans', label: 'Plans', renderIcon: renderPlansCategoryIcon },
];

export default function OwnerHomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors, typography, radii, shadows, layout, isDark } = useTheme();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isAuthed = Boolean(user?.gymId);

  useEffect(() => {
    runMobileConvergenceAudit().catch(() => {});
  }, []);

  // 1. Executive Analytics Query (Real Data)
  const {
    data: overview,
    isRefetching: isRefetchingOverview,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['owner-analytics-overview', user?.gymId, 'this_month'],
    queryFn: () => OwnerAnalyticsService.getOverview('this_month'),
    enabled: isAuthed,
  });

  // 2. Unread Notifications Count (Real Data)
  const {
    data: unreadCount = 0,
    refetch: refetchUnread,
  } = useQuery({
    queryKey: ['owner-unread-notifications'],
    queryFn: () => ownerNotificationService.getUnreadCount(),
    refetchInterval: 30000,
    enabled: isAuthed,
  });

  // 3. Attendance Statistics & On-Floor Count (Real Data)
  const {
    data: attendanceStats,
    refetch: refetchAttendanceStats,
  } = useQuery({
    queryKey: ['owner-attendance-stats', user?.gymId],
    queryFn: () => OwnerAttendanceService.getAttendanceStats(),
    refetchInterval: 20000,
    enabled: isAuthed,
  });

  // 4. Daily Attendance Check-ins (Real Data for Live Floor & Activity)
  const {
    data: dailyAttendance,
    refetch: refetchDailyAttendance,
  } = useQuery({
    queryKey: ['owner-daily-attendance-recent', user?.gymId],
    queryFn: () => OwnerAttendanceService.getDailyAttendance(undefined, 10),
    enabled: isAuthed,
  });

  // 5. Recent Member Admissions (Real Data for Recent Activity)
  const {
    data: recentMembersData,
    refetch: refetchRecentMembers,
  } = useQuery({
    queryKey: ['owner-members-recent-admissions', user?.gymId],
    queryFn: () => OwnerMembersService.getMembers(undefined, 'ALL', 5),
    enabled: isAuthed,
  });

  // 6. Inline Instant Member Search Results (When typing in SearchBar)
  const {
    data: searchResults,
    isFetching: isSearching,
  } = useQuery({
    queryKey: ['owner-home-member-search', searchQuery],
    queryFn: () => OwnerMembersService.getMembers(searchQuery, 'ALL', 4),
    enabled: isAuthed && searchQuery.trim().length >= 2,
  });

  // Combined Pull-To-Refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchOverview(),
        refetchUnread(),
        refetchAttendanceStats(),
        refetchDailyAttendance(),
        refetchRecentMembers(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check-ins & On Floor Calculations
  const allCheckins: AttendanceItem[] = dailyAttendance?.items ?? [];
  const currentlyOnFloor: AttendanceItem[] = allCheckins.filter((i: AttendanceItem) => !i.checkOutTime);
  const currentlyInsideCount = currentlyOnFloor.length > 0
    ? currentlyOnFloor.length
    : (attendanceStats?.todayCheckIns ?? 0);

  const recentMembers: GymMemberSummary[] = recentMembersData?.members ?? [];
  const totalRevenue = overview?.metrics.financial.netPaid ?? 0;
  const transactionCount = overview?.metrics.financial.transactionCount ?? 0;
  const expiringSoon = overview?.metrics.memberships.expiringSoon ?? 0;
  const expiredMembers = overview?.metrics.members.expired ?? 0;

  const handleCategoryPress = (catId: string) => {
    setActiveCategory(catId);
    if (catId === 'attendance' || catId === 'floor') router.push('/attendance' as any);
    else if (catId === 'members') router.push('/members' as any);
    else if (catId === 'finance') router.push('/finance' as any);
    else if (catId === 'trainers') router.push('/trainers' as any);
    else if (catId === 'plans') router.push('/plans' as any);
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isDark ? '#0F172A' : '#E6F8F9' },
      ]}
      edges={['top']}
    >
      {/* ============================================================ */}
      {/* 1. FIXED BLINKIT-STYLE TOP CONTEXT HEADER (Remains 100% Intact) */}
      {/* ============================================================ */}
      <View
        style={[
          styles.blinkitHeader,
          {
            backgroundColor: isDark ? '#0F172A' : '#E6F8F9',
            borderBottomColor: isDark ? '#334155' : '#CBD5E1',
          },
        ]}
      >
        <View style={styles.blinkitHeaderTopRow}>
          {/* Left: Blinkit in / 24 minutes / HOME - House ▾ */}
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerSubtitleText}>GymDeck in</Text>
            <Text style={styles.headerMainTitle}>
              {currentlyInsideCount > 0 ? `${currentlyInsideCount} on Floor` : 'Floor Active'}
            </Text>
            <TouchableOpacity
              style={styles.locationSelectorRow}
              onPress={() => router.push('/settings' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.locationSelectorText}>
                {user?.gymName || 'Flagship Gym'} · {user?.gymCode || 'GD-HQ'}
              </Text>
              <ChevronDown size={14} color="#0F172A" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>

            {/* Right: Cash Wallet Pill + Profile Avatar Button */}
            <View style={styles.headerRightActions}>
              {/* Cash Wallet Pill (₹2,222) */}
              <TouchableOpacity
                style={styles.cashWalletPill}
                onPress={() => router.push('/finance' as any)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="View finance ledger"
              >
                <View style={styles.cashIconCircle}>
                  <Wallet size={13} color="#15803D" />
                </View>
                <Text style={styles.cashAmountText}>
                  {formatCurrency(totalRevenue)}
                </Text>
              </TouchableOpacity>

              {/* Profile Avatar Button */}
              <TouchableOpacity
                style={styles.headerProfileBtn}
                onPress={() => router.push('/more' as any)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Account and settings"
              >
                <View style={styles.profileAvatarCircle}>
                  <Text style={styles.profileAvatarInitial}>
                    {(user?.fullName || 'Owner').charAt(0).toUpperCase()}
                  </Text>
                </View>
                {unreadCount > 0 && (
                  <View style={styles.profileUnreadDot} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Blinkit Search Bar Capsule */}
          <View style={styles.searchBarWrapper}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder='Search "Rahul", "phone", "GD-101"...'
              onScanPress={() => router.push('/attendance' as any)}
              onClear={() => setSearchQuery('')}
            />

            {/* Instant Search Results Dropdown Overlay */}
            {searchQuery.trim().length >= 2 && (
              <View
                style={[
                  styles.searchDropdown,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                  },
                  shadows.medium,
                ]}
              >
                {isSearching ? (
                  <Text style={[typography.caption, { color: colors.textSecondary, padding: 14 }]}>
                    Searching member directory...
                  </Text>
                ) : searchResults?.members && searchResults.members.length > 0 ? (
                  <>
                    {searchResults.members.map((m: GymMemberSummary) => (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.searchResultRow, { borderBottomColor: colors.borderSubtle }]}
                        onPress={() => {
                          setSearchQuery('');
                          router.push(`/members/${m.id}` as any);
                        }}
                        activeOpacity={0.7}
                      >
                        <Avatar name={m.fullName} size="sm" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>{m.fullName}</Text>
                          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                            {m.memberCode} · {m.phone}
                          </Text>
                        </View>
                        <StatusBadge status={m.membershipStatus} />
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.searchViewAllBtn}
                      onPress={() => {
                        setSearchQuery('');
                        router.push('/members' as any);
                      }}
                    >
                      <Text style={[typography.buttonSmall, { color: colors.primary }]}>
                        View all in Member Directory →
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={[typography.caption, { color: colors.textMuted, padding: 14, textAlign: 'center' }]}>
                    No members found matching "{searchQuery}"
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Blinkit Category Horizontal Rail with Active Underline Indicator */}
          <View style={styles.categoryRailWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.categoryRailScroll}
            >
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryTabItem}
                    onPress={() => handleCategoryPress(cat.id)}
                    activeOpacity={0.7}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`${cat.label} category`}
                  >
                    <View style={styles.categoryIconWrap}>
                      {cat.renderIcon(isDark, isActive)}
                    </View>
                    <Text
                      style={[
                        styles.categoryTabText,
                        isActive
                          ? [styles.categoryTabTextActive, { color: isDark ? '#F8FAFC' : '#000000' }]
                          : { color: isDark ? '#CBD5E1' : '#0F172A' },
                      ]}
                    >
                      {cat.label}
                    </Text>
                    {isActive && (
                      <View
                        style={[
                          styles.categoryActiveUnderline,
                          { backgroundColor: isDark ? '#38BDF8' : '#000000' },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* ============================================================ */}
        {/* SCROLLABLE BODY (Pull-to-refresh starts below fixed header)  */}
        {/* ============================================================ */}
        <Animated.ScrollView
          style={[
            styles.container,
            { backgroundColor: isDark ? '#0F172A' : '#E6F8F9' },
          ]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing || isRefetchingOverview}
              onRefresh={handleRefresh}
              tintColor="transparent"
              colors={['transparent']}
              progressBackgroundColor="transparent"
              style={{ backgroundColor: 'transparent' }}
            />
          }
        >
          {/* Custom Twin Kinetic Energy Rings & Live Core Loading Spinner */}
          <View style={styles.ringSlot} pointerEvents="none">
            <TwinRingsRefreshSpinner
              isRefreshing={isRefreshing || isRefetchingOverview}
              isDark={isDark}
              scrollY={scrollY}
            />
          </View>
          {/* ============================================================ */}
          {/* 2. CURATED HERO FEATURE GRID (Blinkit "CELEBRATE" Mosaic)     */}
          {/* Seamlessly blended with header wash color (no card box)      */}
          {/* ============================================================ */}
          <View
            style={[
              styles.curatedHeroContainer,
              { backgroundColor: isDark ? '#0F172A' : '#E6F8F9' },
            ]}
          >
          <View style={styles.curatedHeaderRow}>
            <View>
              <Text style={styles.curatedOverline}>TODAY'S OPERATIONS</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Text style={styles.curatedTitle}>Floor Command</Text>
                <View style={styles.livePulseDot} />
              </View>
            </View>
          </View>

          {/* Asymmetric 5-Tile Grid (Mirroring Blinkit 2-column + tall tile) */}
          <View style={styles.curatedTilesGrid}>
            {/* Left Column: TALL Tile (Slate-Blue like "Poshak, Idol & More" in Blinkit) */}
            <TouchableOpacity
              style={styles.tallFeatureTile}
              onPress={() => router.push('/attendance' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.tallTileOverline}>On Floor Now</Text>

              <View style={styles.tallTileBadgeRow}>
                <View style={styles.tallTileYellowBadge}>
                  <Text style={styles.tallTileBadgeText}>
                    {currentlyInsideCount} Active
                  </Text>
                </View>
              </View>

              <Text style={styles.tallTileSub}>
                Cap: 50 Members
              </Text>

              <View style={styles.tallTileIllustration}>
                <Dumbbell size={32} color="rgba(255, 255, 255, 0.9)" />
              </View>
            </TouchableOpacity>

            {/* Right 2x2 Column Grid */}
            <View style={styles.tileGrid2x2}>
              {/* Row 1 */}
              <View style={styles.tileRow}>
                {/* Tile 2: Today's Cash (Soft Amber) */}
                <TouchableOpacity
                  style={[styles.smallTile, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}
                  onPress={() => router.push('/finance' as any)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.smallTileTitle}>Today's Cash</Text>
                  <Text style={[styles.smallTileValue, { color: '#B45309' }]}>
                    {formatCurrency(totalRevenue)}
                  </Text>
                  <View style={[styles.smallTileChip, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.smallTileChipText, { color: '#92400E' }]}>{transactionCount} Txns</Text>
                  </View>
                </TouchableOpacity>

                {/* Tile 3: Expired / Dues (Soft Rose) */}
                <TouchableOpacity
                  style={[styles.smallTile, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                  onPress={() => router.push('/members' as any)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.smallTileTitle}>Expired / Dues</Text>
                  <Text style={[styles.smallTileValue, { color: '#DC2626' }]}>
                    {expiredMembers} Members
                  </Text>
                  <View style={[styles.smallTileChip, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.smallTileChipText, { color: '#991B1B' }]}>Defaulters</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Row 2 */}
              <View style={styles.tileRow}>
                {/* Tile 4: Expiring Soon (Soft Green) */}
                <TouchableOpacity
                  style={[styles.smallTile, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                  onPress={() => router.push('/members' as any)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.smallTileTitle}>Expiring Soon</Text>
                  <Text style={[styles.smallTileValue, { color: '#15803D' }]}>
                    {expiringSoon} Members
                  </Text>
                  <View style={[styles.smallTileChip, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.smallTileChipText, { color: '#166534' }]}>Next 3 Days</Text>
                  </View>
                </TouchableOpacity>

                {/* Tile 5: Active Plans (Soft Purple) */}
                <TouchableOpacity
                  style={[styles.smallTile, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}
                  onPress={() => router.push('/plans' as any)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.smallTileTitle}>Active Plans</Text>
                  <Text style={[styles.smallTileValue, { color: '#7E22CE' }]}>
                    {overview?.metrics.memberships.activeSubscriptions ?? 0}
                  </Text>
                  <View style={[styles.smallTileChip, { backgroundColor: '#F3E8FF' }]}>
                    <Text style={[styles.smallTileChipText, { color: '#6B21A8' }]}>Catalog</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* GRAPHIC HORIZONTAL LINE DIVIDER (Ending Color Wash Section)  */}
        {/* ============================================================ */}
        <CuratedSectionBottomDivider isDark={isDark} />

        {/* ============================================================ */}
        {/* MAIN BODY SECTIONS                                           */}
        {/* ============================================================ */}
        <View
          style={[
            styles.mainBodyContainer,
            {
              backgroundColor: isDark ? '#0B0F19' : '#F8FAFC',
              paddingBottom: layout.bottomNavHeight + 52,
            },
          ]}
        >
          {/* ============================================================ */}
          {/* 3. ACTIVE ON GYM FLOOR (Mirroring Blinkit "Previously bought")*/}
          {/* ============================================================ */}
          <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionMainTitle}>Active on Gym Floor</Text>
            <TouchableOpacity
              onPress={() => router.push('/attendance' as any)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.sectionActionLink}>See all ({currentlyInsideCount}) →</Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal Product-Card Style Rail */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.productCardsRail}
          >
            {currentlyOnFloor.length > 0 ? (
              currentlyOnFloor.map((member: AttendanceItem) => (
                <View key={member.id} style={styles.productCard}>
                  {/* Card Header: Live badge & Heart/Action icon */}
                  <View style={styles.productCardTop}>
                    <View style={styles.liveFloorChip}>
                      <View style={styles.liveChipDot} />
                      <Text style={styles.liveChipText}>In Gym</Text>
                    </View>
                    <Heart size={14} color="#CBD5E1" />
                  </View>

                  {/* Center: Member Avatar & Initial */}
                  <View style={styles.productAvatarBox}>
                    <Avatar name={member.fullName} size="md" />
                  </View>

                  {/* Member Name & Time */}
                  <Text style={styles.productMemberName} numberOfLines={1}>
                    {member.fullName}
                  </Text>
                  <Text style={styles.productMemberMeta}>
                    In: {new Date(member.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>

                  {/* 1-Tap Checkout Button */}
                  <TouchableOpacity
                    style={styles.productCardBtn}
                    onPress={() => router.push('/attendance' as any)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.productCardBtnText}>Check Out</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              /* If no one on floor: Fast check-in card */
              <TouchableOpacity
                style={[styles.productCard, styles.emptyFloorCard]}
                onPress={() => router.push('/attendance' as any)}
                activeOpacity={0.8}
              >
                <View style={styles.emptyFloorIconBox}>
                  <UserCheck size={24} color="#2563EB" />
                </View>
                <Text style={styles.productMemberName}>Floor is clear</Text>
                <Text style={[styles.productMemberMeta, { textAlign: 'center', marginTop: 2 }]}>
                  0 members on floor
                </Text>
                <View style={[styles.productCardBtn, { backgroundColor: '#2563EB', borderColor: '#2563EB', marginTop: 8 }]}>
                  <Text style={[styles.productCardBtnText, { color: '#FFFFFF' }]}>+ Check In</Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* ============================================================ */}
        {/* 4. NEEDS ATTENTION (Blinkit-style High-Priority Action Cards) */}
        {/* ============================================================ */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionMainTitle}>Needs Attention</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.attentionRail}
          >
            {expiringSoon > 0 && (
              <TouchableOpacity
                style={[styles.attentionCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}
                onPress={() => router.push('/members' as any)}
                activeOpacity={0.8}
              >
                <View style={styles.attentionCardHeader}>
                  <View style={[styles.attentionBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Clock size={12} color="#D97706" style={{ marginRight: 4 }} />
                    <Text style={[styles.attentionBadgeText, { color: '#B45309' }]}>Expiring Soon</Text>
                  </View>
                </View>
                <Text style={styles.attentionCardTitle}>
                  {expiringSoon} Memberships Expiring
                </Text>
                <Text style={styles.attentionCardDesc}>
                  Members nearing expiration require immediate renewal follow-up.
                </Text>
                <View style={styles.attentionCardActionRow}>
                  <Text style={[styles.attentionCardActionText, { color: '#B45309' }]}>
                    Review Renewals →
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {expiredMembers > 0 && (
              <TouchableOpacity
                style={[styles.attentionCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                onPress={() => router.push('/members' as any)}
                activeOpacity={0.8}
              >
                <View style={styles.attentionCardHeader}>
                  <View style={[styles.attentionBadge, { backgroundColor: '#FEE2E2' }]}>
                    <AlertCircle size={12} color="#DC2626" style={{ marginRight: 4 }} />
                    <Text style={[styles.attentionBadgeText, { color: '#991B1B' }]}>Expired Members</Text>
                  </View>
                </View>
                <Text style={styles.attentionCardTitle}>
                  {expiredMembers} Expired Memberships
                </Text>
                <Text style={styles.attentionCardDesc}>
                  Members currently marked as expired pending renewal or archive.
                </Text>
                <View style={styles.attentionCardActionRow}>
                  <Text style={[styles.attentionCardActionText, { color: '#DC2626' }]}>
                    Review Expired →
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {expiringSoon === 0 && expiredMembers === 0 && (
              <View style={[styles.attentionCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', width: 280 }]}>
                <View style={styles.attentionCardHeader}>
                  <View style={[styles.attentionBadge, { backgroundColor: '#DCFCE7' }]}>
                    <CheckCircle2 size={12} color="#166534" style={{ marginRight: 4 }} />
                    <Text style={[styles.attentionBadgeText, { color: '#166534' }]}>All Caught Up</Text>
                  </View>
                </View>
                <Text style={styles.attentionCardTitle}>No Pending Exceptions</Text>
                <Text style={styles.attentionCardDesc}>
                  All memberships are active and there are zero uncollected fee dues.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* ============================================================ */}
        {/* 5. 1-THUMB QUICK ACTION RAIL                                 */}
        {/* ============================================================ */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionMainTitle}>Quick Operational Actions</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.actionRailScroll}
          >
            {/* Action 1: Add Member */}
            <TouchableOpacity
              style={styles.actionRailItem}
              onPress={() => router.push('/members/add' as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIconSquircle, { backgroundColor: '#FFF4EE' }]}>
                <UserPlus size={20} color="#EA4303" />
              </View>
              <Text style={styles.actionRailLabel}>+ Add Member</Text>
            </TouchableOpacity>

            {/* Action 2: Check In */}
            <TouchableOpacity
              style={styles.actionRailItem}
              onPress={() => router.push('/attendance' as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIconSquircle, { backgroundColor: '#ECFDF5' }]}>
                <UserCheck size={20} color="#10B981" />
              </View>
              <Text style={styles.actionRailLabel}>Check In</Text>
            </TouchableOpacity>

            {/* Action 3: Collect Fees */}
            <TouchableOpacity
              style={styles.actionRailItem}
              onPress={() => router.push('/finance' as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIconSquircle, { backgroundColor: '#FEF3C7' }]}>
                <Wallet size={20} color="#D97706" />
              </View>
              <Text style={styles.actionRailLabel}>Collect Fees</Text>
            </TouchableOpacity>

            {/* Action 4: Renewals */}
            <TouchableOpacity
              style={styles.actionRailItem}
              onPress={() => router.push('/members' as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIconSquircle, { backgroundColor: '#F5F3FF' }]}>
                <RotateCcw size={20} color="#7C3AED" />
              </View>
              <Text style={styles.actionRailLabel}>Renewals</Text>
            </TouchableOpacity>

            {/* Action 5: Trainers */}
            <TouchableOpacity
              style={styles.actionRailItem}
              onPress={() => router.push('/trainers' as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIconSquircle, { backgroundColor: '#EFF6FF' }]}>
                <Award size={20} color="#2563EB" />
              </View>
              <Text style={styles.actionRailLabel}>Coaches</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ============================================================ */}
        {/* 6. RECENT ACTIVITY (Chronological Mobile Feed)               */}
        {/* ============================================================ */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionMainTitle}>Recent Admissions</Text>
            <TouchableOpacity
              onPress={() => router.push('/members' as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.sectionActionLink}>Directory →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityFeedList}>
            {recentMembers.length > 0 ? (
              recentMembers.slice(0, 4).map((member: GymMemberSummary, idx: number) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.activityFeedRow,
                    idx < Math.min(recentMembers.length, 4) - 1 && styles.activityRowDivider,
                  ]}
                  onPress={() => router.push(`/members/${member.id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.activityIconBox}>
                    <UserPlus size={14} color="#EA4303" />
                  </View>

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {member.fullName}
                    </Text>
                    <Text style={styles.activityMeta}>
                      {member.memberCode} · Admitted {new Date(member.joinedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>

                  <StatusBadge status={member.membershipStatus} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyActivityRow}>
                <Text style={styles.emptyActivityText}>
                  No recent member admissions logged today.
                </Text>
              </View>
            )}
          </View>
        </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  ringSlot: {
    position: 'absolute',
    top: -42,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  ringContainer: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 0,
  },

  mainBodyContainer: {
    flex: 1,
  },

  /* 1. Blinkit Top Context Header (Unified Upper Portion) */
  blinkitHeader: {
    backgroundColor: '#E6F8F9', // Blinkit fresh cyan/mint wash
    paddingTop: 8,
    paddingHorizontal: 0,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    zIndex: 50,
  },
  blinkitHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerSubtitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: -0.2,
  },
  headerMainTitle: {
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.6,
    marginTop: 1,
  },
  locationSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  locationSelectorText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  cashWalletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cashIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  cashAmountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerProfileBtn: {
    position: 'relative',
  },
  profileAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarInitial: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileUnreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EA4303',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  /* Search Bar Wrapper */
  searchBarWrapper: {
    position: 'relative',
    paddingHorizontal: 16,
    marginBottom: 8,
    zIndex: 20,
  },
  searchDropdown: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    borderWidth: 1,
    zIndex: 30,
    overflow: 'hidden',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchViewAllBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Category Horizontal Rail */
  categoryRailWrapper: {
    marginTop: 6,
    marginBottom: 0,
    width: '100%',
  },
  categoryRailScroll: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 32,
    paddingTop: 4,
    paddingBottom: 0,
    paddingHorizontal: 16,
  },
  categoryTabItem: {
    alignItems: 'center',
    paddingBottom: 7,
    paddingHorizontal: 2,
    position: 'relative',
  },
  categoryIconWrap: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  categoryTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  categoryTabTextActive: {
    fontWeight: '900',
    color: '#000000',
  },
  categoryActiveUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 2,
    right: 2,
    height: 3,
    backgroundColor: '#000000',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  /* 2. Curated Hero Feature Grid (Blinkit "CELEBRATE" Mosaic) */
  curatedHeroContainer: {
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 16,
  },
  curatedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  curatedOverline: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#00838F',
  },
  curatedTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#006064',
    letterSpacing: -0.4,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginLeft: 6,
  },
  curatedTilesGrid: {
    flexDirection: 'row',
    gap: 8,
  },

  /* Tall Tile (Left Column) */
  tallFeatureTile: {
    flex: 1.1,
    backgroundColor: '#3B82F6', // Vibrant Slate-Blue like Blinkit's tall tile
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 160,
  },
  tallTileOverline: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tallTileBadgeRow: {
    marginVertical: 4,
  },
  tallTileYellowBadge: {
    backgroundColor: '#FACC15', // Bright yellow pill like Blinkit price chip
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tallTileBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  tallTileSub: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  tallTileIllustration: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },

  /* 2x2 Grid (Right Column) */
  tileGrid2x2: {
    flex: 2,
    gap: 8,
  },
  tileRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallTile: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    minHeight: 76,
    justifyContent: 'space-between',
  },
  smallTileTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  smallTileValue: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  smallTileChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  smallTileChipText: {
    fontSize: 9.5,
    fontWeight: '800',
  },

  /* 3. Section Common */
  sectionBlock: {
    marginTop: 22,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  sectionActionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EA4303',
  },

  /* Horizontal Product-Card Rail (Active on Floor) */
  productCardsRail: {
    flexDirection: 'row',
    paddingBottom: 6,
  },
  productCard: {
    width: 144,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginRight: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  productCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  liveFloorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveChipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  liveChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  productAvatarBox: {
    alignItems: 'center',
    marginVertical: 4,
  },
  productMemberName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
    textAlign: 'center',
  },
  productMemberMeta: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },
  productCardBtn: {
    marginTop: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productCardBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  emptyFloorCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  emptyFloorIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },

  /* 4. Attention Rail */
  attentionRail: {
    flexDirection: 'row',
    paddingBottom: 4,
  },
  attentionCard: {
    width: 250,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginRight: 10,
  },
  attentionCardHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  attentionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attentionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  attentionCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  attentionCardDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 15,
  },
  attentionCardActionRow: {
    marginTop: 8,
  },
  attentionCardActionText: {
    fontSize: 11.5,
    fontWeight: '800',
  },

  /* 5. 1-Thumb Quick Action Rail */
  actionRailScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  actionRailItem: {
    alignItems: 'center',
    width: 76,
  },
  actionIconSquircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionRailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },

  /* 6. Recent Activity Feed */
  activityFeedList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  activityFeedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFF4EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  activityMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  emptyActivityRow: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyActivityText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
