/**
 * GymDeck Owner Mobile - Trainers & Coaching Staff Management Screen
 *
 * Phase 10 — Trainers & Staff + Personal Training Experience
 * Features:
 * - Real data via OwnerTrainersService.getTrainers()
 * - Debounced search by name/specialty
 * - FilterPills (All, Active, Inactive)
 * - Compact operational trainer cards with real metrics
 * - AddTrainerModal integration
 * - LoadingSkeleton, EmptyState, and ErrorState handling
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLocalTrainers } from '../src/hooks/useLocalTrainers';
import { TrainerSummary } from '../src/types';
import { AddTrainerModal } from '../src/components/AddTrainerModal';
import { FilterPills, FilterOption } from '../src/components/FilterPills';
import { StatusBadge } from '../src/components/StatusBadge';
import { EmptyState } from '../src/components/ui/EmptyState';
import { ErrorState } from '../src/components/ui/ErrorState';
import { OfflineBanner } from '../src/components/ui/ConnectivityBanner';
import { useTheme } from '../src/theme';
import {
  Dumbbell,
  Search,
  Plus,
  Award,
  Star,
  Phone,
  ArrowLeft,
  Users,
  X,
  Mail,
  Briefcase,
} from 'lucide-react-native';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export default function TrainersScreen() {
  const router = useRouter();
  const { colors, typography, radii, shadows, layout } = useTheme();

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Debounce search input (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Query trainers from local SQLCipher repository (with automatic background bootstrap when online)
  const {
    trainers = [],
    isLoading,
    isRefetching,
    isOffline,
    error,
    refetch,
  } = useLocalTrainers({ search: debouncedSearch || undefined });

  // Client-side status filtering based on actual isActive flag
  const filteredTrainers = useMemo(() => {
    if (statusFilter === 'ACTIVE') {
      return trainers.filter((t) => t.isActive);
    }
    if (statusFilter === 'INACTIVE') {
      return trainers.filter((t) => !t.isActive);
    }
    return trainers;
  }, [trainers, statusFilter]);

  // Filter options with counts
  const filterOptions: FilterOption[] = useMemo(
    () => [
      { label: 'All', value: 'ALL', count: trainers.length },
      { label: 'Active', value: 'ACTIVE', count: trainers.filter((t) => t.isActive).length },
      { label: 'Inactive', value: 'INACTIVE', count: trainers.filter((t) => !t.isActive).length },
    ],
    [trainers]
  );

  const renderTrainerCard = ({ item }: { item: TrainerSummary }) => {
    const initial = (item.fullName || 'C').trim().charAt(0).toUpperCase();

    return (
      <View
        style={[
          styles.row,
          {
            borderBottomColor: colors.borderSubtle,
          },
        ]}
      >
        {/* Row Header */}
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.avatarBox,
              { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder, borderRadius: radii.full },
            ]}
          >
            <Text style={[typography.cardTitle, { color: colors.primary, fontSize: 16 }]}>
              {initial}
            </Text>
          </View>

          <View style={styles.trainerDetails}>
            <View style={styles.nameRow}>
              <Text style={[typography.cardTitle, { color: colors.textPrimary, fontSize: 15 }]} numberOfLines={1}>
                {item.fullName}
              </Text>
              <StatusBadge status={item.isActive ? 'ACTIVE' : 'INACTIVE'} />
            </View>

            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
              {item.specialization || 'Fitness Specialist'}
              {item.experienceYears ? ` • ${item.experienceYears}y Exp` : ''}
            </Text>
          </View>
        </View>

        {/* Operational Metrics Inline Chips */}
        <View style={styles.metricsChipRow}>
          <View style={[styles.metricChip, { backgroundColor: colors.surfaceSubtle }]}>
            <Text style={[typography.captionBold, { color: colors.textPrimary, fontSize: 11 }]}>
              {item.activeClientsCount ?? 0} Clients
            </Text>
          </View>

          <View style={[styles.metricChip, { backgroundColor: colors.surfaceSubtle }]}>
            <Text style={[typography.captionBold, { color: colors.textPrimary, fontSize: 11 }]}>
              {item.activePackagesCount ?? 0} Packages
            </Text>
          </View>

          <View style={[styles.metricChip, { backgroundColor: colors.surfaceSubtle }]}>
            <Text style={[typography.captionBold, { color: colors.textPrimary, fontSize: 11 }]}>
              {item.commissionType === 'PERCENTAGE'
                ? `${item.commissionRate}% Comm`
                : `₹${item.commissionRate}/s`}
            </Text>
          </View>
        </View>

        {/* Contact Line */}
        <View style={styles.contactRow}>
          <View style={styles.contactItem}>
            <Phone size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.phone}</Text>
          </View>
          {item.email && (
            <View style={[styles.contactItem, { marginLeft: 12 }]}>
              <Mail size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.email}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header with Back Navigation & Add Action */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.headerLeftGroup}>
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
              Trainers & Staff
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
              {trainers.length} registered coaches
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.addBtn,
            { backgroundColor: colors.primary, borderRadius: radii.full },
          ]}
          onPress={() => setAddModalVisible(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Add new trainer"
        >
          <Plus size={15} color={colors.textOnPrimary} style={{ marginRight: 4 }} />
          <Text style={[typography.buttonSmall, { color: colors.textOnPrimary }]}>Add Coach</Text>
        </TouchableOpacity>
      </View>

      <OfflineBanner isOffline={isOffline} />

      {/* Prominent Search Bar */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.md,
          },
        ]}
      >
        <Search size={16} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, typography.body, { color: colors.textPrimary }]}
          placeholder="Search by coach name or specialty..."
          placeholderTextColor={colors.textMuted}
          value={searchInput}
          onChangeText={setSearchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={() => setSearchInput('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Options */}
      <View style={styles.filtersContainer}>
        <FilterPills
          options={filterOptions}
          selectedStatus={statusFilter}
          onSelect={(status) => setStatusFilter(status as StatusFilter)}
        />
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((key) => (
            <View
              key={key}
              style={[
                styles.skeletonCard,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
              ]}
            >
              <View style={styles.skeletonHeader}>
                <View
                  style={[
                    styles.skeletonAvatar,
                    { backgroundColor: colors.surfaceSubtle, borderRadius: radii.md },
                  ]}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View
                    style={[
                      styles.skeletonLine,
                      { width: '60%', backgroundColor: colors.surfaceSubtle, borderRadius: radii.xs },
                    ]}
                  />
                  <View
                    style={[
                      styles.skeletonLine,
                      { width: '40%', height: 10, marginTop: 6, backgroundColor: colors.surfaceSubtle, borderRadius: radii.xs },
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <ErrorState
            title="Couldn't load coaching directory"
            message="Please verify your connection and tap retry to load trainers."
            onRetry={() => refetch()}
          />
        </View>
      ) : (
        <FlatList
          data={filteredTrainers}
          keyExtractor={(item) => item.id}
          renderItem={renderTrainerCard}
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
            <EmptyState
              icon={<Users size={40} color={colors.textMuted} />}
              title={searchInput ? 'No matching coaches' : 'No trainers yet'}
              description={
                searchInput
                  ? 'No coaches match your search query. Try searching by another specialty or name.'
                  : 'Add certified coaches to manage personal coaching packages and client allocations.'
              }
              actionLabel="+ Add Coach"
              onActionPress={() => setAddModalVisible(true)}
            />
          }
        />
      )}

      {/* Register Trainer Modal */}
      <AddTrainerModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    minHeight: 34,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 110,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trainerDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricsChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  metricChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  skeletonCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
  },
  skeletonLine: {
    height: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});
