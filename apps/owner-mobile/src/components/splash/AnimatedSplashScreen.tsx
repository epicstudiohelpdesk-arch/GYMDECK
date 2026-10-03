/**
 * GymDeck Owner Mobile - Flagship Branded Animated Splash Screen
 *
 * Implements the exact brand design language from the Auth Header (login page):
 * - Signature GymDeck Vibrant Orange (#EA4303) background with warm ambient depth
 * - Layered abstract faded white cards tilted dynamically (-14deg, 8deg, 18deg, etc.) matching AuthHeader
 * - Confident bold all-caps hero wordmark in the Ethnocentric font: "GYMDECK"
 * - Compact, refined subtitle lockup: "— SMART GYM OS —"
 * - Specular light sweep sheen beam
 * - Buttery smooth spring entrance & seamless cross-dissolve exit to Auth
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Svg, {
  Rect,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  /**
   * When `true`, the splash stays fully visible (covering the underlying route).
   * When it flips to `false` (only after the entrance showcase has completed),
   * a state-driven exit crossfade begins and `onAnimationComplete` fires once
   * the road is cleared for the final route.
   */
  active: boolean;
  /** Fires once the full branded entrance timeline finishes its showcase. */
  onEntranceComplete?: () => void;
  /** Fires once the exit crossfade has fully finished. */
  onAnimationComplete?: () => void;
}

