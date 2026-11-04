/**
 * GymDeck Member Mobile - Quick Action Grid Component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { QrCode, Award, Dumbbell, User, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';

export const QuickActionGrid: React.FC = () => {
  const { colors, radii, spacing } = useTheme();
  const router = useRouter();

  const actions = [
    {
      title: 'QR Pass',
      icon: <QrCode size={20} color={colors.brand.primary} />,
      route: '/(main)/(tabs)/check-in',
    },
    {
      title: 'AI Studio',
      icon: <Sparkles size={20} color="#FF5E62" />,
      route: '/details/ai-hub',
    },
    {
      title: 'My Plan',
      icon: <Award size={20} color={colors.brand.secondary} />,
      route: '/(main)/(tabs)/membership',
    },
    {
      title: 'Workouts',
      icon: <Dumbbell size={20} color="#38BDF8" />,
      route: '/(main)/(tabs)/workouts',
    },
    {
      title: 'Profile',
      icon: <User size={20} color="#A78BFA" />,
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
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 76,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionTitle: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default QuickActionGrid;
