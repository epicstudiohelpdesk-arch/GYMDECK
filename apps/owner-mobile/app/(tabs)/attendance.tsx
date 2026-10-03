/**
 * GymDeck Owner Mobile - Attendance & Check-In Management Screen
 *
 * High-speed operational attendance center answering:
 * "Who is in my gym right now, who checked in today, and how do I check someone in or correct an attendance record quickly?"
 *
 * Information Architecture:
 * 1. Screen Header (Attendance Title, Date, Manual & Check In Quick Triggers)
 * 2. Live Floor Hero Banner (Real-time on-floor member count with pulsing indicator)
 * 3. Fast SearchBar (Debounced lookup by attendee name, member code, phone)
 * 4. Summary KPIs (On Floor, Today's Check-ins, Checked Out sourced from real data)
 * 5. Date Navigator & History Control (Today default, 1-tap previous/next day navigation)
 * 6. Semantic FilterPills (All, On Floor, Checked Out with dynamic badge counts)
 * 7. Virtualized Attendance List (FlatList with compact AttendanceRow items)
 * 8. 1-Tap Check Out Action with ConfirmationDialog
 * 9. Standardized Loading Skeletons, ErrorState & Intentional Empty States
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Users,
  UserCheck,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  RotateCcw,
  Search as SearchIcon,
  Filter as FilterIcon,
  FileEdit,
} from 'lucide-react-native';

import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { OwnerAttendanceService } from '../../src/services/api/ownerAttendanceService';
import { localMutationService } from '../../src/services/LocalMutationService';
import { isDatabaseOpen } from '../../src/database/LocalDatabaseManager';
import { useLocalAttendance } from '../../src/hooks/useLocalAttendance';
import { OfflineBanner } from '../../src/components/ui/ConnectivityBanner';
import { AttendanceItem } from '../../src/types';
import { AttendanceRow } from '../../src/components/AttendanceRow';
import { CheckInModal } from '../../src/components/CheckInModal';
import { ManualAttendanceModal } from '../../src/components/ManualAttendanceModal';
import { FilterPills, FilterOption } from '../../src/components/FilterPills';
import {
  SearchBar,
  EmptyState,
  ErrorState,
  ConfirmationDialog,
  AttendanceRowSkeleton,
  MetricCardSkeleton,
} from '../../src/components/ui';

export default function AttendanceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, typography, radii, layout, shadows } = useTheme();

  // Search & Filter State
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Date Navigation State (Default to today)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Modal Visibility State
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [checkOutItem, setCheckOutItem] = useState<AttendanceItem | null>(null);

  // Debounce search input by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Today ISO Date String (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const isToday = !selectedDate || selectedDate === todayStr;

  // Formatted date label for header and date control
  const formattedDateLabel = useMemo(() => {
    const targetDate = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
    if (isToday) {
      return `Today, ${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return targetDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, [selectedDate, isToday]);

  const user = useAuthStore((state) => state.user);

  // Authoritative Local-First Daily Attendance & Stats
  const {
    items: allItems,
    stats,
    isLoading: isLoadingAttendance,
    isRefetching: isRefetchingAttendance,
    isOffline,
    error: attendanceError,
    refetch: handleRefresh,
  } = useLocalAttendance({
    date: selectedDate || undefined,
    query: debouncedSearch || undefined,
  });

  // Check-Out Mutation (Local-First with Transactional Outbox)
  const checkOutMutation = useMutation({
    mutationFn: async (attendanceId: string) => {
      if (isDatabaseOpen()) {
        return localMutationService.checkOutMember(attendanceId);
      }
      return OwnerAttendanceService.checkOutMember(attendanceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['local-attendance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['owner-daily-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['owner-attendance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['owner-analytics-overview'] });
      setCheckOutItem(null);
    },
    onError: (err: any) => {
      Alert.alert('Check-Out Failed', err?.message || 'Unable to check out member.');
      setCheckOutItem(null);
    },
  });

  const onFloorItems = useMemo(() => {
    return allItems.filter((item) => !item.checkOutTime);
  }, [allItems]);

  const checkedOutItems = useMemo(() => {
    return allItems.filter((item) => !!item.checkOutTime);
  }, [allItems]);

  const displayedItems = useMemo(() => {
    switch (filterStatus) {
      case 'ON_FLOOR':
        return onFloorItems;
      case 'CHECKED_OUT':
        return checkedOutItems;
      case 'ALL':
      default:
        return allItems;
    }
  }, [filterStatus, onFloorItems, checkedOutItems, allItems]);

  // Counts
  const onFloorCount = onFloorItems.length;
  const checkedOutCount = checkedOutItems.length;
  const todayCheckIns = stats?.todayTotalCheckIns ?? allItems.length;

  // Filter Options with live counts
  const filterOptions: FilterOption[] = useMemo(() => [
    { label: 'All', value: 'ALL', count: allItems.length },
    { label: 'On Floor', value: 'ON_FLOOR', count: onFloorCount },
    { label: 'Checked Out', value: 'CHECKED_OUT', count: checkedOutCount },
  ], [allItems.length, onFloorCount, checkedOutCount]);

  // Date Navigation Handlers
  const handlePreviousDay = () => {
    const current = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
    current.setDate(current.getDate() - 1);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    if (isToday) return;
    const current = new Date(`${selectedDate}T00:00:00`);
    current.setDate(current.getDate() + 1);
    const nextStr = current.toISOString().split('T')[0];
    if (nextStr >= todayStr) {
      setSelectedDate(null); // Return to today
    } else {
      setSelectedDate(nextStr);
    }
  };

  const handleJumpToToday = () => {
    setSelectedDate(null);
  };

  // Render Attendance Item
  const renderItem = useCallback(
    ({ item }: { item: AttendanceItem }) => (
      <AttendanceRow
        item={item}
        onPress={() => router.push(`/members/${item.memberId}` as any)}
        onCheckOutPress={() => setCheckOutItem(item)}
        isCheckingOut={checkOutMutation.isPending && checkOutMutation.variables === item.id}
      />
    ),
    [router, checkOutMutation.isPending, checkOutMutation.variables]
  );

  // Key Extractor
  const keyExtractor = useCallback((item: AttendanceItem) => item.id, []);

  // List Header Component
  const renderListHeader = () => (
    <View style={styles.headerArea}>
      {/* 1. Live Floor Presence (Open Canvas Hero) */}
      <View style={styles.liveFloorHero}>
        <View style={styles.liveFloorTopRow}>
          <View style={styles.liveFloorLeft}>
            <View style={styles.liveBadgeRow}>
              <View
                style={[
                  styles.pulseDot,
                  { backgroundColor: onFloorCount > 0 ? colors.success : colors.textMuted },
                ]}
              />
              <Text
                style={[
                  typography.captionBold,
                  {
                    color: onFloorCount > 0 ? colors.successText : colors.textSecondary,
                    fontSize: 11,
                    letterSpacing: 0.6,
                  },
                ]}
              >
                {onFloorCount > 0 ? 'LIVE GYM FLOOR' : 'FLOOR IDLE'}
              </Text>
            </View>

            <Text style={[typography.display, styles.floorDisplayCount, { color: colors.textPrimary }]}>
              {onFloorCount} {onFloorCount === 1 ? 'Member' : 'Members'}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              {isToday
                ? `${todayCheckIns} total check-ins recorded today · ${checkedOutCount} checked out`
                : `Historical floor state for ${formattedDateLabel}`}
            </Text>
          </View>
        </View>

        {/* Inline Secondary Numbers (No Boxed Cards) */}
        <View style={[styles.inlineFloorStats, { borderColor: colors.borderSubtle }]}>
          <View style={styles.inlineFloorStatItem}>
            <Text style={[typography.cardTitle, styles.inlineFloorStatValue, { color: colors.success }]}>
              {onFloorCount}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>On Floor</Text>
          </View>

          <View style={[styles.inlineStatDivider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.inlineFloorStatItem}>
            <Text style={[typography.cardTitle, styles.inlineFloorStatValue, { color: colors.textPrimary }]}>
              {todayCheckIns}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Total Check-ins</Text>
          </View>

          <View style={[styles.inlineStatDivider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.inlineFloorStatItem}>
            <Text style={[typography.cardTitle, styles.inlineFloorStatValue, { color: colors.textMuted }]}>
              {checkedOutCount}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Checked Out</Text>
          </View>
        </View>
      </View>

      {/* 2. Fast Attendee SearchBar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search attendee by name, code or phone"
          onClear={() => {
            setSearchInput('');
            setDebouncedSearch('');
          }}
        />
      </View>

      {/* 3. Filter Rail & Date Controls */}
      <View style={styles.filterAndDateRow}>
        <View style={{ flex: 1 }}>
          <FilterPills
            selectedStatus={filterStatus}
            onSelect={setFilterStatus}
            options={filterOptions}
          />
        </View>
      </View>

      {/* 4. Lightweight Date Navigator */}
      <View style={[styles.lightDateNav, { borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity
          style={styles.dateNavChevron}
          onPress={handlePreviousDay}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Previous Day"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.dateCenterRow}>
          <Calendar size={12} color={colors.primary} style={{ marginRight: 5 }} />
          <Text style={[typography.captionBold, { color: colors.textPrimary }]}>
            {formattedDateLabel}
          </Text>
          {!isToday && (
            <TouchableOpacity
              onPress={handleJumpToToday}
              activeOpacity={0.7}
              style={{ marginLeft: 8 }}
              hitSlop={{ top: 4, bottom: 4, left: 6, right: 6 }}
            >
              <Text style={[typography.captionBold, { color: colors.primary, fontSize: 11 }]}>
                (Jump to Today)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.dateNavChevron, isToday && { opacity: 0.3 }]}
          onPress={handleNextDay}
          disabled={isToday}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Next Day"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronRight size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Section Subtitle */}
      <View style={styles.listSectionHeader}>
        <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
          {debouncedSearch
            ? `RESULTS FOR "${debouncedSearch.toUpperCase()}" (${displayedItems.length})`
            : filterStatus === 'ON_FLOOR'
            ? `CURRENTLY ON FLOOR (${displayedItems.length})`
            : filterStatus === 'CHECKED_OUT'
            ? `COMPLETED SESSIONS (${displayedItems.length})`
            : `TODAY'S ACTIVITY LOG (${displayedItems.length})`}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* 1. Screen Header */}
      <View
        style={[
          styles.screenHeader,
          { backgroundColor: colors.background, borderBottomColor: colors.borderSubtle },
        ]}
      >
        <View style={styles.headerTextGroup}>
          <Text style={[typography.screenTitle, { color: colors.textPrimary }]}>
            Attendance
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
            {isToday ? `${onFloorCount} on floor now • ${todayCheckIns} today` : formattedDateLabel}
          </Text>
        </View>

        <View style={styles.headerActionsGroup}>
          {/* Secondary Action: Manual Entry */}
          <TouchableOpacity
            style={[
              styles.manualBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                borderRadius: radii.md,
              },
            ]}
            onPress={() => setManualModalVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Manual attendance entry"
          >
            <FileEdit size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
              Manual
            </Text>
          </TouchableOpacity>

          {/* Primary Action: + Check In */}
          <TouchableOpacity
            style={[
              styles.primaryCheckInBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: radii.md,
              },
            ]}
            onPress={() => setCheckInModalVisible(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Check in member"
          >
            <Plus size={16} color={colors.textOnPrimary} style={{ marginRight: 4 }} />
            <Text style={[typography.buttonSmall, { color: colors.textOnPrimary }]}>
              Check In
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <OfflineBanner isOffline={isOffline} />

      {/* Main Content Area */}
      {isLoadingAttendance && allItems.length === 0 ? (
        <View style={styles.loadingContainer}>
          <View style={styles.skeletonKpiRow}>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </View>
          <View style={{ marginTop: 16 }}>
            <AttendanceRowSkeleton />
            <AttendanceRowSkeleton />
            <AttendanceRowSkeleton />
            <AttendanceRowSkeleton />
            <AttendanceRowSkeleton />
          </View>
        </View>
      ) : attendanceError ? (
        <View style={styles.errorContainer}>
          <ErrorState
            title="Couldn't load attendance"
            message="Please check your network connection or tap retry."
            onRetry={handleRefresh}
          />
        </View>
      ) : (
        <FlatList
          data={displayedItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={renderListHeader}
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
              refreshing={isRefetchingAttendance}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            debouncedSearch ? (
              <EmptyState
                icon={<SearchIcon size={32} color={colors.textSecondary} />}
                title="No matching members"
                description={`No attendees found matching "${debouncedSearch}". Try another name, phone number, or member code.`}
                actionLabel="Clear Search"
                onActionPress={() => {
                  setSearchInput('');
                  setDebouncedSearch('');
                }}
              />
            ) : filterStatus === 'ON_FLOOR' ? (
              <EmptyState
                icon={<Users size={32} color={colors.textSecondary} />}
                title="No members on the floor"
                description="There are currently no active members checked in on the floor."
                actionLabel="+ Check In Member"
                onActionPress={() => setCheckInModalVisible(true)}
              />
            ) : filterStatus === 'CHECKED_OUT' ? (
              <EmptyState
                icon={<LogOut size={32} color={colors.textSecondary} />}
                title="No check-outs yet"
                description="Members who complete their workout and check out will appear here."
                actionLabel="View All Activity"
                onActionPress={() => setFilterStatus('ALL')}
              />
            ) : (
              <EmptyState
                icon={<UserCheck size={36} color={colors.primary} />}
                title="No attendance yet"
                description={
                  isToday
                    ? 'No members have checked in today. Tap "+ Check In Member" to record admissions.'
                    : `No attendance records found for ${formattedDateLabel}.`
                }
                actionLabel={isToday ? '+ Check In Member' : 'Jump to Today'}
                onActionPress={isToday ? () => setCheckInModalVisible(true) : handleJumpToToday}
              />
            )
          }
        />
      )}

      {/* Check-In Modal (BottomSheet) */}
      <CheckInModal
        visible={checkInModalVisible}
        onClose={() => setCheckInModalVisible(false)}
        onSuccess={() => handleRefresh()}
      />

      {/* Manual Attendance Modal (BottomSheet) */}
      <ManualAttendanceModal
        visible={manualModalVisible}
        onClose={() => setManualModalVisible(false)}
        onSuccess={() => handleRefresh()}
      />

      {/* Check-Out Confirmation Dialog */}
      <ConfirmationDialog
        visible={!!checkOutItem}
        onClose={() => setCheckOutItem(null)}
        onConfirm={() => {
          if (checkOutItem) {
            checkOutMutation.mutate(checkOutItem.id);
          }
        }}
        title="Check Out Member"
        message={
          checkOutItem
            ? `Confirm check-out for ${checkOutItem.fullName} (${checkOutItem.memberCode})? Session check-out time will be recorded.`
            : ''
        }
        confirmLabel="Confirm Check-Out"
        cancelLabel="Cancel"
        isDestructive={false}
        loading={checkOutMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTextGroup: {
    flex: 1,
    marginRight: 8,
  },
  headerActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    minHeight: 34,
  },
  primaryCheckInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    minHeight: 34,
  },
  headerArea: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  liveFloorHero: {
    backgroundColor: '#E0F7FA',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#B2EBF2',
    marginBottom: 16,
  },
  liveFloorTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  liveFloorLeft: {
    flex: 1,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  floorDisplayCount: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  inlineFloorStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginTop: 14,
  },
  inlineFloorStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  inlineFloorStatValue: {
    fontSize: 18,
    lineHeight: 22,
    marginBottom: 2,
  },
  inlineStatDivider: {
    width: 1,
    height: 24,
  },
  searchContainer: {
    marginBottom: 10,
  },
  filterAndDateRow: {
    marginBottom: 8,
  },
  lightDateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  dateNavChevron: {
    padding: 6,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listSectionHeader: {
    paddingVertical: 6,
    marginBottom: 6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  skeletonKpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});
