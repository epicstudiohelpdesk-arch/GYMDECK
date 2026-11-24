/**
 * GymDeck Owner Mobile - In-Place Members Directory Page
 *
 * Renders directly inside the homepage scrollable area when "Members" is selected
 * from the category rail under the search bar.
 *
 * Features:
 * - Search bar for instant filtering
 * - Filter pills (All, Active, Expired, Frozen, Inactive)
 * - Profile cards with original profile photos / vector avatars, member code, phone, joined date, expiry
 * - Action buttons: View Profile, Call, WhatsApp
 * - Header with total member count and a Close / Back to Dashboard button
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Modal,
  TouchableWithoutFeedback,
  Image,
  Animated,
  Platform,
  ScrollView,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search,
  X,
  Phone,
  MessageCircle,
  Eye,
  Users,
  ChevronRight,
  ChevronDown,
  Filter,
  UserCheck,
  UserX,
  User,
  AlertCircle,
  Dumbbell,
  Check,
  UserPlus,
  Plus,
  Sparkles,
  Mail,
  ShieldCheck,
  Clock,
  PauseCircle,
  Layers,
  ArrowRight,
  UserCircle,
  FileSpreadsheet,
  QrCode,
  Calendar,
  CreditCard,
  Building2,
  Banknote,
  Smartphone,
  MapPin,
  Camera,
  UploadCloud,
  FileText,
  Trash2,
  Percent,
  RefreshCw,
  Zap,
  ZapOff,
} from 'lucide-react-native';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useLocalMembers } from '../hooks/useLocalMembers';
import { useLocalPlans } from '../hooks/useLocalPlans';
import { localMutationService } from '../services/LocalMutationService';
import { isDatabaseOpen } from '../database/LocalDatabaseManager';
import { Avatar } from './ui/Avatar';
import { BrandSignatureFooter } from './BrandSignatureFooter';
import { layout } from '../theme/spacing';
import { GymMemberSummary } from '../types';

interface InPlaceMembersViewProps {
  isDark?: boolean;
  onClose?: () => void;
}

interface FilterOption {
  id: string;
  label: string;
  desc: string;
  icon: any;
  color: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'ACTIVE', label: 'Active Members', desc: 'Currently enrolled & valid status', icon: ShieldCheck, color: '#10B981' },
  { id: 'ALL', label: 'All Records', desc: 'Complete gym membership roster', icon: Layers, color: '#3B82F6' },
  { id: 'EXPIRED', label: 'Expired', desc: 'Due for renewal / lapsed membership', icon: Clock, color: '#EF4444' },
  { id: 'FROZEN', label: 'Frozen / Paused', desc: 'Temporarily on hold / paused', icon: PauseCircle, color: '#0EA5E9' },
  { id: 'INACTIVE', label: 'Inactive', desc: 'Archived / cancelled accounts', icon: UserX, color: '#64748B' },
];

const ITEMS_PER_PAGE = 10;

export const InPlaceMembersView: React.FC<InPlaceMembersViewProps> = ({ isDark = false, onClose }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Smooth Custom Bottom Sheet Animation (Backdrop fade + Sheet slide up from bottom)
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(600)).current;

  // Add Member Modal Animations
  const addModalBackdropAnim = useRef(new Animated.Value(0)).current;
  const addModalSheetTranslateY = useRef(new Animated.Value(750)).current;

  // New Registration Multi-Page State (Pages 1 - 5 matching desktop exactly)
  const [regPage, setRegPage] = useState<1 | 2 | 3 | 4 | 5>(1);

  // New Registration Form Fields (Matching Desktop "New Registration" Modal)
  const [formFullName, setFormFullName] = useState('');
  const [formContactNumber, setFormContactNumber] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formGender, setFormGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [formWhatsAppNumber, setFormWhatsAppNumber] = useState('');
  const [formHeight, setFormHeight] = useState('');
  const [formHeightUnit, setFormHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [formWeight, setFormWeight] = useState('');
  const [formWeightUnit, setFormWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [formBloodGroup, setFormBloodGroup] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formWhatsAppConsent, setFormWhatsAppConsent] = useState(true);

  // Page 2: Photo & In-Modal Camera Viewfinder
  const [formProfilePhoto, setFormProfilePhoto] = useState<string | null>(null);
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const [cameraFlash, setCameraFlash] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const liveCameraRef = useRef<CameraView>(null);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Page 3: Documents
  const [formDocs, setFormDocs] = useState<{
    aadhaar: string | null;
    residential: string | null;
    health: string | null;
    others: string | null;
  }>({
    aadhaar: null,
    residential: null,
    health: null,
    others: null,
  });

  // Page 4: Plan & Add-ons
  const [formSelectedPlanId, setFormSelectedPlanId] = useState<string | undefined>(undefined);
  const [formJoiningFee, setFormJoiningFee] = useState<number>(0);
  const [formGstEnabled, setFormGstEnabled] = useState(false);
  const [formGstRate, setFormGstRate] = useState<number>(18);
  const [formSelectedAddons, setFormSelectedAddons] = useState<{ [key: string]: number }>({});
  const [formCustomAddons, setFormCustomAddons] = useState<Array<{ id: string; name: string; amount: number }>>([]);
  const [newCustomAddonName, setNewCustomAddonName] = useState('');
  const [newCustomAddonAmount, setNewCustomAddonAmount] = useState('');
  const [showCustomAddonInput, setShowCustomAddonInput] = useState(false);

  // Page 5: Payment Settlement & Modes
  const [formPaymentMethod, setFormPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [formSendDigitalReceipt, setFormSendDigitalReceipt] = useState(true);
  const [formUpiIdPush, setFormUpiIdPush] = useState('');
  const [formUpiPushSent, setFormUpiPushSent] = useState(false);
  const [isDynamicQrActive, setIsDynamicQrActive] = useState(false);

  const [formIsSubmitting, setFormIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load available plans for membership assignment
  const { plans: availablePlans = [] } = useLocalPlans({ activeOnly: true });

  // Listen to Global Open Event (e.g. from bottom nav or member tab button)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('OPEN_ADD_MEMBER_MODAL', () => {
      setIsAddMemberModalOpen(true);
    });
    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (isAddMemberModalOpen) {
      addModalSheetTranslateY.setValue(750);
      Animated.parallel([
        Animated.timing(addModalBackdropAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(addModalSheetTranslateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(addModalBackdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(addModalSheetTranslateY, {
          toValue: 750,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isAddMemberModalOpen]);

  const closeAddMemberModal = () => {
    Animated.parallel([
      Animated.timing(addModalBackdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(addModalSheetTranslateY, {
        toValue: 750,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsAddMemberModalOpen(false);
      setRegPage(1);
      setFormError(null);
    });
  };

  const handleNextPage = () => {
    setFormError(null);
    if (regPage === 1) {
      setRegPage(2);
    } else if (regPage === 2) {
      setRegPage(3);
    } else if (regPage === 3) {
      setRegPage(4);
    } else if (regPage === 4) {
      setRegPage(5);
    }
  };

  const handlePrevPage = () => {
    setFormError(null);
    if (regPage === 2) setRegPage(1);
    else if (regPage === 3) setRegPage(2);
    else if (regPage === 4) setRegPage(3);
    else if (regPage === 5) setRegPage(4);
  };

  const handleRegisterMember = async () => {
    if (!formFullName.trim()) {
      setFormError('Please enter the member full name.');
      return;
    }
    const cleanPhone = formContactNumber.replace(/[^0-9+]/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      setFormError('Please enter a valid contact number.');
      return;
    }
    if (!formAddress.trim()) {
      setFormError('Please enter the residential address.');
      return;
    }

    setFormIsSubmitting(true);
    setFormError(null);

    try {
      const selectedPlan = availablePlans.find((p) => p.id === formSelectedPlanId);
      const planPrice = selectedPlan ? Number(selectedPlan.price) : 0;
      const addonsTotal = Object.values(formSelectedAddons).reduce((acc, curr) => acc + curr, 0) +
        formCustomAddons.reduce((acc, curr) => acc + curr.amount, 0);
      const subtotal = planPrice + formJoiningFee + addonsTotal;
      const gstAmount = formGstEnabled ? (subtotal * formGstRate) / 100 : 0;
      const totalPayable = Math.round(subtotal + gstAmount);

      // Compose physical & health notes
      const notesParts: string[] = [];
      if (formHeight) notesParts.push(`Height: ${formHeight} ${formHeightUnit}`);
      if (formWeight) notesParts.push(`Weight: ${formWeight} ${formWeightUnit}`);
      if (formBloodGroup) notesParts.push(`Blood: ${formBloodGroup}`);
      if (formWhatsAppNumber && formWhatsAppNumber !== formContactNumber) {
        notesParts.push(`WhatsApp: ${formWhatsAppNumber}`);
      }
      if (formJoiningFee > 0) notesParts.push(`Joining Fee: ₹${formJoiningFee}`);
      if (formGstEnabled) notesParts.push(`GST: ${formGstRate}% (₹${Math.round(gstAmount)})`);
      if (addonsTotal > 0) notesParts.push(`Add-ons: ₹${addonsTotal}`);
      const notes = notesParts.length > 0 ? notesParts.join(' | ') : undefined;

      if (isDatabaseOpen()) {
        await localMutationService.admitMember({
          fullName: formFullName.trim(),
          phone: cleanPhone,
          alternatePhone: formWhatsAppNumber.trim() || undefined,
          email: formEmail.trim() || undefined,
          gender: formGender.toUpperCase(),
          dob: formDob.trim() || undefined,
          address: formAddress.trim(),
          notes,
          planId: formSelectedPlanId,
          initialPaymentAmount: totalPayable > 0 ? totalPayable : undefined,
          initialPaymentMethod: formSelectedPlanId ? formPaymentMethod : undefined,
          profilePhotoUrl: formProfilePhoto || undefined,
        });
      }

      // Refresh list
      refetch();

      Alert.alert(
        'Member Registered Successfully',
        `${formFullName.trim()} has been registered and activated in the gym roster.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form fields
              setFormFullName('');
              setFormContactNumber('');
              setFormEmail('');
              setFormDob('');
              setFormGender('Male');
              setFormWhatsAppNumber('');
              setFormHeight('');
              setFormWeight('');
              setFormBloodGroup('');
              setFormAddress('');
              setFormSelectedPlanId(undefined);
              setFormProfilePhoto(null);
              setFormDocs({ aadhaar: null, residential: null, health: null, others: null });
              setFormJoiningFee(0);
              setFormGstEnabled(false);
              setFormSelectedAddons({});
              setFormCustomAddons([]);
              setRegPage(1);
              closeAddMemberModal();
            },
          },
        ]
      );
    } catch (err: any) {
      setFormError(err?.message || 'Failed to register member. Please check fields.');
    } finally {
      setFormIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isFilterDropdownOpen) {
      sheetTranslateY.setValue(600);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 600,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isFilterDropdownOpen]);

  const closeFilterModal = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 600,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsFilterDropdownOpen(false);
    });
  };

  const {
    members: allMembers,
    totalCount,
    isLoading,
    refetch,
  } = useLocalMembers({
    search: search.trim(),
    status: selectedStatus,
  });

  // Reset to page 1 whenever search or status changes
  const handleSearchChange = (text: string) => {
    setSearch(text);
    setCurrentPage(1);
  };

  const handleSelectStatus = (statusId: string) => {
    setSelectedStatus(statusId);
    setCurrentPage(1);
    closeFilterModal();
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(allMembers.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMembers = useMemo(() => {
    return allMembers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [allMembers, startIndex]);

  const activeFilterMeta = FILTER_OPTIONS.find((f) => f.id === selectedStatus) || FILTER_OPTIONS[0];

  const handlePhoneCall = (phoneNumber?: string) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {});
  };

  const handleSendEmail = (email?: string | null, name?: string) => {
    if (!email) return;
    const url = `mailto:${email}?subject=${encodeURIComponent('Greeting from GymDeck')}&body=${encodeURIComponent(`Hello ${name || 'Member'},\n\n`)}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleWhatsApp = (phoneNumber?: string) => {
    if (!phoneNumber) return;
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const url = `whatsapp://send?phone=${cleanPhone}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${cleanPhone}`).catch(() => {});
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' };
      case 'EXPIRED':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' };
      case 'FROZEN':
        return { bg: '#E0F2FE', text: '#075985', border: '#BAE6FD' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      {/* 1. Executive Filled Header Card with Increased Height & Watermark */}
      <View
        style={[
          styles.headerCard,
          {
            backgroundColor: isDark ? '#090D16' : '#0B1120',
            borderColor: isDark ? '#1E293B' : '#1E293B',
          },
        ]}
      >
        {/* Subtle Watermark Brand Logo Attached to Inner Bottom Right */}
        <View style={styles.watermarkLogo} pointerEvents="none">
          <Svg width={88} height={88} viewBox="0 0 24 24" fill="none">
            <Path
              d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
              stroke="#94A3B8"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.16}
            />
            <Circle
              cx="9"
              cy="7"
              r="4"
              stroke="#94A3B8"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.16}
            />
            <Path
              d="M22 21v-2a4 4 0 0 0-3-3.87"
              stroke="#94A3B8"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.16}
            />
            <Path
              d="M16 3.13a4 4 0 0 1 0 7.75"
              stroke="#94A3B8"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.16}
            />
          </Svg>
        </View>

        <View style={styles.headerCardTop}>
          <View style={{ flex: 1, zIndex: 1 }}>
            <Text style={styles.headerOverline}>
              DIRECTORY & ROSTER
            </Text>
            <Text style={styles.headerTitle}>
              Member Directory
            </Text>
            <Text style={styles.headerSubtitle}>
              Identity, contact, membership & profile records
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Professional "Add New Member" Action Card with Sculpted Cutout */}
      <View style={styles.addNewMemberOuterWrapper}>
        <View
          style={[
            styles.addNewMemberBanner,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          {/* Subtle Background Watermark Graphic attached to bottom */}
          <View style={styles.addMemberWatermark} pointerEvents="none">
            <UserPlus
              size={54}
              color={isDark ? '#94A3B8' : '#64748B'}
              strokeWidth={1.5}
              opacity={0.12}
            />
          </View>

          {/* Left Content with Non-Boxed Modern Icon attached to bottom */}
          <View style={styles.addMemberLeftContent}>
            {/* Non-boxed modern professional icon aligned near bottom */}
            <View style={styles.addMemberModernIconWrapper}>
              <UserPlus size={22} color="#F97316" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.addMemberTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                New Admission
              </Text>
              <Text style={[styles.addMemberSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                Register new client, assign plan & collect fee
              </Text>
            </View>
          </View>

          {/* Sculpted Cutout Pocket for the Button */}
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
              style={styles.addMemberSquaredBtn}
              onPress={() => setIsAddMemberModalOpen(true)}
              activeOpacity={0.85}
            >
              <Plus size={13} color="#FFFFFF" strokeWidth={3} />
              <Text style={styles.addMemberCtaText}>Add Member</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 3. Search & E-Commerce Filter Row (Side-by-side equal height) */}
      <View style={styles.searchFilterRow}>
        {/* Search Bar on the left */}
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
            placeholder="Search name, phone, code..."
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            value={search}
            onChangeText={handleSearchChange}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={14} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Dropdown Button exactly matching search bar height & appearance */}
        <TouchableOpacity
          style={[
            styles.filterTriggerBtn,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: selectedStatus !== 'ALL' ? '#F97316' : isDark ? '#334155' : '#E2E8F0',
            },
          ]}
          onPress={() => setIsFilterDropdownOpen(true)}
          activeOpacity={0.8}
        >
          <View style={styles.filterTriggerInner}>
            <Filter
              size={15}
              color={selectedStatus !== 'ALL' ? '#F97316' : isDark ? '#CBD5E1' : '#334155'}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.filterTriggerText,
                {
                  color: selectedStatus !== 'ALL' ? '#EA580C' : isDark ? '#FFFFFF' : '#0F172A',
                  fontWeight: selectedStatus !== 'ALL' ? '800' : '700',
                },
              ]}
              numberOfLines={1}
            >
              {activeFilterMeta.label.split(' ')[0]}
            </Text>
            <ChevronDown
              size={14}
              color={selectedStatus !== 'ALL' ? '#F97316' : isDark ? '#94A3B8' : '#64748B'}
              strokeWidth={2.2}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Modern Filter Dropdown Modal (Custom Smooth Bottom Sheet with Independent Fade Backdrop) */}
      <Modal
        visible={isFilterDropdownOpen}
        transparent
        animationType="none"
        onRequestClose={closeFilterModal}
      >
        <View style={styles.modalRoot}>
          {/* Smooth Fade-Only Dim Backdrop (Soft black fade, completely stationary, no sliding) */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: backdropAnim,
                backgroundColor: 'rgba(0, 0, 0, 0.42)',
              },
            ]}
          >
            <TouchableWithoutFeedback onPress={closeFilterModal}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
          </Animated.View>

          {/* Bottom Sheet Card sliding up from bottom independently */}
          <Animated.View
            style={[
              styles.sheetContainer,
              {
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
            pointerEvents="box-none"
          >
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.dropdownSheet,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                {/* Drag Handle Bar */}
                <View style={styles.modalDragHandleContainer}>
                  <View
                    style={[
                      styles.modalDragHandle,
                      { backgroundColor: isDark ? '#334155' : '#CBD5E1' },
                    ]}
                  />
                </View>

                {/* Modal Header */}
                <View style={[styles.modalHeaderRow, { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={[
                        styles.modalHeaderIconBadge,
                        {
                          backgroundColor: isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED',
                          borderColor: isDark ? 'rgba(249, 115, 22, 0.3)' : '#FFEDD5',
                        },
                      ]}
                    >
                      <Filter size={16} color="#F97316" strokeWidth={2.4} />
                    </View>
                    <View>
                      <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                        Filter Members
                      </Text>
                      <Text style={[styles.modalSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                        Select membership status to display
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={closeFilterModal}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[
                      styles.modalCloseCircle,
                      { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                    ]}
                  >
                    <X size={16} color={isDark ? '#94A3B8' : '#64748B'} strokeWidth={2.2} />
                  </TouchableOpacity>
                </View>

                {/* Filter Options with Category Icons & Subtle Badges */}
                <View style={styles.dropdownOptionsContainer}>
                  {FILTER_OPTIONS.map((opt) => {
                    const isSelected = selectedStatus === opt.id;
                    const IconComponent = opt.icon;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          styles.dropdownOptionItem,
                          {
                            backgroundColor: isSelected
                              ? isDark
                                ? 'rgba(249, 115, 22, 0.14)'
                                : '#FFF7ED'
                              : isDark
                              ? '#1E293B'
                              : '#F8FAFC',
                            borderColor: isSelected
                              ? '#F97316'
                              : isDark
                              ? '#334155'
                              : '#E2E8F0',
                          },
                        ]}
                        onPress={() => handleSelectStatus(opt.id)}
                        activeOpacity={0.7}
                      >
                        {/* Option Icon Pill */}
                        <View
                          style={[
                            styles.optionIconContainer,
                            {
                              backgroundColor: isSelected
                                ? 'rgba(249, 115, 22, 0.2)'
                                : isDark
                                ? '#0F172A'
                                : '#FFFFFF',
                              borderColor: isSelected
                                ? 'rgba(249, 115, 22, 0.4)'
                                : isDark
                                ? '#334155'
                                : '#E2E8F0',
                            },
                          ]}
                        >
                          <IconComponent
                            size={18}
                            color={isSelected ? '#EA580C' : opt.color}
                            strokeWidth={2.2}
                          />
                        </View>

                        {/* Title & Desc */}
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text
                            style={[
                              styles.dropdownOptionLabel,
                              {
                                color: isSelected ? '#EA580C' : isDark ? '#F8FAFC' : '#0F172A',
                                fontWeight: isSelected ? '800' : '700',
                              },
                            ]}
                          >
                            {opt.label}
                          </Text>
                          <Text
                            style={[
                              styles.dropdownOptionDesc,
                              { color: isDark ? '#94A3B8' : '#64748B' },
                            ]}
                          >
                            {opt.desc}
                          </Text>
                        </View>

                        {/* Active Selection Indicator */}
                        {isSelected ? (
                          <View style={styles.selectedCheckCircle}>
                            <Check size={14} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.unselectedCheckCircle,
                              { borderColor: isDark ? '#475569' : '#CBD5E1' },
                            ]}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </View>
      </Modal>

      {/* Modern "New Registration" Member Admission Modal (Matching Desktop New Registration Exactly) */}
      <Modal
        visible={isAddMemberModalOpen}
        transparent
        animationType="none"
        onRequestClose={closeAddMemberModal}
      >
        <View style={styles.modalRoot}>
          {/* Smooth Fade-Only Dim Backdrop */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: addModalBackdropAnim,
                backgroundColor: 'rgba(0, 0, 0, 0.42)',
              },
            ]}
          >
            <TouchableWithoutFeedback onPress={closeAddMemberModal}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
          </Animated.View>

          {/* Bottom Sheet Card sliding up from bottom with Tall Height & Full Form */}
          <Animated.View
            style={[
              styles.registrationSheetContainer,
              {
                transform: [{ translateY: addModalSheetTranslateY }],
              },
            ]}
            pointerEvents="box-none"
          >
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.registrationSheet,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                {/* Drag Handle Bar */}
                <View style={styles.modalDragHandleContainer}>
                  <View
                    style={[
                      styles.modalDragHandle,
                      { backgroundColor: isDark ? '#334155' : '#CBD5E1' },
                    ]}
                  />
                </View>

                {/* Modal Header (Matching Desktop Top Bar for each page) */}
                <View style={[styles.modalHeaderRow, { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9', marginBottom: 12 }]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.registrationKickerText}>
                      {regPage === 1 && 'NEW REGISTRATION'}
                      {regPage === 2 && 'IDENTITY CAPTURE'}
                      {regPage === 3 && 'DOCUMENT UPLOAD'}
                      {regPage === 4 && 'PLAN SELECTION'}
                      {regPage === 5 && 'PAYMENT SETTLEMENT'}
                    </Text>
                    <Text style={[styles.modalTitle, styles.registrationHeaderTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                      {regPage === 1 && 'Add New Member'}
                      {regPage === 2 && 'Capture Member Photo'}
                      {regPage === 3 && 'Upload Member Documents'}
                      {regPage === 4 && 'Membership Planning'}
                      {regPage === 5 && 'Bill Summary & Pay'}
                    </Text>
                    <Text style={[styles.modalSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                      {regPage === 1 && 'Start a clean new profile with key member info in one focused flow.'}
                      {regPage === 2 && 'Upload a clear profile photo for identification & membership card.'}
                      {regPage === 3 && 'Add supporting documents to complete the member profile.'}
                      {regPage === 4 && 'Select membership plan & optional add-on services.'}
                      {regPage === 5 && 'Review itemization, select payment mode, and activate member.'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={closeAddMemberModal}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[
                      styles.modalCloseSquare,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                  >
                    <X size={16} color={isDark ? '#CBD5E1' : '#475569'} strokeWidth={2.4} />
                  </TouchableOpacity>
                </View>

                {/* Form Error Banner if any */}
                {formError && (
                  <View style={styles.formErrorBanner}>
                    <AlertCircle size={14} color="#EF4444" strokeWidth={2.2} />
                    <Text style={styles.formErrorBannerText}>{formError}</Text>
                  </View>
                )}

                {/* Scrollable Registration Form Content */}
                <ScrollView
                  style={styles.registrationScrollView}
                  contentContainerStyle={styles.registrationScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  scrollEventThrottle={16}
                  decelerationRate="normal"
                  bounces={true}
                  overScrollMode="always"
                >
                  {/* PAGE 1: Personal Details, Demographics & Metrics */}
                  {regPage === 1 && (
                    <>
                      {/* Section 1: Primary Identity & Contact */}
                      <View style={styles.formSectionBox}>
                        <View style={styles.formField}>
                          <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                            Full Name <Text style={{ color: '#EF4444' }}>*</Text>
                          </Text>
                          <TextInput
                            style={[
                              styles.formInput,
                              {
                                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                borderColor: isDark ? '#334155' : '#E2E8F0',
                                color: isDark ? '#FFFFFF' : '#0F172A',
                              },
                            ]}
                            placeholder="Enter member name"
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            value={formFullName}
                            onChangeText={setFormFullName}
                            autoCapitalize="words"
                          />
                        </View>

                        <View style={styles.formRowTwoCol}>
                          <View style={[styles.formField, { flex: 1 }]}>
                            <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                              Contact Number <Text style={{ color: '#EF4444' }}>*</Text>
                            </Text>
                            <TextInput
                              style={[
                                styles.formInput,
                                {
                                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                  borderColor: isDark ? '#334155' : '#E2E8F0',
                                  color: isDark ? '#FFFFFF' : '#0F172A',
                                },
                              ]}
                              placeholder="Primary phone"
                              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                              value={formContactNumber}
                              onChangeText={(txt) => {
                                setFormContactNumber(txt);
                                if (!formWhatsAppNumber) setFormWhatsAppNumber(txt);
                              }}
                              keyboardType="phone-pad"
                            />
                          </View>

                          <View style={[styles.formField, { flex: 1 }]}>
                            <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                              WhatsApp Number <Text style={{ color: '#EF4444' }}>*</Text>
                            </Text>
                            <TextInput
                              style={[
                                styles.formInput,
                                {
                                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                  borderColor: isDark ? '#334155' : '#E2E8F0',
                                  color: isDark ? '#FFFFFF' : '#0F172A',
                                },
                              ]}
                              placeholder="WhatsApp phone"
                              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                              value={formWhatsAppNumber}
                              onChangeText={setFormWhatsAppNumber}
                              keyboardType="phone-pad"
                            />
                          </View>
                        </View>

                        <View style={styles.formRowTwoCol}>
                          <View style={[styles.formField, { flex: 1.2 }]}>
                            <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                              Email Address
                            </Text>
                            <TextInput
                              style={[
                                styles.formInput,
                                {
                                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                  borderColor: isDark ? '#334155' : '#E2E8F0',
                                  color: isDark ? '#FFFFFF' : '#0F172A',
                                },
                              ]}
                              placeholder="Email address"
                              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                              value={formEmail}
                              onChangeText={setFormEmail}
                              keyboardType="email-address"
                              autoCapitalize="none"
                            />
                          </View>

                          <View style={[styles.formField, { flex: 0.8 }]}>
                            <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                              Date of Birth
                            </Text>
                            <TextInput
                              style={[
                                styles.formInput,
                                {
                                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                  borderColor: isDark ? '#334155' : '#E2E8F0',
                                  color: isDark ? '#FFFFFF' : '#0F172A',
                                },
                              ]}
                              placeholder="YYYY-MM-DD"
                              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                              value={formDob}
                              onChangeText={setFormDob}
                            />
                          </View>
                        </View>

                        {/* Gender Segmented Picker */}
                        <View style={styles.formField}>
                          <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                            Gender <Text style={{ color: '#EF4444' }}>*</Text>
                          </Text>
                          <View style={styles.genderTabsRow}>
                            {(['Male', 'Female', 'Other'] as const).map((g) => (
                              <TouchableOpacity
                                key={g}
                                style={[
                                  styles.genderTabBtn,
                                  formGender === g
                                    ? { backgroundColor: '#0F172A', borderColor: '#0F172A' }
                                    : {
                                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                        borderColor: isDark ? '#334155' : '#E2E8F0',
                                      },
                                ]}
                                onPress={() => setFormGender(g)}
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    styles.genderTabText,
                                    { color: formGender === g ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B' },
                                  ]}
                                >
                                  {g}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </View>

                      {/* Section 2: Physical & Health Metrics */}
                      <View style={styles.formSectionBox}>
                        <View style={styles.formRowThreeCol}>
                          {/* Height with unit toggle */}
                          <View style={[styles.formField, { flex: 1 }]}>
                            <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                              Height ({formHeightUnit})
                            </Text>
                            <View
                              style={[
                                styles.metricInputContainer,
                                {
                                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                  borderColor: isDark ? '#334155' : '#E2E8F0',
                                },
                              ]}
                            >
                              <TextInput
                                style={[
                                  styles.metricInputField,
                                  { color: isDark ? '#FFFFFF' : '#0F172A' },
                                ]}
                                placeholder={formHeightUnit === 'cm' ? '175' : '5.9'}
                                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                value={formHeight}
                                onChangeText={setFormHeight}
                                keyboardType="numeric"
                              />
                              <TouchableOpacity
                                style={styles.metricUnitTouchArea}
                                onPress={() => setFormHeightUnit(formHeightUnit === 'cm' ? 'ft' : 'cm')}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.metricUnitBadgeText}>{formHeightUnit}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Weight with unit toggle */}
                          <View style={[styles.formField, { flex: 1 }]}>
                            <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                              Weight ({formWeightUnit})
                            </Text>
                            <View
                              style={[
                                styles.metricInputContainer,
                                {
                                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                  borderColor: isDark ? '#334155' : '#E2E8F0',
                                },
                              ]}
                            >
                              <TextInput
                                style={[
                                  styles.metricInputField,
                                  { color: isDark ? '#FFFFFF' : '#0F172A' },
                                ]}
                                placeholder={formWeightUnit === 'kg' ? '70' : '154'}
                                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                value={formWeight}
                                onChangeText={setFormWeight}
                                keyboardType="numeric"
                              />
                              <TouchableOpacity
                                style={styles.metricUnitTouchArea}
                                onPress={() => setFormWeightUnit(formWeightUnit === 'kg' ? 'lbs' : 'kg')}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.metricUnitBadgeText}>{formWeightUnit}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Blood Group */}
                          <View style={[styles.formField, { flex: 1 }]}>
                            <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                              Blood Group
                            </Text>
                            <TextInput
                              style={[
                                styles.formInput,
                                {
                                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                  borderColor: isDark ? '#334155' : '#E2E8F0',
                                  color: isDark ? '#FFFFFF' : '#0F172A',
                                },
                              ]}
                              placeholder="e.g. O+"
                              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                              value={formBloodGroup}
                              onChangeText={setFormBloodGroup}
                              autoCapitalize="characters"
                            />
                          </View>
                        </View>
                      </View>

                      {/* Section 3: Residential Address */}
                      <View style={styles.formSectionBox}>
                        <View style={styles.formField}>
                          <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                            Residential Address <Text style={{ color: '#EF4444' }}>*</Text>
                          </Text>
                          <TextInput
                            style={[
                              styles.formInput,
                              {
                                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                borderColor: isDark ? '#334155' : '#E2E8F0',
                                color: isDark ? '#FFFFFF' : '#0F172A',
                                height: 60,
                                paddingTop: 8,
                              },
                            ]}
                            placeholder="Complete residential address"
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            value={formAddress}
                            onChangeText={setFormAddress}
                            multiline
                          />
                        </View>
                      </View>

                      {/* Section 4: WhatsApp Consent Toggle (Integrated Desktop Card Footer) */}
                      <TouchableOpacity
                        style={[
                          styles.consentToggleRow,
                          { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                        ]}
                        onPress={() => setFormWhatsAppConsent(!formWhatsAppConsent)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.consentCheckbox,
                            formWhatsAppConsent && { backgroundColor: '#10B981', borderColor: '#10B981' },
                          ]}
                        >
                          {formWhatsAppConsent && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                        <Image
                          source={require('../../assets/whatsapp-logo.png')}
                          style={{ width: 16, height: 16, marginLeft: 8 }}
                          resizeMode="contain"
                        />
                        <Text style={[styles.consentHeadlineText, { color: isDark ? '#F8FAFC' : '#0F172A', flex: 1, marginLeft: 8 }]}>
                          WhatsApp notifications & updates
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* PAGE 2: Capture Member Photo */}
                  {regPage === 2 && (
                    <View style={{ flex: 1, paddingBottom: 40 }}>
                      {isLiveCameraActive ? (
                        /* In-Modal Real Device Camera Screen */
                        <View style={styles.cameraLiveContainer}>
                          <View style={styles.cameraViewfinderScreen}>
                            {/* Real Native Device Camera View */}
                            <CameraView
                              ref={liveCameraRef}
                              facing={cameraFacing}
                              enableTorch={cameraFlash}
                              style={styles.cameraLiveFeed}
                            />

                            {/* Camera HUD Header Overlay */}
                            <View style={styles.cameraHudHeader}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={styles.cameraLiveDot} />
                                <Text style={styles.cameraLiveStatusText}>
                                  {cameraFacing === 'front' ? 'FRONT CAMERA' : 'REAR CAMERA'}
                                </Text>
                              </View>

                              <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                  style={[styles.cameraHudIconBtn, cameraFlash && { backgroundColor: '#F59E0B' }]}
                                  onPress={() => setCameraFlash(!cameraFlash)}
                                  activeOpacity={0.7}
                                >
                                  {cameraFlash ? (
                                    <Zap size={15} color="#000000" strokeWidth={2.4} />
                                  ) : (
                                    <ZapOff size={15} color="#FFFFFF" strokeWidth={2.2} />
                                  )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.cameraHudIconBtn}
                                  onPress={() => setCameraFacing(cameraFacing === 'front' ? 'back' : 'front')}
                                  activeOpacity={0.7}
                                >
                                  <RefreshCw size={15} color="#FFFFFF" strokeWidth={2.2} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[styles.cameraHudIconBtn, { backgroundColor: 'rgba(239, 68, 68, 0.8)' }]}
                                  onPress={() => setIsLiveCameraActive(false)}
                                  activeOpacity={0.7}
                                >
                                  <X size={15} color="#FFFFFF" strokeWidth={2.5} />
                                </TouchableOpacity>
                              </View>
                            </View>

                            {/* Precision Portrait Framing Guides */}
                            <View style={styles.cameraReticleContainer} pointerEvents="none">
                              <View style={styles.reticleCornerTL} />
                              <View style={styles.reticleCornerTR} />
                              <View style={styles.reticleCornerBL} />
                              <View style={styles.reticleCornerBR} />
                              <View style={styles.portraitOvalGuideline} />
                            </View>

                            {/* Camera Shutter & Controls Bottom Bar */}
                            <View style={styles.cameraHudFooter}>
                              <TouchableOpacity
                                style={styles.cameraShutterOuterRing}
                                onPress={async () => {
                                  try {
                                    if (liveCameraRef.current) {
                                      const photo = await liveCameraRef.current.takePictureAsync({
                                        quality: 0.85,
                                      });
                                      if (photo?.uri) {
                                        setFormProfilePhoto(photo.uri);
                                      }
                                    }
                                  } catch (err: any) {
                                    Alert.alert('Capture Failed', err?.message || 'Could not take picture.');
                                  } finally {
                                    setIsLiveCameraActive(false);
                                  }
                                }}
                                activeOpacity={0.8}
                              >
                                <View style={styles.cameraShutterInnerCircle} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ) : (
                        /* Clean, Professional Member Photo Studio */
                        <View style={{ gap: 16 }}>
                          {/* Main Profile Canvas Box */}
                          <View
                            style={[
                              styles.proPhotoCard,
                              {
                                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                borderColor: isDark ? '#334155' : '#E2E8F0',
                              },
                            ]}
                          >
                            {/* Portrait Avatar Circle */}
                            <TouchableOpacity
                              style={[
                                styles.proAvatarCircle,
                                {
                                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                                  borderColor: formProfilePhoto
                                    ? '#10B981'
                                    : isDark
                                    ? '#475569'
                                    : '#CBD5E1',
                                },
                              ]}
                              onPress={async () => {
                                if (!cameraPermission?.granted) {
                                  const res = await requestCameraPermission();
                                  if (!res.granted) {
                                    Alert.alert(
                                      'Camera Permission Needed',
                                      'Please enable Camera permission in iOS Settings to take member photos.'
                                    );
                                    return;
                                  }
                                }
                                setIsLiveCameraActive(true);
                              }}
                              activeOpacity={0.8}
                            >
                              {formProfilePhoto ? (
                                <Image
                                  source={{ uri: formProfilePhoto }}
                                  style={styles.proAvatarImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.proAvatarPlaceholder}>
                                  <Camera
                                    size={36}
                                    color={isDark ? '#64748B' : '#94A3B8'}
                                    strokeWidth={1.7}
                                  />
                                </View>
                              )}

                              {/* Subtle Corner Badge */}
                              <View
                                style={[
                                  styles.proAvatarBadge,
                                  {
                                    backgroundColor: formProfilePhoto
                                      ? '#10B981'
                                      : isDark
                                      ? '#334155'
                                      : '#64748B',
                                  },
                                ]}
                              >
                                {formProfilePhoto ? (
                                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                                ) : (
                                  <Camera size={12} color="#FFFFFF" strokeWidth={2.4} />
                                )}
                              </View>
                            </TouchableOpacity>

                            {/* Minimal Clean Typography */}
                            <View style={{ alignItems: 'center', marginTop: 12, gap: 3 }}>
                              <Text
                                style={[
                                  styles.proTitle,
                                  { color: isDark ? '#FFFFFF' : '#0F172A' },
                                ]}
                              >
                                {formProfilePhoto ? 'Profile Photo Added' : 'Member Profile Photo'}
                              </Text>
                              <Text
                                style={[
                                  styles.proSubtitle,
                                  { color: isDark ? '#94A3B8' : '#64748B' },
                                ]}
                              >
                                {formProfilePhoto
                                  ? 'This photo will appear on member records and digital check-in.'
                                  : 'Capture using device camera or choose from your photo library.'}
                              </Text>
                            </View>

                            {/* Action Buttons: Clean & Direct */}
                            <View style={styles.proActionRow}>
                              <TouchableOpacity
                                style={[styles.proPrimaryBtn, { backgroundColor: '#EA580C' }]}
                                onPress={async () => {
                                  if (!cameraPermission?.granted) {
                                    const res = await requestCameraPermission();
                                    if (!res.granted) {
                                      Alert.alert(
                                        'Camera Permission Needed',
                                        'Please enable Camera permission in iOS Settings to take member photos.'
                                      );
                                      return;
                                    }
                                  }
                                  setIsLiveCameraActive(true);
                                }}
                                activeOpacity={0.8}
                              >
                                <Camera size={16} color="#FFFFFF" strokeWidth={2.2} />
                                <Text style={styles.proPrimaryBtnText}>
                                  {formProfilePhoto ? 'Retake Photo' : 'Take Photo'}
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.proSecondaryBtn,
                                  {
                                    backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                                    borderColor: isDark ? '#334155' : '#E2E8F0',
                                  },
                                ]}
                                onPress={async () => {
                                  try {
                                    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                                    if (!perm.granted) {
                                      Alert.alert(
                                        'Permission Denied',
                                        'Photo gallery access is required.'
                                      );
                                      return;
                                    }
                                    const res = await ImagePicker.launchImageLibraryAsync({
                                      mediaTypes: ['images'],
                                      allowsEditing: true,
                                      aspect: [1, 1],
                                      quality: 0.85,
                                    });
                                    if (!res.canceled && res.assets?.[0]?.uri) {
                                      setFormProfilePhoto(res.assets[0].uri);
                                    }
                                  } catch (e: any) {
                                    Alert.alert(
                                      'Gallery Error',
                                      e?.message || 'Could not select photo'
                                    );
                                  }
                                }}
                                activeOpacity={0.8}
                              >
                                <UploadCloud
                                  size={16}
                                  color={isDark ? '#E2E8F0' : '#334155'}
                                  strokeWidth={2.2}
                                />
                                <Text
                                  style={[
                                    styles.proSecondaryBtnText,
                                    { color: isDark ? '#E2E8F0' : '#334155' },
                                  ]}
                                >
                                  Choose File
                                </Text>
                              </TouchableOpacity>

                              {formProfilePhoto && (
                                <TouchableOpacity
                                  style={[
                                    styles.proDeleteBtn,
                                    {
                                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                                      borderColor: isDark ? '#334155' : '#E2E8F0',
                                    },
                                  ]}
                                  onPress={() => setFormProfilePhoto(null)}
                                  activeOpacity={0.8}
                                >
                                  <Trash2 size={16} color="#EF4444" strokeWidth={2} />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>

                          {/* Security & Non-Custodial Data Policy - FAQs */}
                          <View style={{ marginTop: 6, gap: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <ShieldCheck size={14} color="#EA580C" strokeWidth={2.4} />
                              <Text
                                style={{
                                  fontSize: 11.5,
                                  fontWeight: '800',
                                  color: isDark ? '#FFFFFF' : '#0F172A',
                                  letterSpacing: 0.2,
                                  textTransform: 'uppercase',
                                }}
                              >
                                Security & Non-Custodial Data Policy
                              </Text>
                            </View>

                            {/* FAQ Item 1: How to click member photo */}
                            <View
                              style={[
                                styles.faqAccordionCard,
                                {
                                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                  borderColor: isDark ? '#334155' : '#E2E8F0',
                                },
                              ]}
                            >
                              <TouchableOpacity
                                style={styles.faqHeaderBtn}
                                onPress={() =>
                                  setExpandedFaqId(expandedFaqId === 'how_to_click' ? null : 'how_to_click')
                                }
                                activeOpacity={0.7}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                  <Camera size={14} color="#EA580C" strokeWidth={2.2} />
                                  <Text
                                    style={[
                                      styles.faqQuestionText,
                                      { color: isDark ? '#FFFFFF' : '#0F172A' },
                                    ]}
                                  >
                                    How to capture an optimal photo?
                                  </Text>
                                </View>
                                <ChevronDown
                                  size={15}
                                  color={isDark ? '#94A3B8' : '#64748B'}
                                  style={{
                                    transform: [{ rotate: expandedFaqId === 'how_to_click' ? '180deg' : '0deg' }],
                                  }}
                                />
                              </TouchableOpacity>
                              {expandedFaqId === 'how_to_click' && (
                                <View style={styles.faqAnswerBody}>
                                  <Text
                                    style={[
                                      styles.faqAnswerText,
                                      { color: isDark ? '#94A3B8' : '#64748B' },
                                    ]}
                                  >
                                    Align the member's face directly facing the camera with neutral lighting. Avoid dark backlights or heavy caps/sunglasses so facial attributes are clearly recognizable on the member directory and biometric turnstiles.
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* FAQ Item 2: How will photos be used */}
                            <View
                              style={[
                                styles.faqAccordionCard,
                                {
                                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                  borderColor: isDark ? '#334155' : '#E2E8F0',
                                },
                              ]}
                            >
                              <TouchableOpacity
                                style={styles.faqHeaderBtn}
                                onPress={() =>
                                  setExpandedFaqId(expandedFaqId === 'photo_usage' ? null : 'photo_usage')
                                }
                                activeOpacity={0.7}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                  <UserCheck size={14} color="#EA580C" strokeWidth={2.2} />
                                  <Text
                                    style={[
                                      styles.faqQuestionText,
                                      { color: isDark ? '#FFFFFF' : '#0F172A' },
                                    ]}
                                  >
                                    How will this photo be used?
                                  </Text>
                                </View>
                                <ChevronDown
                                  size={15}
                                  color={isDark ? '#94A3B8' : '#64748B'}
                                  style={{
                                    transform: [{ rotate: expandedFaqId === 'photo_usage' ? '180deg' : '0deg' }],
                                  }}
                                />
                              </TouchableOpacity>
                              {expandedFaqId === 'photo_usage' && (
                                <View style={styles.faqAnswerBody}>
                                  <Text
                                    style={[
                                      styles.faqAnswerText,
                                      { color: isDark ? '#94A3B8' : '#64748B' },
                                    ]}
                                  >
                                    The portrait is strictly used for gym check-in verification, physical membership card printing, and member profile verification in your gym staff directory.
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* FAQ Item 3: Non-Custodial Data Policy */}
                            <View
                              style={[
                                styles.faqAccordionCard,
                                {
                                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                  borderColor: isDark ? '#334155' : '#E2E8F0',
                                },
                              ]}
                            >
                              <TouchableOpacity
                                style={styles.faqHeaderBtn}
                                onPress={() =>
                                  setExpandedFaqId(expandedFaqId === 'data_security' ? null : 'data_security')
                                }
                                activeOpacity={0.7}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                  <ShieldCheck size={14} color="#EA580C" strokeWidth={2.2} />
                                  <Text
                                    style={[
                                      styles.faqQuestionText,
                                      { color: isDark ? '#FFFFFF' : '#0F172A' },
                                    ]}
                                  >
                                    Non-Custodial Data Policy & privacy?
                                  </Text>
                                </View>
                                <ChevronDown
                                  size={15}
                                  color={isDark ? '#94A3B8' : '#64748B'}
                                  style={{
                                    transform: [{ rotate: expandedFaqId === 'data_security' ? '180deg' : '0deg' }],
                                  }}
                                />
                              </TouchableOpacity>
                              {expandedFaqId === 'data_security' && (
                                <View style={styles.faqAnswerBody}>
                                  <Text
                                    style={[
                                      styles.faqAnswerText,
                                      { color: isDark ? '#94A3B8' : '#64748B' },
                                    ]}
                                  >
                                    GymDeck follows an air-gapped non-custodial storage policy. Member photos and credentials are encrypted on your local SQLite storage and are never sold, centralized, or harvested by third parties.
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* PAGE 3: Upload Member Documents */}
                  {regPage === 3 && (
                    <View style={{ gap: 10 }}>
                      {/* Aadhaar Card (Required) */}
                      <View style={[styles.docUploadCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: formDocs.aadhaar ? '#10B981' : isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={[styles.docUploadIconBox, { backgroundColor: '#EEF2FF' }]}>
                          <FileText size={18} color="#4F46E5" strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.docCardTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Aadhaar Card</Text>
                            <Text style={{ color: '#EF4444', fontWeight: '900' }}>*</Text>
                            <View style={styles.requiredPill}><Text style={styles.requiredPillText}>Required</Text></View>
                          </View>
                          <Text style={[styles.docCardSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>Identity proof (front & back)</Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.docTriggerBtn,
                            formDocs.aadhaar
                              ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }
                              : { backgroundColor: '#0F172A', borderColor: '#0F172A' },
                          ]}
                          onPress={() => {
                            setFormDocs({
                              ...formDocs,
                              aadhaar: formDocs.aadhaar ? null : 'aadhaar_doc_preview.pdf',
                            });
                          }}
                        >
                          {formDocs.aadhaar ? (
                            <>
                              <Check size={12} color="#059669" strokeWidth={3} />
                              <Text style={[styles.docTriggerBtnText, { color: '#059669' }]}>Uploaded</Text>
                            </>
                          ) : (
                            <>
                              <UploadCloud size={12} color="#FFFFFF" strokeWidth={2.4} />
                              <Text style={[styles.docTriggerBtnText, { color: '#FFFFFF' }]}>Upload</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* Residential Proof */}
                      <View style={[styles.docUploadCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: formDocs.residential ? '#10B981' : isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={[styles.docUploadIconBox, { backgroundColor: '#ECFDF5' }]}>
                          <MapPin size={18} color="#059669" strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.docCardTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Residential Proof</Text>
                          <Text style={[styles.docCardSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>Utility bill, rent agreement, or address proof</Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.docTriggerBtn,
                            formDocs.residential
                              ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }
                              : { backgroundColor: isDark ? '#334155' : '#F1F5F9', borderColor: isDark ? '#475569' : '#CBD5E1' },
                          ]}
                          onPress={() => {
                            setFormDocs({
                              ...formDocs,
                              residential: formDocs.residential ? null : 'residential_proof.pdf',
                            });
                          }}
                        >
                          {formDocs.residential ? (
                            <>
                              <Check size={12} color="#059669" strokeWidth={3} />
                              <Text style={[styles.docTriggerBtnText, { color: '#059669' }]}>Uploaded</Text>
                            </>
                          ) : (
                            <>
                              <UploadCloud size={12} color={isDark ? '#FFFFFF' : '#0F172A'} strokeWidth={2.4} />
                              <Text style={[styles.docTriggerBtnText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Upload</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* Health Certificate */}
                      <View style={[styles.docUploadCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: formDocs.health ? '#10B981' : isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={[styles.docUploadIconBox, { backgroundColor: '#EFF6FF' }]}>
                          <ShieldCheck size={18} color="#2563EB" strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.docCardTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Health Certificate</Text>
                          <Text style={[styles.docCardSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>Medical clearance or fitness certificate</Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.docTriggerBtn,
                            formDocs.health
                              ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }
                              : { backgroundColor: isDark ? '#334155' : '#F1F5F9', borderColor: isDark ? '#475569' : '#CBD5E1' },
                          ]}
                          onPress={() => {
                            setFormDocs({
                              ...formDocs,
                              health: formDocs.health ? null : 'fitness_cert.pdf',
                            });
                          }}
                        >
                          {formDocs.health ? (
                            <>
                              <Check size={12} color="#059669" strokeWidth={3} />
                              <Text style={[styles.docTriggerBtnText, { color: '#059669' }]}>Uploaded</Text>
                            </>
                          ) : (
                            <>
                              <UploadCloud size={12} color={isDark ? '#FFFFFF' : '#0F172A'} strokeWidth={2.4} />
                              <Text style={[styles.docTriggerBtnText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Upload</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* Others */}
                      <View style={[styles.docUploadCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: formDocs.others ? '#10B981' : isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={[styles.docUploadIconBox, { backgroundColor: '#FFFBEB' }]}>
                          <FileText size={18} color="#D97706" strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.docCardTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Others</Text>
                          <Text style={[styles.docCardSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>Any other supporting documents</Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.docTriggerBtn,
                            formDocs.others
                              ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }
                              : { backgroundColor: isDark ? '#334155' : '#F1F5F9', borderColor: isDark ? '#475569' : '#CBD5E1' },
                          ]}
                          onPress={() => {
                            setFormDocs({
                              ...formDocs,
                              others: formDocs.others ? null : 'other_doc.pdf',
                            });
                          }}
                        >
                          {formDocs.others ? (
                            <>
                              <Check size={12} color="#059669" strokeWidth={3} />
                              <Text style={[styles.docTriggerBtnText, { color: '#059669' }]}>Uploaded</Text>
                            </>
                          ) : (
                            <>
                              <UploadCloud size={12} color={isDark ? '#FFFFFF' : '#0F172A'} strokeWidth={2.4} />
                              <Text style={[styles.docTriggerBtnText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Upload</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* Document disclaimer */}
                      <View style={[styles.disclaimerBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <ShieldCheck size={15} color="#6366F1" strokeWidth={2.2} />
                        <Text style={[styles.disclaimerText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                          Aadhaar Card is required to complete profile. Accepted formats: JPG, PNG or PDF. Files are encrypted in GymDeck local data store.
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* PAGE 4: Membership Planning (Plan Selection + Joining Fee + GST + Add-ons) */}
                  {regPage === 4 && (
                    <View style={{ gap: 12 }}>
                      {/* Section: Select Membership Plan */}
                      <View style={styles.formSectionBox}>
                        <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155', marginBottom: 2 }]}>
                          Available Membership Packages
                        </Text>
                        {availablePlans.length === 0 ? (
                          <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B' }}>
                            No active plans configured. Member will be admitted under Free / Trial tier.
                          </Text>
                        ) : (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {availablePlans.map((p) => {
                              const isPlanSelected = formSelectedPlanId === p.id;
                              return (
                                <TouchableOpacity
                                  key={p.id}
                                  style={[
                                    styles.planSelectorCard,
                                    isPlanSelected
                                      ? { backgroundColor: '#0F172A', borderColor: '#0F172A' }
                                      : {
                                          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                          borderColor: isDark ? '#334155' : '#E2E8F0',
                                        },
                                  ]}
                                  onPress={() => {
                                    setFormSelectedPlanId(isPlanSelected ? undefined : p.id);
                                  }}
                                  activeOpacity={0.8}
                                >
                                  <Text
                                    style={[
                                      styles.planSelectorTitle,
                                      { color: isPlanSelected ? '#FFFFFF' : isDark ? '#F8FAFC' : '#0F172A' },
                                    ]}
                                  >
                                    {p.planName}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.planSelectorPrice,
                                      { color: isPlanSelected ? '#F97316' : '#EA580C' },
                                    ]}
                                  >
                                    ₹{p.price}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.planSelectorDuration,
                                      { color: isPlanSelected ? '#94A3B8' : isDark ? '#64748B' : '#94A3B8' },
                                    ]}
                                  >
                                    {p.durationDays} Days
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        )}
                      </View>

                      {/* One-Time Joining Fee Card */}
                      <View style={[styles.controlBoxCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={[styles.miniIconBadge, { backgroundColor: '#EEF2FF' }]}>
                              <CreditCard size={14} color="#4F46E5" strokeWidth={2.4} />
                            </View>
                            <Text style={[styles.controlBoxTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>One-Time Joining Fee</Text>
                          </View>
                          <View style={styles.discretionaryBadge}><Text style={styles.discretionaryBadgeText}>Discretionary</Text></View>
                        </View>
                        <Text style={[styles.controlBoxSubtitle, { color: isDark ? '#94A3B8' : '#64748B', marginTop: 4 }]}>
                          Admission fee can be customized, discounted, or waived.
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          <View style={[styles.priceInputBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            <Text style={styles.currencyPrefix}>₹</Text>
                            <TextInput
                              style={[styles.priceInputNumber, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
                              value={String(formJoiningFee)}
                              onChangeText={(val) => setFormJoiningFee(Number(val.replace(/[^0-9]/g, '')) || 0)}
                              keyboardType="numeric"
                            />
                          </View>
                          <TouchableOpacity
                            style={[styles.presetChip, formJoiningFee === 0 && styles.presetChipActive]}
                            onPress={() => setFormJoiningFee(0)}
                          >
                            <Text style={[styles.presetChipText, formJoiningFee === 0 && styles.presetChipTextActive]}>Waive</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.presetChip, formJoiningFee === 500 && styles.presetChipActive]}
                            onPress={() => setFormJoiningFee(500)}
                          >
                            <Text style={[styles.presetChipText, formJoiningFee === 500 && styles.presetChipTextActive]}>₹500</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.presetChip, formJoiningFee === 1000 && styles.presetChipActive]}
                            onPress={() => setFormJoiningFee(1000)}
                          >
                            <Text style={[styles.presetChipText, formJoiningFee === 1000 && styles.presetChipTextActive]}>₹1k</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* GST Taxing Control Card */}
                      <View style={[styles.controlBoxCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                            onPress={() => setFormGstEnabled(!formGstEnabled)}
                          >
                            <View style={[styles.consentCheckbox, formGstEnabled && { backgroundColor: '#2563EB', borderColor: '#2563EB' }]}>
                              {formGstEnabled && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                            </View>
                            <Text style={[styles.controlBoxTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>GST Taxing</Text>
                          </TouchableOpacity>
                          <View style={styles.discretionaryBadge}><Text style={styles.discretionaryBadgeText}>Optional</Text></View>
                        </View>
                        {formGstEnabled && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                            {([5, 12, 18] as const).map((rate) => (
                              <TouchableOpacity
                                key={rate}
                                style={[styles.presetChip, formGstRate === rate && styles.presetChipActive]}
                                onPress={() => setFormGstRate(rate)}
                              >
                                <Text style={[styles.presetChipText, formGstRate === rate && styles.presetChipTextActive]}>{rate}%</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>

                      {/* Add-on Amenities & Services Card */}
                      <View style={[styles.controlBoxCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Sparkles size={14} color="#6366F1" strokeWidth={2.4} />
                            <Text style={[styles.controlBoxTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Add-On Amenities</Text>
                          </View>
                          <View style={styles.discretionaryBadge}><Text style={styles.discretionaryBadgeText}>Optional</Text></View>
                        </View>

                        {[
                          { id: 'locker', name: 'Personal Locker', fee: 500, icon: ShieldCheck, color: '#4F46E5' },
                          { id: 'pt', name: 'PT Starter Pack', fee: 1500, icon: Dumbbell, color: '#059669' },
                          { id: 'diet', name: 'Diet Consultation', fee: 800, icon: ActivityIndicator, color: '#D97706' },
                          { id: 'sauna', name: 'Steam & Sauna', fee: 600, icon: Sparkles, color: '#2563EB' },
                        ].map((addon) => {
                          const isChecked = formSelectedAddons[addon.id] !== undefined;
                          return (
                            <TouchableOpacity
                              key={addon.id}
                              style={[
                                styles.addonRowItem,
                                {
                                  backgroundColor: isChecked ? (isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF') : isDark ? '#0F172A' : '#F8FAFC',
                                  borderColor: isChecked ? '#6366F1' : isDark ? '#334155' : '#E2E8F0',
                                },
                              ]}
                              onPress={() => {
                                const next = { ...formSelectedAddons };
                                if (isChecked) delete next[addon.id];
                                else next[addon.id] = addon.fee;
                                setFormSelectedAddons(next);
                              }}
                              activeOpacity={0.8}
                            >
                              <View style={[styles.consentCheckbox, isChecked && { backgroundColor: '#6366F1', borderColor: '#6366F1' }]}>
                                {isChecked && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                              </View>
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[styles.addonNameText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{addon.name}</Text>
                              </View>
                              <Text style={[styles.addonFeeText, { color: isDark ? '#C7D2FE' : '#4F46E5' }]}>+₹{addon.fee}</Text>
                            </TouchableOpacity>
                          );
                        })}

                        {/* Custom Addons list */}
                        {formCustomAddons.map((ca) => (
                          <View
                            key={ca.id}
                            style={[styles.addonRowItem, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                          >
                            <Sparkles size={13} color="#6366F1" strokeWidth={2} />
                            <Text style={[styles.addonNameText, { flex: 1, marginLeft: 8, color: isDark ? '#FFFFFF' : '#0F172A' }]}>{ca.name}</Text>
                            <Text style={[styles.addonFeeText, { color: '#10B981', marginRight: 8 }]}>+₹{ca.amount}</Text>
                            <TouchableOpacity onPress={() => setFormCustomAddons(formCustomAddons.filter((x) => x.id !== ca.id))}>
                              <Trash2 size={13} color="#EF4444" strokeWidth={2} />
                            </TouchableOpacity>
                          </View>
                        ))}

                        {showCustomAddonInput ? (
                          <View style={{ gap: 8, marginTop: 6 }}>
                            <TextInput
                              style={[styles.formInput, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#FFFFFF' : '#0F172A' }]}
                              placeholder="Service name (e.g. Gym Bag / Towel)"
                              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                              value={newCustomAddonName}
                              onChangeText={setNewCustomAddonName}
                            />
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <TextInput
                                style={[styles.formInput, { flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#FFFFFF' : '#0F172A' }]}
                                placeholder="Fee (INR)"
                                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                value={newCustomAddonAmount}
                                onChangeText={setNewCustomAddonAmount}
                                keyboardType="numeric"
                              />
                              <TouchableOpacity
                                style={[styles.presetChip, styles.presetChipActive, { paddingHorizontal: 16 }]}
                                onPress={() => {
                                  if (newCustomAddonName.trim() && Number(newCustomAddonAmount) > 0) {
                                    setFormCustomAddons([
                                      ...formCustomAddons,
                                      {
                                        id: Date.now().toString(),
                                        name: newCustomAddonName.trim(),
                                        amount: Number(newCustomAddonAmount),
                                      },
                                    ]);
                                    setNewCustomAddonName('');
                                    setNewCustomAddonAmount('');
                                    setShowCustomAddonInput(false);
                                  }
                                }}
                              >
                                <Text style={styles.presetChipTextActive}>Add</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.addCustomBtn, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                            onPress={() => setShowCustomAddonInput(true)}
                          >
                            <Plus size={12} color="#6366F1" strokeWidth={2.4} />
                            <Text style={styles.addCustomBtnText}>Add Custom Service / Fee</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}

                  {/* PAGE 5: Payment Settlement & Bill Summary */}
                  {regPage === 5 && (
                    <View style={{ gap: 12 }}>
                      {/* Left/Top: Invoice Itemization Card */}
                      <View style={[styles.controlBoxCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <Text style={[styles.controlBoxTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Invoice Itemization</Text>
                          <Text style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                            TX-GD-REC-24B
                          </Text>
                        </View>

                        {/* Line items */}
                        <View style={{ gap: 8 }}>
                          <View style={styles.invoiceItemRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.invoiceItemName, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                                {availablePlans.find((p) => p.id === formSelectedPlanId)?.planName || 'Free / Trial Tier'}
                              </Text>
                              <Text style={[styles.invoiceItemSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>Membership Plan</Text>
                            </View>
                            <Text style={[styles.invoiceItemAmount, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                              ₹{availablePlans.find((p) => p.id === formSelectedPlanId)?.price || 0}
                            </Text>
                          </View>

                          <View style={styles.invoiceItemRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.invoiceItemName, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>One-Time Joining Fee</Text>
                              <Text style={[styles.invoiceItemSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>Admission charge</Text>
                            </View>
                            <Text style={[styles.invoiceItemAmount, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>₹{formJoiningFee}</Text>
                          </View>

                          {(Object.values(formSelectedAddons).reduce((acc, curr) => acc + curr, 0) +
                            formCustomAddons.reduce((acc, curr) => acc + curr.amount, 0) > 0) && (
                            <View style={styles.invoiceItemRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.invoiceItemName, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Add-on Amenities & Services</Text>
                                <Text style={[styles.invoiceItemSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>Selected options</Text>
                              </View>
                              <Text style={[styles.invoiceItemAmount, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                                ₹{Object.values(formSelectedAddons).reduce((acc, curr) => acc + curr, 0) +
                                  formCustomAddons.reduce((acc, curr) => acc + curr.amount, 0)}
                              </Text>
                            </View>
                          )}

                          <View style={styles.invoiceItemRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.invoiceItemName, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Taxes & Surcharges</Text>
                              <Text style={[styles.invoiceItemSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                                {formGstEnabled ? `GST ${formGstRate}% included` : 'Inclusive of all taxes'}
                              </Text>
                            </View>
                            <Text style={[styles.invoiceItemAmount, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                              ₹{formGstEnabled
                                ? Math.round(
                                    ((Number(availablePlans.find((p) => p.id === formSelectedPlanId)?.price || 0) +
                                      formJoiningFee +
                                      Object.values(formSelectedAddons).reduce((acc, curr) => acc + curr, 0) +
                                      formCustomAddons.reduce((acc, curr) => acc + curr.amount, 0)) *
                                      formGstRate) /
                                      100
                                  )
                                : 0}
                            </Text>
                          </View>
                        </View>

                        {/* Total Amount Payable Banner */}
                        <View style={[styles.totalAmountPayableBar, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                          <View>
                            <Text style={[styles.totalLabel, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Total Amount Payable</Text>
                            <Text style={[styles.totalSubtext, { color: isDark ? '#94A3B8' : '#64748B' }]}>Tax inclusive summary</Text>
                          </View>
                          <Text style={styles.totalBigAmount}>
                            ₹{Math.round(
                              (Number(availablePlans.find((p) => p.id === formSelectedPlanId)?.price || 0) +
                                formJoiningFee +
                                Object.values(formSelectedAddons).reduce((acc, curr) => acc + curr, 0) +
                                formCustomAddons.reduce((acc, curr) => acc + curr.amount, 0)) *
                                (formGstEnabled ? 1 + formGstRate / 100 : 1)
                            )}
                          </Text>
                        </View>
                      </View>

                      {/* Right/Bottom: Payment Mode Selection */}
                      <View style={[styles.controlBoxCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <Text style={[styles.controlBoxTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Select Payment Mode</Text>
                          {isDynamicQrActive && (
                            <TouchableOpacity onPress={() => setIsDynamicQrActive(false)}>
                              <Text style={{ fontSize: 11, color: '#F97316', fontWeight: '700' }}>Change Mode</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Mode 1: Cash Settlement */}
                        <TouchableOpacity
                          style={[
                            styles.paymentModeOptionBox,
                            formPaymentMethod === 'CASH' && !isDynamicQrActive
                              ? { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5', borderColor: '#10B981' }
                              : { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                          ]}
                          onPress={() => {
                            setFormPaymentMethod('CASH');
                            setIsDynamicQrActive(false);
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.paymentModeIcon, { backgroundColor: '#ECFDF5' }]}>
                            <Banknote size={18} color="#059669" strokeWidth={2.2} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[styles.paymentModeTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Cash Settlement</Text>
                            <Text style={[styles.paymentModeSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>Collect physical currency at desk</Text>
                          </View>
                          <View style={styles.tagDirectDesk}><Text style={styles.tagDirectDeskText}>DIRECT DESK</Text></View>
                        </TouchableOpacity>

                        {/* Mode 2: UPI / Scan QR */}
                        <TouchableOpacity
                          style={[
                            styles.paymentModeOptionBox,
                            formPaymentMethod === 'UPI' || isDynamicQrActive
                              ? { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF', borderColor: '#6366F1' }
                              : { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' },
                            { marginTop: 8 },
                          ]}
                          onPress={() => {
                            setFormPaymentMethod('UPI');
                            setIsDynamicQrActive(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.paymentModeIcon, { backgroundColor: '#EEF2FF' }]}>
                            <QrCode size={18} color="#4F46E5" strokeWidth={2.2} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[styles.paymentModeTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>UPI / Scan QR</Text>
                            <Text style={[styles.paymentModeSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>Dynamic QR scan or VPA push</Text>
                          </View>
                          <View style={styles.tagInstant}><Text style={styles.tagInstantText}>INSTANT</Text></View>
                        </TouchableOpacity>

                        {/* Mode 3: Card Terminal (Coming Soon Disabled) */}
                        <View style={[styles.paymentModeOptionBox, styles.paymentModeDisabled, { marginTop: 8 }]}>
                          <View style={[styles.paymentModeIcon, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                            <CreditCard size={18} color="#94A3B8" strokeWidth={2.2} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[styles.paymentModeTitle, { color: '#94A3B8' }]}>Card Terminal</Text>
                            <Text style={[styles.paymentModeSubtitle, { color: '#94A3B8' }]}>POS reader swipe, tap & chip processing</Text>
                          </View>
                          <View style={styles.tagComingSoon}><Text style={styles.tagComingSoonText}>COMING SOON</Text></View>
                        </View>

                        {/* Dynamic QR Display or UPI Push Helper */}
                        {isDynamicQrActive && (
                          <View style={[styles.qrOverlayBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            <View style={styles.qrInnerRow}>
                              {/* Vector QR code display */}
                              <View style={styles.qrCodeBox}>
                                <QrCode size={64} color="#0F172A" strokeWidth={2} />
                                <View style={styles.qrLiveBadge}>
                                  <View style={styles.greenPulseDot} />
                                  <Text style={styles.qrLiveText}>Live Dynamic QR</Text>
                                </View>
                              </View>
                              <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.qrBeneficiaryTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>Verified Settlement</Text>
                                <Text style={[styles.qrBeneficiaryName, { color: isDark ? '#C7D2FE' : '#4F46E5' }]}>GYMDECK HEALTH PVT</Text>
                                <Text style={[styles.qrBeneficiaryVpa, { color: isDark ? '#94A3B8' : '#64748B' }]}>gymdeck@okaxis</Text>
                                <View style={{ flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                                  {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((app) => (
                                    <View key={app} style={styles.appPill}><Text style={styles.appPillText}>{app}</Text></View>
                                  ))}
                                </View>
                              </View>
                            </View>
                            <Text style={[styles.qrHelpNote, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                              Ask member to scan this QR code with any UPI app to pay.
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Digital Receipt Toggle */}
                      <TouchableOpacity
                        style={[
                          styles.consentToggleRow,
                          { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
                        ]}
                        onPress={() => setFormSendDigitalReceipt(!formSendDigitalReceipt)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.consentCheckbox,
                            formSendDigitalReceipt && { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
                          ]}
                        >
                          {formSendDigitalReceipt && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.consentHeadlineText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                            Generate & Send Digital Receipt
                          </Text>
                          <Text style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B', marginTop: 1 }}>
                            Delivered via WhatsApp / SMS upon profile activation.
                          </Text>
                        </View>
                        <View style={styles.automatedBadge}><Text style={styles.automatedBadgeText}>Automated</Text></View>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={{ height: 24 }} />
                </ScrollView>

                {/* Shared Action Footer (Fixed at bottom of modal with Safe Area insets) */}
                <View
                  style={[
                    styles.registrationBottomBar,
                    {
                      borderTopColor: isDark ? '#1E293B' : '#F1F5F9',
                      paddingBottom: Math.max(insets.bottom, 16),
                    },
                  ]}
                >
                  {regPage === 1 ? (
                    <TouchableOpacity
                      style={[
                        styles.registrationCancelBtn,
                        {
                          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                          borderColor: isDark ? '#334155' : '#E2E8F0',
                        },
                      ]}
                      onPress={closeAddMemberModal}
                    >
                      <Text style={[styles.registrationCancelBtnText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.registrationCancelBtn,
                        {
                          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                          borderColor: isDark ? '#334155' : '#E2E8F0',
                        },
                      ]}
                      onPress={handlePrevPage}
                    >
                      <Text style={[styles.registrationCancelBtnText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                        ← Back
                      </Text>
                    </TouchableOpacity>
                  )}

                  {regPage < 5 ? (
                    <TouchableOpacity
                      style={styles.registrationSubmitBtn}
                      onPress={handleNextPage}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.registrationSubmitBtnText}>NEXT</Text>
                      <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.4} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.registrationSubmitBtn,
                        formIsSubmitting && { opacity: 0.6 },
                      ]}
                      onPress={handleRegisterMember}
                      disabled={formIsSubmitting}
                      activeOpacity={0.85}
                    >
                      {formIsSubmitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <UserPlus size={15} color="#FFFFFF" strokeWidth={2.4} />
                          <Text style={styles.registrationSubmitBtnText}>Save & Finish</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </View>
      </Modal>

      {/* 3. Members List (Paginated: 10 per page) */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#F97316" />
          <Text style={[styles.loadingText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Loading members from database...
          </Text>
        </View>
      ) : paginatedMembers.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
          <Users size={32} color={isDark ? '#475569' : '#CBD5E1'} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
            No members found
          </Text>
          <Text style={[styles.emptySubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {search ? `No members match "${search}".` : 'No members found under this status filter.'}
          </Text>
        </View>
      ) : (
        <View style={styles.membersList}>
          {paginatedMembers.map((member: GymMemberSummary) => {
            const statusStyle = getStatusColor(member.membershipStatus);
            const joinedText = member.joinedAt
              ? new Date(member.joinedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
              : 'N/A';

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
                {/* Top Row: Avatar + Name/Code */}
                <View style={styles.memberTopRow}>
                  <Avatar
                    name={member.fullName}
                    photoUrl={member.profilePhotoUrl}
                    gender={(member as any).gender}
                    size="md"
                    showStatusDot={false}
                  />

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.memberName, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                      {member.fullName}
                    </Text>
                    <Text style={[styles.memberCode, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      {member.memberCode} · Joined {joinedText}
                    </Text>
                  </View>
                </View>

                {/* Info Bar: Membership Expiration / Validity */}
                {member.expiresAt ? (
                  <View style={[styles.infoBar, { borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
                    <Text style={[styles.infoText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      Validity: <Text style={{ fontWeight: '700', color: isDark ? '#F8FAFC' : '#0F172A' }}>Expires {new Date(member.expiresAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                    </Text>
                  </View>
                ) : null}

                {/* Bottom Actions: View Profile (Clean View Button), Call, WhatsApp, Email */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.viewProfileBtn, { backgroundColor: '#0F172A' }]}
                    onPress={() => router.push(`/members/${member.id}` as any)}
                    activeOpacity={0.8}
                  >
                    <Eye size={13} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.viewProfileBtnText}>View</Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    {/* 1. Phone Call Button */}
                    {member.phone && member.phone !== '0000000000' && (
                      <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                        onPress={() => handlePhoneCall(member.phone)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Phone size={13} color={isDark ? '#E2E8F0' : '#475569'} strokeWidth={2} />
                      </TouchableOpacity>
                    )}

                    {/* 2. Email Button */}
                    {member.email ? (
                      <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                        onPress={() => handleSendEmail(member.email, member.fullName)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Mail size={13} color={isDark ? '#E2E8F0' : '#475569'} strokeWidth={2} />
                      </TouchableOpacity>
                    ) : null}

                    {/* 3. Official WhatsApp PNG Button */}
                    {member.phone && member.phone !== '0000000000' && (
                      <TouchableOpacity
                        style={[styles.whatsappActionBtn, { backgroundColor: '#25D366', borderColor: '#20BA5A' }]}
                        onPress={() => handleWhatsApp(member.phone)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={require('../../assets/whatsapp-logo.png')}
                          style={{ width: 17, height: 17 }}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* 4. Pagination Controls Bar (10 members per page) */}
      {allMembers.length > ITEMS_PER_PAGE && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[
              styles.pageBtn,
              validCurrentPage <= 1 && styles.pageBtnDisabled,
              { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
            ]}
            onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={validCurrentPage <= 1}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pageBtnText,
                { color: validCurrentPage <= 1 ? (isDark ? '#475569' : '#94A3B8') : (isDark ? '#F8FAFC' : '#0F172A') },
              ]}
            >
              ← Prev
            </Text>
          </TouchableOpacity>

          <View style={styles.pageInfoBox}>
            <Text style={[styles.pageInfoText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
              Page <Text style={{ fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A' }}>{String(validCurrentPage).padStart(2, '0')}</Text>/<Text style={{ fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A' }}>{String(totalPages).padStart(2, '0')}</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.pageBtn,
              validCurrentPage >= totalPages && styles.pageBtnDisabled,
              { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
            ]}
            onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={validCurrentPage >= totalPages}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pageBtnText,
                { color: validCurrentPage >= totalPages ? (isDark ? '#475569' : '#94A3B8') : (isDark ? '#F8FAFC' : '#0F172A') },
              ]}
            >
              Next →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 5. Brand Signature Footer with ample clearance */}
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
    paddingBottom: layout.bottomNavHeight + 64, // Ensures full clearance above floating/bottom nav
  },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  /* Professional Add New Member Action Card with Sculpted Cutout */
  addNewMemberOuterWrapper: {
    marginBottom: 16,
    position: 'relative',
    overflow: 'visible',
  },
  addNewMemberBanner: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 14,
    paddingRight: 10,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 74,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  addMemberWatermark: {
    position: 'absolute',
    bottom: -6,
    left: 4,
    opacity: 0.6,
  },
  addMemberLeftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginRight: 10,
  },
  addMemberModernIconWrapper: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  addMemberTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  addMemberSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  /* Sculpted Inset Cutout Pocket hugging the Squared Button */
  buttonCutoutPocket: {
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  /* New Registration Bottom Sheet Modal Styles (Desktop Replica) */
  registrationSheetContainer: {
    height: '92%',
    justifyContent: 'flex-end',
  },
  registrationSheet: {
    height: '100%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 14,
  },
  registrationKickerText: {
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#EA580C',
    textTransform: 'uppercase',
  },
  registrationHeaderTitle: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 2,
    marginBottom: 2,
  },
  modalCloseSquare: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registrationTagsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  registrationTagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  registrationTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  formErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    marginBottom: 12,
  },
  formErrorBannerText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  registrationScrollView: {
    flex: 1,
  },
  registrationScrollContent: {
    paddingTop: 4,
    paddingBottom: 28,
    gap: 16,
  },
  formSectionBox: {
    gap: 12,
  },
  formField: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  formInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    fontSize: 13.5,
  },
  formRowTwoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  formRowThreeCol: {
    flexDirection: 'row',
    gap: 10,
  },
  genderTabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderTabBtn: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderTabText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  metricInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderRadius: 9,
    overflow: 'hidden',
  },
  metricInputField: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 13.5,
  },
  metricUnitTouchArea: {
    height: '100%',
    paddingHorizontal: 12,
    minWidth: 42,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EA580C',
  },
  metricUnitBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  planSelectorCard: {
    width: 135,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.2,
    gap: 4,
  },
  planSelectorTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  planSelectorPrice: {
    fontSize: 15,
    fontWeight: '900',
  },
  planSelectorDuration: {
    fontSize: 11,
    fontWeight: '600',
  },
  consentToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  consentCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentHeadlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  registrationBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  registrationCancelBtn: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  registrationCancelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  registrationSubmitBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 44,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  registrationSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  /* In-Modal Professional Camera Screen Styles */
  cameraLiveContainer: {
    width: '100%',
    height: 445,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  cameraViewfinderScreen: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  cameraLiveFeed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  cameraFlashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    zIndex: 99,
  },
  cameraHudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    zIndex: 10,
  },
  cameraStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cameraLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  cameraLiveStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cameraHudIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraReticleContainer: {
    position: 'absolute',
    top: 55,
    bottom: 85,
    left: 18,
    right: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 26,
    height: 26,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderColor: '#EA580C',
  },
  reticleCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 26,
    height: 26,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: '#EA580C',
  },
  reticleCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 26,
    height: 26,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderColor: '#EA580C',
  },
  reticleCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: '#EA580C',
  },
  portraitOvalGuideline: {
    width: 155,
    height: 200,
    borderRadius: 77.5,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderStyle: 'dashed',
  },
  reticleGuidanceText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 12,
    letterSpacing: 0.2,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cameraHudFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
    zIndex: 10,
  },
  cameraShutterOuterRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  cameraShutterInnerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EA580C',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  /* Professional Page 2 Photo Studio Styles */
  proPhotoCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  proAvatarCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  proAvatarImage: {
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  proAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  proAvatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  proSubtitle: {
    fontSize: 11,
    fontWeight: '400',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 15,
  },
  proActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginTop: 18,
  },
  proPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 9,
  },
  proPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  proSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 9,
    borderWidth: 1,
  },
  proSecondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  proDeleteBtn: {
    width: 42,
    height: 42,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* FAQ Accordion Styles matching Security Policy */
  faqAccordionCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  faqQuestionText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  faqAnswerBody: {
    paddingHorizontal: 12,
    paddingBottom: 11,
    paddingTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  faqAnswerText: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
  },
  /* Page 3 Document Upload Styles */
  docUploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  docUploadIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  docCardSubtitle: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 2,
  },
  requiredPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  requiredPillText: {
    color: '#EF4444',
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  docTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  docTriggerBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '500',
    lineHeight: 14,
  },
  /* Page 4 & 5 Controls & Billing Styles */
  controlBoxCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  miniIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBoxTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  controlBoxSubtitle: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  discretionaryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discretionaryBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
  },
  priceInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    marginRight: 4,
  },
  priceInputNumber: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    padding: 0,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  presetChipActive: {
    backgroundColor: '#0F172A',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  addonRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 9,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  addonNameText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addonFeeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  addCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addCustomBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6366F1',
  },
  invoiceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceItemName: {
    fontSize: 12,
    fontWeight: '700',
  },
  invoiceItemSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  invoiceItemAmount: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  totalAmountPayableBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  totalSubtext: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  totalBigAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#059669',
  },
  paymentModeOptionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  paymentModeDisabled: {
    opacity: 0.55,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
  },
  paymentModeIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentModeTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  paymentModeSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  tagDirectDesk: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagDirectDeskText: {
    color: '#059669',
    fontSize: 9.5,
    fontWeight: '800',
  },
  tagInstant: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagInstantText: {
    color: '#4F46E5',
    fontSize: 9.5,
    fontWeight: '800',
  },
  tagComingSoon: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagComingSoonText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
  },
  qrOverlayBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  qrInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrCodeBox: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  qrLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  qrLiveText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#059669',
  },
  qrBeneficiaryTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  qrBeneficiaryName: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  qrBeneficiaryVpa: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1,
  },
  appPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  appPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  qrHelpNote: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 8,
  },
  automatedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  automatedBadgeText: {
    color: '#059669',
    fontSize: 9.5,
    fontWeight: '800',
  },
  /* Squared Add Member Button with 5px Corner Curves */
  addMemberSquaredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  addMemberCtaText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  filterTriggerBtn: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTriggerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterTriggerText: {
    fontSize: 12.5,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  dropdownSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 12,
  },
  modalDragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 6,
  },
  modalDragHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  modalHeaderIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  modalCloseCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownOptionsContainer: {
    gap: 9,
  },
  dropdownOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1.2,
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBadge: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dropdownOptionLabel: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  dropdownOptionDesc: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  selectedCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unselectedCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.8,
    marginLeft: 8,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  membersList: {
    gap: 10,
  },
  memberCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  memberTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  memberCode: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 8,
  },
  infoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  quickActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  whatsappActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  pageBtnDisabled: {
    opacity: 0.45,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pageInfoBox: {
    alignItems: 'center',
  },
  pageInfoText: {
    fontSize: 12,
  },
  pageSubText: {
    fontSize: 10.5,
    marginTop: 1,
  },
});

