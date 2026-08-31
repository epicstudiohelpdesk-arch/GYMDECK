/**
 * GymDeck Member Mobile - Quick Action Grid Component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { QrCode, Award, Dumbbell, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';

export const QuickActionGrid: React.FC = () => {
  const { colors, radii, spacing } = useTheme();
  const router = useRouter();

  const actions = [
    {
      title: 'QR Check-In',
      icon: <QrCode size={22} color={colors.brand.primary} />,
      route: '/(main)/(tabs)/check-in',
    },
    {
      title: 'My Plan',
      icon: <Award size={22} color={colors.brand.secondary} />,
      route: '/(main)/(tabs)/membership',
    },
    {
      title: 'Workouts',
      icon: <Dumbbell size={22} color="#38BDF8" />,
      route: '/(main)/(tabs)/workouts',
    },
    {
      title: 'Profile',
      icon: <User size={22} color="#A78BFA" />,
      route: '/(main)/(tabs)/profile',
    },
  ];

  return (
    <View style={[styles.container, { gap: spacing.sm, marginVertical: spacing.md }]}>
      {actions.map((act, idx) => (
        <TouchableOpacity
          key={idx}
          style={[
            styles.actionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.md,
            },
          ]}
          onPress={() => router.push(act.route as any)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={act.title}
        >
          <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceSubtle }]}>
            {act.icon}
          </View>
          <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
            {act.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default QuickActionGrid;
