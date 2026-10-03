/**
 * GymDeck Owner Mobile - Primary 3-Tab Navigation Layout
 *
 * Target Architecture:
 * [ Home ] [ Finance ] [ More ]
 *
 * Enforces safe-area layout adaptation, accessibility touch targets (>= 44pt),
 * and GymDeck Light Theme styling.
 */

import React from 'react';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: 'none',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="members" options={{ title: 'Members', href: null }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', href: null }} />
      <Tabs.Screen name="finance" options={{ title: 'Finance' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