export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  active,
  onEntranceComplete,
  onAnimationComplete,
}) => {
  const [fontsLoaded] = useFonts({
    'Ethnocentric-Regular': require('../../../assets/fonts/Ethnocentric-Regular.otf'),
  });

  // Root container exit transition
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  // Background and faded cards entrance
  const bgOpacity = useRef(new Animated.Value(0)).current;

  // Central Logo Animation
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(10)).current;

  // Tagline Animation
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(8)).current;

  // Specular Shimmer Sheen Beam across wordmark
  const shimmerTranslateX = useRef(new Animated.Value(-width * 0.65)).current;
  const shimmerOpacity = useRef(new Animated.Value(0)).current;

  const exitStarted = useRef(false);

  useEffect(() => {
    // Premium entrance showcase (~3s) mirroring the iOS launch feel:
    // background + wordmark spring in, subtitle fade-up, then a slow specular
    // sweep across the wordmark with a brief branded hold before exit.
    const timeline = Animated.sequence([
      // Stage A: Background and Wordmark Spring Entrance (0ms - ~800ms)
      Animated.parallel([
        Animated.timing(bgOpacity, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 540,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 42,
          useNativeDriver: true,
        }),
        Animated.spring(logoTranslateY, {
          toValue: 0,
          friction: 7,
          tension: 42,
          useNativeDriver: true,
        }),
      ]),

      // Stage B: Subtitle Fade-Up
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 0.88,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(taglineTranslateY, {
          toValue: 0,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),

      // Stage C: Specular Light Sweep across letters
      Animated.parallel([
        Animated.timing(shimmerOpacity, {
          toValue: 0.45,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerTranslateX, {
          toValue: width * 0.66,
          duration: 950,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // Stage D: Brief branded hold so the final frame breathes before exit.
      Animated.delay(320),
    ]);

    timeline.start(({ finished }) => {
      if (finished) {
        onEntranceComplete?.();
      }
    });

    return () => {
      timeline.stop();
    };
  }, [bgOpacity, logoOpacity, logoScale, logoTranslateY, taglineOpacity, taglineTranslateY, shimmerOpacity, shimmerTranslateX]);

  // State-driven exit: only when the parent signals the auth decision is final
  // AND the entrance showcase has run to completion.
  useEffect(() => {
    if (active || exitStarted.current) return;
    exitStarted.current = true;
    Animated.parallel([
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 380,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(containerScale, {
        toValue: 1.035,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onAnimationComplete?.();
      }
    });
  }, [active, containerOpacity, containerScale, onAnimationComplete]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}
      pointerEvents="box-none"
    >
      <StatusBar style="light" />

      {/* Lush Radiant Brand Gradient Base */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]}
        pointerEvents="none"
      >
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="brandLinearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#DF3800" />
              <Stop offset="45%" stopColor="#EA4303" />
              <Stop offset="80%" stopColor="#F55716" />
              <Stop offset="100%" stopColor="#FF6B2B" />
            </LinearGradient>

            <RadialGradient
              id="ambientCenterGlow"
              cx="50%"
              cy="48%"
              rx="60%"
              ry="45%"
              fx="50%"
              fy="48%"
            >
              <Stop offset="0%" stopColor="#FF8F54" stopOpacity="0.25" />
              <Stop offset="50%" stopColor="#FF6B2B" stopOpacity="0.10" />
              <Stop offset="100%" stopColor="#EA4303" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Rect width={width} height={height} fill="url(#brandLinearGrad)" />
          <Rect width={width} height={height} fill="url(#ambientCenterGlow)" />
        </Svg>
      </Animated.View>

      {/* Abstract Faded Cards Graphics (Directly matching the Auth Header graphics in login page) */}
      <Animated.View
        style={[styles.bgDecorWrapper, { opacity: bgOpacity }]}
        pointerEvents="none"
      >
        {/* Top-Left floating card (matches login AuthHeader) */}
        <View style={[styles.decorCard, styles.decorTopLeft]} />
        {/* Top-Center floating card (matches login AuthHeader) */}
        <View style={[styles.decorCard, styles.decorTopCenter]} />
        {/* Top-Right floating card (matches login AuthHeader) */}
        <View style={[styles.decorCard, styles.decorTopRight]} />

        {/* Mid-Left floating card */}
        <View style={[styles.decorCard, styles.decorMidLeft]} />
        {/* Mid-Right floating card */}
        <View style={[styles.decorCard, styles.decorMidRight]} />

        {/* Bottom-Left floating card */}
        <View style={[styles.decorCard, styles.decorBottomLeft]} />
        {/* Bottom-Right floating card */}
        <View style={[styles.decorCard, styles.decorBottomRight]} />

        {/* Bottom Ambient Glow Pill (matches login AuthHeader) */}
        <View style={styles.decorGlow} />
      </Animated.View>

      {/* Main Optical Center: Bold Ethnocentric GYMDECK Wordmark + Subtitle */}
      <View style={styles.centerSection}>
        {/* Bold Confident GYMDECK Wordmark in Ethnocentric font */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { translateY: logoTranslateY }],
            },
          ]}
        >
          <Text
            style={[
              styles.brandTitle,
              fontsLoaded && { fontFamily: 'Ethnocentric-Regular' },
            ]}
          >
            GYMDECK
          </Text>

          {/* Specular Light Sweep Beam */}
          <Animated.View
            style={[
              styles.shimmerBeam,
              {
                opacity: shimmerOpacity,
                transform: [{ translateX: shimmerTranslateX }, { rotate: '25deg' }],
              },
            ]}
          />
        </Animated.View>

        {/* Compact Minimalist Subtitle */}
        <Animated.View
          style={[
            styles.taglineContainer,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          <View style={styles.taglineRow}>
            <View style={styles.taglineDash} />
            <Text style={styles.taglineText}>SMART GYM OS</Text>
            <View style={styles.taglineDash} />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#EA4303',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bgDecorWrapper: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  decorCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  // Top cards (Identical geometry & orientation to login AuthHeader)
  decorTopLeft: {
    width: 125,
    height: 135,
    top: -15,
    left: -20,
    borderRadius: 26,
    opacity: 0.12,
    transform: [{ rotate: '-14deg' }],
  },
  decorTopCenter: {
    width: 155,
    height: 145,
    top: -30,
    left: width * 0.35,
    borderRadius: 28,
    opacity: 0.1,
    transform: [{ rotate: '8deg' }],
  },
  decorTopRight: {
    width: 135,
    height: 145,
    top: -15,
    right: -25,
    borderRadius: 28,
    opacity: 0.12,
    transform: [{ rotate: '18deg' }],
  },
  // Mid cards for full screen vertical balance
  decorMidLeft: {
    width: 120,
    height: 130,
    top: height * 0.42,
    left: -42,
    borderRadius: 24,
    opacity: 0.08,
    transform: [{ rotate: '12deg' }],
  },
  decorMidRight: {
    width: 135,
    height: 145,
    top: height * 0.36,
    right: -45,
    borderRadius: 26,
    opacity: 0.09,
    transform: [{ rotate: '-18deg' }],
  },
  // Bottom cards for anchored baseline
  decorBottomLeft: {
    width: 165,
    height: 175,
    bottom: -35,
    left: -30,
    borderRadius: 34,
    opacity: 0.11,
    transform: [{ rotate: '-22deg' }],
  },
  decorBottomRight: {
    width: 145,
    height: 155,
    bottom: -25,
    right: -25,
    borderRadius: 30,
    opacity: 0.1,
    transform: [{ rotate: '16deg' }],
  },
  // Bottom ambient glow pill (matches login AuthHeader)
  decorGlow: {
    position: 'absolute',
    width: width * 0.85,
    height: 160,
    bottom: -40,
    left: width * 0.075,
    backgroundColor: '#FF6B35',
    borderRadius: 80,
    opacity: 0.25,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    marginTop: -20,
    zIndex: 20,
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  shimmerBeam: {
    position: 'absolute',
    width: 32,
    height: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  taglineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taglineDash: {
    width: 12,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    marginHorizontal: 8,
  },
  taglineText: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 2.4,
    textAlign: 'center',
  },
});
