/**
 * GymDeck Owner Mobile - Member Directory Screen
 *
 * Professional mobile-first member directory:
 * - High-efficiency search by name, phone, member code
 * - Fast status filter pills (All, Active, Expired, Frozen, Inactive)
 * - Virtualized FlatList for high performance (100 to 1,000+ members)
 * - Standardized MemberCard with avatar initials, validity context, and status badges
 * - Purposeful empty, loading (skeleton), and error states
 * - Safe-area and 5-tab bar aware bottom padding
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  UserPlus,
  Users,
  Search as SearchIcon,
  Filter as FilterIcon,
  X,
} from 'lucide-react-native';

import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { GymMemberSummary } from '../../src/types';
import { MemberCard } from '../../src/components/MemberCard';
import { FilterPills, FilterOption } from '../../src/components/FilterPills';
import {
  SearchBar,
  EmptyState,
  MemberCardSkeleton,
  ErrorState,
} from '../../src/components/ui';
import { OfflineBanner } from '../../src/components/ui/ConnectivityBanner';
import { useLocalMembers } from '../../src/hooks/useLocalMembers';

const FILTER_OPTIONS: FilterOption[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Frozen', value: 'FROZEN' },
  { label: 'Inactive', value: 'INACTIVE' },
];

export default function OwnerMembersScreen() {
  const router = useRouter();
  const { colors, typography, radii, layout, shadows } = useTheme();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  // Debounce search query by 250ms to prevent excessive queries
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const user = useAuthStore((state) => state.user);

  // Authoritative Local-First Members Query (SQLCipher via MemberRepository)
  const {
    members,
    totalCount,
    isLoading,
    isRefetching,
    isOffline,
    isBootstrapping,
    lastBootstrappedAt,
    refetch,
    error,
  } = useLocalMembers({
    search: debouncedSearch,
    status,
  });

  // Directory Summary Text
  const summaryText = useMemo(() => {
    if (isLoading) return 'Loading members from local vault...';
    if (isBootstrapping) return 'Updating local member database...';
    const offlineSuffix = isOffline ? ' • Offline Mode' : '';
    if (debouncedSearch && status !== 'ALL') {
      return `Showing ${members.length} matching "${debouncedSearch}" (${status.toLowerCase()})${offlineSuffix}`;
    }
    if (debouncedSearch) {
      return `Showing ${members.length} matching "${debouncedSearch}"${offlineSuffix}`;
    }
    if (status !== 'ALL') {
      return `Showing ${members.length} ${status.toLowerCase()} members${offlineSuffix}`;
    }
    return `Showing ${members.length} of ${totalCount} registered members${offlineSuffix}`;
  }, [isLoading, isBootstrapping, isOffline, debouncedSearch, status, members.length, totalCount]);

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatus('ALL');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 1. Screen Header (Clean Canvas) */}
      <View style={styles.headerContainer}>
        <View style={styles.titleColumn}>
          <Text style={[typography.screenTitle, styles.screenTitleText, { color: colors.textPrimary }]}>
            Members
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            {totalCount} registered members
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.addMemberBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: radii.full,
            },
          ]}
          onPress={() => router.push('/members/add' as any)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Add New Member"
        >
          <UserPlus size={15} color={colors.textOnPrimary} style={{ marginRight: 6 }} />
          <Text style={[typography.captionBold, { color: colors.textOnPrimary }]}>
            + Add Member
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainContainer}>
        {/* Offline Connection Banner */}
        {isOffline && (
          <View style={{ marginBottom: 12 }}>
            <OfflineBanner isOffline={isOffline} />
          </View>
        )}

        {/* 2. Prominent Search Bar */}
        <View style={styles.searchRow}>
          <SearchBar
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by name, phone, code..."
            onClear={() => {
              setSearchInput('');
              setDebouncedSearch('');
            }}
          />
        </View>

        {/* 3. Horizontal Status Filter Pills */}
        <View style={styles.filtersRow}>
          <FilterPills
            selectedStatus={status}
            onSelect={setStatus}
            options={FILTER_OPTIONS}
          />
        </View>

        {/* 4. Directory Summary & Quick Reset Action */}
        <View style={[styles.summaryBar, { borderBottomColor: colors.borderSubtle }]}>
          <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
            {summaryText}
          </Text>
          {(debouncedSearch || status !== 'ALL') && (
            <TouchableOpacity
              style={styles.clearFilterBtn}
              onPress={handleClearFilters}
              accessibilityRole="button"
              accessibilityLabel="Clear filters and search"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={12} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[typography.captionBold, { color: colors.primary }]}>
                Reset
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 5. Members List / Skeleton / Empty / Error */}
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <MemberCardSkeleton />
            <MemberCardSkeleton />
            <MemberCardSkeleton />
            <MemberCardSkeleton />
            <MemberCardSkeleton />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <ErrorState
              title="Couldn't load member directory"
              message="Please check your internet connection or tap retry."
              onRetry={() => refetch()}
            />
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MemberCard
                member={item}
                onPress={() => router.push(`/members/${item.id}` as any)}
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: layout.bottomNavHeight + 52 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching || isBootstrapping}
                onRefresh={refetch}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              debouncedSearch ? (
                <EmptyState
                  icon={<SearchIcon size={32} color={colors.textSecondary} />}
                  title="No members found"
                  description={`No members match "${debouncedSearch}". Try searching by another name, phone number, or member code.`}
                  actionLabel="Clear Search"
                  onActionPress={() => {
                    setSearchInput('');
                    setDebouncedSearch('');
                  }}
                />
              ) : status !== 'ALL' ? (
                <EmptyState
                  icon={<FilterIcon size={32} color={colors.textSecondary} />}
                  title={`No ${status.toLowerCase()} members`}
                  description={`There are currently no members with ${status.toLowerCase()} status in this directory.`}
                  actionLabel="View All Members"
                  onActionPress={() => setStatus('ALL')}
                />
              ) : (
                <EmptyState
                  icon={<Users size={36} color={colors.primary} />}
                  title="No members yet"
                  description="Start building your gym directory by admitting your first member."
                  actionLabel="+ Add First Member"
                  onActionPress={() => router.push('/members/add' as any)}
                />
              )
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  screenTitleText: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  titleColumn: {
    justifyContent: 'center',
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 36,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchRow: {
    marginTop: 12,
  },
  filtersRow: {
    marginTop: 8,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  listContent: {
    paddingTop: 4,
  },
  skeletonContainer: {
    paddingTop: 8,
  },
  errorContainer: {
    paddingTop: 24,
  },
});
