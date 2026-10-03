/**
 * GymDeck Owner Mobile - Membership Plans Screen
 *
 * Secondary operational screen accessed via More Hub.
 * Sourced directly from OwnerBillingService.getPlans() without fabricated plans.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLocalPlans } from '../src/hooks/useLocalPlans';
import { MembershipPlanSummary } from '../src/types';
import { useTheme } from '../src/theme';
import { formatCurrency } from '../src/utils/currency';
import { StatusBadge } from '../src/components/StatusBadge';
import { OfflineBanner } from '../src/components/ui/ConnectivityBanner';
import { AddPlanModal } from '../src/components/AddPlanModal';
import { ArrowLeft, CreditCard, Clock, Check, Layers, Plus } from 'lucide-react-native';

export default function MembershipPlansScreen() {
  const router = useRouter();
  const { colors, typography, radii, shadows } = useTheme();
  const [addPlanVisible, setAddPlanVisible] = useState(false);

  const {
    plans,
    isLoading,
    isRefetching,
    isOffline,
    refetch,
  } = useLocalPlans({ activeOnly: false });

  const renderPlanCard = ({ item }: { item: MembershipPlanSummary }) => {
    return (
      <View
        style={[
          styles.planRow,
          {
            borderBottomColor: colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[typography.cardTitle, { color: colors.textPrimary, fontSize: 16 }]}>
              {item.planName}
            </Text>
            {item.description ? (
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {item.description}
              </Text>
            ) : null}
          </View>
          <StatusBadge status={item.isActive ? 'ACTIVE' : 'INACTIVE'} />
        </View>

        <View style={styles.metaRow}>
          <Text style={[typography.display, { color: colors.primary, fontSize: 24, lineHeight: 30 }]}>
            {formatCurrency(item.price)}
          </Text>

          <View
            style={[
              styles.durationPill,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
            ]}
          >
            <Clock size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[typography.captionBold, { color: colors.textPrimary }]}>
              {item.durationDays} Days
            </Text>
          </View>
        </View>

        {item.benefits ? (
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitRow}>
              <Check size={12} color={colors.success} style={{ marginRight: 6 }} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {item.benefits}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderRadius: radii.full },
          ]}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back to More"
        >
          <ArrowLeft size={16} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={[typography.screenTitle, { color: colors.textPrimary, letterSpacing: -0.5 }]}>
            Membership Plans
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
            {plans ? `${plans.length} configured tiers` : 'Subscription tiers & pricing'}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.addBtn,
            { backgroundColor: colors.primary, borderRadius: radii.full },
          ]}
          onPress={() => setAddPlanVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={16} color={colors.textOnPrimary} style={{ marginRight: 4 }} />
          <Text style={[typography.captionBold, { color: colors.textOnPrimary }]}>Add Plan</Text>
        </TouchableOpacity>
      </View>

      <OfflineBanner isOffline={isOffline} />

      {/* Plans List */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 10 }]}>
            Loading membership plans...
          </Text>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          renderItem={renderPlanCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Layers size={40} color={colors.textMuted} style={{ marginBottom: 10 }} />
              <Text style={[typography.sectionTitle, { color: colors.textPrimary }]}>No Plans Found</Text>
              <Text style={[typography.bodySecondary, { color: colors.textSecondary, textAlign: 'center', marginTop: 4, maxWidth: 280 }]}>
                Membership plans configure duration, contractual price, and access tiers for your gym members.
              </Text>
            </View>
          }
        />
      )}

      <AddPlanModal
        visible={addPlanVisible}
        onClose={() => setAddPlanVisible(false)}
        onSuccess={() => refetch()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 110,
  },
  planRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  benefitsContainer: {
    marginTop: 8,
    gap: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
});
