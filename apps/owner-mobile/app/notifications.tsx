/**
 * GymDeck Owner Mobile - Notification Center Screen
 *
 * Phase 11 — Reports & Analytics + Notifications Experience
 *
 * Features:
 * - Real backend data via ownerNotificationService
 * - FilterPills: All vs Unread
 * - Compact high-density notification rows
 * - Category-aware iconography (Membership, Billing, Attendance, Training, Security, System)
 * - Single-item mark-as-read & Mark All Read
 * - EmptyState ("You're all caught up"), ErrorState, and Skeleton loading
 * - Honest inbox/status presentation (zero false delivery guarantees)
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  CreditCard,
  UserCheck,
  Dumbbell,
  ShieldAlert,
  Calendar,
  Info,
} from 'lucide-react-native';
import { ownerNotificationService } from '../src/services/api/ownerNotificationService';
import { NotificationItem } from '../src/types';
import { FilterPills, FilterOption } from '../src/components/FilterPills';
import { EmptyState } from '../src/components/ui/EmptyState';
import { ErrorState } from '../src/components/ui/ErrorState';
import { useTheme } from '../src/theme';

type NotificationFilterType = 'ALL' | 'UNREAD';

export default function OwnerNotificationsScreen() {
  const router = useRouter();
  const { colors, typography, radii, shadows } = useTheme();
  const queryClient = useQueryClient();

  const [filterType, setFilterType] = useState<NotificationFilterType>('ALL');

  // Query notifications list
  const {
    data: notificationPage,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['owner-notifications', filterType],
    queryFn: () => ownerNotificationService.getNotifications(50, 0, filterType === 'UNREAD'),
  });

  // Query unread count for badge & filters
  const {
    data: unreadCount = 0,
    refetch: refetchUnread,
  } = useQuery({
    queryKey: ['owner-unread-notifications'],
    queryFn: () => ownerNotificationService.getUnreadCount(),
    refetchInterval: 30000,
  });

  const notifications = notificationPage?.items || [];
  const totalCount = notificationPage?.total ?? notifications.length;

  // Mark single notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => ownerNotificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['owner-unread-notifications'] });
    },
  });

  // Mark all notifications as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => ownerNotificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['owner-unread-notifications'] });
    },
  });

  const handleNotificationPress = (item: NotificationItem) => {
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }
  };

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetch(), refetchUnread()]);
  }, [refetch, refetchUnread]);

  const filterOptions: FilterOption[] = useMemo(
    () => [
      { label: 'All', value: 'ALL', count: totalCount },
      { label: 'Unread', value: 'UNREAD', count: unreadCount },
    ],
    [totalCount, unreadCount]
  );

  const getCategoryDetails = (category: string) => {
    switch (category) {
      case 'MEMBERSHIP':
        return {
          icon: <Calendar size={18} color={colors.primary} />,
          bg: colors.primarySoft,
          border: colors.primaryBorder,
        };
      case 'BILLING':
        return {
          icon: <CreditCard size={18} color={colors.success} />,
          bg: colors.successBg,
          border: colors.successBorder,
        };
      case 'ATTENDANCE':
        return {
          icon: <UserCheck size={18} color={colors.primary} />,
          bg: colors.primarySoft,
          border: colors.primaryBorder,
        };
      case 'TRAINING':
        return {
          icon: <Dumbbell size={18} color={colors.warning} />,
          bg: colors.warningBg,
          border: colors.warningBorder,
        };
      case 'SECURITY':
        return {
          icon: <ShieldAlert size={18} color={colors.danger} />,
          bg: colors.dangerBg,
          border: colors.dangerBorder,
        };
      default:
        return {
          icon: <Info size={18} color={colors.textSecondary} />,
          bg: colors.surfaceSubtle,
          border: colors.borderSubtle,
        };
    }
  };

  const formatTimestamp = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const renderNotificationRow = ({ item }: { item: NotificationItem }) => {
    const categoryDetails = getCategoryDetails(item.category);

    return (
      <TouchableOpacity
        style={[
          styles.notificationRow,
          {
            borderBottomColor: colors.borderSubtle,
          },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${item.body}, ${item.isRead ? 'read' : 'unread'}`}
      >
        <View style={styles.cardHeaderRow}>
          <View
            style={[
              styles.categoryIconBox,
              {
                backgroundColor: categoryDetails.bg,
                borderColor: categoryDetails.border,
                borderRadius: radii.full,
              },
            ]}
          >
            {categoryDetails.icon}
          </View>

          <View style={styles.cardTextCol}>
            <View style={styles.titleLine}>
              <Text
                style={[
                  typography.cardTitle,
                  {
                    color: colors.textPrimary,
                    fontWeight: item.isRead ? '600' : '700',
                    flex: 1,
                  },
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>

              {!item.isRead && (
                <View
                  style={[
                    styles.unreadDot,
                    { backgroundColor: colors.primary, borderRadius: radii.full },
                  ]}
                />
              )}
            </View>

            <Text
              style={[
                typography.bodySecondary,
                {
                  color: item.isRead ? colors.textSecondary : colors.textPrimary,
                  marginTop: 2,
                  lineHeight: 18,
                },
              ]}
              numberOfLines={2}
            >
              {item.body}
            </Text>

            <View style={styles.metaFooter}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {formatTimestamp(item.createdAt)}
              </Text>

              {item.isRead && item.readAt && (
                <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 8 }]}>
                  • Read
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
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
            <View style={styles.titleRow}>
              <Text style={[typography.screenTitle, { color: colors.textPrimary, letterSpacing: -0.5 }]}>
                Notifications
              </Text>
              {unreadCount > 0 && (
                <View
                  style={[
                    styles.unreadBadge,
                    { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder, borderRadius: radii.full },
                  ]}
                >
                  <Text style={[typography.captionBold, { color: colors.primary, fontSize: 10 }]}>
                    {unreadCount} new
                  </Text>
                </View>
              )}
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
              {unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up'}
            </Text>
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={[
              styles.markAllBtn,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderRadius: radii.full },
            ]}
            onPress={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
          >
            <CheckCheck size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[typography.captionBold, { color: colors.primary }]}>Mark read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Options */}
      <View style={styles.filterBar}>
        <FilterPills
          options={filterOptions}
          selectedStatus={filterType}
          onSelect={(status) => setFilterType(status as NotificationFilterType)}
        />
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4].map((key) => (
            <View
              key={key}
              style={[
                styles.skeletonCard,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <View
                  style={[
                    styles.categoryIconBox,
                    { backgroundColor: colors.surfaceSubtle, borderRadius: radii.sm },
                  ]}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View
                    style={[
                      styles.skeletonLine,
                      { width: '50%', height: 14, backgroundColor: colors.surfaceSubtle, borderRadius: radii.xs },
                    ]}
                  />
                  <View
                    style={[
                      styles.skeletonLine,
                      { width: '80%', height: 12, marginTop: 6, backgroundColor: colors.surfaceSubtle, borderRadius: radii.xs },
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
            title="Couldn't load notifications"
            message="Check your connection and try again to view gym updates."
            onRetry={handleRefresh}
          />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Bell size={40} color={colors.textMuted} />}
              title="You're all caught up"
              description="New gym notifications and system alerts will appear here."
            />
          }
        />
      )}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderWidth: 1,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 110,
  },
  notificationRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryIconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextCol: {
    flex: 1,
    marginLeft: 10,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: 6,
  },
  metaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  skeletonCard: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  skeletonLine: {
    marginBottom: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
});
