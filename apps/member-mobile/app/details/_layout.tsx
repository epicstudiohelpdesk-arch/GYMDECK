/**
 * GymDeck Member Mobile - Detail Views Navigation Stack
 */

import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme';

export default function DetailsLayout() {
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
      <Stack.Screen name="workout-session" options={{ headerShown: false }} />
      <Stack.Screen name="workout-history" options={{ headerShown: false }} />
      <Stack.Screen name="trainer" options={{ headerShown: false }} />
      <Stack.Screen name="pt-packages" options={{ headerShown: false }} />
      <Stack.Screen name="documents" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="progress" options={{ headerShown: false }} />
    </Stack>
  );
}
