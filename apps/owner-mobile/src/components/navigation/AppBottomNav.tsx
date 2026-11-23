/**
 * GymDeck Owner Mobile - Global Fixed Bottom Navigation Bar
 *
 * Persistent, rock-solid floating glassmorphic navigation bar:
 * - Frosted glass capsule using BlurView (tint="light" / "dark")
 * - Whitish faded mist backdrop at the bottom so scrolling content dissolves softly
 * - Bespoke, handcrafted two-tone vector icons (warm yellow fill #FACC15 + crisp dark outline #0F172A)
 * - Butter-smooth native-driven sliding cyan pill (#D6F4F8) with spring physics
 * - Subtle spring bounce pop on active tab icon
 * - Fixed position across all operational screens, hidden on auth screens
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Platform,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Path,
  Circle,
} from 'react-native-svg';
import { useTheme } from '../../theme';

interface NavItem {
  id: 'home' | 'finance' | 'more';
  label: string;
  route: string;
  renderIcon: (isDark: boolean, focused: boolean) => React.ReactNode;
}

const TAB_INDEX_MAP: Record<NavItem['id'], number> = {
  home: 0,
  finance: 1,
  more: 2,
};

// 1. Home Icon (Bespoke House with Warm Yellow Body & Dark Arched Doorway)
const renderHomeIcon = (isDark: boolean, focused: boolean) => {
  const strokeColor = isDark ? '#94A3B8' : '#334155';
  if (focused) {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        {/* House body & roof filled with warm yellow */}
        <Path
          d="M3.2 10.5L12 2.8l8.8 7.7v9a1.5 1.5 0 0 1-1.5 1.5H4.7a1.5 1.5 0 0 1-1.5-1.5v-9z"
          fill="#FACC15"
          stroke="#0F172A"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* Crisp dark arched doorway */}
        <Path
          d="M9.5 21v-5.2a2.5 2.5 0 0 1 5 0V21"
          fill="#0F172A"
          stroke="#0F172A"
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        {/* Roof chimney accent */}
        <Path
          d="M17.5 4v3.2"
          stroke="#0F172A"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.2L12 3l9 7.2v9.3a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5V10.2z"
        stroke={strokeColor}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.5 21v-6a2.5 2.5 0 0 1 5 0v6"
        stroke={strokeColor}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// 2. Finance Icon (Wallet with Dark Clasp Flap & Golden Latch Dot)
const renderFinanceIcon = (isDark: boolean, focused: boolean) => {
  const strokeColor = isDark ? '#94A3B8' : '#334155';
  if (focused) {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        {/* Peeking bill / card */}
        <Path
          d="M6.5 6V4.5a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5V6"
          stroke="#0F172A"
          strokeWidth={1.8}
          fill="#FEF9C3"
        />
        {/* Main wallet body */}
        <Rect
          x="2.5"
          y="6"
          width="19"
          height="14"
          rx="3.5"
          fill="#FACC15"
          stroke="#0F172A"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* Dark clasp flap */}
        <Path
          d="M14 9.8h5.2a2.2 2.2 0 0 1 2.2 2.2v0a2.2 2.2 0 0 1-2.2 2.2H14a1 1 0 0 1-1-1v-2.4a1 1 0 0 1 1-1z"
          fill="#0F172A"
          stroke="#0F172A"
          strokeWidth={1.5}
        />
        {/* Golden center latch dot */}
        <Circle cx="18.5" cy="12" r="1.3" fill="#FACC15" />
      </Svg>
    );
  }
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2.5"
        y="6"
        width="19"
        height="14"
        rx="3"
        stroke={strokeColor}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 6V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V6"
        stroke={strokeColor}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <Path
        d="M15 10.5h4.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H15"
        stroke={strokeColor}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Circle cx="18" cy="12.5" r="1.2" fill={strokeColor} />
    </Svg>
  );
};

