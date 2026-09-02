/**
 * GymDeck Owner Mobile - Attendance & Check-In Management Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerAttendanceService } from '../../src/services/api/ownerAttendanceService';
import { CheckInModal } from '../../src/components/CheckInModal';
import { ManualAttendanceModal } from '../../src/components/ManualAttendanceModal';
import { AttendanceItem } from '../../src/types';
import {
  UserCheck,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  LogOut,
  Users,
  Activity,
  Calendar,
} from 'lucide-react-native';

export default function AttendanceScreen() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);

  // 1. Fetch Daily Attendance
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['owner-daily-attendance', searchQuery],
    queryFn: () => OwnerAttendanceService.getDailyAttendance(undefined, 50, 0, searchQuery),
  });

  // 2. Fetch Attendance Stats
  const { data: stats } = useQuery({
    queryKey: ['owner-attendance-stats'],
    queryFn: () => OwnerAttendanceService.getAttendanceStats(),
  });

  // Check-Out Mutation
  const checkOutMutation = useMutation({
    mutationFn: (attendanceId: string) => OwnerAttendanceService.checkOutMember(attendanceId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['owner-daily-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['owner-attendance-stats'] });
      Alert.alert('Checked Out', 'Member check-out recorded successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Check-Out Failed', err?.message || 'Unable to check out member.');
    },
  });

  const renderAttendanceItem = ({ item }: { item: AttendanceItem }) => {
    const isOngoing = !item.checkOutTime;
    const checkInFormatted = new Date(item.checkInTime).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const checkOutFormatted = item.checkOutTime
      ? new Date(item.checkOutTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.memberName}>{item.fullName}</Text>
            <Text style={styles.memberCode}>{item.memberCode} • {item.phone}</Text>
          </View>
          <View style={[styles.methodBadge, item.entryMethod === 'MANUAL' && styles.manualBadge]}>
            <Text style={[styles.methodBadgeText, item.entryMethod === 'MANUAL' && styles.manualBadgeText]}>
              {item.entryMethod}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.timeInfo}>
            <View style={styles.timeRow}>
              <Clock size={14} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={styles.timeText}>In: {checkInFormatted}</Text>
            </View>
            {checkOutFormatted ? (
              <View style={[styles.timeRow, { marginLeft: 12 }]}>
                <LogOut size={14} color="#94A3B8" style={{ marginRight: 4 }} />
                <Text style={styles.timeText}>Out: {checkOutFormatted}</Text>
              </View>
            ) : (
              <View style={[styles.timeRow, { marginLeft: 12 }]}>
                <View style={styles.liveDot} />
                <Text style={styles.activeText}>Active on Floor</Text>
              </View>
            )}
          </View>

          {isOngoing && (
            <TouchableOpacity
              style={styles.checkOutBtn}
              onPress={() => checkOutMutation.mutate(item.id)}
              disabled={checkOutMutation.isPending}
              activeOpacity={0.7}
            >
              <LogOut size={12} color="#CBD5E1" style={{ marginRight: 4 }} />
              <Text style={styles.checkOutBtnText}>Check Out</Text>
            </TouchableOpacity>
          )}
        </View>

        {item.notes && (
          <Text style={styles.notesText} numberOfLines={2}>
            Notes: {item.notes}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Screen Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Daily Attendance</Text>
            <Text style={styles.subtitle}>Real-time Floor Check-Ins & History</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.manualBtn}
              onPress={() => setManualModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.manualBtnText}>Manual</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkInBtn}
              onPress={() => setCheckInModalVisible(true)}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#0A0D14" style={{ marginRight: 4 }} />
              <Text style={styles.checkInBtnText}>Check In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Activity size={16} color="#EAB308" />
            <Text style={styles.statVal}>{stats?.todayCheckIns ?? 0}</Text>
            <Text style={styles.statLabel}>Today's Check-ins</Text>
          </View>
          <View style={styles.statCard}>
            <Users size={16} color="#10B981" />
            <Text style={styles.statVal}>{stats?.todayUniqueMembers ?? 0}</Text>
            <Text style={styles.statLabel}>Unique Members</Text>
          </View>
          <View style={styles.statCard}>
            <Calendar size={16} color="#3B82F6" />
            <Text style={styles.statVal}>{stats?.weekCheckIns ?? 0}</Text>
            <Text style={styles.statLabel}>Past 7 Days</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search attendee by name, code, phone..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Attendance List */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#EAB308" />
            <Text style={styles.loadingText}>Loading attendance log...</Text>
          </View>
        ) : (
          <FlatList
            data={data?.items || []}
            keyExtractor={(item) => item.id}
            renderItem={renderAttendanceItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#EAB308"
                colors={['#EAB308']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <UserCheck size={48} color="#334155" />
                <Text style={styles.emptyTitle}>No check-ins today</Text>
                <Text style={styles.emptySubtitle}>
                  Members checking in via QR or Code Lookup will appear here in real-time.
                </Text>
              </View>
            }
          />
        )}

        {/* Quick Check-In Modal */}
        <CheckInModal
          visible={checkInModalVisible}
          onClose={() => setCheckInModalVisible(false)}
          onSuccess={() => refetch()}
        />

        {/* Manual Attendance Modal */}
        <ManualAttendanceModal
          visible={manualModalVisible}
          onClose={() => setManualModalVisible(false)}
          onSuccess={() => refetch()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  manualBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
  },
  manualBtnText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  checkInBtnText: {
    color: '#0A0D14',
    fontSize: 13,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#131823',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131823',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 30,
    gap: 10,
  },
  card: {
    backgroundColor: '#131823',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EAB308',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  memberCode: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  methodBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  methodBadgeText: {
    color: '#EAB308',
    fontSize: 10,
    fontWeight: '700',
  },
  manualBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  manualBadgeText: {
    color: '#3B82F6',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  checkOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  checkOutBtnText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 6,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
    marginTop: 6,
  },
});
