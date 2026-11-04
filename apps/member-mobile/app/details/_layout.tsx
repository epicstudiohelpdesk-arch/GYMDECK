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
          backgroundColor: mode === 'dark' ? '#090A0F' : '#F0F2F6',
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
      <Stack.Screen name="ai-hub" options={{ headerShown: false }} />
      <Stack.Screen name="ai-nutrition" options={{ headerShown: false }} />
      <Stack.Screen name="ai-equipment" options={{ headerShown: false }} />
      <Stack.Screen name="ai-rep-counter" options={{ headerShown: false }} />
      <Stack.Screen name="exercise-library" options={{ headerShown: false }} />
    </Stack>
  );
}
