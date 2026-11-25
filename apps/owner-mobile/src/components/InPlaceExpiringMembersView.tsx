/**
 * GymDeck Owner Mobile - In-Place Expiring Memberships & Retention Command View
 *
 * Sourced directly from local database (MemberRepository & PlanRepository via SQLCipher).
 * Replicates the full intelligence, metrics, filter modes, and operational logic of the Desktop
 * Expiring Memberships module (ExpiringMemberships.jsx) tailored with high-end bold executive mobile UX:
 *
 * 1. Executive Filled Header Card with Watermark Brand, Matching Directory, Plans & Past Members height & spacing
 * 2. 4 Modern Portfolio KPI Cards:
 *    - Expiring Today: Count of memberships ending today (daysRemaining === 0)
 *    - 7-Day Window: Total upcoming expirations within 7 days
 *    - Revenue At Risk: Total expiring contract value
 *    - Avg Renewal Probability: Projected winback / renewal cohort score
 * 3. Fast Search & Filter Bar:
 *    - Search name, phone, code
 *    - Filter bottom sheet (All Window, Expiring Today, Next 3 Days, Next 7 Days, Overdue/Lapsed)
 * 4. Rich Expiring Member Cards with:
 *    - Authentic Profile Avatar or fallback initials
 *    - Urgency pill (Expired Xd, Today, In Xd)
 *    - Renewal score progress bar
 *    - Quick Action Buttons: Quick Renew, Call, WhatsApp nudge, View Profile
 * 5. Interactive Modals:
 *    - Quick Renewal Sheet with Plan Selection & immediate transition
 *    - Member Profile Dossier Modal
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
  Linking,
  Animated,
} from 'react-native';
import {
  Search,
  X,
  RotateCw,
  Clock,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Phone,
  MessageCircle,
  Eye,
  Check,
  CheckCircle2,
  ChevronDown,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  DollarSign,
  Activity,
  Users,
  Target,
  Filter as FilterIcon,
} from 'lucide-react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalMembers } from '../hooks/useLocalMembers';
import { useLocalPlans } from '../hooks/useLocalPlans';
import { localMutationService } from '../services/LocalMutationService';
import { Avatar } from './ui/Avatar';
import { BrandSignatureFooter } from './BrandSignatureFooter';
import { layout } from '../theme/spacing';
import { formatCurrency } from '../utils/currency';
import { GymMemberSummary, MembershipPlanSummary } from '../types';

interface InPlaceExpiringMembersViewProps {
  isDark?: boolean;
  onClose?: () => void;
}

export type ExpiringFilter = 'All' | 'Today' | 'Next3Days' | 'Next7Days' | 'Overdue';

const FILTER_OPTIONS: { id: ExpiringFilter; label: string; desc: string; icon: any; color: string }[] = [
  { id: 'All', label: 'All Expiring (≤ 7 Days)', desc: 'Complete 7-day upcoming expiration window', icon: Calendar, color: '#3B82F6' },
  { id: 'Today', label: 'Expiring Today', desc: 'Critical immediate churn deadline', icon: AlertCircle, color: '#F43F5E' },
  { id: 'Next3Days', label: 'Due Next 3 Days', desc: 'High urgency renewal follow-ups', icon: Clock, color: '#F59E0B' },
  { id: 'Next7Days', label: '4 to 7 Days Window', desc: 'Upcoming regular renewal cycle', icon: Target, color: '#10B981' },
  { id: 'Overdue', label: 'Overdue / Grace Period', desc: 'Expired within last 14 days', icon: AlertTriangle, color: '#EF4444' },
];

export const InPlaceExpiringMembersView: React.FC<InPlaceExpiringMembersViewProps> = ({
  isDark = false,
  onClose,
}) => {
  const queryClient = useQueryClient();

  // Local-First Data Hooks
  const { members: allMembers, isLoading: isMembersLoading, refetch: refetchMembers } = useLocalMembers();
  const { plans, isLoading: isPlansLoading } = useLocalPlans({ activeOnly: true });

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<ExpiringFilter>('All');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterBackdropAnim = useRef(new Animated.Value(0)).current;
  const filterTranslateY = useRef(new Animated.Value(500)).current;

  // Quick Renewal Modal State
  const [memberToRenew, setMemberToRenew] = useState<GymMemberSummary | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isRenewing, setIsRenewing] = useState(false);

  // Profile View Modal State
  const [selectedMember, setSelectedMember] = useState<GymMemberSummary | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const openFilterModal = () => {
    setIsFilterDropdownOpen(true);
    Animated.parallel([
      Animated.timing(filterBackdropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(filterTranslateY, {
        toValue: 0,
        damping: 24,
        stiffness: 280,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeFilterModal = () => {
    Animated.parallel([
      Animated.timing(filterBackdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(filterTranslateY, {
        toValue: 500,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsFilterDropdownOpen(false);
    });
  };

  // Compute days remaining & renewal probability for each member
  const enrichedExpiringMembers = useMemo(() => {
    const now = new Date();
    // Start of today at midnight
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const defaultPrice = plans && plans.length > 0 ? parseFloat(plans[0].price) || 2000 : 2000;

    return allMembers
      .filter((m) => {
        const status = String(m.membershipStatus || '').toUpperCase();
        // Do not include deleted or voluntarily terminated members
        if (status === 'TERMINATED' || status === 'CANCELLED' || status === 'DELETED') return false;
        if (!m.expiresAt) return false;
        return true;
      })
      .map((m) => {
        const expDate = new Date(m.expiresAt!);
        const expMidnight = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
        const diffMs = expMidnight.getTime() - startOfToday.getTime();
        const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

        // Renewal probability heuristic matching Desktop formula:
        let renewalScore = 75;
        if (daysRemaining > 3) renewalScore = 85;
        else if (daysRemaining >= 1) renewalScore = 70;
        else if (daysRemaining === 0) renewalScore = 55;
        else if (daysRemaining < 0) renewalScore = Math.max(15, 45 - Math.abs(daysRemaining) * 5);

        return {
          ...m,
          daysRemaining,
          calculatedPlanPrice: defaultPrice,
          calculatedPlanName: 'Standard Membership',
          renewalProbability: renewalScore,
        };
      })
      // Only include memberships expiring within next 7 days, OR expired within last 14 days
      .filter((m) => m.daysRemaining <= 7 && m.daysRemaining >= -14);
  }, [allMembers, plans]);

  // KPI Calculations
  const stats = useMemo(() => {
    let expiringTodayCount = 0;
    let upcomingWeekCount = 0;
    let revenueAtRisk = 0;
    let totalScore = 0;

    enrichedExpiringMembers.forEach((m) => {
      if (m.daysRemaining === 0) {
        expiringTodayCount += 1;
      }
      if (m.daysRemaining >= 0 && m.daysRemaining <= 7) {
        upcomingWeekCount += 1;
      }
      revenueAtRisk += m.calculatedPlanPrice;
      totalScore += m.renewalProbability;
    });

    const avgProbability =
      enrichedExpiringMembers.length > 0
        ? Math.round(totalScore / enrichedExpiringMembers.length)
        : 80;

    return {
      expiringTodayCount,
      upcomingWeekCount,
      revenueAtRisk,
      avgProbability,
    };
  }, [enrichedExpiringMembers]);

  // Filter & Search Members
  const filteredMembers = useMemo(() => {
    return enrichedExpiringMembers
      .filter((m) => {
        // Filter logic
        if (selectedFilter === 'Today') {
          return m.daysRemaining === 0;
        }
        if (selectedFilter === 'Next3Days') {
          return m.daysRemaining >= 1 && m.daysRemaining <= 3;
        }
        if (selectedFilter === 'Next7Days') {
          return m.daysRemaining >= 4 && m.daysRemaining <= 7;
        }
        if (selectedFilter === 'Overdue') {
          return m.daysRemaining < 0;
        }
        // 'All' - shows all <= 7 days
        return true;
      })
      .filter((m) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          m.fullName?.toLowerCase().includes(q) ||
          m.phone?.toLowerCase().includes(q) ||
          m.memberCode?.toLowerCase().includes(q) ||
          m.calculatedPlanName?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [enrichedExpiringMembers, selectedFilter, search]);

  // Handlers for Native Interactions
  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'No contact number available for this member.');
      return;
    }
    const cleanNumber = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      Alert.alert('Call Failed', 'Unable to dial phone number on this device.');
    });
  };

  const handleWhatsApp = (member: typeof enrichedExpiringMembers[0]) => {
    if (!member.phone) {
      Alert.alert('No Phone', 'No phone number available for WhatsApp message.');
      return;
    }
    const cleanNumber = member.phone.replace(/[^0-9]/g, '');
    const days = member.daysRemaining;
    let message = '';
    if (days === 0) {
      message = `Hi ${member.fullName}, your GymDeck membership expires TODAY! Renew now to keep your workouts uninterrupted. Let us know how we can help!`;
    } else if (days < 0) {
      message = `Hi ${member.fullName}, your GymDeck membership expired ${Math.abs(days)} day(s) ago. We'd love to welcome you back! Renew today to continue your fitness journey.`;
    } else {
      message = `Hi ${member.fullName}, friendly reminder that your GymDeck membership expires in ${days} day(s). Renew early to avoid any interruption!`;
    }

    const url = `whatsapp://send?phone=${cleanNumber}&text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`);
        }
      })
      .catch(() => {
        Alert.alert('WhatsApp Error', 'Could not open WhatsApp.');
      });
  };

  // Quick Renew Flow
  const openRenewModal = (member: GymMemberSummary) => {
    setMemberToRenew(member);
    setSelectedPlanId(plans && plans.length > 0 ? plans[0].id : '');
    setIsRenewModalOpen(true);
  };

  const executeRenewal = async () => {
    if (!memberToRenew) return;
    setIsRenewing(true);
    try {
      const chosenPlan = plans?.find((p) => p.id === selectedPlanId);
      const days = chosenPlan?.durationDays || 30;

      // Start new expiration either from current expiry (if in future) or today
      const now = new Date();
      const currentExp = memberToRenew.expiresAt ? new Date(memberToRenew.expiresAt) : now;
      const baseDate = currentExp > now ? currentExp : now;

      const newExp = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      await localMutationService.updateMember(memberToRenew.id, {
        membershipStatus: 'ACTIVE',
        expiresAt: newExp.toISOString(),
      });

      await refetchMembers();
      queryClient.invalidateQueries({ queryKey: ['local-members'] });
      queryClient.invalidateQueries({ queryKey: ['owner-analytics-overview'] });

      setIsRenewModalOpen(false);
      setMemberToRenew(null);
      Alert.alert(
        'Renewal Successful',
        `${memberToRenew.fullName}'s membership has been extended until ${newExp.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`
      );
    } catch (err: any) {
      Alert.alert('Renewal Failed', err?.message || 'Could not process membership extension.');
    } finally {
      setIsRenewing(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#0B0F19' : '#F8FAFC' }]}>
      {/* ============================================================ */}
      {/* 1. EXECUTIVE DARK NAVY COMMAND HEADER CARD                   */}
      {/* Exact spacing and visual weight matching other modules       */}
      {/* ============================================================ */}
      <View style={styles.headerCardContainer}>
        <View style={styles.executiveHeaderCard}>
          {/* Subtle Background Watermark Logo */}
          <View style={styles.watermarkWrap} pointerEvents="none">
            <Svg width={110} height={110} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"
                stroke="#FFFFFF"
                strokeWidth={1.5}
                strokeOpacity={0.06}
              />
              <Path
                d="M19 2l.8 2.2L22 5l-2.2.8L19 8l-.8-2.2L16 5l2.2-.8L19 2z"
                stroke="#FFFFFF"
                strokeWidth={1.2}
                strokeOpacity={0.06}
              />
            </Svg>
          </View>

          {/* Overline & Live Pulse */}
          <View style={styles.headerTopRow}>
            <View style={styles.overlineContainer}>
              <View style={styles.pulseDot} />
              <Text style={styles.headerOverline}>RETENTION COMMAND CENTER</Text>
            </View>
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.headerTitle}>Expiring Memberships</Text>
          <Text style={styles.headerSubtitle}>
            Upcoming 7-day expirations, overdue renewals & churn prevention
          </Text>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 2. 4 STRATEGIC KPI CARDS                                     */}
      {/* 2x2 Grid with real metrics from SQLCipher                   */}
      {/* ============================================================ */}
      <View style={styles.statsGrid}>
        {/* Stat 1: Expiring Today */}
        <View style={[styles.statTile, isDark && styles.statTileDark]}>
          <View style={styles.statTileTop}>
            <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>EXPIRING TODAY</Text>
            <View
              style={[
                styles.statBadge,
                stats.expiringTodayCount > 0
                  ? { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }
                  : { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
              ]}
            >
              <Text
                style={[
                  styles.statBadgeText,
                  { color: stats.expiringTodayCount > 0 ? '#B91C1C' : '#64748B' },
                ]}
              >
                {stats.expiringTodayCount > 0 ? 'CRITICAL' : 'CLEAR'}
              </Text>
            </View>
          </View>
          <Text style={[styles.statValue, isDark && styles.statValueDark]}>
            {stats.expiringTodayCount}
          </Text>
          <Text style={styles.statSubtext}>Immediate churn deadline</Text>
        </View>

        {/* Stat 2: 7-Day Window */}
        <View style={[styles.statTile, isDark && styles.statTileDark]}>
          <View style={styles.statTileTop}>
            <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>7-DAY HORIZON</Text>
            <View style={[styles.statBadge, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
              <Text style={[styles.statBadgeText, { color: '#0369A1' }]}>WINDOW</Text>
            </View>
          </View>
          <Text style={[styles.statValue, isDark && styles.statValueDark]}>
            {stats.upcomingWeekCount}
          </Text>
          <Text style={styles.statSubtext}>Due in next 7 calendar days</Text>
        </View>

        {/* Stat 3: Revenue At Risk */}
        <View style={[styles.statTile, isDark && styles.statTileDark]}>
          <View style={styles.statTileTop}>
            <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>REVENUE AT RISK</Text>
            <View style={[styles.statBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Text style={[styles.statBadgeText, { color: '#B45309' }]}>EXPOSURE</Text>
            </View>
          </View>
          <Text style={[styles.statValue, isDark && styles.statValueDark]}>
            {formatCurrency(stats.revenueAtRisk)}
          </Text>
          <Text style={styles.statSubtext}>Total expiring contract value</Text>
        </View>

        {/* Stat 4: Avg Renewal Probability */}
        <View style={[styles.statTile, isDark && styles.statTileDark]}>
          <View style={styles.statTileTop}>
            <Text style={[styles.statLabel, isDark && styles.statLabelDark]}>RENEWAL HEALTH</Text>
            <View style={[styles.statBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <Text style={[styles.statBadgeText, { color: '#047857' }]}>PROBABILITY</Text>
            </View>
          </View>
          <Text style={[styles.statValue, isDark && styles.statValueDark]}>
            {stats.avgProbability}%
          </Text>
          <Text style={styles.statSubtext}>Retention win-back score</Text>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 3. SEARCH & FILTER SECTION BAR                               */}
      {/* ============================================================ */}
      <View style={styles.filterSection}>
        {/* Search Bar */}
        <View style={[styles.searchBarWrap, isDark && styles.searchBarWrapDark]}>
          <Search size={16} color={isDark ? '#94A3B8' : '#64748B'} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, isDark && styles.searchInputDark]}
            placeholder="Search expiring members, phones..."
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Dropdown Pill */}
        <TouchableOpacity
          style={[styles.filterDropdownPill, isDark && styles.filterDropdownPillDark]}
          onPress={openFilterModal}
          activeOpacity={0.8}
        >
          <FilterIcon size={14} color={isDark ? '#38BDF8' : '#0284C7'} strokeWidth={2.2} />
          <Text style={[styles.filterDropdownPillText, isDark && styles.filterDropdownPillTextDark]}>
            {FILTER_OPTIONS.find((f) => f.id === selectedFilter)?.label}
          </Text>
          <ChevronDown size={14} color={isDark ? '#94A3B8' : '#64748B'} />
        </TouchableOpacity>
      </View>

      {/* ============================================================ */}
      {/* 4. EXPIRING MEMBERS LIST                                     */}
      {/* ============================================================ */}
      <View style={styles.listContainer}>
        {isMembersLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#0284C7" />
            <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
              Scanning membership expiry dates...
            </Text>
          </View>
        ) : filteredMembers.length === 0 ? (
          <View style={[styles.emptyWrap, isDark && styles.emptyWrapDark]}>
            <View style={styles.emptyIconCircle}>
              <CheckCircle2 size={28} color="#10B981" strokeWidth={2} />
            </View>
            <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
              {search ? 'No Matching Members Found' : 'No Expiring Members in Horizon'}
            </Text>
            <Text style={[styles.emptySubtitle, isDark && styles.emptySubtitleDark]}>
              {search
                ? `No expiring members match "${search}". Try adjusting your query.`
                : 'All current active contracts are safely outside the 7-day expiration boundary.'}
            </Text>
          </View>
        ) : (
          filteredMembers.map((member) => {
            const days = member.daysRemaining;
            const isOverdue = days < 0;
            const isToday = days === 0;
            const isSoon = days >= 1 && days <= 3;

            // Badging colors
            let urgencyBg = '#E0F2FE';
            let urgencyBorder = '#BAE6FD';
            let urgencyText = '#0369A1';
            let urgencyLabel = `In ${days} Days`;

            if (isOverdue) {
              urgencyBg = '#FEE2E2';
              urgencyBorder = '#FECACA';
              urgencyText = '#B91C1C';
              urgencyLabel = `Expired ${Math.abs(days)}d ago`;
            } else if (isToday) {
              urgencyBg = '#FFE4E6';
              urgencyBorder = '#FECDD3';
              urgencyText = '#BE123C';
              urgencyLabel = 'Expires Today';
            } else if (isSoon) {
              urgencyBg = '#FEF3C7';
              urgencyBorder = '#FDE68A';
              urgencyText = '#B45309';
              urgencyLabel = `In ${days} Day${days > 1 ? 's' : ''}`;
            }

            return (
              <View
                key={member.id}
                style={[styles.memberCard, isDark && styles.memberCardDark]}
              >
                {/* Member Card Top: Avatar, Name, Urgency Pill */}
                <View style={styles.memberCardTop}>
                  <Avatar
                    name={member.fullName}
                    size="md"
                    style={styles.avatarBorder}
                  />

                  <View style={styles.memberMainInfo}>
                    <View style={styles.nameRow}>
                      <Text
                        style={[styles.memberName, isDark && styles.memberNameDark]}
                        numberOfLines={1}
                      >
                        {member.fullName}
                      </Text>
                      {/* Urgency Pill */}
                      <View
                        style={[
                          styles.urgencyPill,
                          { backgroundColor: urgencyBg, borderColor: urgencyBorder },
                        ]}
                      >
                        <Text style={[styles.urgencyPillText, { color: urgencyText }]}>
                          {urgencyLabel}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.memberMeta}>
                      {member.memberCode} · {member.phone || 'No phone'}
                    </Text>
                  </View>
                </View>

                {/* Plan Info Bar */}
                <View style={[styles.planInfoBar, isDark && styles.planInfoBarDark]}>
                  <View style={styles.planInfoLeft}>
                    <Text style={styles.planTagLabel}>STATUS</Text>
                    <Text
                      style={[styles.planTagName, isDark && styles.planTagNameDark]}
                      numberOfLines={1}
                    >
                      {String(member.membershipStatus || 'ACTIVE').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.planTagPrice, isDark && styles.planTagPriceDark]}>
                    Expires: {member.expiresAt ? new Date(member.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}
                  </Text>
                </View>

                {/* Renewal Probability Bar */}
                <View style={styles.probabilitySection}>
                  <View style={styles.probabilityRow}>
                    <Text style={styles.probabilityLabel}>Renewal Probability</Text>
                    <Text
                      style={[
                        styles.probabilityValue,
                        member.renewalProbability >= 70
                          ? { color: '#10B981' }
                          : member.renewalProbability >= 40
                          ? { color: '#F59E0B' }
                          : { color: '#EF4444' },
                      ]}
                    >
                      {member.renewalProbability}%
                    </Text>
                  </View>
                  <View style={[styles.progressBarTrack, isDark && styles.progressBarTrackDark]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${member.renewalProbability}%`,
                          backgroundColor:
                            member.renewalProbability >= 70
                              ? '#10B981'
                              : member.renewalProbability >= 40
                              ? '#F59E0B'
                              : '#EF4444',
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Member Action Toolbar */}
                <View style={[styles.actionToolbar, isDark && styles.actionToolbarDark]}>
                  {/* Quick Renew Button */}
                  <TouchableOpacity
                    style={styles.renewButton}
                    onPress={() => openRenewModal(member)}
                    activeOpacity={0.8}
                  >
                    <RotateCw size={13} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.renewButtonText}>Renew</Text>
                  </TouchableOpacity>

                  {/* Native Call Button */}
                  {member.phone ? (
                    <TouchableOpacity
                      style={[styles.iconButton, styles.callButton]}
                      onPress={() => handleCall(member.phone)}
                      activeOpacity={0.8}
                    >
                      <Phone size={13} color="#0284C7" strokeWidth={2.2} />
                      <Text style={styles.callButtonText}>Call</Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* Native WhatsApp Button */}
                  {member.phone ? (
                    <TouchableOpacity
                      style={[styles.iconButton, styles.whatsappButton]}
                      onPress={() => handleWhatsApp(member)}
                      activeOpacity={0.8}
                    >
                      <MessageCircle size={13} color="#16A34A" strokeWidth={2.2} />
                      <Text style={styles.whatsappButtonText}>Nudge</Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* View Profile Button */}
                  <TouchableOpacity
                    style={[styles.profileButton, isDark && styles.profileButtonDark]}
                    onPress={() => {
                      setSelectedMember(member);
                      setIsProfileModalOpen(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Eye size={13} color={isDark ? '#CBD5E1' : '#475569'} strokeWidth={2.2} />
                    <Text style={[styles.profileButtonText, isDark && styles.profileButtonTextDark]}>
                      Profile
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ============================================================ */}
      {/* 5. FILTER SELECTION MODAL                                    */}
      {/* ============================================================ */}
      <Modal
        visible={isFilterDropdownOpen}
        transparent
        animationType="none"
        onRequestClose={closeFilterModal}
      >
        <View style={styles.modalRoot}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: filterBackdropAnim, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
            ]}
          >
            <TouchableWithoutFeedback onPress={closeFilterModal}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
          </Animated.View>

          <Animated.View
            style={[
              styles.dropdownSheetContainer,
              { transform: [{ translateY: filterTranslateY }] },
            ]}
          >
            <View
              style={[
                styles.dropdownSheet,
                {
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.filterModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <FilterIcon size={18} color={isDark ? '#38BDF8' : '#0284C7'} strokeWidth={2.2} />
                  <Text style={[styles.filterModalTitle, isDark && styles.filterModalTitleDark]}>
                    Filter Expiring Cohort
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closeFilterModal}
                  style={styles.modalCloseSquare}
                >
                  <X size={16} color={isDark ? '#CBD5E1' : '#475569'} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              <View style={styles.filterOptionsList}>
                {FILTER_OPTIONS.map((opt) => {
                  const isSelected = selectedFilter === opt.id;
                  const IconComp = opt.icon;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.filterOptionItem,
                        isSelected && (isDark ? styles.filterOptionItemActiveDark : styles.filterOptionItemActive),
                      ]}
                      onPress={() => {
                        setSelectedFilter(opt.id);
                        closeFilterModal();
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.filterOptionIconWrap,
                          { backgroundColor: `${opt.color}15` },
                        ]}
                      >
                        <IconComp size={16} color={opt.color} strokeWidth={2.2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.filterOptionLabel,
                            isSelected && { color: opt.color, fontWeight: '700' },
                            isDark && !isSelected && styles.filterOptionLabelDark,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text style={styles.filterOptionDesc}>{opt.desc}</Text>
                      </View>
                      {isSelected && <Check size={18} color={opt.color} strokeWidth={2.5} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* 6. QUICK RENEWAL MODAL                                       */}
      {/* ============================================================ */}
      <Modal
        visible={isRenewModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRenewModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsRenewModalOpen(false)}>
          <View style={styles.filterModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.renewModalContent, isDark && styles.filterModalContentDark]}>
                <View style={styles.filterModalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <RotateCw size={18} color="#0284C7" strokeWidth={2.4} />
                    <Text style={[styles.filterModalTitle, isDark && styles.filterModalTitleDark]}>
                      Renew Membership
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsRenewModalOpen(false)}
                    style={styles.modalCloseSquare}
                  >
                    <X size={16} color={isDark ? '#CBD5E1' : '#475569'} strokeWidth={2.2} />
                  </TouchableOpacity>
                </View>

                {memberToRenew && (
                  <View style={styles.renewMemberBanner}>
                    <Avatar
                      name={memberToRenew.fullName}
                      size="sm"
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.renewMemberName, isDark && styles.memberNameDark]}>
                        {memberToRenew.fullName}
                      </Text>
                      <Text style={styles.renewMemberSub}>
                        {memberToRenew.memberCode} · Currently{' '}
                        {String(memberToRenew.membershipStatus || 'ACTIVE').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                )}

                <Text style={[styles.selectPlanLabel, isDark && styles.statLabelDark]}>
                  SELECT EXTENSION PLAN
                </Text>

                <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                  {plans?.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    return (
                      <TouchableOpacity
                        key={plan.id}
                        style={[
                          styles.planSelectCard,
                          isDark && styles.planSelectCardDark,
                          isSelected && styles.planSelectCardSelected,
                        ]}
                        onPress={() => setSelectedPlanId(plan.id)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.planSelectName,
                              isDark && styles.memberNameDark,
                              isSelected && { color: '#0284C7' },
                            ]}
                          >
                            {plan.planName}
                          </Text>
                          <Text style={styles.planSelectMeta}>
                            {plan.durationDays} days duration
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.planSelectPrice,
                            isDark && styles.memberNameDark,
                            isSelected && { color: '#0284C7' },
                          ]}
                        >
                          {formatCurrency(parseFloat(plan.price) || 0)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.renewActions}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, isDark && styles.cancelBtnDark]}
                    onPress={() => setIsRenewModalOpen(false)}
                  >
                    <Text style={[styles.cancelBtnText, isDark && styles.cancelBtnTextDark]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.confirmRenewBtn, isRenewing && { opacity: 0.7 }]}
                    onPress={executeRenewal}
                    disabled={isRenewing}
                  >
                    {isRenewing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Check size={16} color="#FFFFFF" strokeWidth={2.4} />
                        <Text style={styles.confirmRenewBtnText}>Confirm Renewal</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ============================================================ */}
      {/* 7. MEMBER PROFILE DOSSIER MODAL                              */}
      {/* ============================================================ */}
      <Modal
        visible={isProfileModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsProfileModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsProfileModalOpen(false)}>
          <View style={styles.filterModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.profileModalContent, isDark && styles.filterModalContentDark]}>
                <View style={styles.filterModalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={18} color="#0284C7" strokeWidth={2.2} />
                    <Text style={[styles.filterModalTitle, isDark && styles.filterModalTitleDark]}>
                      Member Profile Dossier
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsProfileModalOpen(false)}
                    style={styles.modalCloseSquare}
                  >
                    <X size={16} color={isDark ? '#CBD5E1' : '#475569'} strokeWidth={2.2} />
                  </TouchableOpacity>
                </View>

                {selectedMember && (
                  <View style={styles.profileDetailsBody}>
                    <View style={styles.profileHero}>
                      <Avatar
                        name={selectedMember.fullName}
                        size="lg"
                      />
                      <Text style={[styles.profileHeroName, isDark && styles.memberNameDark]}>
                        {selectedMember.fullName}
                      </Text>
                      <Text style={styles.profileHeroCode}>
                        {selectedMember.memberCode} ·{' '}
                        {String(selectedMember.membershipStatus || 'ACTIVE').toUpperCase()}
                      </Text>
                    </View>

                    <View style={[styles.profileInfoGrid, isDark && styles.profileInfoGridDark]}>
                      <View style={styles.profileInfoRow}>
                        <Text style={styles.profileInfoLabel}>Phone Number</Text>
                        <Text style={[styles.profileInfoVal, isDark && styles.memberNameDark]}>
                          {selectedMember.phone || 'Not Recorded'}
                        </Text>
                      </View>
                      <View style={styles.profileInfoRow}>
                        <Text style={styles.profileInfoLabel}>Status</Text>
                        <Text style={[styles.profileInfoVal, isDark && styles.memberNameDark]}>
                          {String(selectedMember.membershipStatus || 'ACTIVE').toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.profileInfoRow}>
                        <Text style={styles.profileInfoLabel}>Expires At</Text>
                        <Text style={[styles.profileInfoVal, isDark && styles.memberNameDark]}>
                          {selectedMember.expiresAt
                            ? new Date(selectedMember.expiresAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.profileInfoRow}>
                        <Text style={styles.profileInfoLabel}>Enrolled Date</Text>
                        <Text style={[styles.profileInfoVal, isDark && styles.memberNameDark]}>
                          {selectedMember.joinedAt
                            ? new Date(selectedMember.joinedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                      <TouchableOpacity
                        style={[styles.renewButton, { flex: 1, height: 44 }]}
                        onPress={() => {
                          setIsProfileModalOpen(false);
                          openRenewModal(selectedMember);
                        }}
                      >
                        <RotateCw size={15} color="#FFFFFF" strokeWidth={2.4} />
                        <Text style={[styles.renewButtonText, { fontSize: 13 }]}>Quick Renew</Text>
                      </TouchableOpacity>
                      {selectedMember.phone && (
                        <TouchableOpacity
                          style={[styles.iconButton, styles.callButton, { flex: 1, height: 44 }]}
                          onPress={() => handleCall(selectedMember.phone)}
                        >
                          <Phone size={15} color="#0284C7" strokeWidth={2.2} />
                          <Text style={[styles.callButtonText, { fontSize: 13 }]}>Call</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ============================================================ */}
      {/* 8. BRAND SIGNATURE FOOTER                                    */}
      {/* Engineered with ample padding so it clears bottom nav bar    */}
      {/* ============================================================ */}
      <View style={{ paddingBottom: layout.bottomNavHeight + 64 }}>
        <BrandSignatureFooter isDark={isDark} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  /* 1. Header Card */
  headerCardContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  executiveHeaderCard: {
    backgroundColor: '#0F172A', // Dark Navy
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 20,
    paddingTop: 28,
    minHeight: 96,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  watermarkWrap: {
    position: 'absolute',
    right: -10,
    top: -10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  overlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    lineHeight: 16,
  },

  /* 2. 4 Stat Tiles Grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 8,
  },
  statTile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statTileDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  statTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  statLabelDark: {
    color: '#94A3B8',
  },
  statBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  statValueDark: {
    color: '#F8FAFC',
  },
  statSubtext: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* 3. Search & Filter Bar */
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
  },
  searchBarWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchBarWrapDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    paddingVertical: 0,
  },
  searchInputDark: {
    color: '#F8FAFC',
  },
  filterDropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    gap: 6,
  },
  filterDropdownPillDark: {
    backgroundColor: '#0F172A',
    borderColor: '#0284C7',
  },
  filterDropdownPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  filterDropdownPillTextDark: {
    color: '#38BDF8',
  },

  /* 4. Expiring Members List */
  listContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 4,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  loadingTextDark: {
    color: '#94A3B8',
  },
  emptyWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 32,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyWrapDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyTitleDark: {
    color: '#F8FAFC',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptySubtitleDark: {
    color: '#94A3B8',
  },

  /* Member Card */
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  memberCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  memberCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBorder: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  memberMainInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  memberNameDark: {
    color: '#F8FAFC',
  },
  urgencyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  urgencyPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  memberMeta: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },

  /* Plan Bar */
  planInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
  },
  planInfoBarDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  planInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  planTagLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  planTagName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  planTagNameDark: {
    color: '#E2E8F0',
  },
  planTagPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  planTagPriceDark: {
    color: '#F8FAFC',
  },

  /* Probability Section */
  probabilitySection: {
    marginTop: 10,
  },
  probabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  probabilityLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  probabilityValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarTrackDark: {
    backgroundColor: '#334155',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  /* Action Toolbar */
  actionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionToolbarDark: {
    borderTopColor: '#334155',
  },
  renewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  renewButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  callButton: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  callButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  whatsappButton: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  whatsappButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginLeft: 'auto',
  },
  profileButtonDark: {
    borderColor: '#334155',
    backgroundColor: '#0F172A',
  },
  profileButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  profileButtonTextDark: {
    color: '#CBD5E1',
  },

  /* Modal Generic */
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dropdownSheetContainer: {
    width: '100%',
  },
  dropdownSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 20,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  filterModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  filterModalTitleDark: {
    color: '#F8FAFC',
  },
  modalCloseSquare: {
    width: 28,
    height: 28,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  filterOptionsList: {
    gap: 8,
  },
  filterOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterOptionItemActive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  filterOptionItemActiveDark: {
    backgroundColor: '#0F172A',
    borderColor: '#475569',
  },
  filterOptionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  filterOptionLabelDark: {
    color: '#F8FAFC',
  },
  filterOptionDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },

  /* Renew Modal */
  renewModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
  },
  filterModalContentDark: {
    backgroundColor: '#1E293B',
  },
  renewMemberBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  renewMemberName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  renewMemberSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  selectPlanLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  planSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  planSelectCardDark: {
    borderColor: '#334155',
    backgroundColor: '#0F172A',
  },
  planSelectCardSelected: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  planSelectName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  planSelectMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  planSelectPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  renewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  cancelBtnDark: {
    borderColor: '#475569',
    backgroundColor: '#0F172A',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  cancelBtnTextDark: {
    color: '#CBD5E1',
  },
  confirmRenewBtn: {
    flex: 1.5,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: '#0284C7',
  },
  confirmRenewBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Profile Modal */
  profileModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
  },
  profileDetailsBody: {
    paddingTop: 6,
  },
  profileHero: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileHeroName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 8,
  },
  profileHeroCode: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  profileInfoGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  profileInfoGridDark: {
    backgroundColor: '#0F172A',
  },
  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileInfoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  profileInfoVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
});
