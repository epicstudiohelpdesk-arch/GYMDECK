/**
 * GymDeck Owner Mobile - Trainers & Coaching Staff Management Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OwnerTrainersService } from '../../src/services/api/ownerTrainersService';
import { TrainerSummary } from '../../src/types';
import { AddTrainerModal } from '../../src/components/AddTrainerModal';
import {
  Dumbbell,
  Search,
  Plus,
  Award,
  Users,
  Star,
  ChevronRight,
  Phone,
  DollarSign,
} from 'lucide-react-native';

export default function TrainersScreen() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);

  const {
    data: trainers,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['owner-trainers', searchQuery],
    queryFn: () => OwnerTrainersService.getTrainers(false, searchQuery),
  });

  const renderTrainerCard = ({ item }: { item: TrainerSummary }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarBox}>
            <Award size={24} color="#EAB308" />
          </View>
          <View style={styles.trainerDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.trainerName}>{item.fullName}</Text>
              <View style={styles.ratingBadge}>
                <Star size={12} color="#EAB308" fill="#EAB308" style={{ marginRight: 3 }} />
                <Text style={styles.ratingText}>{item.rating || '5.00'}</Text>
              </View>
            </View>
            <Text style={styles.specialization}>
              {item.specialization || 'Fitness Specialist'} • {item.experienceYears || 1}y Exp
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>ACTIVE CLIENTS</Text>
            <Text style={styles.statVal}>{item.activeClientsCount || 0}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>ACTIVE PACKAGES</Text>
            <Text style={styles.statVal}>{item.activePackagesCount || 0}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>COMMISSION</Text>
            <Text style={styles.statVal}>
              {item.commissionType === 'PERCENTAGE'
                ? `${item.commissionRate}%`
                : `$${item.commissionRate}/s`}
            </Text>
          </View>
        </View>

        <View style={styles.contactRow}>
          <Phone size={14} color="#94A3B8" style={{ marginRight: 6 }} />
          <Text style={styles.phoneText}>{item.phone}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Personal Trainers</Text>
          <Text style={styles.headerSubtitle}>
            {trainers ? `${trainers.length} Certified Coaches` : 'Coaching Staff Directory'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddModalVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#000000" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Add Trainer</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#64748B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone or specialty..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Trainer List */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#EAB308" size="large" />
          <Text style={styles.loadingText}>Loading trainers directory...</Text>
        </View>
      ) : (
        <FlatList
          data={trainers}
          keyExtractor={(item) => item.id}
          renderItem={renderTrainerCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#EAB308"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Dumbbell size={48} color="#334155" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Trainers Found</Text>
              <Text style={styles.emptySubtitle}>
                Add personal trainers to start assigning members and selling PT packages.
              </Text>
            </View>
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
    backgroundColor: '#0A0E1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#F8FAFC',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#131823',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2A2410',
    borderWidth: 1,
    borderColor: '#EAB308',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trainerDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2410',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#EAB308',
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EAB308',
  },
  specialization: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1E293B',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  phoneText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
