/**
 * GymDeck Owner Mobile - Comprehensive Member Profile, Billing & Membership Operations Screen
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
import { OwnerBillingService } from '../../../src/services/api/ownerBillingService';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { InviteModal } from '../../../src/components/InviteModal';
import { ReceiptModal } from '../../../src/components/ReceiptModal';
import { CollectPaymentModal } from '../../../src/components/CollectPaymentModal';
import { RenewMembershipModal } from '../../../src/components/RenewMembershipModal';
import { MemberInvitationResult, ReceiptData, PaymentRecord } from '../../../src/types';
import {
  ArrowLeft,
  Phone,
  Mail,
  Award,
  Activity,
  DollarSign,
  Dumbbell,
  Send,
  Edit,
  Trash2,
  Clock,
  ShieldAlert,
  RefreshCw,
  Receipt,
  PlusCircle,
} from 'lucide-react-native';

export default function MemberDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteResult, setInviteResult] = useState<MemberInvitationResult | null>(null);

  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  const [collectPaymentVisible, setCollectPaymentVisible] = useState(false);
  const [renewMembershipVisible, setRenewMembershipVisible] = useState(false);

  // 1. Fetch Profile Details
  const { data, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ['owner-member-detail', id],
    queryFn: () => OwnerMembersService.getMemberById(id!),
    enabled: !!id,
  });

  // 2. Fetch Derived Billing Summary
  const { data: billingData } = useQuery({
    queryKey: ['owner-member-billing', id],
    queryFn: () => OwnerBillingService.getMemberBilling(id!),
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

  const handleOpenReceipt = async (paymentId: string) => {
    try {
      const receipt = await OwnerBillingService.getReceipt(paymentId);
      setSelectedReceipt(receipt);
      setReceiptModalVisible(true);
    } catch (err: any) {
      Alert.alert('Receipt Error', err?.message || 'Unable to load payment receipt.');
    }
  };

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

  const { member, membership, attendanceSummary, trainer, invite } = data;
  const outstandingDues = billingData?.outstandingBalance ?? 0;

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

        {/* Membership Details & Renewal */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Current Membership</Text>
            <TouchableOpacity
              style={styles.renewActionBtn}
              onPress={() => setRenewMembershipVisible(true)}
              activeOpacity={0.8}
            >
              <RefreshCw size={14} color="#EAB308" style={{ marginRight: 4 }} />
              <Text style={styles.renewActionText}>Renew Plan</Text>
            </TouchableOpacity>
          </View>

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

        {/* Billing & Financial Ledger */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Billing & Payments</Text>
            <TouchableOpacity
              style={styles.collectActionBtn}
              onPress={() => setCollectPaymentVisible(true)}
              activeOpacity={0.8}
            >
              <PlusCircle size={14} color="#0A0D14" style={{ marginRight: 4 }} />
              <Text style={styles.collectActionText}>Collect Payment</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {/* Financial Ledger Summary Cards */}
            <View style={styles.financialRow}>
              <View style={styles.financialCard}>
                <Text style={styles.financialLabel}>TOTAL BILLED</Text>
                <Text style={styles.financialVal}>
                  ${Number(billingData?.totalBilled ?? 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.financialCard}>
                <Text style={styles.financialLabel}>TOTAL PAID</Text>
                <Text style={[styles.financialVal, { color: '#10B981' }]}>
                  ${Number(billingData?.totalPaid ?? 0).toFixed(2)}
                </Text>
              </View>
            </View>

            {outstandingDues > 0 && (
              <View style={styles.duesAlert}>
                <Text style={styles.duesAlertTitle}>Outstanding Dues: ${outstandingDues.toFixed(2)}</Text>
                <Text style={styles.duesAlertSub}>Tap 'Collect Payment' to record a payment towards this balance.</Text>
              </View>
            )}

            {/* Payment History Items */}
            {(billingData?.recentPayments || []).length > 0 && (
              <>
                <View style={styles.cardDivider} />
                <Text style={styles.subsectionTitle}>Payment Transactions</Text>
                {(billingData?.recentPayments || []).slice(0, 5).map((pay) => (
                  <TouchableOpacity
                    key={pay.id}
                    style={styles.payRow}
                    onPress={() => handleOpenReceipt(pay.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.payMethod}>{pay.paymentMethod}</Text>
                        {pay.type === 'REFUND' && (
                          <View style={styles.refundTag}>
                            <Text style={styles.refundTagText}>REFUND</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.payDate}>
                        {new Date(pay.paidAt).toLocaleDateString()} • {pay.receiptNumber || 'No receipt'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 6 }}>
                      <Text
                        style={[
                          styles.payAmount,
                          Number(pay.amount) < 0 && { color: '#EF4444' },
                        ]}
                      >
                        ${Number(pay.amount).toFixed(2)}
                      </Text>
                      <Receipt size={16} color="#EAB308" />
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
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

        {/* Formal Receipt Modal */}
        <ReceiptModal
          visible={receiptModalVisible}
          receipt={selectedReceipt}
          onClose={() => setReceiptModalVisible(false)}
        />

        {/* Collect Payment Modal */}
        <CollectPaymentModal
          visible={collectPaymentVisible}
          memberId={id!}
          defaultAmount={outstandingDues > 0 ? outstandingDues : undefined}
          onClose={() => setCollectPaymentVisible(false)}
          onSuccess={(pay) => handleOpenReceipt(pay.id)}
        />

        {/* Renew Membership Modal */}
        <RenewMembershipModal
          visible={renewMembershipVisible}
          memberId={id!}
          onClose={() => setRenewMembershipVisible(false)}
          onSuccess={(res) => {
            if (res.payment) handleOpenReceipt(res.payment.id);
          }}
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  renewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  renewActionText: {
    color: '#EAB308',
    fontSize: 12,
    fontWeight: '700',
  },
  collectActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  collectActionText: {
    color: '#0A0D14',
    fontSize: 12,
    fontWeight: '700',
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
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  financialCard: {
    flex: 1,
    backgroundColor: '#0F141F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
  },
  financialLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  financialVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 4,
  },
  duesAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  duesAlertTitle: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  duesAlertSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 10,
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  payMethod: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  payDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  payAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10B981',
  },
  refundTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 6,
  },
  refundTagText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
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