// 3. More Icon (Four Rounded Tiles in 2x2 Grid)
const renderMoreIcon = (isDark: boolean, focused: boolean) => {
  const strokeColor = isDark ? '#94A3B8' : '#334155';
  if (focused) {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Rect
          x="3"
          y="3"
          width="7.6"
          height="7.6"
          rx="2.4"
          fill="#FACC15"
          stroke="#0F172A"
          strokeWidth={1.9}
          strokeLinejoin="round"
        />
        <Rect
          x="13.4"
          y="3"
          width="7.6"
          height="7.6"
          rx="2.4"
          fill="#FACC15"
          stroke="#0F172A"
          strokeWidth={1.9}
          strokeLinejoin="round"
        />
        <Rect
          x="3"
          y="13.4"
          width="7.6"
          height="7.6"
          rx="2.4"
          fill="#FACC15"
          stroke="#0F172A"
          strokeWidth={1.9}
          strokeLinejoin="round"
        />
        <Rect
          x="13.4"
          y="13.4"
          width="7.6"
          height="7.6"
          rx="2.4"
          fill="#FACC15"
          stroke="#0F172A"
          strokeWidth={1.9}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3.5"
        y="3.5"
        width="7"
        height="7"
        rx="2"
        stroke={strokeColor}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x="13.5"
        y="3.5"
        width="7"
        height="7"
        rx="2"
        stroke={strokeColor}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x="3.5"
        y="13.5"
        width="7"
        height="7"
        rx="2"
        stroke={strokeColor}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x="13.5"
        y="13.5"
        width="7"
        height="7"
        rx="2"
        stroke={strokeColor}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    route: '/(tabs)',
    renderIcon: renderHomeIcon,
  },
  {
    id: 'finance',
    label: 'Finance',
    route: '/(tabs)/finance',
    renderIcon: renderFinanceIcon,
  },
  {
    id: 'more',
    label: 'More',
    route: '/(tabs)/more',
    renderIcon: renderMoreIcon,
  },
];

