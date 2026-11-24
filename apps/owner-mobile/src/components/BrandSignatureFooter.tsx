/**
 * GymDeck Owner Mobile - Brand Signature Footer
 *
 * Replicates the elegant desktop signature brand footer:
 * - 🇮🇳 ENGINEERED IN INDIA
 * - Made with ❤️ in India
 * - Built for the People Who Build Stronger People.
 * - GYMDECK (Ethnocentric font)
 * - FITNESS MANAGEMENT PLATFORM
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';

interface BrandSignatureFooterProps {
  isDark?: boolean;
}

export const BrandSignatureFooter: React.FC<BrandSignatureFooterProps> = ({ isDark = false }) => {
  const [fontsLoaded] = useFonts({
    'Ethnocentric-Regular': require('../../assets/fonts/Ethnocentric-Regular.otf'),
  });

  const textColor = isDark ? '#64748B' : '#98A2B3';
  const headingColor = isDark ? '#94A3B8' : '#98A2B3';
  const heartColor = isDark ? '#C084FC' : '#9E7E82';

  return (
    <View style={styles.container}>
      {/* 1. Flag & Kicker */}
      <View style={styles.flagLabelRow}>
        <Text style={styles.flag}>🇮🇳</Text>
        <Text style={[styles.kicker, { color: textColor }]}>ENGINEERED IN INDIA</Text>
      </View>

      {/* 2. Primary Headline */}
      <Text style={[styles.primaryHeadline, { color: headingColor }]}>
        Made with <Text style={[styles.heart, { color: heartColor }]}>❤️</Text> in India
      </Text>

      {/* 3. Brand Philosophy */}
      <Text style={[styles.philosophy, { color: textColor }]}>
        Built for the People Who Build Stronger People.
      </Text>

      {/* 4. Brand Signature Group */}
      <View style={styles.brandGroup}>
        <Text
          style={[
            styles.brandName,
            { color: headingColor },
            fontsLoaded ? { fontFamily: 'Ethnocentric-Regular' } : { fontWeight: '900' },
          ]}
        >
          GYMDECK
        </Text>
        <Text style={[styles.brandDescriptor, { color: textColor }]}>FITNESS MANAGEMENT PLATFORM</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 54,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  flagLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  flag: {
    fontSize: 14,
    lineHeight: 18,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  primaryHeadline: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 38,
    marginBottom: 14,
  },
  heart: {
    fontSize: 22,
  },
  philosophy: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.2,
    lineHeight: 23,
    maxWidth: 320,
    marginBottom: 36,
  },
  brandGroup: {
    gap: 6,
  },
  brandName: {
    fontSize: 22,
    letterSpacing: 1.2,
  },
  brandDescriptor: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
});
