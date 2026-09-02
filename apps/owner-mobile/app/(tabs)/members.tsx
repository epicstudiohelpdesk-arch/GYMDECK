/**
 * GymDeck Owner Mobile - Member Directory Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { OwnerMembersService } from '../../src/services/api/ownerMembersService';
import { MemberCard } from '../../src/components/MemberCard';
import { FilterPills } from '../../src/components/FilterPills';
import { Search, UserPlus, Users, RefreshCw } from 'lucide-react-native';

export default function OwnerMembersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['owner-members', search, status],
    queryFn: () => OwnerMembersService.getMembers(search, status),
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with Title & Add Member Button */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Member Directory</Text>
            <Text style={styles.subtitle}>
              {data?.total ?? 0} members registered
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/members/add' as any)}
            activeOpacity={0.8}
          >
            <UserPlus size={18} color="#0A0D14" style={{ marginRight: 6 }} />
            <Text style={styles.addBtnText}>Add Member</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone, code..."
            placeholderTextColor="#64748B"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Status Filter Pills */}
        <FilterPills selectedStatus={status} onSelect={setStatus} />

        {/* Members List */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#EAB308" />
            <Text style={styles.loadingText}>Loading member directory...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorTitle}>Failed to load members</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <RefreshCw size={16} color="#0A0D14" style={{ marginRight: 6 }} />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={data?.members || []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MemberCard
                member={item}
                onPress={() => router.push(`/members/${item.id}` as any)}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshing={isRefetching}
            onRefresh={refetch}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Users size={48} color="#334155" />
                <Text style={styles.emptyTitle}>No members found</Text>
                <Text style={styles.emptySubtitle}>
                  {search || status !== 'ALL'
                    ? 'Try adjusting your search query or filter.'
                    : 'Add a new member to begin managing your gym.'}
                </Text>
              </View>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#0A0D14',
    fontSize: 13,
    fontWeight: '700',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131823',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#0A0D14',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 240,
  },
});
