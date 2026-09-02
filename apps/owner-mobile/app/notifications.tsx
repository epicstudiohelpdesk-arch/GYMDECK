/**
 * GymDeck Owner Mobile - Notification Center Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  CreditCard,
  UserCheck,
  Dumbbell,
  ShieldAlert,
  Info,
  Calendar,
} from 'lucide-react-native';
import { ownerNotificationService } from '../src/services/api/ownerNotificationService';
import { NotificationItem } from '../src/types';

export default function OwnerNotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const data = await ownerNotificationService.getNotifications(50, 0, filterUnreadOnly);
      setNotifications(data.items);
      setUnreadCount(data.unreadCount);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterUnreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAsRead = async (item: NotificationItem) => {
    if (item.isRead) return;
    try {
      await ownerNotificationService.markAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore silent error
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await ownerNotificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // Ignore silent error
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MEMBERSHIP':
        return <Calendar size={18} color="#06B6D4" />;
      case 'BILLING':
        return <CreditCard size={18} color="#10B981" />;
      case 'ATTENDANCE':
        return <UserCheck size={18} color="#8B5CF6" />;
      case 'TRAINING':
        return <Dumbbell size={18} color="#F59E0B" />;
      case 'SECURITY':
        return <ShieldAlert size={18} color="#EF4444" />;
      default:
        return <Info size={18} color="#94A3B8" />;
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
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color="#F8FAFC" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Notification Center</Text>
          {unreadCount > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{unreadCount} new</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllRead}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
          >
            <CheckCheck size={18} color="#38BDF8" />
            <Text style={styles.markAllText}>Read All</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, !filterUnreadOnly && styles.filterChipActive]}
          onPress={() => setFilterUnreadOnly(false)}
        >
          <Text style={[styles.filterChipText, !filterUnreadOnly && styles.filterChipTextActive]}>
            All Notifications
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterUnreadOnly && styles.filterChipActive]}
          onPress={() => setFilterUnreadOnly(true)}
        >
          <Text style={[styles.filterChipText, filterUnreadOnly && styles.filterChipTextActive]}>
            Unread Only
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <ShieldAlert size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchNotifications}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Bell size={48} color="#475569" />
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptySubtitle}>
            {filterUnreadOnly
              ? 'No unread notifications right now.'
              : 'You have no system or operational notifications at this time.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#38BDF8"
              colors={['#38BDF8']}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.isRead && styles.cardUnread]}
              onPress={() => handleMarkAsRead(item)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>{getCategoryIcon(item.category)}</View>

              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]}>
                    {item.title}
                  </Text>
                  <Text style={styles.timestamp}>{formatTimestamp(item.createdAt)}</Text>
                </View>

                <Text style={styles.cardBody}>{item.body}</Text>
              </View>

              {!item.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  badgeContainer: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38BDF8',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#0F172A',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardUnread: {
    backgroundColor: '#1E293B',
    borderColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    flex: 1,
    marginRight: 8,
  },
  cardTitleUnread: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 11,
    color: '#64748B',
  },
  cardBody: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
    marginLeft: 8,
    marginTop: 6,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#0284C7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
