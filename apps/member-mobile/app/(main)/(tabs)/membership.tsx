/**
 * GymDeck Member Mobile - Membership Details Screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Award, CheckCircle, Calendar, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../../src/theme';
import { useMembership } from '../../../src/hooks';
import { SkeletonLoader, PrimaryButton } from '../../../src/components';

export default function MembershipScreen() {
  const { colors, radii, spacing } = useTheme();
  const { data: membership, isLoading, error, refetch, isRefetching } = useMembership();

  if (isLoading && !membership) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: spacing.lg }}>
          <SkeletonLoader height={40} borderRadius={8} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={200} borderRadius={16} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={140} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !membership) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.centerContainer, { padding: spacing.xl }]}>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            Couldn't load membership details
          </Text>
          <PrimaryButton
            title="Retry"
            onPress={() => refetch()}
            style={{ marginTop: 16, maxWidth: 200 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { planName, status, startDate, expiresAt, daysRemaining, price, features } =
    membership!;

  const isExpired = status === 'EXPIRED';
  const isFrozen = status === 'FROZEN';

  const statusBg = isExpired
    ? colors.status.errorBg
    : isFrozen
    ? colors.status.warningBg
    : colors.status.successBg;

  const statusColor = isExpired
    ? colors.status.error
    : isFrozen
    ? colors.status.warning
    : colors.status.success;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
            My Membership Plan
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
            Active membership privileges, tenure, and club perks.
          </Text>
        </View>

        {/* Membership Hero Card */}
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
          <View style={styles.cardHeader}>
            <View style={[styles.iconPill, { backgroundColor: colors.surfaceSubtle }]}>
              <Award size={20} color={colors.brand.primary} />
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
            </View>
          </View>

          <Text style={[styles.planTitle, { color: colors.textPrimary }]}>{planName}</Text>
          <Text style={[styles.planPrice, { color: colors.brand.secondary }]}>
            ${price.toFixed(2)}{' '}
            <Text style={[styles.priceSub, { color: colors.textMuted }]}>/ billing cycle</Text>
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.datesGrid}>
            <View style={styles.dateBlock}>
              <View style={styles.dateLabelRow}>
                <Calendar size={13} color={colors.textMuted} />
                <Text style={[styles.dateLabel, { color: colors.textMuted }]}>START DATE</Text>
              </View>
              <Text style={[styles.dateValue, { color: colors.textPrimary }]}>
                {new Date(startDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>

            <View style={styles.dateBlock}>
              <View style={styles.dateLabelRow}>
                <Calendar size={13} color={colors.textMuted} />
                <Text style={[styles.dateLabel, { color: colors.textMuted }]}>EXPIRY DATE</Text>
              </View>
              <Text style={[styles.dateValue, { color: colors.textPrimary }]}>
                {new Date(expiresAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.daysRemainingBox,
              { backgroundColor: colors.surfaceSubtle, borderRadius: radii.md },
            ]}
          >
            <ShieldCheck size={16} color={colors.brand.primary} />
            <Text style={[styles.daysRemainingText, { color: colors.textPrimary }]}>
              <Text style={{ fontWeight: '800', color: colors.brand.primary }}>
                {daysRemaining} days
              </Text>{' '}
              remaining on this pass
            </Text>
          </View>
        </View>

        {/* Plan Features & Perks */}
        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeader}>
            <Sparkles size={16} color={colors.brand.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Included Member Perks
            </Text>
          </View>

          <View
            style={[
              styles.featuresCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.lg,
                padding: spacing.lg,
              },
            ]}
          >
            {features.map((feature, idx) => (
              <View key={idx} style={styles.featureItem}>
                <CheckCircle size={18} color={colors.status.success} style={{ marginTop: 2 }} />
                <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: spacing.xxl }} />
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
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  heroCard: {
    width: '100%',
    borderWidth: 1,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700',
  },
  priceSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  datesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateBlock: {
    flex: 1,
  },
  dateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  daysRemainingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  daysRemainingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionWrapper: {
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  featuresCard: {
    width: '100%',
    borderWidth: 1,
    gap: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});

