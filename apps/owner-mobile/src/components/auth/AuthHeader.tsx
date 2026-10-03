/**
 * GymDeck Owner Mobile - Modern Curved Vibrant Auth Header
 * Matches the reference design with layered abstract geometric backdrop,
 * brand emblem, bold white headline, and clean curved transition.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dumbbell } from 'lucide-react-native';

interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

const { width } = Dimensions.get('window');

export const AuthHeader: React.FC<AuthHeaderProps> = ({ title, subtitle }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + 16, 36) }]}>
      {/* Abstract Background Decorative Shapes matching reference image */}
      <View style={styles.bgDecorWrapper} pointerEvents="none">
        {/* Left floating shape */}
        <View style={[styles.decorCard, styles.decorLeft]} />
        {/* Center floating shape */}
        <View style={[styles.decorCard, styles.decorCenter]} />
        {/* Right floating shape */}
        <View style={[styles.decorCard, styles.decorRight]} />
        {/* Subtle circular ambient glow */}
        <View style={styles.decorGlow} />
      </View>

      {/* Brand Header */}
      <View style={styles.brandRow}>
        <View style={styles.brandIconWrapper}>
          <Dumbbell size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.brandName}>GymDeck</Text>
      </View>

      {/* Title & Subtitle */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#EA4303',
    paddingHorizontal: 24,
    paddingBottom: 48,
    position: 'relative',
    overflow: 'hidden',
  },
  bgDecorWrapper: {
    ...StyleSheet.absoluteFill,
  },
  decorCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
  },
  decorLeft: {
    width: 110,
    height: 120,
    top: -10,
    left: -20,
    opacity: 0.12,
    transform: [{ rotate: '-14deg' }],
  },
  decorCenter: {
    width: 140,
    height: 130,
    top: -25,
    left: width * 0.35,
    opacity: 0.1,
    transform: [{ rotate: '8deg' }],
  },
  decorRight: {
    width: 120,
    height: 130,
    top: -15,
    right: -25,
    opacity: 0.12,
    transform: [{ rotate: '18deg' }],
  },
  decorGlow: {
    position: 'absolute',
    width: width * 0.8,
    height: 140,
    bottom: -40,
    left: width * 0.1,
    backgroundColor: '#FF6B35',
    borderRadius: 70,
    opacity: 0.25,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    zIndex: 2,
  },
  brandIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  content: {
    alignItems: 'center',
    textAlign: 'center',
    zIndex: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 300,
  },
});
