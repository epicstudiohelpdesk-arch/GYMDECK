/**
 * GymDeck Owner Mobile - Member Profile & Operations Command Center
 *
 * Answers in seconds:
 * "WHO IS THIS MEMBER, WHAT IS THEIR STATUS, AND WHAT ACTIONS CAN I TAKE?"
 *
 * Information Architecture:
 * 1. Back Navigation & Quick Share/Edit Header
 * 2. Member Identity Card (Avatar initial, Name, Member Code, StatusBadge, Contact)
 * 3. High-Frequency Action Bar (Call, WhatsApp, Check In, Collect Payment, Renew)
 * 4. Quick Operational KPIs (Membership validity, Balance Due, Attendance visits)
 * 5. Segmented Profile Navigation (Overview | Membership & Billing | Attendance | PT & Coach)
 * 6. Business Modals (Payment Collection, Plan Renewal, Freeze/Unfreeze, PT Sessions, Receipts)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  Award,
  Wallet,
  Calendar,
  Clock,
  Dumbbell,
  Send,
  Edit,
  UserCheck,
  RefreshCw,
  Snowflake,
  Play,
  CheckCircle2,
  Receipt,
  PlusCircle,
  ChevronRight,
  User,
  Trash2,
} from 'lucide-react-native';

import { useTheme } from '../../src/theme';
import { OwnerMembersService } from '../../src/services/api/ownerMembersService';
import { OwnerBillingService } from '../../src/services/api/ownerBillingService';
import { OwnerMembershipService } from '../../src/services/api/ownerMembershipService';
import { OwnerTrainersService } from '../../src/services/api/ownerTrainersService';
import { localMutationService } from '../../src/services/LocalMutationService';
import { isDatabaseOpen } from '../../src/database/LocalDatabaseManager';

import {
  MemberInvitationResult,
  ReceiptData,
  PaymentRecord,
  PTPackageSummary,
} from '../../src/types';

import {
  Avatar,
  StatusBadge,
  ConfirmationDialog,
  ErrorState,
  EmptyState,
} from '../../src/components/ui';
import { OfflineBanner } from '../../src/components/ui/ConnectivityBanner';
import { useLocalMemberDetail } from '../../src/hooks/useLocalMemberDetail';

import { InviteModal } from '../../src/components/InviteModal';
import { ReceiptModal } from '../../src/components/ReceiptModal';
import { CollectPaymentModal } from '../../src/components/CollectPaymentModal';
import { RenewMembershipModal } from '../../src/components/RenewMembershipModal';
import { FreezeMembershipModal } from '../../src/components/FreezeMembershipModal';
import { AssignTrainerModal } from '../../src/components/AssignTrainerModal';
import { PurchasePTPackageModal } from '../../src/components/PurchasePTPackageModal';
import { CompletePTSessionModal } from '../../src/components/CompletePTSessionModal';

type ProfileTab = 'overview' | 'billing' | 'attendance' | 'pt';

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, typography, radii, shadows } = useTheme();

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  // Modals state
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteResult, setInviteResult] = useState<MemberInvitationResult | null>(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [collectPaymentVisible, setCollectPaymentVisible] = useState(false);
  const [renewMembershipVisible, setRenewMembershipVisible] = useState(false);
  const [freezeModalVisible, setFreezeModalVisible] = useState(false);
  const [assignTrainerVisible, setAssignTrainerVisible] = useState(false);
  const [purchasePTPackageVisible, setPurchasePTPackageVisible] = useState(false);
  const [completeSessionModalVisible, setCompleteSessionModalVisible] = useState(false);
  const [selectedPTPackage, setSelectedPTPackage] = useState<PTPackageSummary | null>(null);
  const [deactivateConfirmVisible, setDeactivateConfirmVisible] = useState(false);

  // 1. Primary Member Profile Query (Local-First SQLCipher via MemberRepository)
  const {
    data,
    isLoading,
    isRefetching,
    isOffline,
    refetch,
    error,
  } = useLocalMemberDetail(id);

  // 2. Billing Summary Query (Only active when online)
  const { data: billingData } = useQuery({
    queryKey: ['owner-member-billing', id],
    queryFn: () => OwnerBillingService.getMemberBilling(id!),
    enabled: !!id && !isOffline,
  });

  // 3. Current Membership Lifecycle Query (Only active when online)
  const { data: currentMembershipData } = useQuery({
    queryKey: ['owner-member-current-membership', id],
    queryFn: () => OwnerMembershipService.getCurrentMembership(id!),
    enabled: !!id && !isOffline,
  });

  // 4. PT Packages Query (Only active when online)
  const { data: ptPackages } = useQuery({
    queryKey: ['owner-member-pt-packages', id],
    queryFn: () => OwnerTrainersService.getMemberPTPackages(id!),
    enabled: !!id && !isOffline,
  });

  // 5. Trainer History Query (Only active when online)
  const { data: trainerHistory } = useQuery({
    queryKey: ['owner-member-trainer-history', id],
    queryFn: () => OwnerTrainersService.getMemberTrainerHistory(id!),
    enabled: !!id && !isOffline,
  });

  // Invitation Mutation
  const inviteMutation = useMutation({
    mutationFn: () => OwnerMembersService.generateInvite(id!),
    onSuccess: (res) => {
      setInviteResult(res);
      setInviteModalVisible(true);
      queryClient.invalidateQueries({ queryKey: ['owner-member-detail', id] });
    },
    onError: (err: any) => {
      Alert.alert('Invitation Error', err?.message || 'Failed to generate invitation.');
    },
  });

  // Deactivate Member Mutation (Local-First with Transactional Outbox)
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (isDatabaseOpen()) {
        return localMutationService.deleteMember(id!);
      }
      return OwnerMembersService.deleteMember(id!);
    },
    onSuccess: () => {
      setDeactivateConfirmVisible(false);
      queryClient.invalidateQueries({ queryKey: ['local-members'] });
      queryClient.invalidateQueries({ queryKey: ['owner-members'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
      Alert.alert('Member Deactivated', 'The member has been deactivated locally (Pending sync).');
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to deactivate member.');
    },
  });

  // Unfreeze Mutation
  const unfreezeMutation = useMutation({
    mutationFn: (membershipId: string) => OwnerMembershipService.unfreezeMembership(id!, membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-member-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['owner-member-current-membership', id] });
      queryClient.invalidateQueries({ queryKey: ['owner-members'] });
      Alert.alert('Membership Resumed', 'Subscription has been unfrozen and remaining days restored.');
    },
    onError: (err: any) => {
      Alert.alert('Unfreeze Error', err?.message || 'Failed to unfreeze membership.');
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

  const handleWhatsApp = async (phone: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `whatsapp://send?phone=${cleanPhone}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://wa.me/${cleanPhone}`);
      }
    } catch {
      await Linking.openURL(`https://wa.me/${cleanPhone}`);
    }
  };

  const handleCall = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const handleLogPTSession = (pkg: PTPackageSummary) => {
    setSelectedPTPackage(pkg);
    setCompleteSessionModalVisible(true);
  };

  if (!id || (isLoading && !data)) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
            Loading Member Profile from secure vault...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.errorWrapper}>
          <ErrorState
            title="Member Profile Unavailable"
            message={error instanceof Error ? error.message : 'Member not found in local vault.'}
            onRetry={() => refetch()}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.errorWrapper}>
          <ErrorState
            title="Member Not Found"
            message="No record found for this member in the local database."
            onRetry={() => refetch()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { member, attendanceSummary } = data;
  const membership = currentMembershipData || data.membership;
  const outstandingDues = billingData ? billingData.outstandingBalance : 0;
  const isFrozen = membership?.status === 'FROZEN';
  const activeAssignment = trainerHistory?.find((h) => h.status === 'ACTIVE');

  // Days remaining calculation (plain calculation without conditional hooks)
  let daysRemainingText = 'No Active Plan';
  if (membership) {
    if (isFrozen) {
      daysRemainingText = `${membership.frozenDaysRemaining ?? membership.daysRemaining ?? 0}d (Frozen)`;
    } else {
      const days = membership.daysRemaining ?? 0;
      daysRemainingText = `${days} ${days === 1 ? 'day' : 'days'} left`;
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Offline Status Banner */}
      {isOffline && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <OfflineBanner isOffline={isOffline} />
        </View>
      )}

      {/* 1. Navigation Header */}
      <View style={[styles.navHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }, shadows.low]}>
        <TouchableOpacity
          style={[styles.headerIconBtn, { backgroundColor: colors.surfaceSubtle }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back to member directory"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[typography.sectionTitle, { color: colors.textPrimary, flex: 1, marginHorizontal: 12 }]} numberOfLines={1}>
          {member.fullName}
        </Text>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: colors.primarySoft }]}
            onPress={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Generate member app invitation link"
          >
            <Send size={16} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: colors.surfaceSubtle, marginLeft: 8 }]}
            onPress={() => router.push({ pathname: '/members/edit', params: { id: member.id } } as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Edit member details"
          >
            <Edit size={16} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* 2. Compact Member Identity Card */}
        <View style={[styles.identityCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }, shadows.low]}>
          <View style={styles.identityTop}>
            <Avatar
              name={member.fullName}
              size="lg"
              showStatusDot={member.membershipStatus === 'ACTIVE'}
              statusDotColor={colors.success}
            />

            <View style={styles.identityDetails}>
              <View style={styles.nameStatusRow}>
                <Text style={[typography.cardTitle, { color: colors.textPrimary, fontSize: 18, flex: 1 }]} numberOfLines={1}>
                  {member.fullName}
                </Text>
                <StatusBadge status={member.membershipStatus} />
              </View>

              <Text style={[typography.captionBold, { color: colors.textSecondary, marginTop: 2 }]}>
                {member.memberCode}
              </Text>

              <View style={styles.contactRow}>
                {member.phone && (
                  <View style={styles.inlineContactItem}>
                    <Phone size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>{member.phone}</Text>
                  </View>
                )}
                {member.email && (
                  <View style={[styles.inlineContactItem, { marginLeft: 12 }]}>
                    <Mail size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                      {member.email}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* 3. Primary Action Rail (Thumb-Accessible Operational Actions) */}
        <View style={styles.actionRailWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.actionRailScroll}
          >
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleCall(member.phone)}
              disabled={!member.phone}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Call member"
            >
              <Phone size={16} color={member.phone ? colors.primary : colors.textMuted} />
              <Text style={[typography.captionBold, { color: member.phone ? colors.textPrimary : colors.textMuted, marginTop: 4 }]}>
                Call
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleWhatsApp(member.phone)}
              disabled={!member.phone}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Message on WhatsApp"
            >
              <MessageCircle size={16} color={member.phone ? '#25D366' : colors.textMuted} />
              <Text style={[typography.captionBold, { color: member.phone ? colors.textPrimary : colors.textMuted, marginTop: 4 }]}>
                WhatsApp
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push('/attendance' as any)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Attendance Check-In"
            >
              <UserCheck size={16} color={colors.success} />
              <Text style={[typography.captionBold, { color: colors.textPrimary, marginTop: 4 }]}>
                Check In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: outstandingDues > 0 ? colors.dangerBg : colors.surface,
                  borderColor: outstandingDues > 0 ? colors.dangerBorder : colors.border,
                },
              ]}
              onPress={() => setCollectPaymentVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Collect fee payment"
            >
              <Wallet size={16} color={outstandingDues > 0 ? colors.danger : colors.warning} />
              <Text style={[typography.captionBold, { color: outstandingDues > 0 ? colors.dangerText : colors.textPrimary, marginTop: 4 }]}>
                Collect
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setRenewMembershipVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Renew membership plan"
            >
              <RefreshCw size={16} color={colors.special} />
              <Text style={[typography.captionBold, { color: colors.textPrimary, marginTop: 4 }]}>
                Renew
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 4. Quick Operational Metrics Overview */}
        <View style={[styles.inlineKpiRow, { borderColor: colors.borderSubtle }]}>
          <View style={styles.inlineKpiItem}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>PLAN STATUS</Text>
            <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: 2 }]} numberOfLines={1}>
              {daysRemainingText}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 1 }]} numberOfLines={1}>
              {membership?.planName || 'No plan active'}
            </Text>
          </View>

          <View style={[styles.inlineKpiDivider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.inlineKpiItem}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>BALANCE DUE</Text>
            <Text
              style={[
                typography.bodyBold,
                { color: outstandingDues > 0 ? colors.dangerText : colors.successText, marginTop: 2 },
              ]}
              numberOfLines={1}
            >
              ₹{outstandingDues.toFixed(2)}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 1 }]}>
              {outstandingDues > 0 ? 'Dues pending' : 'All cleared'}
            </Text>
          </View>

          <View style={[styles.inlineKpiDivider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.inlineKpiItem}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>GYM VISITS</Text>
            <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: 2 }]} numberOfLines={1}>
              {attendanceSummary.totalCheckIns}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 1 }]}>
              {attendanceSummary.recentCheckIns?.[0]
                ? `Last: ${new Date(attendanceSummary.recentCheckIns[0].checkInTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                : 'No visits'}
            </Text>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 5. CURRENT MEMBERSHIP                                        */}
        {/* ============================================================ */}
        <View style={styles.profileSection}>
          <Text style={[typography.captionBold, styles.profileSectionTitle, { color: colors.textSecondary }]}>
            CURRENT MEMBERSHIP
          </Text>

          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }, shadows.low]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconCircle, { backgroundColor: colors.primarySoft }]}>
                <Award size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                  {membership?.planName || 'No Active Membership Plan'}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
                  {membership?.price ? `₹${membership.price}` : 'Plan unassigned'} · {membership?.durationDays ? `${membership.durationDays} Days` : 'Inactive'}
                </Text>
              </View>
              {membership && <StatusBadge status={membership.status} />}
            </View>

            {membership && (
              <>
                <View style={[styles.cardDivider, { backgroundColor: colors.borderSubtle }]} />
                <View style={styles.planDatesRow}>
                  <View style={styles.planDateCol}>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>START DATE</Text>
                    <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: 2 }]}>
                      {new Date(membership.startDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.planDateCol}>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>EXPIRATION</Text>
                    <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: 2 }]}>
                      {new Date(membership.endDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.planDateCol}>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>REMAINING</Text>
                    <Text style={[typography.bodyBold, { color: isFrozen ? colors.specialText : colors.primary, marginTop: 2 }]}>
                      {daysRemainingText}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <View style={[styles.cardActionRow, { borderTopColor: colors.borderSubtle }]}>
              {membership ? (
                <>
                  {isFrozen ? (
                    <TouchableOpacity
                      style={[styles.smallActionBtn, { backgroundColor: colors.specialBg, borderColor: colors.specialBorder }]}
                      onPress={() => unfreezeMutation.mutate(membership.id)}
                      disabled={unfreezeMutation.isPending}
                    >
                      <Play size={12} color={colors.specialText} style={{ marginRight: 4 }} />
                      <Text style={[typography.captionBold, { color: colors.specialText }]}>Unfreeze</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.smallActionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                      onPress={() => setFreezeModalVisible(true)}
                    >
                      <Snowflake size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[typography.captionBold, { color: colors.textSecondary }]}>Freeze</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.smallActionBtn, { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }]}
                    onPress={() => setRenewMembershipVisible(true)}
                  >
                    <RefreshCw size={12} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[typography.captionBold, { color: colors.primary }]}>Renew Plan</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.smallActionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setRenewMembershipVisible(true)}
                >
                  <PlusCircle size={14} color={colors.textOnPrimary} style={{ marginRight: 6 }} />
                  <Text style={[typography.captionBold, { color: colors.textOnPrimary }]}>Assign Membership Plan</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 6. FINANCIAL LEDGER & RECENT PAYMENTS                        */}
        {/* ============================================================ */}
        <View style={styles.profileSection}>
          <View style={styles.sectionHeaderBetween}>
            <Text style={[typography.captionBold, styles.profileSectionTitle, { color: colors.textSecondary }]}>
              FINANCIAL LEDGER
            </Text>
            {outstandingDues > 0 && (
              <TouchableOpacity
                style={[styles.collectDuesBtn, { backgroundColor: colors.danger }]}
                onPress={() => setCollectPaymentVisible(true)}
              >
                <Text style={[typography.captionBold, { color: colors.textOnPrimary, fontSize: 11 }]}>
                  Collect ₹{outstandingDues.toFixed(2)}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }, shadows.low]}>
            <View style={styles.statGrid}>
              <View style={styles.statBox}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>INVOICED</Text>
                <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: 2 }]}>
                  ₹{billingData ? billingData.totalBilled.toFixed(2) : '0.00'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>COLLECTED</Text>
                <Text style={[typography.bodyBold, { color: colors.successText, marginTop: 2 }]}>
                  ₹{billingData ? billingData.totalPaid.toFixed(2) : '0.00'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>BALANCE DUE</Text>
                <Text
                  style={[
                    typography.bodyBold,
                    { color: outstandingDues > 0 ? colors.dangerText : colors.textSecondary, marginTop: 2 },
                  ]}
                >
                  ₹{outstandingDues.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Payment Records */}
            {(billingData?.recentPayments || []).length > 0 && (
              <>
                <View style={[styles.cardDivider, { backgroundColor: colors.borderSubtle }]} />
                <Text style={[typography.captionBold, { color: colors.textSecondary, marginBottom: 8 }]}>
                  RECENT TRANSACTIONS
                </Text>
                {billingData!.recentPayments.slice(0, 3).map((p: PaymentRecord, idx: number) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.paymentRow,
                      idx < Math.min(billingData!.recentPayments.length, 3) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
                    ]}
                    onPress={() => handleOpenReceipt(p.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.paymentIconBox, { backgroundColor: colors.successBg }]}>
                      <Receipt size={14} color={colors.success} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[typography.bodyBold, { color: colors.textPrimary, fontSize: 13 }]}>
                        {p.paymentMethod} {p.receiptNumber ? `· ${p.receiptNumber}` : ''}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        {new Date(p.paidAt).toLocaleDateString()} · {p.status}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                        ₹{Number(p.amount).toFixed(2)}
                      </Text>
                      <Text style={[typography.caption, { color: colors.primary, fontSize: 11 }]}>Receipt →</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        </View>

        {/* ============================================================ */}
        {/* 7. ATTENDANCE RECORD                                         */}
        {/* ============================================================ */}
        <View style={styles.profileSection}>
          <Text style={[typography.captionBold, styles.profileSectionTitle, { color: colors.textSecondary }]}>
            ATTENDANCE RECORD
          </Text>

          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }, shadows.low]}>
            <View style={styles.statGrid}>
              <View style={styles.statBox}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>TOTAL VISITS</Text>
                <Text style={[typography.sectionTitle, { color: colors.textPrimary, marginTop: 2 }]}>
                  {attendanceSummary.totalCheckIns}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>LATEST VISIT</Text>
                <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: 4 }]}>
                  {attendanceSummary.recentCheckIns[0]
                    ? new Date(attendanceSummary.recentCheckIns[0].checkInTime).toLocaleDateString()
                    : 'Never'}
                </Text>
              </View>
            </View>

            {attendanceSummary.recentCheckIns.length > 0 && (
              <>
                <View style={[styles.cardDivider, { backgroundColor: colors.borderSubtle }]} />
                <Text style={[typography.captionBold, { color: colors.textSecondary, marginBottom: 8 }]}>
                  RECENT CHECK-INS
                </Text>
                {attendanceSummary.recentCheckIns.slice(0, 3).map((item, idx) => (
                  <View
                    key={item.id || idx}
                    style={[
                      styles.attendanceRow,
                      idx < Math.min(attendanceSummary.recentCheckIns.length, 3) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
                    ]}
                  >
                    <View style={[styles.attendanceDot, { backgroundColor: colors.successBg }]}>
                      <Clock size={12} color={colors.success} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[typography.bodyBold, { color: colors.textPrimary, fontSize: 13 }]}>
                        {new Date(item.checkInTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        Check-in: {new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {item.entryMethod}
                      </Text>
                    </View>
                    <StatusBadge status="CHECKED_IN" />
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        {/* ============================================================ */}
        {/* 8. COACHING & PERSONAL TRAINING (PT)                         */}
        {/* ============================================================ */}
        <View style={styles.profileSection}>
          <View style={styles.sectionHeaderBetween}>
            <Text style={[typography.captionBold, styles.profileSectionTitle, { color: colors.textSecondary }]}>
              COACHING & PERSONAL TRAINING
            </Text>
            <TouchableOpacity
              style={[styles.smallActionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setPurchasePTPackageVisible(true)}
            >
              <PlusCircle size={12} color={colors.textOnPrimary} style={{ marginRight: 4 }} />
              <Text style={[typography.captionBold, { color: colors.textOnPrimary }]}>Buy PT Pack</Text>
            </TouchableOpacity>
          </View>

          {/* Assigned Coach */}
          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }, shadows.low]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconCircle, { backgroundColor: colors.primarySoft }]}>
                <User size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                  {activeAssignment ? activeAssignment.trainerName : 'No Assigned Coach'}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {activeAssignment ? (activeAssignment.specialization || 'Dedicated Coach') : 'Assign coach for personal training'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.smallActionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                onPress={() => setAssignTrainerVisible(true)}
              >
                <Text style={[typography.captionBold, { color: colors.textPrimary }]}>
                  {activeAssignment ? 'Change' : 'Assign'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* PT Packages Progress */}
            {ptPackages && ptPackages.length > 0 && (
              <>
                <View style={[styles.cardDivider, { backgroundColor: colors.borderSubtle }]} />
                <Text style={[typography.captionBold, { color: colors.textSecondary, marginBottom: 8 }]}>
                  ACTIVE PT PACKAGES
                </Text>
                {ptPackages.map((pkg) => {
                  const isDepleted = pkg.remainingSessions === 0 || pkg.status === 'DEPLETED';
                  const progressPct = pkg.totalSessions > 0 ? (pkg.usedSessions / pkg.totalSessions) * 100 : 0;
                  return (
                    <View key={pkg.id} style={styles.ptPkgItem}>
                      <View style={styles.ptPkgHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.cardTitle, { color: colors.textPrimary, fontSize: 13 }]}>{pkg.packageName}</Text>
                          <Text style={[typography.caption, { color: colors.textSecondary }]}>Coach: {pkg.trainerName}</Text>
                        </View>
                        <View style={[styles.sessionsBadge, { backgroundColor: isDepleted ? colors.surfaceSubtle : colors.primarySoft }]}>
                          <Text style={[typography.captionBold, { color: isDepleted ? colors.textMuted : colors.primary, fontSize: 11 }]}>
                            {pkg.remainingSessions} Left
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSubtle }]}>
                        <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: colors.primary }]} />
                      </View>

                      <View style={styles.ptFooterRow}>
                        <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>
                          {pkg.usedSessions}/{pkg.totalSessions} Sessions · Exp: {new Date(pkg.expiryDate).toLocaleDateString()}
                        </Text>
                        {!isDepleted && (
                          <TouchableOpacity
                            style={[styles.smallActionBtn, { backgroundColor: colors.successBg, borderColor: colors.successBorder }]}
                            onPress={() => handleLogPTSession(pkg)}
                          >
                            <CheckCircle2 size={12} color={colors.success} style={{ marginRight: 4 }} />
                            <Text style={[typography.captionBold, { color: colors.successText, fontSize: 11 }]}>Log Session</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        </View>

        {/* ============================================================ */}
        {/* 9. DEACTIVATE MEMBER ACCOUNT                                 */}
        {/* ============================================================ */}
        <View style={styles.deactivateSection}>
          <TouchableOpacity
            style={[styles.deactivateBtn, { borderColor: colors.dangerBorder, borderRadius: radii.md }]}
            onPress={() => setDeactivateConfirmVisible(true)}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color={colors.danger} style={{ marginRight: 6 }} />
            <Text style={[typography.captionBold, { color: colors.danger }]}>
              Deactivate Member Account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* --- CONFIRMATION DIALOG FOR DEACTIVATION --- */}
      <ConfirmationDialog
        visible={deactivateConfirmVisible}
        onClose={() => setDeactivateConfirmVisible(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Deactivate Member?"
        message={`Are you sure you want to deactivate ${member.fullName}? They will be marked as inactive in your directory.`}
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        isDestructive={true}
        loading={deleteMutation.isPending}
      />

      {/* --- BUSINESS MODALS --- */}
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
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrapper: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  identityCard: {
    padding: 14,
    borderWidth: 1,
  },
  identityTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  identityDetails: {
    flex: 1,
    marginLeft: 12,
  },
  nameStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  inlineContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRailWrapper: {
    marginTop: 14,
    marginBottom: 10,
  },
  actionRailScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  actionButton: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 52,
  },
  inlineKpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginVertical: 12,
  },
  inlineKpiItem: {
    flex: 1,
    alignItems: 'center',
  },
  inlineKpiDivider: {
    width: 1,
    height: 28,
  },
  profileSection: {
    marginTop: 18,
  },
  profileSectionTitle: {
    letterSpacing: 0.6,
    marginBottom: 8,
    fontSize: 11,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  profileCard: {
    padding: 14,
    borderWidth: 1,
  },
  ptPkgItem: {
    marginTop: 12,
  },
  card: {
    padding: 14,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDivider: {
    height: 1,
    width: '100%',
    marginVertical: 12,
  },
  planDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planDateCol: {
    flex: 1,
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  coachContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deactivateSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  deactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  ledgerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  collectDuesBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  paymentIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  attendanceDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ptHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ptPkgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  progressTrack: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  ptFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
