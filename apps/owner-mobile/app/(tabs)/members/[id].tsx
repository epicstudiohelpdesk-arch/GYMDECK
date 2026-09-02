/**
 * GymDeck Owner Mobile - Comprehensive Member Profile & Operations Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerMembersService } from '../../../src/services/api/ownerMembersService';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { InviteModal } from '../../../src/components/InviteModal';
import { MemberInvitationResult } from '../../../src/types';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Award,
  Activity,
  DollarSign,
  Dumbbell,
  Send,
  Edit,
  Trash2,
  Clock,
  ShieldAlert,
} from 'lucide-react-native';

export default function MemberDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteResult, setInviteResult] = useState<MemberInvitationResult | null>(null);

  const { data, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ['owner-member-detail', id],
    queryFn: () => OwnerMembersService.getMemberById(id!),
    enabled: !!id,
  });

  const inviteMutation = useMutation({
    mutationFn: () => OwnerMembersService.generateInvite(id!),
    onSuccess: (res) => {
      setInviteResult(res);
      setInviteModalVisible(true);
      queryClient.invalidateQueries({ queryKey: ['owner-member-detail', id] });
    },
    onError: (err: any) => {
      Alert.alert('Invitation Error', err?.message || 'Failed to generate activation invite.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => OwnerMembersService.deleteMember(id!),
    onSuccess: () => {
      Alert.alert('Member Deactivated', 'The member has been marked as inactive.');
      queryClient.invalidateQueries({ queryKey: ['owner-members'] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to deactivate member.');
    },
  });

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate Member',
      `Are you sure you want to deactivate ${data?.member.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EAB308" />
          <Text style={styles.centerText}>Loading member profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ShieldAlert size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Member Not Found</Text>
          <Text style={styles.errorSubtitle}>This member may have been deleted or belongs to another gym.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { member, membership, attendanceSummary, paymentSummary, trainer, invite } = data;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navBack} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={22} color="#F8FAFC" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Member Profile</Text>
          <TouchableOpacity
            style={styles.navEdit}
            onPress={() => router.push(`/(tabs)/members/edit?id=${id}` as any)}
            activeOpacity={0.7}
          >
            <Edit size={18} color="#EAB308" />
          </TouchableOpacity>
        </View>

        {/* Member Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{member.fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.memberName}>{member.fullName}</Text>
          <Text style={styles.memberCode}>{member.memberCode}</Text>
          <View style={{ marginTop: 8 }}>
            <StatusBadge status={member.membershipStatus} />
          </View>

          {/* Contact quick actions */}
          <View style={styles.contactRow}>
            <TouchableOpacity
              style={styles.contactChip}
              onPress={() => Linking.openURL(`tel:${member.phone}`)}
            >
              <Phone size={14} color="#EAB308" style={{ marginRight: 6 }} />
              <Text style={styles.contactChipText}>{member.phone}</Text>
            </TouchableOpacity>

            {member.email && (
              <TouchableOpacity
                style={styles.contactChip}
                onPress={() => Linking.openURL(`mailto:${member.email}`)}
              >
                <Mail size={14} color="#3B82F6" style={{ marginRight: 6 }} />
                <Text style={styles.contactChipText} numberOfLines={1}>
                  {member.email}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Action: Send / Show Activation Code */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.inviteBanner}
            onPress={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending}
            activeOpacity={0.8}
          >
            <View style={styles.inviteIconBox}>
              <Send size={20} color="#0A0D14" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.inviteTitle}>
                {invite ? 'Regenerate App Invite' : 'Invite to GymDeck Member App'}
              </Text>
              <Text style={styles.inviteSubtitle}>
                {invite
                  ? `Active code: ${invite.displayCode} (Expires: ${new Date(invite.expiresAt).toLocaleDateString()})`
                  : 'Generate a 7-day secure activation code for mobile access.'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Membership Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Membership</Text>
          {membership ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconBox}>
                  <Award size={20} color="#EAB308" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.planName}>{membership.planName}</Text>
                  <Text style={styles.planPrice}>${membership.price} • {membership.durationDays} Days</Text>
                </View>
                <StatusBadge status={membership.status} />
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.datesGrid}>
                <View style={styles.dateCol}>
                  <Text style={styles.dateLabel}>START DATE</Text>
                  <Text style={styles.dateVal}>
                    {new Date(membership.startDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.dateCol}>
                  <Text style={styles.dateLabel}>EXPIRY DATE</Text>
                  <Text style={styles.dateVal}>
                    {new Date(membership.endDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>No active membership plan on record.</Text>
            </View>
          )}
        </View>

        {/* Attendance Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Overview</Text>
          <View style={styles.card}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Activity size={20} color="#10B981" />
                <Text style={styles.statVal}>{attendanceSummary.totalCheckIns}</Text>
                <Text style={styles.statLbl}>Total Check-ins</Text>
              </View>
              <View style={styles.statBox}>
                <Clock size={20} color="#3B82F6" />
                <Text style={styles.statVal}>
                  {attendanceSummary.recentCheckIns.length > 0 ? 'Active' : 'Never'}
                </Text>
                <Text style={styles.statLbl}>Recent Activity</Text>
              </View>
            </View>

            {attendanceSummary.recentCheckIns.length > 0 && (
              <>
                <View style={styles.cardDivider} />
                <Text style={styles.subsectionTitle}>Recent Check-in Logs</Text>
                {attendanceSummary.recentCheckIns.slice(0, 5).map((log) => (
                  <View key={log.id} style={styles.logRow}>
                    <View style={styles.dot} />
                    <Text style={styles.logTime}>
                      {new Date(log.checkInTime).toLocaleString()}
                    </Text>
                    <Text style={styles.logMethod}>{log.entryMethod}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        {/* Payments Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payments & Transactions</Text>
          <View style={styles.card}>
            <View style={styles.paymentTotalRow}>
              <Text style={styles.paymentTotalLbl}>Total Paid to Date</Text>
              <Text style={styles.paymentTotalVal}>
                ${Number(paymentSummary.totalPaid).toFixed(2)}
              </Text>
            </View>

            {paymentSummary.recentPayments.length > 0 && (
              <>
                <View style={styles.cardDivider} />
                {paymentSummary.recentPayments.slice(0, 5).map((pay) => (
                  <View key={pay.id} style={styles.payRow}>
                    <View>
                      <Text style={styles.payMethod}>{pay.paymentMethod}</Text>
                      <Text style={styles.payDate}>
                        {new Date(pay.paidAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.payAmount}>${Number(pay.amount).toFixed(2)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        {/* Trainer Assignment */}
        {trainer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assigned Trainer & PT</Text>
            <View style={styles.card}>
              <View style={styles.trainerRow}>
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
                  <Dumbbell size={20} color="#F97316" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.trainerName}>{trainer.trainerName}</Text>
                  <Text style={styles.trainerSpec}>{trainer.specialization || 'Personal Trainer'}</Text>
                </View>
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.ptSessionsRow}>
                <Text style={styles.ptSessionsText}>{trainer.packageName}</Text>
                <Text style={styles.ptRemaining}>
                  {trainer.remainingSessions} of {trainer.totalSessions} sessions left
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Deactivate Button */}
        <View style={styles.dangerSection}>
          <TouchableOpacity
            style={styles.deactivateBtn}
            onPress={handleDeactivate}
            disabled={deleteMutation.isPending}
            activeOpacity={0.8}
          >
            <Trash2 size={16} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.deactivateBtnText}>Deactivate Member</Text>
          </TouchableOpacity>
        </View>

        {/* Activation Modal */}
        <InviteModal
          visible={inviteModalVisible}
          invite={inviteResult}
          onClose={() => setInviteModalVisible(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navBack: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#131823',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  navEdit: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#131823',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    backgroundColor: '#131823',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#EAB308',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#EAB308',
  },
  memberName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  memberCode: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F141F',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    maxWidth: 180,
  },
  contactChipText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#131823',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  planPrice: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 14,
  },
  datesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateCol: {
    width: '48%',
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  dateVal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
    marginTop: 4,
  },
  emptyBox: {
    backgroundColor: '#131823',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  emptyBoxText: {
    color: '#64748B',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 6,
  },
  statLbl: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 10,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  logTime: {
    flex: 1,
    fontSize: 12,
    color: '#CBD5E1',
  },
  logMethod: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  paymentTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentTotalLbl: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  paymentTotalVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  payMethod: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  payDate: {
    fontSize: 11,
    color: '#64748B',
  },
  payAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  trainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trainerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  trainerSpec: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  ptSessionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ptSessionsText: {
    fontSize: 13,
    color: '#CBD5E1',
  },
  ptRemaining: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
  },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    borderRadius: 16,
    padding: 16,
  },
  inviteIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A0D14',
  },
  inviteSubtitle: {
    fontSize: 12,
    color: 'rgba(10, 13, 20, 0.8)',
    marginTop: 2,
  },
  dangerSection: {
    marginTop: 10,
    alignItems: 'center',
  },
  deactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  deactivateBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centerText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  errorSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#EAB308',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#0A0D14',
    fontWeight: '700',
  },
});
