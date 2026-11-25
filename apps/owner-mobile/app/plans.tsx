/**
 * GymDeck Owner Mobile - Membership Plans Screen
 *
 * Standalone operational screen accessed via More Hub or direct deep link.
 * Powered by InPlacePlansView featuring desktop-grade portfolio intelligence.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme';
import { InPlacePlansView } from '../src/components/InPlacePlansView';

export default function MembershipPlansScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <InPlacePlansView isDark={isDark} onClose={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
});
