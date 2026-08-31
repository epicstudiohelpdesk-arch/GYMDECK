/**
 * GymDeck Member Mobile - Root Entry Point & Session Gatekeeper
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme';
import { useAuthStore } from '../src/store';

export default function IndexScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { isInitialized, isAuthenticated, isOnboarded } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    } else if (!isOnboarded) {
      router.replace('/(onboarding)/welcome');
    } else {
      router.replace('/(main)/(tabs)');
    }
  }, [isInitialized, isAuthenticated, isOnboarded, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.brandText, { color: colors.brand.primary }]}>
          GYMDECK
        </Text>
        <Text style={[styles.subText, { color: colors.textSecondary }]}>
          MEMBER PORTAL
        </Text>
        <ActivityIndicator
          size="small"
          color={colors.brand.primary}
          style={{ marginTop: spacing.xl }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  brandText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
  },
  subText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 3,
    marginTop: 4,
  },
});
