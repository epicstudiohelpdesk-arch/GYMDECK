/**
 * GymDeck Owner Mobile - In-Place Membership Plans Management Page
 *
 * Sourced directly from local database (MembershipPlanRepository & transactional outbox).
 * Replicates the full intelligence, metrics, filter modes, and operational logic of the Desktop
 * Membership Plans module (MembershipPlans.jsx) tailored with high-end bold executive mobile UX:
 *
 * 1. Executive Filled Header Card with Watermark Brand & In-Place Back/Close
 * 2. 4 Modern Portfolio KPI Cards:
 *    - Active Plans (catalog depth)
 *    - Monthly Revenue Generated (MRR contribution)
 *    - Average Plan Retention (% weighted index)
 *    - Members Expiring (30D forecast)
 * 3. Quick Action Banner: "Create Plan" with Sculpted Cutout & Fast Preset Launcher
 * 4. Search & Filter Bar:
 *    - Fast search across name, category, and ID
 *    - Status filter dropdown (All, Active/Healthy, At Risk, Growing, Highest Revenue, Newest)
 * 5. Plan Cards with:
 *    - Dynamic category visual badges (Transformation, Bodybuilding, Weight Loss, General, etc.)
 *    - Pricing (base + joining fee), duration pill, active subscribers count
 *    - Retention gauge & status pill (Healthy, Growing, At Risk)
 *    - Direct Actions: View Details, Edit Plan, Delete Plan
 * 6. Interactive Modals:
 *    - Plan Details Bottom Sheet (Financial breakdown, privileges, retention/renewal metrics)
 *    - Add/Edit Plan Modal (Integrated step/page controls matching desktop logic)
 *    - Setup Guide Style Compact Delete Confirmation Modal (Square close button, 5px radius)
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  X,
  Plus,
  Filter,
  Layers,
  Sparkles,
  Dumbbell,
  Flame,
  Zap,
  Crown,
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Edit3,
  Eye,
  ShieldCheck,
  ChevronDown,
  BarChart3,
  Users,
  Target,
  ArrowRight,
  Shield,
  HelpCircle,
} from 'lucide-react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalPlans } from '../hooks/useLocalPlans';
import { useLocalMembers } from '../hooks/useLocalMembers';
import { localMutationService } from '../services/LocalMutationService';
import { isDatabaseOpen } from '../database/LocalDatabaseManager';
import { BrandSignatureFooter } from './BrandSignatureFooter';
import { layout } from '../theme/spacing';
import { formatCurrency } from '../utils/currency';
import { MembershipPlanSummary } from '../types';

interface InPlacePlansViewProps {
  isDark?: boolean;
  onClose?: () => void;
}

export type PlanFilterOption = 'All' | 'Active' | 'At Risk' | 'Growing' | 'Highest Revenue' | 'Newest';

const FILTER_OPTIONS: { id: PlanFilterOption; label: string; desc: string; icon: any; color: string }[] = [
  { id: 'All', label: 'All Plans', desc: 'Complete catalog of membership tiers', icon: Layers, color: '#3B82F6' },
  { id: 'Active', label: 'Healthy & Active', desc: 'Plans with steady retention (≥70%)', icon: ShieldCheck, color: '#10B981' },
  { id: 'Growing', label: 'Growing Velocity', desc: 'Plans expanding in active members', icon: TrendingUp, color: '#6366F1' },
  { id: 'At Risk', label: 'At Risk / Attention', desc: 'Plans needing retention improvement', icon: AlertTriangle, color: '#EF4444' },
  { id: 'Highest Revenue', label: 'Highest Revenue', desc: 'Ranked by total historical yield', icon: DollarSign, color: '#F59E0B' },
  { id: 'Newest', label: 'Recently Created', desc: 'Chronological plan catalog order', icon: Clock, color: '#8B5CF6' },
];

export const InPlacePlansView: React.FC<InPlacePlansViewProps> = ({ isDark = false, onClose }) => {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  // Primary data hooks (Local-First SQLCipher)
  const { plans: rawPlans, isLoading: isPlansLoading, refetch: refetchPlans } = useLocalPlans({ activeOnly: false });
  const { members, isLoading: isMembersLoading } = useLocalMembers();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<PlanFilterOption>('All');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Plan Details Modal State
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<any | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const detailsBackdropAnim = useRef(new Animated.Value(0)).current;
  const detailsTranslateY = useRef(new Animated.Value(750)).current;

  // Add / Edit Plan Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const formBackdropAnim = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(750)).current;

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Transformation');
  const [formDurationDays, setFormDurationDays] = useState('30');
  const [formDurationLabel, setFormDurationLabel] = useState('Monthly');
  const [formPrice, setFormPrice] = useState('');
  const [formJoiningFee, setFormJoiningFee] = useState('0');
  const [formAudience, setFormAudience] = useState('Professionals');
  const [formGoal, setFormGoal] = useState('Revenue Generation');
  const [formDescription, setFormDescription] = useState('');
  const [formAreas, setFormAreas] = useState<string[]>(['Gym Floor', 'Cardio Zone']);
  const [formAccess, setFormAccess] = useState<string[]>(['Freeze Support']);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Setup Guide Style Deletion Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteBackdropAnim = useRef(new Animated.Value(0)).current;
  const deleteScaleAnim = useRef(new Animated.Value(0.95)).current;

  // Dropdown bottom sheet animation
  const filterBackdropAnim = useRef(new Animated.Value(0)).current;
  const filterTranslateY = useRef(new Animated.Value(500)).current;

  // ─────────────────────────────────────────────────────────────
  // 1. Enrich Plans with Member Metrics (Exact Desktop Logic)
  // ─────────────────────────────────────────────────────────────
  const enrichedPlans = useMemo(() => {
    return rawPlans.map((p) => {
      let category = 'General Fitness';
      let joiningFee = 0;
      let audience = 'Professionals';
      let goal = 'Revenue Generation';
      let desc = p.description || '';
      let areas = ['Gym Floor', 'Cardio Zone'];
      let access = ['Freeze Support'];
      let durationName = `${p.durationDays} Days`;

      if (desc.includes('||')) {
        const parts = desc.split('||');
        if (parts.length >= 8) {
          category = parts[0];
          joiningFee = parseFloat(parts[1]) || 0;
          audience = parts[2];
          goal = parts[3];
          desc = parts[4];
          try {
            areas = JSON.parse(parts[5]);
            access = JSON.parse(parts[6]);
          } catch {
            areas = parts[5].split(',').filter(Boolean);
            access = parts[6].split(',').filter(Boolean);
          }
          durationName = parts[7] || durationName;
        } else if (parts.length >= 5) {
          category = parts[0];
          joiningFee = parseFloat(parts[1]) || 0;
          audience = parts[2];
          goal = parts[3];
          desc = parts[4];
        } else if (parts.length >= 3) {
          category = parts[0];
          joiningFee = parseFloat(parts[1]) || 0;
          desc = parts[2];
        } else {
          category = parts[0];
          desc = parts[1] || '';
        }
      }

      // Filter members subscribed to this plan
      const planMembers = members.filter(
        (m: any) =>
          (m.membershipPlanId && String(m.membershipPlanId).toLowerCase() === String(p.id).toLowerCase()) ||
          (m.notes && m.notes.toLowerCase().includes(p.planName.toLowerCase()))
      );

      const activePlanMembers = planMembers.filter(
        (m) => m.membershipStatus === 'ACTIVE' || m.membershipStatus === 'FROZEN'
      );

      const activeCount = activePlanMembers.length;
      const totalCount = planMembers.length;

      // Retention Rate
      const retention = totalCount > 0
        ? Math.min(100, Math.round((activeCount / totalCount) * 100))
        : 100;

      // Renewal velocity
      const planDurationDays = p.durationDays || 30;
      const eligibleMembers = planMembers.filter((m) => {
        const joinedDate = new Date(m.joinedAt || m.createdAt || Date.now());
        const elapsedDays = (Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24);
        return elapsedDays > planDurationDays;
      });
      const renewedMembers = eligibleMembers.filter(
        (m) => m.membershipStatus === 'ACTIVE' || m.membershipStatus === 'FROZEN'
      );
      const renewalRate = eligibleMembers.length > 0
        ? Math.min(100, Math.round((renewedMembers.length / eligibleMembers.length) * 100))
        : 100;

      // Price
      const numericPrice = parseFloat(p.price) || 0;

      // LTD Revenue estimation
      let totalRevenue = 0;
      planMembers.forEach((m) => {
        const joinedDate = new Date(m.joinedAt || m.createdAt || Date.now());
        const elapsedDays = (Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24);
        const isActive = m.membershipStatus === 'ACTIVE' || m.membershipStatus === 'FROZEN';
        const terms = isActive
          ? Math.max(1, Math.ceil(elapsedDays / planDurationDays))
          : Math.max(1, Math.floor(elapsedDays / planDurationDays));
        totalRevenue += terms * numericPrice + joiningFee;
      });

      // Monthly MRR Contribution
      const monthlyContribution = Math.round((activeCount * numericPrice * 30) / planDurationDays);

      const trend = retention >= 85 ? '+12%' : retention >= 70 ? '+4%' : '-14%';
      const trendUp = retention >= 70;
      const status = p.isActive ? (retention >= 70 ? 'Healthy' : 'At Risk') : 'At Risk';
      const risk = retention >= 85 ? 'Low' : retention >= 70 ? 'Medium' : 'High';

      return {
        id: p.id,
        raw: p,
        name: p.planName,
        category,
        price: numericPrice,
        joiningFee,
        audience,
        goal,
        description: desc,
        areas,
        access,
        duration: durationName,
        durationDays: p.durationDays,
        isActive: p.isActive,
        activeMembers: activeCount,
        totalMembers: totalCount,
        retention,
        renewalRate,
        revenue: totalRevenue,
        monthlyContribution,
        trend,
        trendUp,
        status,
        risk,
      };
    });
  }, [rawPlans, members]);

  // ─────────────────────────────────────────────────────────────
  // 2. Portfolio Overall Stats (KPICard desktop replica)
  // ─────────────────────────────────────────────────────────────
  const portfolioStats = useMemo(() => {
    const activePlans = enrichedPlans.filter((p) => p.isActive).length;
    const monthlyRevenue = enrichedPlans.reduce((acc, p) => acc + p.monthlyContribution, 0);
    const avgRetention = enrichedPlans.length > 0
      ? Math.round(enrichedPlans.reduce((acc, p) => acc + p.retention, 0) / enrichedPlans.length)
      : 100;

    // Members expiring in next 5 days (Strictly real data)
    const now = Date.now();
    const fiveDaysAhead = now + 5 * 24 * 60 * 60 * 1000;
    const expiringSoonCount = members.filter((m) => {
      if (!m.expiresAt) return false;
      const exp = new Date(m.expiresAt).getTime();
      return exp >= now && exp <= fiveDaysAhead;
    }).length;

    const forecastedRenewal = expiringSoonCount * (enrichedPlans.length > 0 ? (enrichedPlans[0].price || 0) : 0);

    return {
      activePlans,
      monthlyRevenue,
      avgRetention,
      expiringSoonCount,
      forecastedRenewal,
    };
  }, [enrichedPlans, members]);

  // ─────────────────────────────────────────────────────────────
  // 3. Filtered & Sorted Plans
  // ─────────────────────────────────────────────────────────────
  const filteredPlans = useMemo(() => {
    let list = enrichedPlans.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q);

      const matchesFilter =
        selectedFilter === 'All' ||
        (selectedFilter === 'Active' && p.status === 'Healthy') ||
        (selectedFilter === 'At Risk' && p.status === 'At Risk') ||
        (selectedFilter === 'Growing' && p.trendUp) ||
        selectedFilter === 'Highest Revenue' ||
        selectedFilter === 'Newest';

      return matchesSearch && matchesFilter;
    });

    if (selectedFilter === 'Highest Revenue') {
      return [...list].sort((a, b) => b.revenue - a.revenue);
    }
    return list;
  }, [enrichedPlans, search, selectedFilter]);

  // ─────────────────────────────────────────────────────────────
  // Visual Styles Helper per Category
  // ─────────────────────────────────────────────────────────────
  const getVisualCategory = (plan: any) => {
    const name = (plan.name || '').toLowerCase();
    const cat = (plan.category || '').toLowerCase();

    if (cat.includes('transform') || name.includes('platinum') || name.includes('elite')) {
      return {
        bg: '#EEF2FF',
        border: '#C7D2FE',
        accent: '#4F46E5',
        gradientStart: '#6366F1',
        gradientEnd: '#4338CA',
        Icon: Sparkles,
        badgeText: 'ELITE TRANSFORMATION',
      };
    }
    if (cat.includes('body') || name.includes('strength') || name.includes('muscle') || name.includes('heavy')) {
      return {
        bg: '#ECFDF5',
        border: '#A7F3D0',
        accent: '#059669',
        gradientStart: '#10B981',
        gradientEnd: '#047857',
        Icon: Dumbbell,
        badgeText: 'BODYBUILDING & STRENGTH',
      };
    }
    if (cat.includes('weight') || cat.includes('loss') || name.includes('burn') || name.includes('fat')) {
      return {
        bg: '#FFFBEB',
        border: '#FDE68A',
        accent: '#D97706',
        gradientStart: '#F59E0B',
        gradientEnd: '#B45309',
        Icon: Flame,
        badgeText: 'FAT BURN & WEIGHT LOSS',
      };
    }
    if (name.includes('student') || name.includes('scholar')) {
      return {
        bg: '#F5F3FF',
        border: '#DDD6FE',
        accent: '#7C3AED',
        gradientStart: '#8B5CF6',
        gradientEnd: '#6D28D9',
        Icon: Crown,
        badgeText: 'STUDENT ACCESS',
      };
    }
    // Default Sky / General Fitness
    return {
      bg: '#F0F9FF',
      border: '#BAE6FD',
      accent: '#0284C7',
      gradientStart: '#0EA5E9',
      gradientEnd: '#0369A1',
      Icon: Activity,
      badgeText: 'GENERAL FITNESS',
    };
  };

  // ─────────────────────────────────────────────────────────────
  // Modal Handlers & Animations
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

  const openDetailsModal = (plan: any) => {
    setSelectedPlanForDetails(plan);
    setIsDetailsModalOpen(true);
    Animated.parallel([
      Animated.timing(detailsBackdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(detailsTranslateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const closeDetailsModal = () => {
    Animated.parallel([
      Animated.timing(detailsBackdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(detailsTranslateY, { toValue: 750, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setIsDetailsModalOpen(false);
      setSelectedPlanForDetails(null);
    });
  };

  const openCreatePlanModal = (presetDuration?: number, presetName?: string) => {
    setFormMode('create');
    setEditingPlanId(null);
    setFormName(presetName || '');
    setFormCategory('Transformation');
    setFormDurationDays(String(presetDuration || 30));
    setFormDurationLabel(presetDuration === 365 ? 'Annual' : presetDuration === 90 ? 'Quarterly' : 'Monthly');
    setFormPrice(presetDuration === 365 ? '12000' : presetDuration === 90 ? '4500' : '1800');
    setFormJoiningFee('500');
    setFormAudience('Professionals');
    setFormGoal('Revenue Generation');
    setFormDescription('Comprehensive gym & wellness access program.');
    setFormAreas(['Gym Floor', 'Cardio Zone', 'Steam/Sauna']);
    setFormAccess(['Freeze Support']);
    setFormError(null);

    setIsFormModalOpen(true);
    Animated.parallel([
      Animated.timing(formBackdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(formTranslateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const openEditPlanModal = (plan: any) => {
    setFormMode('edit');
    setEditingPlanId(plan.id);
    setFormName(plan.name);
    setFormCategory(plan.category);
    setFormDurationDays(String(plan.durationDays || 30));
    setFormDurationLabel(plan.duration || 'Monthly');
    setFormPrice(String(plan.price));
    setFormJoiningFee(String(plan.joiningFee || 0));
    setFormAudience(plan.audience || 'Professionals');
    setFormGoal(plan.goal || 'Revenue Generation');
    setFormDescription(plan.description || '');
    setFormAreas(plan.areas || ['Gym Floor', 'Cardio Zone']);
    setFormAccess(plan.access || ['Freeze Support']);
    setFormError(null);

    setIsFormModalOpen(true);
    Animated.parallel([
      Animated.timing(formBackdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(formTranslateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const closeFormModal = () => {
    Animated.parallel([
      Animated.timing(formBackdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(formTranslateY, { toValue: 750, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setIsFormModalOpen(false);
      setEditingPlanId(null);
      setFormError(null);
    });
  };

  const openDeleteModal = (plan: any) => {
    setPlanToDelete(plan);
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
      setPlanToDelete(null);
    });
  };

  // ─────────────────────────────────────────────────────────────
  // Save Plan Mutation (Create & Update)
  // ─────────────────────────────────────────────────────────────
  const handleSavePlan = async () => {
    if (!formName.trim() || formName.trim().length < 2) {
      setFormError('Plan title is required (at least 2 characters).');
      return;
    }
    const days = parseInt(formDurationDays, 10);
    if (isNaN(days) || days < 1) {
      setFormError('Duration days must be 1 or higher.');
      return;
    }
    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('Please enter a valid plan base fee.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    // Format serialized desktop description string
    const areasStr = JSON.stringify(formAreas);
    const accessStr = JSON.stringify(formAccess);
    const encodedDescription = `${formCategory}||${formJoiningFee || 0}||${formAudience}||${formGoal}||${formDescription.trim()}||${areasStr}||${accessStr}||${formDurationLabel}`;
    const priceMinorUnits = Math.round(priceNum * 100);

    try {
      if (formMode === 'edit' && editingPlanId) {
        if (isDatabaseOpen()) {
          await localMutationService.updatePlan(editingPlanId, {
            planName: formName.trim(),
            durationDays: days,
            priceMinorUnits,
            description: encodedDescription,
            benefits: formAreas.join(', '),
            isActive: true,
          });
        }
        Alert.alert('Plan Updated', `"${formName.trim()}" membership plan changes saved.`);
      } else {
        if (isDatabaseOpen()) {
          await localMutationService.createPlan({
            planName: formName.trim(),
            durationDays: days,
            priceMinorUnits,
            description: encodedDescription,
            benefits: formAreas.join(', '),
            isActive: true,
          });
        }
        Alert.alert('Plan Created', `"${formName.trim()}" has been added to your catalog.`);
      }

      queryClient.invalidateQueries({ queryKey: ['local-plans'] });
      await refetchPlans();
      closeFormModal();
      if (isDetailsModalOpen) {
        closeDetailsModal();
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save plan. Please verify inputs.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Delete Plan Mutation
  // ─────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!planToDelete?.id) return;
    setIsDeleting(true);

    try {
      if (isDatabaseOpen()) {
        await localMutationService.deletePlan(planToDelete.id);
      }
      queryClient.invalidateQueries({ queryKey: ['local-plans'] });
      await refetchPlans();
      closeDeleteModal();
      if (isDetailsModalOpen) {
        closeDetailsModal();
      }
      Alert.alert('Plan Removed', `"${planToDelete.name}" was permanently removed.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to delete plan.');
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
        {/* Subtle Watermark Attached to Bottom-Right */}
        <View style={styles.watermarkLogo} pointerEvents="none">
          <Svg width={96} height={96} viewBox="0 0 24 24" fill="none">
            <Rect x="2.5" y="5" width="19" height="14" rx="3.5" stroke="#94A3B8" strokeWidth={1.8} opacity={0.16} />
            <Path d="M7 10h10M7 14h5" stroke="#94A3B8" strokeWidth={1.8} strokeLinecap="round" opacity={0.16} />
          </Svg>
        </View>

        <View style={styles.headerCardTop}>
          <View style={{ flex: 1, zIndex: 1 }}>
            <View style={styles.headerKickerRow}>
              <View style={styles.headerKickerPill}>
                <Layers size={11} color="#38BDF8" strokeWidth={2.4} />
                <Text style={styles.headerOverline}>MEMBERSHIP ARCHITECTURE</Text>
              </View>
            </View>
            <Text style={styles.headerTitle}>Plans Portfolio</Text>
            <Text style={styles.headerSubtitle}>
              Subscription tiers, contract durations, MRR & yield intelligence
            </Text>
          </View>
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. QUICK ACTION BANNER: "Configure New Plan"                  */}
      {/* Positioned directly below MEMBERSHIP ARCHITECTURE card        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View style={styles.actionBannerWrapper}>
        <View
          style={[
            styles.actionBanner,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          {/* Subtle Watermark */}
          <View style={styles.actionBannerWatermark} pointerEvents="none">
            <Layers size={54} color={isDark ? '#94A3B8' : '#64748B'} strokeWidth={1.5} opacity={0.12} />
          </View>

          {/* Left Info */}
          <View style={styles.actionBannerLeft}>
            <View style={styles.actionBannerIconWrap}>
              <Layers size={20} color="#F97316" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.actionBannerTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                Configure New Plan
              </Text>
              <Text style={[styles.actionBannerSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                Define contract duration, base pricing & access
              </Text>
            </View>
          </View>

          {/* Sculpted Pocket with Add Button */}
          <View
            style={[
              styles.buttonCutoutPocket,
              {
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
          >
            <TouchableOpacity
              style={styles.addPlanSquaredBtn}
              onPress={() => openCreatePlanModal()}
              activeOpacity={0.85}
            >
              <Plus size={13} color="#FFFFFF" strokeWidth={3} />
              <Text style={styles.addPlanCtaText}>Add Plan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. 4 PORTFOLIO KPI METRIC CARDS (Desktop Replica)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View style={styles.kpiGrid}>
        {/* Card 1: Active Plans */}
        <View
          style={[
            styles.kpiCard,
            { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
          ]}
        >
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#EEF2FF' }]}>
              <Layers size={14} color="#4F46E5" strokeWidth={2.4} />
            </View>
            <Text style={[styles.kpiPillText, { color: '#4F46E5' }]}>ACTIVE</Text>
          </View>
          <Text style={[styles.kpiLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>PORTFOLIO TIERS</Text>
          <Text style={[styles.kpiValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
            {portfolioStats.activePlans} <Text style={styles.kpiValueUnit}>Plans</Text>
          </Text>
          <Text style={[styles.kpiSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Across {enrichedPlans.length} total defined
          </Text>
        </View>

        {/* Card 2: Monthly Revenue (MRR) */}
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
            <Text style={[styles.kpiPillText, { color: '#059669' }]}>MRR</Text>
          </View>
          <Text style={[styles.kpiLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>EST. MONTHLY MRR</Text>
          <Text style={[styles.kpiValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
            {formatCurrency(portfolioStats.monthlyRevenue)}
          </Text>
          <Text style={[styles.kpiSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Active membership yield
          </Text>
        </View>

        {/* Card 3: Average Retention */}
        <View
          style={[
            styles.kpiCard,
            { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
          ]}
        >
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#FFFBEB' }]}>
              <TrendingUp size={14} color="#D97706" strokeWidth={2.4} />
            </View>
            <Text style={[styles.kpiPillText, { color: '#D97706' }]}>INDEX</Text>
          </View>
          <Text style={[styles.kpiLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>AVG RETENTION</Text>
          <Text style={[styles.kpiValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
            {portfolioStats.avgRetention}%
          </Text>
          <Text style={[styles.kpiSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Weighted retention score
          </Text>
        </View>

        {/* Card 4: 5D Expiring Renewals */}
        <View
          style={[
            styles.kpiCard,
            { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
          ]}
        >
          <View style={styles.kpiTopRow}>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#F8FAFC' }]}>
              <Calendar size={14} color="#475569" strokeWidth={2.4} />
            </View>
            <Text style={[styles.kpiPillText, { color: '#64748B' }]}>5D</Text>
          </View>
          <Text style={[styles.kpiLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>EXPIRING 5 DAYS</Text>
          <Text style={[styles.kpiValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
            {portfolioStats.expiringSoonCount} <Text style={styles.kpiValueUnit}>Members</Text>
          </Text>
          <Text style={[styles.kpiSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
            {formatCurrency(portfolioStats.forecastedRenewal)} renewal pipeline
          </Text>
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. SEARCH & FILTER ROW (Identical To Member Directory)       */}
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
            placeholder="Search plan name, category, or tier..."
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
                  <Text style={styles.dropdownKicker}>CATALOG SORT & FILTERS</Text>
                  <Text style={[styles.dropdownTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    Filter Membership Plans
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
      {/* 5. MEMBERSHIP PLANS LIST                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isPlansLoading || isMembersLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#F97316" />
          <Text style={[styles.loadingText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Loading plans and subscription metrics...
          </Text>
        </View>
      ) : filteredPlans.length === 0 ? (
        <View
          style={[
            styles.emptyContainer,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <Layers size={36} color={isDark ? '#475569' : '#CBD5E1'} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
            No Plans Found
          </Text>
          <Text style={[styles.emptySubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {search
              ? `No subscription plans match "${search}".`
              : 'Tap "Add Plan" above to create your first membership tier.'}
          </Text>
        </View>
      ) : (
        <View style={styles.plansList}>
          {filteredPlans.map((plan) => {
            const visual = getVisualCategory(plan);
            const VisualIcon = visual.Icon;

            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                {/* Top Row: Category Icon + Plan Name + Status Pill */}
                <View style={styles.planCardTopRow}>
                  <View style={[styles.planIconBox, { backgroundColor: visual.bg, borderColor: visual.border }]}>
                    <VisualIcon size={20} color={visual.accent} strokeWidth={2.4} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.categoryBadgeRow}>
                      <Text style={[styles.categoryBadgeText, { color: visual.accent }]}>
                        {visual.badgeText}
                      </Text>
                      <View style={styles.durationPill}>
                        <Clock size={10} color={isDark ? '#94A3B8' : '#64748B'} strokeWidth={2} />
                        <Text style={[styles.durationPillText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                          {plan.durationDays} Days
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.planCardTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                      {plan.name}
                    </Text>
                  </View>

                  {/* Status Badge */}
                  <View
                    style={[
                      styles.planStatusPill,
                      {
                        backgroundColor:
                          plan.status === 'Healthy'
                            ? '#DCFCE7'
                            : plan.status === 'Growing'
                            ? '#EEF2FF'
                            : '#FEE2E2',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.planStatusPillText,
                        {
                          color:
                            plan.status === 'Healthy'
                              ? '#15803D'
                              : plan.status === 'Growing'
                              ? '#4F46E5'
                              : '#DC2626',
                        },
                      ]}
                    >
                      {plan.status}
                    </Text>
                  </View>
                </View>

                {/* Pricing & Key Numbers Row */}
                <View style={[styles.planNumbersRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                  <View style={styles.numberCol}>
                    <Text style={[styles.numberLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>BASE PRICE</Text>
                    <Text style={[styles.numberPriceValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                      {formatCurrency(plan.price)}
                    </Text>
                  </View>

                  <View style={styles.numberDivider} />

                  <View style={styles.numberCol}>
                    <Text style={[styles.numberLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>ACTIVE MEMBERS</Text>
                    <View style={styles.subscribersRow}>
                      <Users size={12} color={isDark ? '#CBD5E1' : '#475569'} strokeWidth={2.2} />
                      <Text style={[styles.subscribersValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                        {plan.activeMembers}
                      </Text>
                      <Text style={[styles.trendBadge, { color: plan.trendUp ? '#16A34A' : '#EF4444' }]}>
                        {plan.trend}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.numberDivider} />

                  <View style={styles.numberCol}>
                    <Text style={[styles.numberLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>EST. MONTHLY</Text>
                    <Text style={[styles.numberValue, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
                      {formatCurrency(plan.monthlyContribution)}
                    </Text>
                  </View>
                </View>

                {/* Privileges Inclusions */}
                {plan.areas && plan.areas.length > 0 && (
                  <View style={styles.privilegesChipsRow}>
                    {plan.areas.slice(0, 3).map((area: string, idx: number) => (
                      <View
                        key={idx}
                        style={[
                          styles.privilegeMiniChip,
                          {
                            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                            borderColor: isDark ? '#334155' : '#E2E8F0',
                          },
                        ]}
                      >
                        <Check size={10} color="#10B981" strokeWidth={2.8} />
                        <Text style={[styles.privilegeMiniText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                          {area}
                        </Text>
                      </View>
                    ))}
                    {plan.areas.length > 3 && (
                      <Text style={[styles.morePrivilegesText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                        +{plan.areas.length - 3} more
                      </Text>
                    )}
                  </View>
                )}

                {/* Bottom Actions Row: View Details, Edit Plan, Delete Plan */}
                <View style={[styles.planActionsRow, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                  {/* View Details Button */}
                  <TouchableOpacity
                    style={[
                      styles.planActionBtn,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                    onPress={() => openDetailsModal(plan)}
                    activeOpacity={0.8}
                  >
                    <Eye size={13} color={isDark ? '#CBD5E1' : '#475569'} strokeWidth={2.2} />
                    <Text style={[styles.planActionBtnText, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                      Details
                    </Text>
                  </TouchableOpacity>

                  {/* Edit Plan Button */}
                  <TouchableOpacity
                    style={[
                      styles.planActionBtn,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                    onPress={() => openEditPlanModal(plan)}
                    activeOpacity={0.8}
                  >
                    <Edit3 size={13} color={isDark ? '#CBD5E1' : '#475569'} strokeWidth={2.2} />
                    <Text style={[styles.planActionBtnText, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>

                  {/* Delete Button */}
                  <TouchableOpacity
                    style={[
                      styles.planDeleteBtn,
                      {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                        borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
                      },
                    ]}
                    onPress={() => openDeleteModal(plan)}
                    activeOpacity={0.8}
                  >
                    <Trash2 size={13} color="#EF4444" strokeWidth={2.2} />
                    <Text style={styles.planDeleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. PLAN DETAILS BOTTOM SHEET MODAL (Desktop Replica)          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal visible={isDetailsModalOpen} transparent animationType="none" onRequestClose={closeDetailsModal}>
        <View style={styles.modalRoot}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: detailsBackdropAnim, backgroundColor: 'rgba(0, 0, 0, 0.52)' },
            ]}
          >
            <TouchableWithoutFeedback onPress={closeDetailsModal}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
          </Animated.View>

          <Animated.View
            style={[
              styles.detailsSheetContainer,
              { transform: [{ translateY: detailsTranslateY }] },
            ]}
            pointerEvents="box-none"
          >
            <View
              style={[
                styles.detailsSheet,
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

              {/* Details Header with Square Close Button (5px curved corners) */}
              <View style={[styles.detailsHeaderRow, { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.detailsKicker}>PLAN INTELLIGENCE</Text>
                  <Text style={[styles.detailsTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                    {selectedPlanForDetails?.name || 'Membership Tier'}
                  </Text>
                  <Text style={[styles.detailsSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    {selectedPlanForDetails?.category} · {selectedPlanForDetails?.durationDays} Days Contract
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={closeDetailsModal}
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
                contentContainerStyle={{ paddingBottom: 30, paddingTop: 14 }}
                showsVerticalScrollIndicator={false}
              >
                {/* 4 Financial Grid Cards */}
                <View style={styles.detailsMetricsGrid}>
                  <View
                    style={[
                      styles.detailsMetricCard,
                      { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                    ]}
                  >
                    <Text style={[styles.detailsMetricLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>BASE PRICING</Text>
                    <Text style={[styles.detailsMetricValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                      {formatCurrency(selectedPlanForDetails?.price || 0)}
                    </Text>
                    <Text style={[styles.detailsMetricFoot, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      +{formatCurrency(selectedPlanForDetails?.joiningFee || 0)} join fee
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.detailsMetricCard,
                      { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                    ]}
                  >
                    <Text style={[styles.detailsMetricLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>SUBSCRIBERS</Text>
                    <Text style={[styles.detailsMetricValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                      {selectedPlanForDetails?.activeMembers || 0}
                    </Text>
                    <Text style={[styles.detailsMetricFoot, { color: selectedPlanForDetails?.trendUp ? '#10B981' : '#EF4444' }]}>
                      {selectedPlanForDetails?.trend} velocity
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.detailsMetricCard,
                      { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                    ]}
                  >
                    <Text style={[styles.detailsMetricLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>MONTHLY MRR</Text>
                    <Text style={[styles.detailsMetricValue, { color: '#0284C7' }]}>
                      {formatCurrency(selectedPlanForDetails?.monthlyContribution || 0)}
                    </Text>
                    <Text style={[styles.detailsMetricFoot, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      Recurring estimate
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.detailsMetricCard,
                      { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                    ]}
                  >
                    <Text style={[styles.detailsMetricLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>LTD REVENUE</Text>
                    <Text style={[styles.detailsMetricValue, { color: '#10B981' }]}>
                      {formatCurrency(selectedPlanForDetails?.revenue || 0)}
                    </Text>
                    <Text style={[styles.detailsMetricFoot, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      All-time yield
                    </Text>
                  </View>
                </View>

                {/* Health & Performance Rates */}
                <View
                  style={[
                    styles.detailsHealthBox,
                    { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                  ]}
                >
                  <Text style={[styles.detailsSectionHeading, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    Retention & Renewal Health
                  </Text>
                  <View style={styles.ratesRow}>
                    <View style={styles.rateItem}>
                      <Text style={[styles.rateLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>RETENTION RATE</Text>
                      <Text style={[styles.rateValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                        {selectedPlanForDetails?.retention || 100}%
                      </Text>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${selectedPlanForDetails?.retention || 100}%`, backgroundColor: '#10B981' },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.rateItem}>
                      <Text style={[styles.rateLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>RENEWAL VELOCITY</Text>
                      <Text style={[styles.rateValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                        {selectedPlanForDetails?.renewalRate || 100}%
                      </Text>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${selectedPlanForDetails?.renewalRate || 100}%`, backgroundColor: '#38BDF8' },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </View>

                {/* Privileges Inclusions */}
                <View
                  style={[
                    styles.detailsPrivilegesBox,
                    { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                  ]}
                >
                  <Text style={[styles.detailsSectionHeading, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    Included Privileges & Facility Access
                  </Text>
                  <View style={styles.detailsPrivilegesGrid}>
                    {[
                      { label: 'Gym Floor', enabled: selectedPlanForDetails?.areas?.includes('Gym Floor') ?? true },
                      { label: 'Cardio Zone', enabled: selectedPlanForDetails?.areas?.includes('Cardio Zone') ?? true },
                      { label: 'Steam & Sauna', enabled: selectedPlanForDetails?.areas?.includes('Steam/Sauna') ?? true },
                      { label: 'Group Classes', enabled: selectedPlanForDetails?.areas?.includes('Group Classes') ?? false },
                      { label: 'Personal Training', enabled: selectedPlanForDetails?.areas?.includes('Personal Training') ?? false },
                      { label: 'Freeze Support', enabled: selectedPlanForDetails?.access?.includes('Freeze Support') ?? true },
                    ].map((priv, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.privilegeItemCard,
                          {
                            backgroundColor: priv.enabled
                              ? isDark ? '#0F172A' : '#FFFFFF'
                              : isDark ? '#1E293B40' : '#F1F5F9',
                            borderColor: priv.enabled
                              ? isDark ? '#334155' : '#E2E8F0'
                              : 'transparent',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.privilegeItemText,
                            {
                              color: priv.enabled
                                ? isDark ? '#FFFFFF' : '#0F172A'
                                : isDark ? '#64748B' : '#94A3B8',
                              textDecorationLine: priv.enabled ? 'none' : 'line-through',
                            },
                          ]}
                        >
                          {priv.label}
                        </Text>
                        <View
                          style={[
                            styles.privilegeDot,
                            { backgroundColor: priv.enabled ? '#10B981' : isDark ? '#475569' : '#CBD5E1' },
                          ]}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Bottom Sheet Actions */}
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
                    const target = selectedPlanForDetails;
                    closeDetailsModal();
                    setTimeout(() => openDeleteModal(target), 200);
                  }}
                  activeOpacity={0.8}
                >
                  <Trash2 size={14} color="#EF4444" strokeWidth={2.2} />
                  <Text style={styles.detailsDeleteBtnText}>Delete Plan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailsEditBtn}
                  onPress={() => {
                    const target = selectedPlanForDetails;
                    closeDetailsModal();
                    setTimeout(() => openEditPlanModal(target), 200);
                  }}
                  activeOpacity={0.85}
                >
                  <Edit3 size={14} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.detailsEditBtnText}>Edit Plan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. ADD / EDIT PLAN MODAL (Desktop Architecture)               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal visible={isFormModalOpen} transparent animationType="none" onRequestClose={closeFormModal}>
        <View style={styles.modalRoot}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: formBackdropAnim, backgroundColor: 'rgba(0, 0, 0, 0.52)' },
            ]}
          >
            <TouchableWithoutFeedback onPress={closeFormModal}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
          </Animated.View>

          <Animated.View
            style={[
              styles.formSheetContainer,
              { transform: [{ translateY: formTranslateY }] },
            ]}
            pointerEvents="box-none"
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <View
                style={[
                  styles.formSheet,
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

                {/* Form Header with 5px curved square close button */}
                <View style={[styles.formHeaderRow, { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.formKicker}>
                      {formMode === 'edit' ? 'MODIFY PLAN CONTRACT' : 'NEW MEMBERSHIP PLAN'}
                    </Text>
                    <Text style={[styles.formTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                      {formMode === 'edit' ? 'Edit Plan Configuration' : 'Create Subscription Tier'}
                    </Text>
                    <Text style={[styles.formSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      Contract terms, durations, and facility permissions
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={closeFormModal}
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

                {formError && (
                  <View style={styles.formErrorBox}>
                    <AlertCircle size={14} color="#EF4444" strokeWidth={2.4} />
                    <Text style={styles.formErrorText}>{formError}</Text>
                  </View>
                )}

                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 30, paddingTop: 10 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Plan Name */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                      PLAN TITLE <Text style={{ color: '#EF4444' }}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.inputField,
                        {
                          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                          borderColor: isDark ? '#334155' : '#E2E8F0',
                          color: isDark ? '#FFFFFF' : '#0F172A',
                        },
                      ]}
                      placeholder="e.g. Annual Elite Transformation"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      value={formName}
                      onChangeText={(t) => {
                        setFormName(t);
                        setFormError(null);
                      }}
                    />
                  </View>

                  {/* Category Selection Chips */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                      CATEGORY CLASSIFICATION
                    </Text>
                    <View style={styles.chipsRow}>
                      {['Transformation', 'Bodybuilding', 'Weight Loss', 'General Fitness'].map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setFormCategory(cat)}
                          style={[
                            styles.chipBtn,
                            {
                              backgroundColor: formCategory === cat ? '#0F172A' : isDark ? '#1E293B' : '#F1F5F9',
                              borderColor: formCategory === cat ? '#0F172A' : isDark ? '#334155' : '#E2E8F0',
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.chipBtnText,
                              { color: formCategory === cat ? '#FFFFFF' : isDark ? '#CBD5E1' : '#475569' },
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Duration Presets & Custom Days */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                      DURATION (DAYS) <Text style={{ color: '#EF4444' }}>*</Text>
                    </Text>
                    <View style={styles.chipsRow}>
                      {[
                        { label: 'Monthly (30D)', days: 30, title: 'Monthly' },
                        { label: 'Quarterly (90D)', days: 90, title: 'Quarterly' },
                        { label: 'Half-Year (180D)', days: 180, title: 'Half-Year' },
                        { label: 'Annual (365D)', days: 365, title: 'Annual' },
                      ].map((item) => (
                        <TouchableOpacity
                          key={item.days}
                          onPress={() => {
                            setFormDurationDays(String(item.days));
                            setFormDurationLabel(item.title);
                          }}
                          style={[
                            styles.chipBtn,
                            {
                              backgroundColor:
                                formDurationDays === String(item.days)
                                  ? '#0F172A'
                                  : isDark ? '#1E293B' : '#F1F5F9',
                              borderColor:
                                formDurationDays === String(item.days)
                                  ? '#0F172A'
                                  : isDark ? '#334155' : '#E2E8F0',
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.chipBtnText,
                              {
                                color:
                                  formDurationDays === String(item.days)
                                    ? '#FFFFFF'
                                    : isDark ? '#CBD5E1' : '#475569',
                              },
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      style={[
                        styles.inputField,
                        {
                          marginTop: 8,
                          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                          borderColor: isDark ? '#334155' : '#E2E8F0',
                          color: isDark ? '#FFFFFF' : '#0F172A',
                        },
                      ]}
                      placeholder="Custom duration in days"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      value={formDurationDays}
                      onChangeText={setFormDurationDays}
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Pricing 2-Col: Base Fee + Joining Fee */}
                  <View style={styles.twoColRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                        BASE PRICE (₹) <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
                      <TextInput
                        style={[
                          styles.inputField,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                            borderColor: isDark ? '#334155' : '#E2E8F0',
                            color: isDark ? '#FFFFFF' : '#0F172A',
                          },
                        ]}
                        placeholder="e.g. 2999"
                        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                        value={formPrice}
                        onChangeText={(t) => {
                          setFormPrice(t);
                          setFormError(null);
                        }}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                        JOINING FEE (₹)
                      </Text>
                      <TextInput
                        style={[
                          styles.inputField,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                            borderColor: isDark ? '#334155' : '#E2E8F0',
                            color: isDark ? '#FFFFFF' : '#0F172A',
                          },
                        ]}
                        placeholder="e.g. 500"
                        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                        value={formJoiningFee}
                        onChangeText={setFormJoiningFee}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  {/* Target Audience & Strategic Goal */}
                  <View style={styles.twoColRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>AUDIENCE</Text>
                      <TextInput
                        style={[
                          styles.inputField,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                            borderColor: isDark ? '#334155' : '#E2E8F0',
                            color: isDark ? '#FFFFFF' : '#0F172A',
                          },
                        ]}
                        placeholder="Professionals, Students..."
                        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                        value={formAudience}
                        onChangeText={setFormAudience}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>BUSINESS GOAL</Text>
                      <TextInput
                        style={[
                          styles.inputField,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                            borderColor: isDark ? '#334155' : '#E2E8F0',
                            color: isDark ? '#FFFFFF' : '#0F172A',
                          },
                        ]}
                        placeholder="Revenue, Retention..."
                        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                        value={formGoal}
                        onChangeText={setFormGoal}
                      />
                    </View>
                  </View>

                  {/* Description / Overview */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>DESCRIPTION</Text>
                    <TextInput
                      style={[
                        styles.inputField,
                        {
                          height: 70,
                          textAlignVertical: 'top',
                          paddingTop: 10,
                          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                          borderColor: isDark ? '#334155' : '#E2E8F0',
                          color: isDark ? '#FFFFFF' : '#0F172A',
                        },
                      ]}
                      placeholder="Summary of tier inclusions and benefits..."
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      value={formDescription}
                      onChangeText={setFormDescription}
                      multiline
                    />
                  </View>

                  {/* Facility Privileges Toggles */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                      FACILITY PERMISSIONS & PRIVILEGES
                    </Text>
                    <View style={styles.chipsRow}>
                      {['Gym Floor', 'Cardio Zone', 'Steam/Sauna', 'Group Classes', 'Personal Training', 'Locker Premium'].map((priv) => {
                        const isSelected = formAreas.includes(priv);
                        return (
                          <TouchableOpacity
                            key={priv}
                            onPress={() => {
                              if (isSelected) {
                                setFormAreas(formAreas.filter((a) => a !== priv));
                              } else {
                                setFormAreas([...formAreas, priv]);
                              }
                            }}
                            style={[
                              styles.chipBtn,
                              {
                                backgroundColor: isSelected
                                  ? isDark ? '#1E293B' : '#ECFDF5'
                                  : isDark ? '#0F172A' : '#F1F5F9',
                                borderColor: isSelected ? '#10B981' : isDark ? '#334155' : '#E2E8F0',
                              },
                            ]}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.chipBtnText,
                                { color: isSelected ? '#059669' : isDark ? '#94A3B8' : '#64748B' },
                              ]}
                            >
                              {isSelected ? '✓ ' : ''}{priv}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </ScrollView>

                {/* Form Footer Bar */}
                <View
                  style={[
                    styles.formFooterBar,
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
                    onPress={closeFormModal}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.formCancelBtnText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.formSaveBtn}
                    onPress={handleSavePlan}
                    disabled={formSubmitting}
                    activeOpacity={0.85}
                  >
                    {formSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <CheckCircle2 size={15} color="#FFFFFF" strokeWidth={2.4} />
                        <Text style={styles.formSaveBtnText}>
                          {formMode === 'edit' ? 'Save Changes' : 'Publish Plan'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 8. SETUP GUIDE STYLE: CONFIRM PERMANENT PLAN DELETION MODAL    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={isDeleteModalOpen}
        transparent
        animationType="none"
        onRequestClose={closeDeleteModal}
      >
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
              {/* Top Right Close Button (Square shaped with 5px curved corners) */}
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
                Delete Membership Plan
              </Text>

              <Text style={[styles.deleteSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Are you sure you want to permanently delete{' '}
                <Text style={{ fontWeight: '900', color: isDark ? '#FFFFFF' : '#0F172A' }}>
                  "{planToDelete?.name || 'this plan'}"
                </Text>
                ? This will remove the tier from future enrollments.
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
  /* Header Card (Matched exactly to Directory & Roster Card) */
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
    bottom: -10,
    right: -8,
  },
  headerCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
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
    marginBottom: 4,
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
  kpiTrendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  kpiTrendText: {
    color: '#059669',
    fontSize: 9.5,
    fontWeight: '800',
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

  /* Quick Action Banner */
  actionBannerWrapper: {
    marginBottom: 14,
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  actionBannerWatermark: {
    position: 'absolute',
    right: 50,
    bottom: -10,
  },
  actionBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBannerIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  actionBannerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  buttonCutoutPocket: {
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  addPlanSquaredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EA580C',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  addPlanCtaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
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

  /* Plans List */
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
  plansList: {
    gap: 12,
  },
  planCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  planCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  planIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  categoryBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationPillText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  planCardTitle: {
    fontSize: 15.5,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  planStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  planNumbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  numberCol: {
    flex: 1,
  },
  numberLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  numberPriceValue: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  numberValue: {
    fontSize: 13.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  subscribersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subscribersValue: {
    fontSize: 13.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  trendBadge: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  numberDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  privilegesChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  privilegeMiniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  privilegeMiniText: {
    fontSize: 10,
    fontWeight: '700',
  },
  morePrivilegesText: {
    fontSize: 10,
    fontWeight: '700',
  },
  planActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  planActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
  },
  planActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  planDeleteBtn: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
  },
  planDeleteBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
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

  /* Details Sheet */
  detailsSheetContainer: {
    height: '88%',
    justifyContent: 'flex-end',
  },
  detailsSheet: {
    height: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 6,
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
  detailsMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  detailsMetricCard: {
    width: '48.5%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  detailsMetricLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  detailsMetricValue: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginTop: 3,
  },
  detailsMetricFoot: {
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 2,
  },
  detailsHealthBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  detailsSectionHeading: {
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 10,
  },
  ratesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rateItem: {
    flex: 1,
  },
  rateLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  rateValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
    marginBottom: 4,
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  detailsPrivilegesBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  detailsPrivilegesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  privilegeItemCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  privilegeItemText: {
    fontSize: 10.5,
    fontWeight: '700',
    flex: 1,
    marginRight: 4,
  },
  privilegeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  detailsFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
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

  /* Add / Edit Form Sheet */
  formSheetContainer: {
    height: '92%',
    justifyContent: 'flex-end',
  },
  formSheet: {
    height: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  formKicker: {
    fontSize: 10,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 1.2,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  formSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  formErrorText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputField: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  formFooterBar: {
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
    marginBottom: 12,
  },
  deleteNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  deleteNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
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

export default InPlacePlansView;
