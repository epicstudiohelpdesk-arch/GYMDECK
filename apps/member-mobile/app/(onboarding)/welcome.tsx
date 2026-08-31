/**
 * GymDeck Member Mobile - Welcome Onboarding Screen
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { QrCode, Dumbbell, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store';
import { PrimaryButton } from '../../src/components';

export default function WelcomeScreen() {
  const { colors, spacing, radii } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const perks = [
    {
      icon: <QrCode size={24} color={colors.brand.primary} />,
      title: 'Fast Floor Check-In',
      description: 'Display your dynamic QR pass at the reception desk for zero-wait entry.',
    },
    {
      icon: <Dumbbell size={24} color={colors.brand.secondary} />,
      title: 'Trainer-Assigned Workouts',
      description: 'Access exercises, rep targets, and daily progress logged directly by your coach.',
    },
    {
      icon: <ShieldCheck size={24} color={colors.status.success} />,
      title: 'Real-Time Membership Radar',
      description: 'Track active tenure, plan benefits, and receive automatic expiry reminders.',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.iconPill, { backgroundColor: colors.surfaceSubtle }]}>
            <Sparkles size={16} color={colors.brand.primary} />
            <Text style={[styles.pillText, { color: colors.brand.primary }]}>WELCOME TO GYMDECK</Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Hello, {user?.fullName?.split(' ')[0] || 'Athlete'}!
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your member portal is set up. Link your home gym to unlock instant check-ins and workout programs.
          </Text>
        </View>

        <View style={[styles.perksContainer, { gap: spacing.md }]}>
          {perks.map((perk, idx) => (
            <View
              key={idx}
              style={[
                styles.perkCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.lg,
                },
              ]}
            >
              <View style={[styles.perkIconWrapper, { backgroundColor: colors.surfaceSubtle }]}>
                {perk.icon}
              </View>
              <View style={styles.perkTextWrapper}>
                <Text style={[styles.perkTitle, { color: colors.textPrimary }]}>
                  {perk.title}
                </Text>
                <Text style={[styles.perkDescription, { color: colors.textSecondary }]}>
                  {perk.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <PrimaryButton
            title="Link My Home Gym"
            onPress={() => router.push('/(onboarding)/gym-linking')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  iconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  perksContainer: {
    marginVertical: 16,
  },
  perkCard: {
    flexDirection: 'row',
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  perkIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  perkTextWrapper: {
    flex: 1,
  },
  perkTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  perkDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
});
