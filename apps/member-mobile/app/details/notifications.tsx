/**
 * GymDeck Member Mobile - Notification Center Screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Dumbbell,
  UserCheck,
  Megaphone,
  Award,
} from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '../../src/hooks';
import { SkeletonLoader, EmptyState } from '../../src/components';
import { MemberNotification } from '../../src/types';

export default function NotificationsScreen() {
  const { colors, radii, spacing } = useTheme();
  const router = useRouter();
  const { data: notifications, isLoading, refetch, isRefetching } = useNotifications();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllMutation = useMarkAllNotificationsAsRead();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'WORKOUT':
        return <Dumbbell size={16} color={colors.brand.primary} />;
      case 'TRAINER':
        return <UserCheck size={16} color={colors.brand.secondary} />;
      case 'MEMBERSHIP':
        return <Award size={16} color={colors.status.success} />;
      default:
        return <Megaphone size={16} color="#F59E0B" />;
    }
  };

  if (isLoading && !notifications) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: spacing.lg }}>
          <SkeletonLoader height={36} width={160} style={{ marginBottom: 20 }} />
          <SkeletonLoader height={80} borderRadius={16} style={{ marginBottom: 12 }} />
          <SkeletonLoader height={80} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  const items = notifications || [];
  const unreadCount = items.filter((n) => !n.isRead).length;

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
          Notifications
        </Text>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={() => markAllMutation.mutate()}
            style={styles.markAllBtn}
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
          >
            <CheckCheck size={16} color={colors.brand.primary} />
            <Text style={[styles.markAllText, { color: colors.brand.primary }]}>
              Read all
            </Text>
          </TouchableOpacity>
        )}
      </View>

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
        {items.length === 0 ? (
          <EmptyState
            icon={<Bell size={32} color={colors.brand.primary} />}
            title="No Notifications"
            description="You're all caught up! Club announcements and program updates will appear here."
          />
        ) : (
          <View style={[styles.listContainer, { gap: spacing.md }]}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  if (!item.isRead) {
                    markAsReadMutation.mutate(item.id);
                  }
                }}
                activeOpacity={0.75}
                style={[
                  styles.notifCard,
                  {
                    backgroundColor: item.isRead ? colors.surface : colors.surfaceElevated,
                    borderColor: item.isRead ? colors.border : colors.brand.primary,
                    borderRadius: radii.lg,
                    padding: spacing.lg,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.isRead ? 'read' : 'unread'}`}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.categoryRow}>
                    <View
                      style={[
                        styles.catIconCircle,
                        { backgroundColor: colors.surfaceSubtle },
                      ]}
                    >
                      {getCategoryIcon(item.category)}
                    </View>
                    <Text style={[styles.catLabel, { color: colors.textSecondary }]}>
                      {item.category.replace('_', ' ')}
                    </Text>
                  </View>

                  {!item.isRead && (
                    <View
                      style={[
                        styles.unreadDot,
                        { backgroundColor: colors.brand.primary },
                      ]}
                    />
                  )}
                </View>

                <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>
                <Text style={[styles.notifMessage, { color: colors.textSecondary }]}>
                  {item.message}
                </Text>

                <Text style={[styles.timeText, { color: colors.textMuted }]}>
                  {new Date(item.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

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
    flex: 1,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
  },
  listContainer: {
    width: '100%',
  },
  notifCard: {
    width: '100%',
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  notifMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 11,
  },
});
