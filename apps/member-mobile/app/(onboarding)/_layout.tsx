/**
 * GymDeck Member Mobile - Onboarding Navigation Stack
 */

import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme';

export default function OnboardingLayout() {
  const { mode } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: mode === 'dark' ? '#090A0F' : '#F8FAFC',
        },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="gym-linking" options={{ headerShown: false }} />
    </Stack>
  );
}
