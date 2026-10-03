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
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useSegments } from 'expo-router';
import { BlurView } from 'expo-blur';
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
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const [fontsLoaded] = useFonts({
    'Ethnocentric-Regular': require('../../../assets/fonts/Ethnocentric-Regular.otf'),
  });

  // Responsive navbar width fallback (leaving 14px left margin, 10px gap, 64px circular button, 14px right margin)
  const screenWidth = Dimensions.get('window').width;
  const initialRowWidth = Math.max(screenWidth - 102, 180);
  const [rowWidth, setRowWidth] = useState(initialRowWidth);

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

  const activeIndex = activeTabId !== null ? TAB_INDEX_MAP[activeTabId] : -1;

  // 1. Sliding Greenish Blob Native Spring Animation & Fade
  const activeIndexAnim = useRef(new Animated.Value(activeIndex >= 0 ? activeIndex : 0)).current;
  const pillOpacityAnim = useRef(new Animated.Value(activeIndex >= 0 ? 1 : 0)).current;

  useEffect(() => {
    if (activeIndex >= 0) {
      Animated.parallel([
        Animated.spring(activeIndexAnim, {
          toValue: activeIndex,
          damping: 24,
          stiffness: 260,
          mass: 0.85,
          useNativeDriver: true,
        }),
        Animated.timing(pillOpacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(pillOpacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [activeIndex]);

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

  const bottomMargin = Math.max(insets.bottom > 0 ? insets.bottom - 10 : 8, 6);
  const fadeHeight = 125 + insets.bottom;

  // Metrics for the gliding rounded blob
  const tabCount = NAV_ITEMS.length;
  const tabWidth = rowWidth / tabCount;
  const blobMargin = 3;
  const blobWidth = Math.max(tabWidth - blobMargin * 2, 40);

  const translateX = activeIndexAnim.interpolate({
    inputRange: NAV_ITEMS.map((_, i) => i),
    outputRange: NAV_ITEMS.map((_, i) => tabWidth * i + blobMargin),
  });

  return (
    <>
      {/* 1. Whitish Faded & Blurry Mist Backdrop (Content scrolling underneath dissolves softly) */}
      <View
        style={[styles.bottomFadeBackdrop, { height: fadeHeight }]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="whitishMist" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0%"
                stopColor={isDark ? '#0B0F19' : '#FFFFFF'}
                stopOpacity="0"
              />
              <Stop
                offset="65%"
                stopColor={isDark ? '#0B0F19' : '#FFFFFF'}
                stopOpacity="0"
              />
              <Stop
                offset="85%"
                stopColor={isDark ? '#0B0F19' : '#FFFFFF'}
                stopOpacity={isDark ? 0.30 : 0.35}
              />
              <Stop
                offset="100%"
                stopColor={isDark ? '#0B0F19' : '#FFFFFF'}
                stopOpacity={isDark ? 0.90 : 0.95}
              />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#whitishMist)" />
        </Svg>
      </View>

      {/* 2. Floating Row: Liquid Transparent Capsule Navbar + Circular GymDeck Action Button */}
      <View
        style={[styles.bottomBarRow, { bottom: bottomMargin }]}
        pointerEvents="box-none"
      >
        {/* Liquid Glass Capsule Navbar (Matches Reference Liquid Design & Shader) */}
        <View
          style={[
            styles.capsuleWrapper,
            {
              shadowColor: isDark ? '#000000' : '#0F172A',
              shadowOpacity: isDark ? 0.35 : 0.12,
            },
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.capsuleFrame,
              {
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'rgba(255, 255, 255, 0.95)',
              },
            ]}
          >
            {/* 1. Native Real-Time Optical Blur View (Crisp, subtle blur for high clarity liquid glass) */}
            <BlurView
              intensity={Platform.OS === 'ios' ? 28 : 20}
              tint={isDark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
              style={StyleSheet.absoluteFill}
            />

            {/* 2. Liquid Glass Translucent Refractive Base Tint (Clear optical clarity) */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: isDark
                    ? 'rgba(15, 23, 42, 0.12)'
                    : 'rgba(255, 255, 255, 0.05)',
                },
              ]}
              pointerEvents="none"
            />

            {/* 3. Shader-derived Directional Specular Sheen (rb1 * gradient + rb3 caustic bounce) */}
            <Svg
              width="100%"
              height="100%"
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Defs>
                <LinearGradient id="liquidGlassSheen" x1="0" y1="0" x2="0" y2="1">
                  <Stop
                    offset="0%"
                    stopColor="#FFFFFF"
                    stopOpacity={isDark ? 0.38 : 0.65}
                  />
                  <Stop
                    offset="20%"
                    stopColor="#FFFFFF"
                    stopOpacity={isDark ? 0.08 : 0.18}
                  />
                  <Stop offset="45%" stopColor="#FFFFFF" stopOpacity="0" />
                  <Stop offset="80%" stopColor="#FFFFFF" stopOpacity="0" />
                  <Stop
                    offset="100%"
                    stopColor="#FFFFFF"
                    stopOpacity={isDark ? 0.08 : 0.22}
                  />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#liquidGlassSheen)" />
            </Svg>

            {/* 4. Inner Liquid Glass Bezel (Double-Rim Caustic Refraction Contour - rb2 in shader) */}
            <View
              style={[
                styles.innerGlassBezel,
                {
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(255, 255, 255, 0.45)',
                },
              ]}
              pointerEvents="none"
            />

            {/* 5. Capsule Content & Tabs */}
            <View
              style={styles.capsuleContent}
              onLayout={(e) => {
                const width = e.nativeEvent.layout.width;
                if (width > 0 && Math.abs(width - rowWidth) > 0.5) {
                  setRowWidth(width);
                }
              }}
            >
              {/* Smooth Gliding Liquid Water-Drop Cushion Pill (Native Driver) */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.slidingPill,
                  {
                    width: blobWidth,
                    opacity: pillOpacityAnim,
                    transform: [{ translateX }],
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.14)'
                      : 'rgba(255, 255, 255, 0.52)',
                    borderColor: isDark
                      ? 'rgba(255, 255, 255, 0.22)'
                      : 'rgba(255, 255, 255, 0.82)',
                    shadowColor: isDark ? '#000000' : '#0F172A',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDark ? 0.28 : 0.08,
                    shadowRadius: 6,
                    elevation: 3,
                  },
                ]}
              >
                {/* Liquid Glass Pill Convex Gloss */}
                <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                  <Defs>
                    <LinearGradient id="pillGloss" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={isDark ? 0.25 : 0.50} />
                      <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0" />
                      <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={isDark ? 0.05 : 0.15} />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" rx={28} fill="url(#pillGloss)" />
                </Svg>
              </Animated.View>

              {/* Tab Items */}
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
                    {/* Stationary Icon Container */}
                    <View style={styles.iconContainer}>
                      {item.renderIcon(isDark, isActive)}
                    </View>

                    {/* Label */}
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
                              { color: isDark ? '#94A3B8' : '#475569' },
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
          </View>
        </View>

        {/* Circular Action Button (64px matching navbar height) */}
        <Animated.View
          style={[
            styles.circularButtonWrapper,
            { transform: [{ scale: pressScale }] },
          ]}
        >
          <TouchableOpacity
            onPress={handleCircularPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.88}
            style={styles.circularTouchable}
            accessibilityRole="button"
            accessibilityLabel="GymDeck brand button"
          >
            {/* Radiant Orange Gradient Surface */}
            <View style={styles.orangeCircleSurface}>
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="gymdeckOrangeGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#FF6224" />
                    <Stop offset="100%" stopColor="#DC3600" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#gymdeckOrangeGrad)" />
              </Svg>

              {/* Perfectly Centered Compact Ethnocentric GYMDECK Wordmark */}
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
    </>
  );
};

const styles = StyleSheet.create({
  bottomFadeBackdrop: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 90,
  },
  bottomBarRow: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  capsuleWrapper: {
    flex: 1,
    height: 64,
    marginRight: 10,
    borderRadius: 32,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  capsuleFrame: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  innerGlassBezel: {
    position: 'absolute',
    top: 1.5,
    left: 1.5,
    right: 1.5,
    bottom: 1.5,
    borderRadius: 30.5,
    borderWidth: 1,
  },
  capsuleContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  slidingPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 28,
    borderWidth: 1,
    zIndex: 0,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 9.5,
    height: 12.5,
    lineHeight: 12.5,
    marginTop: 1.5,
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
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  circularTouchable: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  orangeCircleSurface: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EA4303',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  circularBrandText: {
    fontSize: 6.6,
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
