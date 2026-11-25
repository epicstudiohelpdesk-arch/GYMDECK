/**
 * GymDeck Owner Mobile - In-Place Past Members Management View
 *
 * Sourced directly from local database (MemberRepository & transactional outbox).
 * Replicates the full intelligence, metrics, filter modes, and operational logic of the Desktop
 * Past Members module (PastMembers.jsx) tailored with high-end bold executive mobile UX:
 *
 * 1. Executive Filled Header Card with Watermark Brand, Matching Directory & Plans height & spacing
 * 2. 4 Modern Portfolio KPI Cards:
 *    - Total Archived: Count of offboarded/expired accounts
 *    - Recovery Pipeline: Cumulative projected win-back revenue value
 *    - Reclaimable Cohorts: Members inactive <= 30 Days (highest winback likelihood)
 *    - Inactivity Duration: Average offboarding days
 * 3. Fast Search & Filter Bar:
 *    - Search name, phone, code, reason
 *    - Filter drawer (All, Expired, Cancelled, Terminated, Inactive <= 30D)
 * 4. Rich Past Member Cards with:
 *    - Authentic Profile Avatar or fallback initials
 *    - Inactivity age pill, offboarding reason badge
 *    - Winback recovery potential score (High, Medium, Low)
 *    - Actions: Reactivate / Re-Enroll, Member Profile Dossier, Delete Record
 * 5. Interactive Modals:
 *    - Reactivation Sheet with Plan Selection & immediate transition back to Active roster
 *    - Member Profile Dossier Modal
 *    - Setup Guide Style Compact Deletion Confirmation Modal (Square close button, 5px radius)
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
  Animated,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  X,
  RotateCcw,
  UserCheck,
  UserMinus,
  Filter,
  Users,
  Clock,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Trash2,
  Phone,
  MessageCircle,
  Eye,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Target,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Activity,
} from 'lucide-react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalMembers } from '../hooks/useLocalMembers';
import { useLocalPlans } from '../hooks/useLocalPlans';
import { localMutationService } from '../services/LocalMutationService';
import { isDatabaseOpen } from '../database/LocalDatabaseManager';
import { Avatar } from './ui/Avatar';
import { BrandSignatureFooter } from './BrandSignatureFooter';
import { layout } from '../theme/spacing';
import { formatCurrency } from '../utils/currency';
import { GymMemberSummary } from '../types';

interface InPlacePastMembersViewProps {
  isDark?: boolean;
  onClose?: () => void;
}

export type PastMemberFilter = 'All' | 'Expired' | 'Cancelled' | 'Terminated' | 'Reclaimable';

const FILTER_OPTIONS: { id: PastMemberFilter; label: string; desc: string; icon: any; color: string }[] = [
  { id: 'All', label: 'All Past Members', desc: 'Complete offboarded & lapsed roster', icon: Users, color: '#3B82F6' },
  { id: 'Expired', label: 'Expired Memberships', desc: 'Lapsed subscriptions awaiting renewal', icon: Clock, color: '#EF4444' },
  { id: 'Reclaimable', label: 'Reclaimable (≤30 Days)', desc: 'High conversion win-back cohort', icon: Target, color: '#10B981' },
  { id: 'Cancelled', label: 'Voluntary Cancelled', desc: 'Member-initiated membership termination', icon: UserMinus, color: '#F59E0B' },
  { id: 'Terminated', label: 'System Terminated', desc: 'Policy or payment lapse closure', icon: AlertTriangle, color: '#64748B' },
];

export const InPlacePastMembersView: React.FC<InPlacePastMembersViewProps> = ({
  isDark = false,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  // Local-First Data Hooks
  const { members: allMembers, isLoading: isMembersLoading, refetch: refetchMembers } = useLocalMembers();
  const { plans, isLoading: isPlansLoading } = useLocalPlans({ activeOnly: true });

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<PastMemberFilter>('All');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Reactivate Plan Modal State
  const [memberToReactivate, setMemberToReactivate] = useState<GymMemberSummary | null>(null);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isReactivating, setIsReactivating] = useState(false);
  const reactivateBackdropAnim = useRef(new Animated.Value(0)).current;
  const reactivateTranslateY = useRef(new Animated.Value(750)).current;

  // View Profile Modal State
  const [selectedMemberForView, setSelectedMemberForView] = useState<GymMemberSummary | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const viewBackdropAnim = useRef(new Animated.Value(0)).current;
  const viewTranslateY = useRef(new Animated.Value(750)).current;

  // Delete Confirmation Modal State
  const [memberToDelete, setMemberToDelete] = useState<GymMemberSummary | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteBackdropAnim = useRef(new Animated.Value(0)).current;
  const deleteScaleAnim = useRef(new Animated.Value(0.95)).current;

  // Dropdown filter bottom sheet animation
  const filterBackdropAnim = useRef(new Animated.Value(0)).current;
  const filterTranslateY = useRef(new Animated.Value(500)).current;

  // ─────────────────────────────────────────────────────────────
  // 1. Process Past & Inactive / Expired Members (Exact Desktop Logic)
  // ─────────────────────────────────────────────────────────────
  const processedPastMembers = useMemo(() => {
    const now = Date.now();

    return allMembers
      .filter((m) => {
        const s = String(m.membershipStatus || '').toUpperCase();
        const isStatusPast =
          s === 'EXPIRED' ||
          s === 'CANCELLED' ||
          s === 'TERMINATED' ||
          s === 'INACTIVE';

        const isDateExpired = m.expiresAt ? new Date(m.expiresAt).getTime() < now : false;

        return isStatusPast || isDateExpired;
      })
      .map((m) => {
        // Calculate inactivity days
        let inactiveDays = 30;
        if (m.expiresAt) {
          const expTime = new Date(m.expiresAt).getTime();
          inactiveDays = Math.max(1, Math.floor((now - expTime) / (1000 * 60 * 60 * 24)));
        } else if (m.joinedAt) {
          const joinedTime = new Date(m.joinedAt).getTime();
          inactiveDays = Math.max(1, Math.floor((now - joinedTime) / (1000 * 60 * 60 * 24)));
        }

        // Potential Recovery Value
        let recoveryValue = 2000;
        if (plans.length > 0) {
          recoveryValue = parseFloat(plans[0].price) || 2000;
        }

        // Reason & Reactivation Winback Score
        let reason = 'Subscription Expired';
        let winbackScore: 'High' | 'Medium' | 'Low' = 'Medium';

        if (inactiveDays <= 30) {
          winbackScore = 'High';
          reason = 'Grace Period Renewal';
        } else if (inactiveDays <= 90) {
          winbackScore = 'Medium';
          reason = 'Subscription Lapsed';
        } else {
          winbackScore = 'Low';
          reason = 'Extended Inactivity';
        }

        if (String(m.membershipStatus || '').toUpperCase() === 'CANCELLED') {
          reason = 'Member Cancelled';
          winbackScore = 'Medium';
        }

        return {
          ...m,
          inactiveDays,
          recoveryValue,
          reason,
          winbackScore,
        };
      });
  }, [allMembers, plans]);

  // ─────────────────────────────────────────────────────────────
  // 2. Portfolio Overall Stats (StatTile Desktop Exact Replica)
  // ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = processedPastMembers.length;
    const recoveryPipeline = processedPastMembers.reduce((acc, m) => acc + m.recoveryValue, 0);
    const winbackCount = processedPastMembers.filter((m) => m.inactiveDays <= 30).length;
    const avgInactivity =
      total > 0 ? Math.round(processedPastMembers.reduce((acc, m) => acc + m.inactiveDays, 0) / total) : 0;

    return {
      total,
      recoveryPipeline,
      winbackCount,
      avgInactivity,
    };
  }, [processedPastMembers]);

  // ─────────────────────────────────────────────────────────────
  // 3. Filtered Past Members
  // ─────────────────────────────────────────────────────────────
  const filteredPastMembers = useMemo(() => {
    return processedPastMembers.filter((m) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        (m.memberCode && m.memberCode.toLowerCase().includes(q)) ||
        m.reason.toLowerCase().includes(q);

      const statusStr = String(m.membershipStatus || '').toUpperCase();
      const matchesFilter =
        selectedFilter === 'All' ||
        (selectedFilter === 'Expired' && (statusStr === 'EXPIRED' || (m.expiresAt && new Date(m.expiresAt).getTime() < Date.now()))) ||
        (selectedFilter === 'Reclaimable' && m.inactiveDays <= 30) ||
        (selectedFilter === 'Cancelled' && statusStr === 'CANCELLED') ||
        (selectedFilter === 'Terminated' && statusStr === 'TERMINATED');

      return matchesSearch && matchesFilter;
    });
  }, [processedPastMembers, search, selectedFilter]);

  // ─────────────────────────────────────────────────────────────
  // Modals Handlers
  // ─────────────────────────────────────────────────────────────
  const openFilterModal = () => {
    setIsFilterDropdownOpen(true);
    Animated.parallel([
      Animated.timing(filterBackdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(filterTranslateY, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start();
  };

  const closeFilterModal = () => {
    Animated.parallel([
      Animated.timing(filterBackdropAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(filterTranslateY, { toValue: 500, duration: 200, useNativeDriver: true }),
    ]).start(() => setIsFilterDropdownOpen(false));
  };

  const openReactivateModal = (member: GymMemberSummary) => {
    setMemberToReactivate(member);
    if (plans.length > 0) {
      setSelectedPlanId(plans[0].id);
    }
    setIsReactivateModalOpen(true);
    Animated.parallel([
      Animated.timing(reactivateBackdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(reactivateTranslateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const closeReactivateModal = () => {
    Animated.parallel([
      Animated.timing(reactivateBackdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(reactivateTranslateY, { toValue: 750, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setIsReactivateModalOpen(false);
      setMemberToReactivate(null);
    });
  };

  const openViewModal = (member: GymMemberSummary) => {
    setSelectedMemberForView(member);
    setIsViewModalOpen(true);
    Animated.parallel([
      Animated.timing(viewBackdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(viewTranslateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const closeViewModal = () => {
    Animated.parallel([
      Animated.timing(viewBackdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(viewTranslateY, { toValue: 750, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setIsViewModalOpen(false);
      setSelectedMemberForView(null);
    });
  };

  const openDeleteModal = (member: GymMemberSummary) => {
    setMemberToDelete(member);
    setIsDeleteModalOpen(true);
    Animated.parallel([
      Animated.timing(deleteBackdropAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.spring(deleteScaleAnim, { toValue: 1, friction: 9, tension: 100, useNativeDriver: true }),
    ]).start();
  };

  const closeDeleteModal = () => {
    Animated.parallel([
      Animated.timing(deleteBackdropAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(deleteScaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      setIsDeleteModalOpen(false);
      setMemberToDelete(null);
    });
  };

  // ─────────────────────────────────────────────────────────────
  // Reactivation Submission (Transition to ACTIVE with chosen plan)
  // ─────────────────────────────────────────────────────────────
  const handleReactivateSubmit = async () => {
    if (!memberToReactivate) return;
    const plan = plans.find((p) => p.id === selectedPlanId) || plans[0];
    const durationDays = plan?.durationDays || 30;

    setIsReactivating(true);
    try {
      const now = new Date();
      const newExpiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      if (isDatabaseOpen()) {
        await localMutationService.updateMember(memberToReactivate.id, {
          membershipStatus: 'ACTIVE',
          expiresAt: newExpiry,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['local-members'] });
      await refetchMembers();

      closeReactivateModal();
      if (isViewModalOpen) closeViewModal();

      Alert.alert(
        'Member Reactivated',
        `${memberToReactivate.fullName} has been successfully restored to Active membership on ${plan?.planName || 'Standard Plan'}.`
      );
    } catch (err: any) {
      Alert.alert('Reactivation Error', err?.message || 'Failed to reactivate member.');
    } finally {
      setIsReactivating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Delete Permanent Submission
  // ─────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);

    try {
      if (isDatabaseOpen()) {
        await localMutationService.deleteMember(memberToDelete.id);
      }
      queryClient.invalidateQueries({ queryKey: ['local-members'] });
      await refetchMembers();

      closeDeleteModal();
      if (isViewModalOpen) closeViewModal();

      Alert.alert('Record Purged', `${memberToDelete.fullName}'s archived file was permanently removed.`);
    } catch (err: any) {
      Alert.alert('Deletion Error', err?.message || 'Failed to delete record.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. EXECUTIVE FILLED HEADER CARD (Exact Directory Alignment)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.headerCard,
          {
            backgroundColor: isDark ? '#090D16' : '#0B1120',
            borderColor: '#1E293B',
          },
        ]}
      >
        {/* Subtle Watermark Brand Logo */}
        <View style={styles.watermarkLogo} pointerEvents="none">
          <Svg width={96} height={96} viewBox="0 0 24 24" fill="none">
            <Path
              d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
              stroke="#94A3B8"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.16}
            />
            <Circle cx="9" cy="7" r="4" stroke="#94A3B8" strokeWidth={1.8} opacity={0.16} />
            <Path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="#94A3B8" strokeWidth={1.8} opacity={0.16} />
            <Path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#94A3B8" strokeWidth={1.8} opacity={0.16} />
          </Svg>
        </View>

        <View style={styles.headerCardTop}>
          <View style={{ flex: 1, zIndex: 1 }}>
            <View style={styles.headerKickerRow}>
              <View style={styles.headerKickerPill}>
                <UserMinus size={11} color="#FB923C" strokeWidth={2.4} />
                <Text style={styles.headerOverline}>ARCHIVED & LAPSED VAULT</Text>
              </View>
            </View>
            <Text style={styles.headerTitle}>Past Members</Text>
            <Text style={styles.headerSubtitle}>
              Inactive, cancelled & expired accounts with win-back intelligence
            </Text>
          </View>
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. 4 PORTFOLIO KPI METRIC CARDS (Desktop StatTile Exact)      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View style={styles.kpiGrid}>
        {/* Card 1: Total Archived */}
        <View
          style={[
            styles.kpiCard,
            { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
          ]}
        >
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#F1F5F9' }]}>
              <Users size={14} color="#475569" strokeWidth={2.4} />
            </View>
            <Text style={[styles.kpiPillText, { color: '#64748B' }]}>VAULT</Text>
          </View>
          <Text style={[styles.kpiLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>TOTAL ARCHIVED</Text>
          <Text style={[styles.kpiValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
            {stats.total} <Text style={styles.kpiValueUnit}>Accounts</Text>
          </Text>
          <Text style={[styles.kpiSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Offboarded client records
          </Text>
        </View>

        {/* Card 2: Recovery Pipeline */}
        <View
          style={[
            styles.kpiCard,
            { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
          ]}
        >
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#ECFDF5' }]}>
              <DollarSign size={14} color="#059669" strokeWidth={2.4} />
            </View>
            <Text style={[styles.kpiPillText, { color: '#059669' }]}>PIPELINE</Text>
          </View>
          <Text style={[styles.kpiLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>RECOVERY PIPELINE</Text>
          <Text style={[styles.kpiValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
            {formatCurrency(stats.recoveryPipeline)}
          </Text>
          <Text style={[styles.kpiSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Potential win-back revenue
          </Text>
        </View>

        {/* Card 3: Reclaimable Cohorts (<= 30 Days) */}
        <View
          style={[
            styles.kpiCard,
            { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
          ]}
        >
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#EEF2FF' }]}>
              <Target size={14} color="#4F46E5" strokeWidth={2.4} />
            </View>
            <Text style={[styles.kpiPillText, { color: '#4F46E5' }]}>COHORTS</Text>
          </View>
          <Text style={[styles.kpiLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>RECLAIMABLE</Text>
          <Text style={[styles.kpiValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
            {stats.winbackCount} <Text style={styles.kpiValueUnit}>Members</Text>
          </Text>
          <Text style={[styles.kpiSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Lapsed ≤ 30 Days (High win)
          </Text>
        </View>

        {/* Card 4: Inactivity Duration */}
        <View
          style={[
            styles.kpiCard,
            { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
          ]}
        >
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#FFFBEB' }]}>
              <Clock size={14} color="#D97706" strokeWidth={2.4} />
            </View>
            <Text style={[styles.kpiPillText, { color: '#D97706' }]}>AVG AGE</Text>
          </View>
          <Text style={[styles.kpiLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>INACTIVITY DURATION</Text>
          <Text style={[styles.kpiValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
            {stats.avgInactivity} <Text style={styles.kpiValueUnit}>Days</Text>
          </Text>
          <Text style={[styles.kpiSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Average offboarding age
          </Text>
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. SEARCH & FILTER ROW (Identical To Member Directory)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View style={styles.searchFilterRow}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <Search size={16} color={isDark ? '#64748B' : '#94A3B8'} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
            placeholder="Search past member, phone, reason..."
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={14} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.filterTriggerBtn,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: selectedFilter !== 'All' ? '#F97316' : isDark ? '#334155' : '#E2E8F0',
            },
          ]}
          onPress={openFilterModal}
          activeOpacity={0.8}
        >
          <View style={styles.filterTriggerInner}>
            <Filter
              size={15}
              color={selectedFilter !== 'All' ? '#F97316' : isDark ? '#CBD5E1' : '#334155'}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.filterTriggerText,
                {
                  color: selectedFilter !== 'All' ? '#EA580C' : isDark ? '#FFFFFF' : '#0F172A',
                  fontWeight: selectedFilter !== 'All' ? '800' : '700',
                },
              ]}
              numberOfLines={1}
            >
              {selectedFilter === 'All' ? 'Filter' : selectedFilter}
            </Text>
            <ChevronDown size={14} color={selectedFilter !== 'All' ? '#EA580C' : '#94A3B8'} strokeWidth={2.4} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Filter Dropdown Modal (Bottom Sheet) */}
      <Modal visible={isFilterDropdownOpen} transparent animationType="none" onRequestClose={closeFilterModal}>
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
              <View style={styles.dragHandleBar}>
                <View style={[styles.dragHandle, { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]} />
              </View>

              <View style={styles.dropdownHeaderRow}>
                <View>
                  <Text style={styles.dropdownKicker}>VAULT CLASSIFICATION</Text>
                  <Text style={[styles.dropdownTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    Filter Past Records
                  </Text>
                </View>
                <TouchableOpacity onPress={closeFilterModal} style={styles.dropdownCloseBtn}>
                  <X size={16} color={isDark ? '#CBD5E1' : '#64748B'} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>

              <View style={styles.filterOptionsList}>
                {FILTER_OPTIONS.map((opt) => {
                  const isSelected = selectedFilter === opt.id;
                  const IconComp = opt.icon;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => {
                        setSelectedFilter(opt.id);
                        closeFilterModal();
                      }}
                      style={[
                        styles.filterOptionItem,
                        {
                          backgroundColor: isSelected
                            ? isDark ? '#1E293B' : '#FFF7ED'
                            : 'transparent',
                          borderColor: isSelected ? '#F97316' : isDark ? '#1E293B' : '#F1F5F9',
                        },
                      ]}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.filterOptionIconWrap, { backgroundColor: `${opt.color}18` }]}>
                        <IconComp size={16} color={opt.color} strokeWidth={2.4} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text
                          style={[
                            styles.filterOptionLabel,
                            { color: isSelected ? '#EA580C' : isDark ? '#FFFFFF' : '#0F172A' },
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text style={[styles.filterOptionDesc, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                          {opt.desc}
                        </Text>
                      </View>
                      {isSelected && <Check size={16} color="#EA580C" strokeWidth={2.6} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. PAST MEMBERS ROSTER LIST                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isMembersLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#F97316" />
          <Text style={[styles.loadingText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Loading archived past members...
          </Text>
        </View>
      ) : filteredPastMembers.length === 0 ? (
        <View
          style={[
            styles.emptyContainer,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <UserMinus size={36} color={isDark ? '#475569' : '#CBD5E1'} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
            No Past Members Found
          </Text>
          <Text style={[styles.emptySubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {search
              ? `No archived members match "${search}".`
              : 'All members currently in good standing or no expired records in this view.'}
          </Text>
        </View>
      ) : (
        <View style={styles.membersList}>
          {filteredPastMembers.map((member) => {
            const winbackColor =
              member.winbackScore === 'High'
                ? '#10B981'
                : member.winbackScore === 'Medium'
                ? '#F59E0B'
                : '#94A3B8';

            const winbackBg =
              member.winbackScore === 'High'
                ? '#ECFDF5'
                : member.winbackScore === 'Medium'
                ? '#FFFBEB'
                : '#F1F5F9';

            return (
              <View
                key={member.id}
                style={[
                  styles.memberCard,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                {/* Top Row: Avatar + Name/Code + Winback Badge */}
                <View style={styles.memberTopRow}>
                  <TouchableOpacity
                    onPress={() => openViewModal(member)}
                    activeOpacity={0.8}
                    style={{ borderRadius: 21 }}
                  >
                    <Avatar
                      name={member.fullName}
                      photoUrl={member.profilePhotoUrl}
                      gender={(member as any).gender}
                      size="md"
                      showStatusDot={false}
                    />
                  </TouchableOpacity>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.memberName, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                      {member.fullName}
                    </Text>
                    <Text style={[styles.memberCode, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      {member.memberCode} · Inactive for {member.inactiveDays} Days
                    </Text>
                  </View>

                  {/* Win-back Likelihood Badge */}
                  <View style={[styles.winbackBadge, { backgroundColor: winbackBg }]}>
                    <Text style={[styles.winbackBadgeText, { color: winbackColor }]}>
                      {member.winbackScore} WINBACK
                    </Text>
                  </View>
                </View>

                {/* Info Bar: Reason + Potential Revenue */}
                <View style={[styles.infoBar, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      STATUS / REASON:
                    </Text>
                    <Text style={[styles.infoValue, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                      {member.reason}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.infoLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      RECOVERY POTENTIAL:
                    </Text>
                    <Text style={[styles.recoveryValueText, { color: '#10B981' }]}>
                      {formatCurrency(member.recoveryValue)}
                    </Text>
                  </View>
                </View>

                {/* Bottom Actions Row: Reactivate, Dossier, Quick Call, Delete */}
                <View style={[styles.actionsRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                  {/* Reactivate Button (Primary Action) */}
                  <TouchableOpacity
                    style={styles.reactivateBtn}
                    onPress={() => openReactivateModal(member)}
                    activeOpacity={0.85}
                  >
                    <RotateCcw size={13} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.reactivateBtnText}>Reactivate</Text>
                  </TouchableOpacity>

                  {/* View Dossier Button */}
                  <TouchableOpacity
                    style={[
                      styles.actionIconBtn,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                    onPress={() => openViewModal(member)}
                    activeOpacity={0.8}
                  >
                    <Eye size={14} color={isDark ? '#CBD5E1' : '#475569'} strokeWidth={2.2} />
                  </TouchableOpacity>

                  {/* Phone Call Button */}
                  {member.phone ? (
                    <TouchableOpacity
                      style={[
                        styles.actionIconBtn,
                        {
                          backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                          borderColor: isDark ? '#334155' : '#E2E8F0',
                        },
                      ]}
                      onPress={() => Linking.openURL(`tel:${member.phone}`)}
                      activeOpacity={0.8}
                    >
                      <Phone size={14} color="#059669" strokeWidth={2.2} />
                    </TouchableOpacity>
                  ) : null}

                  {/* Delete Button */}
                  <TouchableOpacity
                    style={[
                      styles.actionDeleteBtn,
                      {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                        borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
                      },
                    ]}
                    onPress={() => openDeleteModal(member)}
                    activeOpacity={0.8}
                  >
                    <Trash2 size={13} color="#EF4444" strokeWidth={2.2} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. REACTIVATE MEMBER MODAL (Plan Selection Sheet)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal visible={isReactivateModalOpen} transparent animationType="none" onRequestClose={closeReactivateModal}>
        <View style={styles.modalRoot}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: reactivateBackdropAnim, backgroundColor: 'rgba(0, 0, 0, 0.52)' },
            ]}
          >
            <TouchableWithoutFeedback onPress={closeReactivateModal}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
          </Animated.View>

          <Animated.View
            style={[
              styles.reactivateSheetContainer,
              { transform: [{ translateY: reactivateTranslateY }] },
            ]}
            pointerEvents="box-none"
          >
            <View
              style={[
                styles.reactivateSheet,
                {
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              {/* Drag Handle */}
              <View style={styles.dragHandleBar}>
                <View style={[styles.dragHandle, { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]} />
              </View>

              {/* Header with 5px curved square close button on right */}
              <View style={[styles.detailsHeaderRow, { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.reactivateKicker}>MEMBERSHIP RESTORATION</Text>
                  <Text style={[styles.detailsTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                    Reactivate {memberToReactivate?.fullName}
                  </Text>
                  <Text style={[styles.detailsSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Select renewal plan to immediately restore active gym privileges
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={closeReactivateModal}
                  style={[
                    styles.squareCloseBtn,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={15} color={isDark ? '#CBD5E1' : '#64748B'} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 24, paddingTop: 14 }}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[styles.planSelectHeading, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                  CHOOSE RENEWAL PLAN TIER
                </Text>

                <View style={styles.plansSelectionList}>
                  {plans.map((p) => {
                    const isSelected = selectedPlanId === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => setSelectedPlanId(p.id)}
                        style={[
                          styles.planOptionCard,
                          {
                            backgroundColor: isSelected
                              ? isDark ? '#1E293B' : '#FFF7ED'
                              : isDark ? '#0F172A' : '#F8FAFC',
                            borderColor: isSelected ? '#EA580C' : isDark ? '#334155' : '#E2E8F0',
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.planOptionTitle,
                              { color: isSelected ? '#EA580C' : isDark ? '#FFFFFF' : '#0F172A' },
                            ]}
                          >
                            {p.planName}
                          </Text>
                          <Text style={[styles.planOptionDuration, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                            {p.durationDays} Days Access {p.benefits ? `· ${p.benefits}` : ''}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                          <Text style={[styles.planOptionPrice, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                            {formatCurrency(p.price)}
                          </Text>
                          {isSelected && (
                            <View style={styles.planSelectedBadge}>
                              <Check size={11} color="#FFFFFF" strokeWidth={3} />
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Bottom Submit Bar */}
              <View
                style={[
                  styles.detailsFooterBar,
                  {
                    borderTopColor: isDark ? '#1E293B' : '#F1F5F9',
                    paddingBottom: Math.max(insets.bottom, 16),
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.formCancelBtn,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                  onPress={closeReactivateModal}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.formCancelBtnText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.formSaveBtn}
                  onPress={handleReactivateSubmit}
                  disabled={isReactivating}
                  activeOpacity={0.85}
                >
                  {isReactivating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <RotateCcw size={14} color="#FFFFFF" strokeWidth={2.4} />
                      <Text style={styles.formSaveBtnText}>Confirm Reactivation</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. PAST MEMBER DOSSIER MODAL                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal visible={isViewModalOpen} transparent animationType="none" onRequestClose={closeViewModal}>
        <View style={styles.modalRoot}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: viewBackdropAnim, backgroundColor: 'rgba(0, 0, 0, 0.52)' },
            ]}
          >
            <TouchableWithoutFeedback onPress={closeViewModal}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
          </Animated.View>

          <Animated.View
            style={[
              styles.reactivateSheetContainer,
              { transform: [{ translateY: viewTranslateY }] },
            ]}
            pointerEvents="box-none"
          >
            <View
              style={[
                styles.reactivateSheet,
                {
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.dragHandleBar}>
                <View style={[styles.dragHandle, { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]} />
              </View>

              <View style={[styles.detailsHeaderRow, { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.detailsKicker}>ARCHIVED DOSSIER</Text>
                  <Text style={[styles.detailsTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                    {selectedMemberForView?.fullName}
                  </Text>
                  <Text style={[styles.detailsSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Member Code: {selectedMemberForView?.memberCode}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={closeViewModal}
                  style={[
                    styles.squareCloseBtn,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={15} color={isDark ? '#CBD5E1' : '#64748B'} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 24, paddingTop: 14 }}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.dossierRow}>
                  <Text style={[styles.dossierLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>PHONE</Text>
                  <Text style={[styles.dossierValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {selectedMemberForView?.phone || 'Not Recorded'}
                  </Text>
                </View>

                <View style={styles.dossierRow}>
                  <Text style={[styles.dossierLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>EMAIL</Text>
                  <Text style={[styles.dossierValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {selectedMemberForView?.email || 'None'}
                  </Text>
                </View>

                <View style={styles.dossierRow}>
                  <Text style={[styles.dossierLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>GENDER</Text>
                  <Text style={[styles.dossierValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {(selectedMemberForView as any)?.gender || 'Unspecified'}
                  </Text>
                </View>

                <View style={styles.dossierRow}>
                  <Text style={[styles.dossierLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>JOINED AT</Text>
                  <Text style={[styles.dossierValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {selectedMemberForView?.joinedAt
                      ? new Date(selectedMemberForView.joinedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </Text>
                </View>

                <View style={styles.dossierRow}>
                  <Text style={[styles.dossierLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>EXPIRED AT</Text>
                  <Text style={[styles.dossierValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {selectedMemberForView?.expiresAt
                      ? new Date(selectedMemberForView.expiresAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </Text>
                </View>

                {selectedMemberForView?.notes ? (
                  <View style={[styles.dossierRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                    <Text style={[styles.dossierLabel, { color: isDark ? '#94A3B8' : '#64748B', marginBottom: 4 }]}>
                      NOTES & BIOMETRICS
                    </Text>
                    <Text style={[styles.dossierValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                      {selectedMemberForView.notes}
                    </Text>
                  </View>
                ) : null}
              </ScrollView>

              <View
                style={[
                  styles.detailsFooterBar,
                  {
                    borderTopColor: isDark ? '#1E293B' : '#F1F5F9',
                    paddingBottom: Math.max(insets.bottom, 16),
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.detailsDeleteBtn,
                    {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
                    },
                  ]}
                  onPress={() => {
                    const target = selectedMemberForView;
                    closeViewModal();
                    if (target) setTimeout(() => openDeleteModal(target), 200);
                  }}
                  activeOpacity={0.8}
                >
                  <Trash2 size={14} color="#EF4444" strokeWidth={2.2} />
                  <Text style={styles.detailsDeleteBtnText}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailsEditBtn}
                  onPress={() => {
                    const target = selectedMemberForView;
                    closeViewModal();
                    if (target) setTimeout(() => openReactivateModal(target), 200);
                  }}
                  activeOpacity={0.85}
                >
                  <RotateCcw size={14} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.detailsEditBtnText}>Reactivate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. SETUP GUIDE STYLE: CONFIRM PERMANENT PURGE MODAL           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal visible={isDeleteModalOpen} transparent animationType="none" onRequestClose={closeDeleteModal}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: deleteBackdropAnim,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 20,
            },
          ]}
        >
          <TouchableWithoutFeedback onPress={closeDeleteModal}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.deleteDialogContainer,
              {
                transform: [{ scale: deleteScaleAnim }],
                width: '100%',
                maxWidth: 390,
              },
            ]}
          >
            <View
              style={[
                styles.deleteDialogCard,
                {
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              {/* 5px curved square close button on top right */}
              <TouchableOpacity
                onPress={closeDeleteModal}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.deleteRightCloseBtn,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                <X size={15} color={isDark ? '#CBD5E1' : '#64748B'} strokeWidth={2.4} />
              </TouchableOpacity>

              {/* Warning Kicker */}
              <View style={styles.deleteKickerRow}>
                <View style={styles.deleteKickerBadge}>
                  <AlertTriangle size={12} color="#DC2626" strokeWidth={2.6} />
                  <Text style={styles.deleteKickerText}>CONFIRM ACTION</Text>
                </View>
              </View>

              <Text style={[styles.deleteTitle, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                Purge Archived Record
              </Text>

              <Text style={[styles.deleteSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Are you sure you want to permanently delete{' '}
                <Text style={{ fontWeight: '900', color: isDark ? '#FFFFFF' : '#0F172A' }}>
                  "{memberToDelete?.fullName || 'this member'}"
                </Text>
                ? All historical profiles and check-in records will be purged.
              </Text>

              {/* Action Buttons */}
              <View style={styles.deleteActionsRow}>
                <TouchableOpacity
                  style={[
                    styles.deleteCancelBtn,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                  onPress={closeDeleteModal}
                  activeOpacity={0.8}
                  disabled={isDeleting}
                >
                  <Text style={[styles.deleteCancelBtnText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteConfirmBtn}
                  onPress={handleConfirmDelete}
                  activeOpacity={0.85}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Trash2 size={14} color="#FFFFFF" strokeWidth={2.4} />
                      <Text style={styles.deleteConfirmBtnText}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Brand Signature Footer with ample bottom clearance */}
      <View style={{ marginTop: 28, marginBottom: 16 }}>
        <BrandSignatureFooter isDark={isDark} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: layout.bottomNavHeight + 64,
  },
  /* Header Card */
  headerCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 20,
    minHeight: 96,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  watermarkLogo: {
    position: 'absolute',
    right: 6,
    bottom: -8,
  },
  headerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerKickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerOverline: {
    color: '#FB923C',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 3,
  },

  /* 4 KPI Grid */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    width: '48.5%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    minHeight: 104,
    justifyContent: 'space-between',
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  kpiIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  kpiValueUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  kpiSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3,
  },

  /* Search & Filter Row */
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 0,
  },
  filterTriggerBtn: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  filterTriggerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterTriggerText: {
    fontSize: 12.5,
  },

  /* List & Members Card */
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  emptyContainer: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  memberTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  memberCode: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
  winbackBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  winbackBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  infoLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  recoveryValueText: {
    fontSize: 13.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  reactivateBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#EA580C',
  },
  reactivateBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  actionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDeleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Modals Shared */
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dragHandleBar: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  squareCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Dropdown Filter Sheet */
  dropdownSheetContainer: {
    justifyContent: 'flex-end',
  },
  dropdownSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 36,
  },
  dropdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 14,
  },
  dropdownKicker: {
    fontSize: 10,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 1,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  dropdownCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptionsList: {
    gap: 6,
  },
  filterOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterOptionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptionLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  filterOptionDesc: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },

  /* Reactivate Sheet */
  reactivateSheetContainer: {
    height: '75%',
    justifyContent: 'flex-end',
  },
  reactivateSheet: {
    height: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  reactivateKicker: {
    fontSize: 10,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 1.2,
  },
  detailsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  detailsKicker: {
    fontSize: 10,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 1.2,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  detailsSubtitle: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  planSelectHeading: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  plansSelectionList: {
    gap: 8,
  },
  planOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  planOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  planOptionDuration: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  planOptionPrice: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  planSelectedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  detailsFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  formCancelBtn: {
    flex: 0.8,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  formSaveBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EA580C',
  },
  formSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  detailsDeleteBtn: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  detailsDeleteBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
  detailsEditBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0F172A',
  },
  detailsEditBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  /* Dossier */
  dossierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dossierLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  dossierValue: {
    fontSize: 13,
    fontWeight: '700',
  },

  /* Setup Guide Delete Confirmation Dialog */
  deleteDialogContainer: {
    alignItems: 'center',
  },
  deleteDialogCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 20,
    position: 'relative',
  },
  deleteRightCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  deleteKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteKickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  deleteKickerText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  deleteTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  deleteSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    marginBottom: 14,
  },
  deleteActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteCancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deleteConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 40,
    borderRadius: 9,
    backgroundColor: '#DC2626',
  },
  deleteConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default InPlacePastMembersView;
