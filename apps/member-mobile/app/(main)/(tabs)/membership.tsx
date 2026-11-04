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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Award, CheckCircle, Calendar, ShieldCheck, Sparkles, Zap } from 'lucide-react-native';
import { useTheme } from '../../../src/theme';
import { useMembership } from '../../../src/hooks';
import { SkeletonLoader, PrimaryButton } from '../../../src/components';
import { memberService } from '../../../src/services/api/memberService';

export default function MembershipScreen() {
  const { colors, radii, spacing } = useTheme();
  const { data: membership, isLoading, error, refetch, isRefetching } = useMembership();

  if (isLoading && !membership) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={{ padding: spacing.lg }}>
          <SkeletonLoader height={40} borderRadius={16} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={200} borderRadius={28} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={140} borderRadius={24} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !membership) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
    ? '#FEF2F2'
    : isFrozen
    ? '#FFFBEB'
    : '#ECFDF5';

  const statusColor = isExpired
    ? '#EF4444'
    : isFrozen
    ? '#F59E0B'
    : '#10B981';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg, paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <View style={[styles.badgePill, { backgroundColor: '#E0E9FD' }]}>
              <Sparkles size={12} color="#4F75E3" />
              <Text style={[styles.badgePillText, { color: '#4F75E3' }]}>TIER PRIVILEGES • DUES CLEAR</Text>
            </View>
          </View>
          <Text style={[styles.screenTitle, { color: '#111827' }]}>
            My Membership Plan
          </Text>
          <Text style={[styles.screenSubtitle, { color: '#6B7280' }]}>
            Active membership privileges, tenure, and club perks.
          </Text>
        </View>

        {/* Membership Hero Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: '#FFFFFF',
              borderColor: '#E5E7EB',
              borderRadius: 28,
              padding: spacing.xl,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconPill, { backgroundColor: '#E0E9FD' }]}>
              <Award size={20} color="#4F75E3" />
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
            </View>
          </View>

          <Text style={[styles.planTitle, { color: '#111827' }]}>{planName}</Text>
          <Text style={[styles.planPrice, { color: '#F59D42' }]}>
            ₹{price.toLocaleString('en-IN')}{' '}
            <Text style={[styles.priceSub, { color: '#9CA3AF' }]}>/ billing cycle</Text>
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
              { backgroundColor: '#E0E9FD', borderRadius: 20 },
            ]}
          >
            <ShieldCheck size={16} color="#4F75E3" />
            <Text style={[styles.daysRemainingText, { color: '#111827' }]}>
              <Text style={{ fontWeight: '800', color: '#4F75E3' }}>
                {daysRemaining} days
              </Text>{' '}
              remaining on this pass
            </Text>
          </View>
        </View>

        {/* Plan Features & Perks */}
        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeader}>
            <Sparkles size={16} color="#4F75E3" />
            <Text style={[styles.sectionTitle, { color: '#111827' }]}>
              Included Member Perks
            </Text>
          </View>

          <View
            style={[
              styles.featuresCard,
              {
                backgroundColor: '#FFFFFF',
                borderColor: '#E5E7EB',
                borderRadius: 24,
                padding: spacing.lg,
              },
            ]}
          >
            {features.map((feature, idx) => (
              <View key={idx} style={styles.featureItem}>
                <CheckCircle size={18} color="#10B981" style={{ marginTop: 2 }} />
                <Text style={[styles.featureText, { color: '#111827' }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Direct UPI Fee Payment Action Card (0% Fee, Direct to Gym Bank A/C) */}
        <View
          style={[
            styles.paymentCard,
            {
              backgroundColor: '#FFFFFF',
              borderColor: '#E5E7EB',
              borderRadius: 24,
              padding: spacing.lg,
              marginTop: spacing.lg,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827' }}>
                Direct UPI Instant Renewal
              </Text>
              <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>
                0% gateway fee • Direct to gym's bank account
              </Text>
            </View>
          </View>

          <PrimaryButton
            title={`Pay ₹${price.toFixed(0)} via UPI (GPay / PhonePe)`}
            onPress={() => memberService.payFeeViaUPI(price, `Renewal - ${planName}`)}
            style={{ width: '100%' }}
          />
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
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  screenTitle: {
    fontSize: 26,
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '800',
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
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  daysRemainingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
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
  paymentCard: {
    width: '100%',
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
});

