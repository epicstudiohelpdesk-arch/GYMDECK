/**
 * GymDeck Owner Mobile - Comprehensive Member Profile, Billing, Attendance & Trainer/PT Management Screen
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
import { OwnerMembersService } from '../../src/services/api/ownerMembersService';
import { OwnerBillingService } from '../../src/services/api/ownerBillingService';
import { OwnerMembershipService } from '../../src/services/api/ownerMembershipService';
import { OwnerTrainersService } from '../../src/services/api/ownerTrainersService';
import { StatusBadge } from '../../src/components/StatusBadge';
import { InviteModal } from '../../src/components/InviteModal';
import { ReceiptModal } from '../../src/components/ReceiptModal';
import { CollectPaymentModal } from '../../src/components/CollectPaymentModal';
import { RenewMembershipModal } from '../../src/components/RenewMembershipModal';
import { FreezeMembershipModal } from '../../src/components/FreezeMembershipModal';
import { AssignTrainerModal } from '../../src/components/AssignTrainerModal';
import { PurchasePTPackageModal } from '../../src/components/PurchasePTPackageModal';
import { CompletePTSessionModal } from '../../src/components/CompletePTSessionModal';
import {
  MemberInvitationResult,
  ReceiptData,
  PaymentRecord,
  PTPackageSummary,
} from '../../src/types';
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
  CheckCircle2,
  UserCheck,
} from 'lucide-react-native';

export default function MemberDetailScreen() {
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

  // Trainer & PT Modals State
  const [assignTrainerVisible, setAssignTrainerVisible] = useState(false);
  const [purchasePTPackageVisible, setPurchasePTPackageVisible] = useState(false);
  const [completeSessionModalVisible, setCompleteSessionModalVisible] = useState(false);
  const [selectedPTPackage, setSelectedPTPackage] = useState<PTPackageSummary | null>(null);

  // 1. Fetch Profile Details
  const { data, isLoading, isPending, refetch, isRefetching, error } = useQuery({
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

  // 4. Fetch Member PT Packages
  const { data: ptPackages } = useQuery({
    queryKey: ['owner-member-pt-packages', id],
    queryFn: () => OwnerTrainersService.getMemberPTPackages(id!),
    enabled: !!id,
  });

  // 5. Fetch Member Trainer History
  const { data: trainerHistory } = useQuery({
    queryKey: ['owner-member-trainer-history', id],
    queryFn: () => OwnerTrainersService.getMemberTrainerHistory(id!),
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
      Alert.alert('Receipt Error', err?.message || 'Failed to load official receipt.');
    }
  };

  const handleLogPTSession = (pkg: PTPackageSummary) => {
    setSelectedPTPackage(pkg);
    setCompleteSessionModalVisible(true);
  };

  if (!id || isLoading || isPending || (!data && !error)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EAB308" />
          <Text style={styles.loadingText}>Loading Member Profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ShieldAlert size={48} color="#EF4444" style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle}>Failed to Load Member</Text>
          <Text style={styles.errorSubtitle}>
            {error instanceof Error ? error.message : 'Member not found or access denied.'}
          </Text>
          <View style={styles.errorActionsRow}>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.8}>
              <RefreshCw size={16} color="#0A0D14" style={{ marginRight: 6 }} />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButtonCenter} onPress={() => router.back()} activeOpacity={0.8}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const { member, attendanceSummary } = data;
  const membership = currentMembershipData || data.membership;
  const outstandingDues = billingData ? billingData.outstandingBalance : 0;
  const isFrozen = membership?.status === 'FROZEN';

  // Determine currently active assigned trainer
  const activeAssignment = trainerHistory?.find((h) => h.status === 'ACTIVE');

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {member.fullName}
        </Text>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => inviteMutation.mutate()}
          disabled={inviteMutation.isPending}
          activeOpacity={0.7}
        >
          {inviteMutation.isPending ? (
            <ActivityIndicator size="small" color="#EAB308" />
          ) : (
            <Send size={20} color="#EAB308" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.avatarText}>
              {member.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.profileMeta}>
            <View style={styles.nameRow}>
              <Text style={styles.fullName}>{member.fullName}</Text>
              <StatusBadge status={member.membershipStatus} />
            </View>
            <Text style={styles.memberCode}>ID: {member.memberCode}</Text>
          </View>
        </View>

        {/* Quick Contact Bar */}
        <View style={styles.contactBar}>
          <TouchableOpacity
            style={styles.contactAction}
            onPress={() => Linking.openURL(`tel:${member.phone}`)}
            activeOpacity={0.7}
          >
            <Phone size={16} color="#EAB308" />
            <Text style={styles.contactText}>{member.phone}</Text>
          </TouchableOpacity>

          {member.email && (
            <TouchableOpacity
              style={styles.contactAction}
              onPress={() => Linking.openURL(`mailto:${member.email}`)}
              activeOpacity={0.7}
            >
              <Mail size={16} color="#EAB308" />
              <Text style={styles.contactText} numberOfLines={1}>
                {member.email}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Membership Subscription Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Membership Plan</Text>
            {membership && (
              <View style={styles.membershipActions}>
                {isFrozen ? (
                  <TouchableOpacity
                    style={styles.unfreezeBtn}
                    onPress={() => unfreezeMutation.mutate(membership.id)}
                    disabled={unfreezeMutation.isPending}
                    activeOpacity={0.8}
                  >
                    {unfreezeMutation.isPending ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <>
                        <Play size={12} color="#000000" style={{ marginRight: 4 }} />
                        <Text style={styles.unfreezeBtnText}>Unfreeze</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.freezeBtn}
                    onPress={() => setFreezeModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Snowflake size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                    <Text style={styles.freezeBtnText}>Freeze</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.renewTriggerBtn}
                  onPress={() => setRenewMembershipVisible(true)}
                  activeOpacity={0.8}
                >
                  <RefreshCw size={12} color="#000000" style={{ marginRight: 4 }} />
                  <Text style={styles.renewTriggerText}>Renew</Text>
                </TouchableOpacity>
              </View>
            )}
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
                  <Text style={styles.dateLabel}>EXPIRATION</Text>
                  <Text style={styles.dateVal}>
                    {new Date(membership.endDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.dateCol}>
                  <Text style={styles.dateLabel}>REMAINING</Text>
                  <Text style={[styles.dateVal, { color: isFrozen ? '#60A5FA' : '#EAB308' }]}>
                    {isFrozen
                      ? `${membership.frozenDaysRemaining ?? membership.daysRemaining ?? 0}d (Saved)`
                      : `${membership.daysRemaining ?? 0} Days`}
                  </Text>
                </View>
              </View>

              {isFrozen && (
                <View style={styles.freezeBanner}>
                  <Snowflake size={14} color="#60A5FA" style={{ marginRight: 6 }} />
                  <Text style={styles.freezeBannerText}>
                    Frozen on {new Date(membership.frozenAt || '').toLocaleDateString()}:{' '}
                    {membership.freezeReason || 'Owner request'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyPlanBox}>
              <Text style={styles.emptyPlanText}>No active membership subscription.</Text>
              <TouchableOpacity
                style={styles.assignPlanBtn}
                onPress={() => setRenewMembershipVisible(true)}
              >
                <PlusCircle size={16} color="#000000" style={{ marginRight: 6 }} />
                <Text style={styles.assignPlanText}>Assign Membership</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Personal Trainer & PT Packages Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Personal Training (PT)</Text>
            <TouchableOpacity
              style={styles.ptActionHeaderBtn}
              onPress={() => setPurchasePTPackageVisible(true)}
              activeOpacity={0.8}
            >
              <PlusCircle size={13} color="#000000" style={{ marginRight: 4 }} />
              <Text style={styles.ptActionHeaderText}>Buy PT Pack</Text>
            </TouchableOpacity>
          </View>

          {/* Assigned Coach Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Dumbbell size={20} color="#3B82F6" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.planName}>
                  {activeAssignment ? activeAssignment.trainerName : 'No Coach Assigned'}
                </Text>
                <Text style={styles.planPrice}>
                  {activeAssignment
                    ? activeAssignment.specialization || 'Personal Trainer'
                    : 'Assign a dedicated coach for custom fitness programs'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.assignCoachBtn}
                onPress={() => setAssignTrainerVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.assignCoachBtnText}>
                  {activeAssignment ? 'Change' : 'Assign'}
                </Text>
              </TouchableOpacity>
            </View>

            {activeAssignment && (
              <>
                <View style={styles.cardDivider} />
                <View style={styles.coachContactRow}>
                  <Phone size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                  <Text style={styles.coachPhoneText}>{activeAssignment.trainerPhone}</Text>
                  <Text style={styles.coachAssignedDate}>
                    • Assigned {new Date(activeAssignment.assignedAt).toLocaleDateString()}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* PT Packages List */}
          {ptPackages && ptPackages.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.subheading}>Allocated PT Packages</Text>
              {ptPackages.map((pkg) => {
                const isDepleted = pkg.remainingSessions === 0 || pkg.status === 'DEPLETED';
                const progressPct = pkg.totalSessions > 0 ? (pkg.usedSessions / pkg.totalSessions) * 100 : 0;
                return (
                  <View key={pkg.id} style={styles.ptPackageCard}>
                    <View style={styles.ptPackageHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ptPackageName}>{pkg.packageName}</Text>
                        <Text style={styles.ptCoachName}>Coach: {pkg.trainerName}</Text>
                      </View>
                      <View style={styles.ptSessionsBadge}>
                        <Text
                          style={[
                            styles.ptSessionsBadgeText,
                            isDepleted && { color: '#94A3B8' },
                          ]}
                        >
                          {pkg.remainingSessions} Left
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
                    </View>

                    <View style={styles.ptFooterRow}>
                      <Text style={styles.ptUsageText}>
                        {pkg.usedSessions} / {pkg.totalSessions} Sessions Used • Exp:{' '}
                        {new Date(pkg.expiryDate).toLocaleDateString()}
                      </Text>
                      {!isDepleted && (
                        <TouchableOpacity
                          style={styles.logSessionBtn}
                          onPress={() => handleLogPTSession(pkg)}
                          activeOpacity={0.8}
                        >
                          <CheckCircle2 size={13} color="#000000" style={{ marginRight: 4 }} />
                          <Text style={styles.logSessionBtnText}>Log Session</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Financial Ledger & Billing Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Financial Ledger</Text>
            {outstandingDues > 0 && (
              <TouchableOpacity
                style={styles.payDuesBtn}
                onPress={() => setCollectPaymentVisible(true)}
                activeOpacity={0.8}
              >
                <DollarSign size={13} color="#000000" style={{ marginRight: 2 }} />
                <Text style={styles.payDuesBtnText}>Collect ${outstandingDues.toFixed(2)}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.statGrid}>
              <View style={styles.statCol}>
                <Text style={styles.statNumber}>
                  ${billingData ? billingData.totalBilled.toFixed(2) : '0.00'}
                </Text>
                <Text style={styles.statText}>Total Invoiced</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={[styles.statNumber, { color: '#10B981' }]}>
                  ${billingData ? billingData.totalPaid.toFixed(2) : '0.00'}
                </Text>
                <Text style={styles.statText}>Total Collected</Text>
              </View>
              <View style={styles.statCol}>
                <Text
                  style={[
                    styles.statNumber,
                    outstandingDues > 0 ? { color: '#EF4444' } : { color: '#94A3B8' },
                  ]}
                >
                  ${outstandingDues.toFixed(2)}
                </Text>
                <Text style={styles.statText}>Balance Due</Text>
              </View>
            </View>

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
                      <Text
                        style={[
                          styles.paymentAmount,
                          Number(p.amount) < 0 && { color: '#EF4444' },
                        ]}
                      >
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

      <AssignTrainerModal
        visible={assignTrainerVisible}
        memberId={member.id}
        memberName={member.fullName}
        currentTrainerId={activeAssignment?.trainerId}
        onClose={() => setAssignTrainerVisible(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['owner-member-trainer-history', id] });
          queryClient.invalidateQueries({ queryKey: ['owner-member-detail', id] });
        }}
      />

      <PurchasePTPackageModal
        visible={purchasePTPackageVisible}
        memberId={member.id}
        memberName={member.fullName}
        defaultTrainerId={activeAssignment?.trainerId}
        onClose={() => setPurchasePTPackageVisible(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['owner-member-pt-packages', id] });
          queryClient.invalidateQueries({ queryKey: ['owner-member-billing', id] });
        }}
      />

      {selectedPTPackage && (
        <CompletePTSessionModal
          visible={completeSessionModalVisible}
          packageId={selectedPTPackage.id}
          packageName={selectedPTPackage.packageName}
          remainingSessions={selectedPTPackage.remainingSessions}
          trainerName={selectedPTPackage.trainerName}
          memberId={member.id}
          onClose={() => {
            setCompleteSessionModalVisible(false);
            setSelectedPTPackage(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['owner-member-pt-packages', id] });
            queryClient.invalidateQueries({ queryKey: ['owner-member-detail', id] });
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
  errorTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  errorSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#EAB308',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#0A0D14',
    fontWeight: '700',
    fontSize: 14,
  },
  backButtonCenter: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F131C',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131823',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2A2410',
    borderWidth: 1,
    borderColor: '#EAB308',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#EAB308',
  },
  profileMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  fullName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
    marginRight: 8,
  },
  memberCode: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  contactBar: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  contactAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131823',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  contactText: {
    fontSize: 12,
    color: '#F8FAFC',
    marginLeft: 6,
    fontWeight: '500',
  },
  section: {
    marginTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  membershipActions: {
    flexDirection: 'row',
    gap: 6,
  },
  freezeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  freezeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  unfreezeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#60A5FA',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  unfreezeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  renewTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  renewTriggerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  payDuesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  payDuesBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  ptActionHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  ptActionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  card: {
    backgroundColor: '#131823',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2410',
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
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  dateVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  freezeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  freezeBannerText: {
    fontSize: 12,
    color: '#60A5FA',
    flex: 1,
  },
  emptyPlanBox: {
    backgroundColor: '#131823',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  emptyPlanText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  assignPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAB308',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  assignPlanText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
  assignCoachBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  assignCoachBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EAB308',
  },
  coachContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachPhoneText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  coachAssignedDate: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  ptPackageCard: {
    backgroundColor: '#131823',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  ptPackageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ptPackageName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  ptCoachName: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  ptSessionsBadge: {
    backgroundColor: '#2A2410',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#EAB308',
  },
  ptSessionsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EAB308',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#EAB308',
    borderRadius: 3,
  },
  ptFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ptUsageText: {
    fontSize: 11,
    color: '#64748B',
  },
  logSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  logSessionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  subheading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0F131C',
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
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  statText: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  attendanceTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 8,
  },
});
