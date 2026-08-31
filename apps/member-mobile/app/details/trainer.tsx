/**
 * GymDeck Member Mobile - Personal Trainer Profile Screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, UserCheck, Award, CheckCircle2, Dumbbell, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { useTrainer } from '../../src/hooks';
import { SkeletonLoader, PrimaryButton } from '../../src/components';

export default function TrainerScreen() {
  const { colors, radii, spacing } = useTheme();
  const router = useRouter();
  const { data: trainer, isLoading, error, refetch } = useTrainer();

  if (isLoading && !trainer) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: spacing.lg }}>
          <SkeletonLoader height={36} width={140} style={{ marginBottom: 20 }} />
          <SkeletonLoader height={180} borderRadius={20} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={120} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  const { name, specialization, experienceYears, bio, certifications } = trainer!;

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.lg,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Assigned Trainer
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Trainer Hero Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.xl,
              padding: spacing.xl,
            },
          ]}
        >
          <View style={styles.avatarRow}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: colors.brand.primary, borderRadius: radii.full },
              ]}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            <View style={styles.trainerDetails}>
              <Text style={[styles.trainerName, { color: colors.textPrimary }]}>{name}</Text>
              <Text style={[styles.specializationText, { color: colors.brand.secondary }]}>
                {specialization}
              </Text>
              <View
                style={[
                  styles.expBadge,
                  { backgroundColor: colors.surfaceSubtle, borderRadius: radii.sm },
                ]}
              >
                <Award size={13} color={colors.brand.primary} />
                <Text style={[styles.expText, { color: colors.textSecondary }]}>
                  {experienceYears} Years Coaching Experience
                </Text>
              </View>
            </View>
          </View>

          {bio && (
            <View style={[styles.bioBox, { borderTopColor: colors.borderSubtle }]}>
              <Text style={[styles.bioText, { color: colors.textSecondary }]}>{bio}</Text>
            </View>
          )}
        </View>

        {/* Certifications Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sparkles size={16} color={colors.brand.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Accreditations & Credentials
            </Text>
          </View>

          <View
            style={[
              styles.certCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.lg,
                padding: spacing.lg,
              },
            ]}
          >
            {certifications.map((cert, idx) => (
              <View key={idx} style={styles.certItem}>
                <CheckCircle2 size={16} color={colors.status.success} style={{ marginTop: 2 }} />
                <Text style={[styles.certText, { color: colors.textPrimary }]}>{cert}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionSection}>
          <PrimaryButton
            title="View 1-on-1 PT Packages"
            onPress={() => router.push('/details/pt-packages' as any)}
          />
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroCard: {
    width: '100%',
    borderWidth: 1,
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  trainerDetails: {
    flex: 1,
  },
  trainerName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  specializationText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  expBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  expText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bioBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 19,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  certCard: {
    width: '100%',
    borderWidth: 1,
    gap: 12,
  },
  certItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  certText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionSection: {
    marginTop: 8,
  },
});
