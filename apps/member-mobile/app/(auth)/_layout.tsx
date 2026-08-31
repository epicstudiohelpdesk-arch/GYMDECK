/**
 * GymDeck Member Mobile - Auth Navigation Stack
 */

import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme';

export default function AuthLayout() {
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
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="verify-email" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
    </Stack>
  );
}
