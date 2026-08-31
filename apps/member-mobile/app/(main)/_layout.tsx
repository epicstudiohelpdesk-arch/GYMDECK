/**
 * GymDeck Member Mobile - Main Authenticated Route Guard & Stack
 */

import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store';
import { useTheme } from '../../src/theme';

export default function MainLayout() {
  const { mode } = useTheme();
  const router = useRouter();
  const { isAuthenticated, isInitialized, isOnboarded } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    } else if (!isOnboarded) {
      router.replace('/(onboarding)/welcome');
    }
  }, [isAuthenticated, isInitialized, isOnboarded, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: {
          backgroundColor: mode === 'dark' ? '#090A0F' : '#F8FAFC',
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
