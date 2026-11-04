/**
 * GymDeck Member Mobile - Welcome Onboarding Screen
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      icon: <QrCode size={22} color="#4F75E3" />,
      iconBg: '#E0E9FD',
      title: 'Fast Floor Check-In',
      description: 'Display your dynamic QR pass at the reception turnstile for zero-wait entry.',
    },
    {
      icon: <Dumbbell size={22} color="#F59D42" />,
      iconBg: '#FEEFD8',
      title: 'Trainer-Assigned Workouts',
      description: 'Access routines, rep targets, and daily progress logged directly by your coach.',
    },
    {
      icon: <ShieldCheck size={22} color="#10B981" />,
      iconBg: '#ECFDF5',
      title: 'Real-Time Membership Radar',
      description: 'Track active tenure, plan benefits, and receive automated dues clear confirmation.',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.iconPill, { backgroundColor: '#E0E9FD' }]}>
            <Sparkles size={14} color="#4F75E3" />
            <Text style={[styles.pillText, { color: '#4F75E3' }]}>LEVEL UP • GYMDECK</Text>
          </View>
          <Text style={[styles.title, { color: '#111827' }]}>
            Hello, {user?.fullName?.split(' ')[0] || 'Athlete'}!
          </Text>
          <Text style={[styles.subtitle, { color: '#6B7280' }]}>
            Your member portal is set up. Link your home gym to unlock instant check-ins and workout programs.
          </Text>
        </View>

        <View style={[styles.perksContainer, { gap: 14 }]}>
          {perks.map((perk, idx) => (
            <View
              key={idx}
              style={[
                styles.perkCard,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E5E7EB',
                  borderRadius: 24,
                },
              ]}
            >
              <View style={[styles.perkIconWrapper, { backgroundColor: perk.iconBg }]}>
                {perk.icon}
              </View>
              <View style={styles.perkTextWrapper}>
                <Text style={[styles.perkTitle, { color: '#111827' }]}>
                  {perk.title}
                </Text>
                <Text style={[styles.perkDescription, { color: '#6B7280' }]}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  header: {
    marginTop: 12,
    marginBottom: 20,
  },
  iconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
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
    padding: 18,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
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
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  perkDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
});
