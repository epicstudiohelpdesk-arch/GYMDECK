/**
 * GymDeck Member Mobile - Authenticated Bottom Tabs Navigator
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Award, QrCode, Dumbbell, User } from 'lucide-react-native';
import { useTheme } from '../../../src/theme';

export default function TabsLayout() {
  const { colors, mode } = useTheme();

  const isDark = mode === 'dark';
  const tabBgColor = isDark ? '#12141D' : '#FFFFFF';
  const tabBorderColor = isDark ? '#1E212E' : '#E2E8F0';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: tabBgColor,
          borderTopColor: tabBorderColor,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={22} color={color} />,
          tabBarAccessibilityLabel: 'Dashboard tab',
        }}
      />
      <Tabs.Screen
        name="membership"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => <Award size={22} color={color} />,
          tabBarAccessibilityLabel: 'Membership plan tab',
        }}
      />
      <Tabs.Screen
        name="check-in"
        options={{
          title: 'Check-In',
          tabBarIcon: ({ color, size }) => <QrCode size={22} color={color} />,
          tabBarAccessibilityLabel: 'QR check-in pass tab',
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          tabBarIcon: ({ color, size }) => <Dumbbell size={22} color={color} />,
          tabBarAccessibilityLabel: 'Workouts tab',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={22} color={color} />,
          tabBarAccessibilityLabel: 'Profile and settings tab',
        }}
      />
    </Tabs>
  );
}
