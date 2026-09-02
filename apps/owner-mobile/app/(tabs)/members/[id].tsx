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
import { OwnerMembershipService } from '../../../src/services/api/ownerMembershipService';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { InviteModal } from '../../../src/components/InviteModal';
import { ReceiptModal } from '../../../src/components/ReceiptModal';
import { CollectPaymentModal } from '../../../src/components/CollectPaymentModal';
import { RenewMembershipModal } from '../../../src/components/RenewMembershipModal';
import { FreezeMembershipModal } from '../../../src/components/FreezeMembershipModal';
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
  Snowflake,
  Play,
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
  const [freezeModalVisible, setFreezeModalVisible] = useState(false);

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

  // 3. Fetch Current Membership Lifecycle
  const { data: currentMembershipData } = useQuery({
    queryKey: ['owner-member-current-membership', id],
    queryFn: () => OwnerMembershipService.getCurrentMembership(id!),
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

  const unfreezeMutation = useMutation({
    mutationFn: (membershipId: string) => OwnerMembershipService.unfreezeMembership(id!, membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-member-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['owner-member-current-membership', id] });
      queryClient.invalidateQueries({ queryKey: ['owner-members'] });
      queryClient.invalidateQueries({ queryKey: ['owner-membership-stats'] });
      queryClient.invalidateQueries({ queryKey: ['owner-daily-attendance'] });
      Alert.alert('Membership Unfrozen', 'Subscription has been resumed and remaining duration restored.');
    },
    onError: (err: any) => {
      Alert.alert('Unfreeze Failed', err?.message || 'Failed to unfreeze membership.');
    },
  });

  const handleOpenReceipt = async (paymentId: string) => {
    try {
      const receipt = await OwnerBillingService.getReceipt(paymentId);
      setSelectedReceipt(receipt);
      setReceiptModalVisible(true);
    } catch (err: any) {
      Alert.alert('Receipt Error', err?.message || 'Unable to load receipt.');
    }
  };

  const confirmDeactivate = () => {
    Alert.alert(
      'Deactivate Member',
      'Are you sure you want to deactivate this member profile? They will no longer have gym access.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deactivate', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EAB308" />
          <Text style={styles.loadingText}>Loading member profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ShieldAlert size={48} color="#EF4444" />
          <Text style={styles.errorText}>Unable to load member profile</Text>
          <TouchableOpacity style={styles.backBtnAlt} onPress={() => router.back()}>
            <Text style={styles.backBtnAltText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { member, membership: rawMembership, attendanceSummary, paymentSummary, trainer, invite } = data;
  const membership = currentMembershipData || rawMembership;
  const outstandingDues = billingData?.outstandingBalance ?? 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {member.fullName}
        </Text>
        <View style={styles.navActions}>
          <TouchableOpacity style={styles.navIconBtn} onPress={confirmDeactivate} activeOpacity={0.7}>
            <Trash2 size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Profile Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{member.fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.profileName}>{member.fullName}</Text>
          <Text style={styles.profileCode}>{member.memberCode}</Text>
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

        {/* Membership Details & Lifecycle Operations */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Current Membership</Text>
            <View style={styles.membershipActionGroup}>
              {membership && membership.status === 'ACTIVE' && (
                <TouchableOpacity
                  style={styles.freezeActionBtn}
                  onPress={() => setFreezeModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Snowflake size={14} color="#38BDF8" style={{ marginRight: 4 }} />
                  <Text style={styles.freezeActionText}>Freeze</Text>
                </TouchableOpacity>
              )}

              {membership && membership.status === 'FROZEN' && (
                <TouchableOpacity
                  style={styles.unfreezeActionBtn}
                  onPress={() => unfreezeMutation.mutate(membership.id)}
                  disabled={unfreezeMutation.isPending}
                  activeOpacity={0.8}
                >
                  <Play size={14} color="#10B981" style={{ marginRight: 4 }} />
                  <Text style={styles.unfreezeActionText}>Unfreeze</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.renewActionBtn}
                onPress={() => setRenewMembershipVisible(true)}
                activeOpacity={0.8}
              >
                <RefreshCw size={14} color="#EAB308" style={{ marginRight: 4 }} />
                <Text style={styles.renewActionText}>Renew</Text>
              </TouchableOpacity>
            </View>
          </View>

          {membership ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconBox}>
                  <Award size={20} color="#EAB308" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.planName}>{membership.planName}</Text>
                  <Text style={styles.planPrice}>
                    ${membership.price || membership.priceAtPurchase || '0.00'}
                    {membership.durationDays ? ` • ${membership.durationDays} Days` : ''}
                  </Text>
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
                <View style={styles.dateCol}>
                  <Text style={styles.dateLabel}>DAYS REMAINING</Text>
                  <Text style={[styles.dateVal, { color: membership.status === 'FROZEN' ? '#38BDF8' : '#EAB308' }]}>
                    {membership.daysRemaining ?? 'N/A'} {membership.status === 'FROZEN' ? '(Saved)' : 'Days'}
                  </Text>
                </View>
              </View>

              {membership.freezeReason && (
                <View style={styles.freezeNotice}>
                  <Snowflake size={14} color="#38BDF8" style={{ marginRight: 6 }} />
                  <Text style={styles.freezeNoticeText}>
                    Frozen: {membership.freezeReason}
                  </Text>
                </View>
              )}
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
                <Text style={styles.subheading}>Payment Ledger History</Text>
                {billingData!.recentPayments.map((p: PaymentRecord) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.paymentRow}
                    onPress={() => handleOpenReceipt(p.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.paymentLeft}>
                      <DollarSign size={16} color="#10B981" />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={styles.paymentMethod}>
                          {p.paymentMethod} {p.receiptNumber ? `• ${p.receiptNumber}` : ''}
                        </Text>
                        <Text style={styles.paymentDate}>
                          {new Date(p.paidAt).toLocaleDateString()} • {p.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.paymentRight}>
                      <Text style={[styles.paymentAmount, Number(p.amount) < 0 && { color: '#EF4444' }]}>
                        ${Number(p.amount).toFixed(2)}
                      </Text>
                      <Receipt size={14} color="#94A3B8" style={{ marginTop: 2 }} />
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        </View>

        {/* Attendance Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Summary</Text>
          <View style={styles.card}>
            <View style={styles.statGrid}>
              <View style={styles.statCol}>
                <Text style={styles.statNumber}>{attendanceSummary.totalCheckIns}</Text>
                <Text style={styles.statText}>Total Check-ins</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statNumber}>
                  {attendanceSummary.recentCheckIns[0]
                    ? new Date(attendanceSummary.recentCheckIns[0].checkInTime).toLocaleDateString()
                    : 'N/A'}
                </Text>
                <Text style={styles.statText}>Latest Visit</Text>
              </View>
            </View>

            {attendanceSummary.recentCheckIns.length > 0 && (
              <>
                <View style={styles.cardDivider} />
                <Text style={styles.subheading}>Recent Check-Ins</Text>
                {attendanceSummary.recentCheckIns.map((a, i) => (
                  <View key={a.id || i} style={styles.attendanceRow}>
                    <Clock size={14} color="#94A3B8" />
                    <Text style={styles.attendanceTime}>
                      {new Date(a.checkInTime).toLocaleString()} ({a.entryMethod})
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        {/* Assigned Trainer */}
        {trainer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Trainer</Text>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Dumbbell size={20} color="#3B82F6" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.planName}>{trainer.trainerName}</Text>
                  <Text style={styles.planPrice}>{trainer.packageName}</Text>
                </View>
              </View>
              <View style={styles.cardDivider} />
              <Text style={styles.trainerDetail}>
                Remaining Sessions: {trainer.remainingSessions} / {trainer.totalSessions}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <InviteModal
        visible={inviteModalVisible}
        invite={inviteResult}
        onClose={() => setInviteModalVisible(false)}
      />

      {selectedReceipt && (
        <ReceiptModal
          visible={receiptModalVisible}
          receipt={selectedReceipt}
          onClose={() => {
            setReceiptModalVisible(false);
            setSelectedReceipt(null);
          }}
        />
      )}

      <CollectPaymentModal
        visible={collectPaymentVisible}
        memberId={member.id}
        defaultAmount={outstandingDues}
        onClose={() => setCollectPaymentVisible(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['owner-member-billing', id] });
          queryClient.invalidateQueries({ queryKey: ['owner-member-detail', id] });
        }}
      />

      <RenewMembershipModal
        visible={renewMembershipVisible}
        memberId={member.id}
        onClose={() => setRenewMembershipVisible(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['owner-member-billing', id] });
          queryClient.invalidateQueries({ queryKey: ['owner-member-detail', id] });
          queryClient.invalidateQueries({ queryKey: ['owner-member-current-membership', id] });
          queryClient.invalidateQueries({ queryKey: ['owner-members'] });
        }}
      />

      {membership && (
        <FreezeMembershipModal
          visible={freezeModalVisible}
          memberId={member.id}
          membershipId={membership.id}
          daysRemaining={membership.daysRemaining}
          onClose={() => setFreezeModalVisible(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['owner-member-detail', id] });
            queryClient.invalidateQueries({ queryKey: ['owner-member-current-membership', id] });
            queryClient.invalidateQueries({ queryKey: ['owner-members'] });
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  backBtnAlt: {
    marginTop: 16,
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnAltText: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#131823',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  navActions: {
    flexDirection: 'row',
    gap: 8,
  },
  navIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#131823',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    backgroundColor: '#131823',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#EAB308',
  },
  profileAvatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#EAB308',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  profileCode: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    justifyContent: 'center',
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F141F',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
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
  membershipActionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  freezeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freezeActionText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  unfreezeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unfreezeActionText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  renewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: '#EAB308',
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  collectActionText: {
    color: '#0A0D14',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    borderRadius: 16,
    padding: 14,
  },
  inviteIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTitle: {
    color: '#0A0D14',
    fontSize: 14,
    fontWeight: '800',
  },
  inviteSubtitle: {
    color: '#422006',
    fontSize: 11,
    marginTop: 2,
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
    borderRadius: 12,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    fontSize: 15,
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
    marginVertical: 12,
  },
  datesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateCol: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  dateVal: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '600',
    marginTop: 2,
  },
  freezeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  freezeNoticeText: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '600',
    flex: 1,
  },
  financialRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  financialCard: {
    flex: 1,
    backgroundColor: '#0F141F',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
  },
  financialLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  financialVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  duesAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  duesAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  duesAlertSub: {
    fontSize: 11,
    color: '#FCA5A5',
    marginTop: 2,
  },
  subheading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethod: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  paymentDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  statText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  attendanceTime: {
    fontSize: 12,
    color: '#CBD5E1',
    marginLeft: 8,
  },
  trainerDetail: {
    fontSize: 13,
    color: '#94A3B8',
  },
  emptyBox: {
    backgroundColor: '#131823',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
    alignItems: 'center',
  },
  emptyBoxText: {
    color: '#64748B',
    fontSize: 13,
  },
});