export const AppBottomNav: React.FC = () => {
  const router = useRouter();
  const segments = useSegments() as unknown as string[];
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { isDark } = useTheme();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const [fontsLoaded] = useFonts({
    'Ethnocentric-Regular': require('../../../assets/fonts/Ethnocentric-Regular.otf'),
  });

  // Circular Action Button Press Spring Animation
  const pressScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.91,
      speed: 24,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      damping: 14,
      stiffness: 240,
      useNativeDriver: true,
    }).start();
  };

  const handleCircularPress = () => {
    router.push('/members/add' as any);
  };

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const inAuthGroup = segments[0] === '(auth)';

  // Determine active tab based on route segments
  const activeTabId: NavItem['id'] | null = (() => {
    const first = segments[0] as string | undefined;
    const second = segments[1] as string | undefined;

    if (first === '(tabs)') {
      if (second === 'finance') return 'finance';
      if (second === 'more') return 'more';
      if (second === 'attendance' || second === 'members') return null;
      return 'home';
    }

    if (first === 'finance') return 'finance';
    if (first === 'attendance' || first === 'members') return null;

    if (
      first === 'trainers' ||
      first === 'pt' ||
      first === 'plans' ||
      first === 'reports' ||
      first === 'notifications' ||
      first === 'settings' ||
      first === 'security' ||
      first === 'account' ||
      first === 'sync'
    ) {
      return 'more';
    }

    return 'home';
  })();

  if (inAuthGroup || isKeyboardVisible) {
    return null;
  }

  const handleTabPress = (item: NavItem) => {
    const isCurrentlyActive = activeTabId === item.id;
    const isAtTabRoot =
      segments[0] === '(tabs)' &&
      (segments[1] === item.id || (!segments[1] && item.id === 'home'));

    if (isCurrentlyActive && isAtTabRoot) {
      return;
    }

    router.replace(item.route as any);
  };

  // Dimensions & Geometry for the Squared Cutout Navbar
  const EXTRA_TOP = 24; // Headroom above navbar top edge allowing the GymDeck button to pop up cleanly without hit-test clipping
  const TAB_BAR_HEIGHT = 60; // Standard ergonomic mobile bottom tab height
  const totalHeight = TAB_BAR_HEIGHT + insets.bottom;
  const containerHeight = totalHeight + EXTRA_TOP;

  const buttonRadius = 29;
  const buttonDiameter = 58;
  const rightMargin = 18;
  const cx = screenWidth - rightMargin - buttonRadius;
  const cy = EXTRA_TOP + 12; // Button vertical center (17px pops above navbar top edge y0)
  const y0 = EXTRA_TOP; // Top edge of the squared navbar

  const flare = 48; // Left/right distance from center to notch shoulder start
  const notchArcRadius = 36; // Cutout arc radius giving ~7px clean margin around the button

  // SVG Cutout Notch Path Definition:
  // Starts at top-left (0, y0), lines horizontally to left shoulder, curves into arc cutout around button,
  // curves out of right shoulder, lines to top-right (screenWidth, y0).
  const notchContourPath = `M 0,${y0} L ${(cx - flare).toFixed(1)},${y0} C ${(cx - 42).toFixed(1)},${y0} ${(cx - notchArcRadius).toFixed(1)},${y0 + 4} ${(cx - notchArcRadius).toFixed(1)},${y0 + 10} A ${notchArcRadius} ${notchArcRadius} 0 0 0 ${(cx + notchArcRadius).toFixed(1)},${y0 + 10} C ${(cx + notchArcRadius).toFixed(1)},${y0 + 4} ${(cx + 42).toFixed(1)},${y0} ${Math.min(cx + flare, screenWidth).toFixed(1)},${y0} L ${screenWidth},${y0}`;

  // Complete filled background polygon covering full width down to bottom safe area
  const navbarBgPath = `${notchContourPath} L ${screenWidth},${containerHeight} L 0,${containerHeight} Z`;

  // Tabs width available to the left of the cutout notch
  const tabsWidth = Math.max(cx - flare - 8, 160);

  return (
    <View
      style={[
        styles.outerDock,
        {
          height: containerHeight,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* 1. Squared Navbar Background with Cutout Notch & Top Border Stroke */}
      <Svg
        width={screenWidth}
        height={containerHeight}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="navbarBgGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0%"
              stopColor={isDark ? '#0F172A' : '#FFFFFF'}
              stopOpacity={1}
            />
            <Stop
              offset="100%"
              stopColor={isDark ? '#090D16' : '#FAFAFA'}
              stopOpacity={1}
            />
          </LinearGradient>
        </Defs>

        {/* Solid squared navbar background with cutout notch */}
        <Path
          d={navbarBgPath}
          fill="url(#navbarBgGrad)"
        />

        {/* Crisp continuous top hairline border following both flat edges and the scooped cutout notch */}
        <Path
          d={notchContourPath}
          stroke={isDark ? '#334155' : '#E2E8F0'}
          strokeWidth={1}
          fill="none"
        />
      </Svg>

      {/* 2. Tab Navigation Items (Left & Center Section) */}
      <View
        style={[
          styles.tabsRow,
          {
            top: EXTRA_TOP,
            width: tabsWidth,
            height: TAB_BAR_HEIGHT,
          },
        ]}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTabId === item.id;

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.tabItem}
              onPress={() => handleTabPress(item)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${item.label} tab`}
            >
              {/* Subtle active indicator accent at top of tab */}
              {isActive && (
                <View
                  style={[
                    styles.activeIndicatorPill,
                    { backgroundColor: isDark ? '#FACC15' : '#0F172A' },
                  ]}
                />
              )}

              {/* Tab Icon */}
              <View style={styles.iconContainer}>
                {item.renderIcon(isDark, isActive)}
              </View>

              {/* Tab Label */}
              <Text
                style={[
                  styles.tabLabel,
                  isActive
                    ? [
                        styles.activeTabLabel,
                        { color: isDark ? '#F8FAFC' : '#0F172A' },
                      ]
                    : [
                        styles.inactiveTabLabel,
                        { color: isDark ? '#94A3B8' : '#64748B' },
                      ],
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. Popped Circular GymDeck Action Button in Cutout Socket */}
      <Animated.View
        style={[
          styles.circularButtonWrapper,
          {
            top: cy - buttonRadius,
            left: cx - buttonRadius,
            width: buttonDiameter,
            height: buttonDiameter,
            borderRadius: buttonRadius,
            transform: [{ scale: pressScale }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleCircularPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.88}
          style={[
            styles.circularTouchable,
            {
              width: buttonDiameter,
              height: buttonDiameter,
              borderRadius: buttonRadius,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="GymDeck brand button"
        >
          {/* Radiant Orange Gradient Surface */}
          <View
            style={[
              styles.orangeCircleSurface,
              {
                width: buttonDiameter,
                height: buttonDiameter,
                borderRadius: buttonRadius,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.45)' : '#FFFFFF',
              },
            ]}
          >
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="gymdeckOrangeGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#FF6224" />
                  <Stop offset="100%" stopColor="#DC3600" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#gymdeckOrangeGrad)" />
            </Svg>

            {/* Centered Compact Ethnocentric GYMDECK Wordmark */}
            <Text
              style={[
                styles.circularBrandText,
                fontsLoaded ? { fontFamily: 'Ethnocentric-Regular' } : { fontWeight: '900' },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              GYMDECK
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 12,
  },
  tabsRow: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    position: 'relative',
  },
  activeIndicatorPill: {
    position: 'absolute',
    top: 0,
    width: 22,
    height: 3,
    borderRadius: 1.5,
  },
  iconContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    height: 13,
    lineHeight: 13,
    marginTop: 3,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  activeTabLabel: {
    fontWeight: '800',
  },
  inactiveTabLabel: {
    fontWeight: '600',
  },
  circularButtonWrapper: {
    position: 'absolute',
    shadowColor: '#EA4303',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 110,
  },
  circularTouchable: {
    overflow: 'hidden',
  },
  orangeCircleSurface: {
    backgroundColor: '#EA4303',
    overflow: 'hidden',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  circularBrandText: {
    fontSize: 6.2,
    lineHeight: 9,
    color: '#FFFFFF',
    letterSpacing: 0.6,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    textShadowColor: 'rgba(0, 0, 0, 0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default AppBottomNav;
