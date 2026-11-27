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
import { CameraView, useCameraPermissions, Camera as ExpoCamera } from 'expo-camera';
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
  useWindowDimensions,
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
  AlertTriangle,
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
  Apple,
  Shield,
  HelpCircle,
  Flame,
  Tag,
  Package,
  Receipt,
  CheckCircle2,
  Download,
  Edit3,
  Snowflake,
} from 'lucide-react-native';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop, SvgXml } from 'react-native-svg';
import { useLocalMembers } from '../hooks/useLocalMembers';
import { useLocalPlans } from '../hooks/useLocalPlans';
import { localMutationService } from '../services/LocalMutationService';
import { OwnerMembersService } from '../services/api/ownerMembersService';
import { isDatabaseOpen } from '../database/LocalDatabaseManager';
import { Avatar } from './ui/Avatar';
import { PermissionAccessModal, PermissionAccessType } from './ui/PermissionAccessModal';
import { MemberRegisteredSuccessModal, MemberSuccessData } from './ui/MemberRegisteredSuccessModal';
import { getDefaultAvatarXml } from '../utils/avatarGenerator';
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
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberFormMode, setMemberFormMode] = useState<'add' | 'edit'>('add');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  // Setup Guide Style Deletion Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const deleteModalBackdropAnim = useRef(new Animated.Value(0)).current;
  const deleteModalScaleAnim = useRef(new Animated.Value(0.92)).current;

  // View Member Profile Modal State & Animations (Bottom Sheet Modal with Embedded Luxury Profile Card)
  const [isViewMemberModalOpen, setIsViewMemberModalOpen] = useState(false);
  const [selectedMemberForView, setSelectedMemberForView] = useState<any | null>(null);
  const viewModalBackdropAnim = useRef(new Animated.Value(0)).current;
  const viewModalSheetTranslateY = useRef(new Animated.Value(750)).current;

  // Luxury Member Portrait Card Modal State & Animations (Matching Desktop Exactly)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedMemberForPhoto, setSelectedMemberForPhoto] = useState<any | null>(null);
  const photoModalBackdropAnim = useRef(new Animated.Value(0)).current;
  const photoModalScaleAnim = useRef(new Animated.Value(0.88)).current;
  const [currentPage, setCurrentPage] = useState(1);

  // Smooth Custom Bottom Sheet Animation (Backdrop fade + Sheet slide up from bottom)
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(600)).current;

  // Add Member Modal Animations
  const addModalBackdropAnim = useRef(new Animated.Value(0)).current;
  const addModalSheetTranslateY = useRef(new Animated.Value(750)).current;

  // Custom Member Success Modal State
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successModalData, setSuccessModalData] = useState<MemberSuccessData | null>(null);

  // Custom Device Permissions Request Modal State
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [permissionModalType, setPermissionModalType] = useState<PermissionAccessType>('gallery');
  const [permissionCanAskAgain, setPermissionCanAskAgain] = useState(true);
  const pendingPermissionActionRef = useRef<(() => Promise<void> | void) | null>(null);

  const requestCustomPermission = async (
    type: PermissionAccessType,
    action: () => Promise<void> | void
  ) => {
    try {
      if (type === 'camera') {
        const status = await ExpoCamera.getCameraPermissionsAsync();
        if (status?.granted) {
          await action();
          return;
        }
        setPermissionModalType('camera');
        setPermissionCanAskAgain(status?.canAskAgain !== false);
        pendingPermissionActionRef.current = async () => {
          setPermissionModalVisible(false);
          const req = await requestCameraPermission();
          if (req.granted) {
            setTimeout(() => {
              action();
            }, 300);
          } else {
            setPermissionCanAskAgain(false);
            setTimeout(() => {
              setPermissionModalVisible(true);
            }, 400);
          }
        };
        setPermissionModalVisible(true);
      } else {
        // 'gallery' or 'documents'
        let status;
        try {
          status = await ImagePicker.getMediaLibraryPermissionsAsync();
        } catch {
          status = null;
        }

        if (status?.granted) {
          await action();
          return;
        }

        // If status is undetermined, trigger requestMediaLibraryPermissionsAsync directly so iOS native picker prompt appears
        if (!status || status.status === 'undetermined') {
          const directReq = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (directReq.granted) {
            await action();
            return;
          }
        }

        setPermissionModalType(type);
        setPermissionCanAskAgain(status?.canAskAgain !== false);
        pendingPermissionActionRef.current = async () => {
          setPermissionModalVisible(false);
          const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (req.granted) {
            setTimeout(() => {
              action();
            }, 300);
          } else {
            setPermissionCanAskAgain(false);
            setTimeout(() => {
              setPermissionModalVisible(true);
            }, 400);
          }
        };
        setPermissionModalVisible(true);
      }
    } catch {
      // Fallback: directly execute action
      await action();
    }
  };

  // Shake & Red Flash Animations for mandatory validation feedback
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [missingFieldErrors, setMissingFieldErrors] = useState<{ [key: string]: boolean }>({});
  const errorResetTimeoutRef = useRef<any>(null);

  const triggerValidationShake = (fields: string[]) => {
    // Set missing fields active for red border
    const errMap: { [key: string]: boolean } = {};
    fields.forEach((k) => { errMap[k] = true; });
    setMissingFieldErrors(errMap);

    // Run refined subtle horizontal shake animation (small amplitude without clipping)
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -3.5, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 3.5, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -2.5, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 2.5, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 35, useNativeDriver: true }),
    ]).start();

    // Auto-revert red borders after 2.5 seconds
    if (errorResetTimeoutRef.current) {
      clearTimeout(errorResetTimeoutRef.current);
    }
    errorResetTimeoutRef.current = setTimeout(() => {
      setMissingFieldErrors({});
    }, 2500);
  };

  // New Registration Multi-Page State (Pages 1 - 5 matching desktop exactly)
  const [regPage, setRegPage] = useState<1 | 2 | 3 | 4 | 5>(1);

  // New Registration Form Fields (Matching Desktop "New Registration" Modal)
  const [formFullName, setFormFullName] = useState('');
  const [formContactNumber, setFormContactNumber] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDob, setFormDob] = useState('');

  const handleDobChange = (txt: string) => {
    // If user pressed backspace
    if (txt.length < formDob.length) {
      // If deleting the trailing hyphen, also remove the digit before it
      if (formDob.endsWith('-') && !txt.endsWith('-')) {
        setFormDob(txt.slice(0, -1));
        return;
      }
      setFormDob(txt);
      return;
    }

    const digits = txt.replace(/[^0-9]/g, '').slice(0, 8);
    if (digits.length === 0) {
      setFormDob('');
    } else if (digits.length < 4) {
      setFormDob(digits);
    } else if (digits.length === 4) {
      setFormDob(`${digits}-`);
    } else if (digits.length < 6) {
      setFormDob(`${digits.slice(0, 4)}-${digits.slice(4)}`);
    } else if (digits.length === 6) {
      setFormDob(`${digits.slice(0, 4)}-${digits.slice(4, 6)}-`);
    } else {
      setFormDob(`${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`);
    }
  };
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

  useEffect(() => {
    if (isViewMemberModalOpen) {
      viewModalSheetTranslateY.setValue(750);
      Animated.parallel([
        Animated.timing(viewModalBackdropAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(viewModalSheetTranslateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(viewModalBackdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(viewModalSheetTranslateY, {
          toValue: 750,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isViewMemberModalOpen]);

  const closeViewMemberModal = () => {
    Animated.parallel([
      Animated.timing(viewModalBackdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(viewModalSheetTranslateY, {
        toValue: 750,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsViewMemberModalOpen(false);
      setSelectedMemberForView(null);
    });
  };

  useEffect(() => {
    if (isPhotoModalOpen) {
      photoModalScaleAnim.setValue(0.88);
      Animated.parallel([
        Animated.timing(photoModalBackdropAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.spring(photoModalScaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(photoModalBackdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(photoModalScaleAnim, {
          toValue: 0.9,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isPhotoModalOpen]);

  const closePhotoModal = () => {
    Animated.parallel([
      Animated.timing(photoModalBackdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(photoModalScaleAnim, {
        toValue: 0.88,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsPhotoModalOpen(false);
      setSelectedMemberForPhoto(null);
    });
  };

  useEffect(() => {
    if (isDeleteModalOpen) {
      deleteModalScaleAnim.setValue(0.95);
      Animated.parallel([
        Animated.timing(deleteModalBackdropAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(deleteModalScaleAnim, {
          toValue: 1,
          friction: 9,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(deleteModalBackdropAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(deleteModalScaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isDeleteModalOpen]);

  const openDeleteModal = () => {
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    Animated.parallel([
      Animated.timing(deleteModalBackdropAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(deleteModalScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsDeleteModalOpen(false);
    });
  };

  const handleConfirmPermanentDelete = async () => {
    if (!selectedMemberForView?.id) return;
    setIsDeletingMember(true);
    const memberId = String(selectedMemberForView.id);
    const memberName = selectedMemberForView.fullName || 'Member';

    try {
      // 1. Delete locally from SQLite & enqueue sync outbox mutation
      if (isDatabaseOpen()) {
        await localMutationService.deleteMember(memberId);
      }
      // 2. Call backend cloud service for instant sync if reachable
      try {
        await OwnerMembersService.deleteMember(memberId);
      } catch (cloudErr) {
        // If device is offline, local soft-delete with sync outbox guarantees eventual consistency
        console.warn('Backend delete sync note:', cloudErr);
      }

      // 3. Trigger refetch to update mobile member directory immediately
      refetch();

      // 4. Close both delete confirmation overlay and view member modal smoothly
      closeDeleteModal();
      closeViewMemberModal();

      Alert.alert(
        'Member Deleted',
        `${memberName}'s profile and account records have been permanently removed from the gym roster.`
      );
    } catch (err: any) {
      Alert.alert('Deletion Error', err?.message || 'Failed to delete member profile. Please try again.');
    } finally {
      setIsDeletingMember(false);
    }
  };

  // Prefill Member Form for Edit Mode (Exact Desktop Logic)
  const openEditMemberModal = (member: any) => {
    if (!member) return;

    // Capture target member attributes cleanly
    const targetId = String(member.id);
    const targetFullName = member.fullName || '';
    const targetPhone = member.phone || '';
    const targetEmail = member.email || '';
    const targetDob = member.dob || '';
    const targetGender =
      member.gender === 'FEMALE' || member.gender === 'Female'
        ? 'Female'
        : member.gender === 'OTHER' || member.gender === 'Other'
        ? 'Other'
        : 'Male';
    const targetWhatsApp = member.alternatePhone || member.phone || '';
    const targetAddress = member.address || '';
    const targetPhoto = member.profilePhotoUrl || null;

    let extractedHeight = member.height ? String(member.height) : '';
    let extractedWeight = member.weight ? String(member.weight) : '';
    let extractedBlood = member.bloodGroup || '';
    if (member.notes && typeof member.notes === 'string') {
      const parts = member.notes.split('|').map((s: string) => s.trim());
      parts.forEach((p: string) => {
        if (p.startsWith('Height:')) {
          const val = p.replace('Height:', '').trim().split(' ')[0];
          if (!extractedHeight && val) extractedHeight = val;
        } else if (p.startsWith('Weight:')) {
          const val = p.replace('Weight:', '').trim().split(' ')[0];
          if (!extractedWeight && val) extractedWeight = val;
        } else if (p.startsWith('Blood:')) {
          const val = p.replace('Blood:', '').trim();
          if (!extractedBlood && val) extractedBlood = val;
        }
      });
    }

    // Set form edit mode state
    setMemberFormMode('edit');
    setEditingMemberId(targetId);

    // Prefill Page 1 fields
    setFormFullName(targetFullName);
    setFormContactNumber(targetPhone);
    setFormEmail(targetEmail);
    setFormDob(targetDob);
    setFormGender(targetGender);
    setFormWhatsAppNumber(targetWhatsApp);
    setFormAddress(targetAddress);
    setFormHeight(extractedHeight);
    setFormWeight(extractedWeight);
    setFormBloodGroup(extractedBlood);

    // Prefill Page 2 Profile Photo
    setFormProfilePhoto(targetPhoto);

    // Set page to 1 & clear form errors
    setRegPage(1);
    setFormError(null);

    // Keep Member Profile Modal OPEN as requested!
    // Open Add Member Modal in edit mode immediately overlaying the profile modal
    setIsAddMemberModalOpen(true);
  };

  const resetRegistrationForm = () => {
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
    setMemberFormMode('add');
    setEditingMemberId(null);
    setFormError(null);
  };

  const closeAddMemberModal = (onClosed?: any) => {
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
      if (typeof onClosed === 'function') {
        onClosed();
      }
    });
  };

  // Validation check for mandatory fields per registration page
  const isPageValid = useMemo(() => {
    if (regPage === 1) {
      const hasName = formFullName.trim().length > 0;
      const cleanPhone = formContactNumber.replace(/[^0-9+]/g, '');
      const hasPhone = cleanPhone.length >= 7;
      const cleanWhatsApp = formWhatsAppNumber.replace(/[^0-9+]/g, '');
      const hasWhatsApp = cleanWhatsApp.length >= 7;
      const hasGender = Boolean(formGender);
      const hasAddress = formAddress.trim().length > 0;
      return hasName && hasPhone && hasWhatsApp && hasGender && hasAddress;
    }
    if (regPage === 2) {
      // Photo is optional/recommended, always valid to proceed
      return true;
    }
    if (regPage === 3) {
      // Aadhaar Card has mandatory red asterisk (*)
      return Boolean(formDocs.aadhaar);
    }
    if (regPage === 4) {
      // Plan Selection: If plans exist in catalog, a plan must be selected
      if (availablePlans.length > 0) {
        return Boolean(formSelectedPlanId);
      }
      return true;
    }
    if (regPage === 5) {
      return Boolean(formPaymentMethod);
    }
    return true;
  }, [
    regPage,
    formFullName,
    formContactNumber,
    formWhatsAppNumber,
    formGender,
    formAddress,
    formDocs.aadhaar,
    availablePlans.length,
    formSelectedPlanId,
    formPaymentMethod,
  ]);

  const handleNextPage = () => {
    if (regPage === 1) {
      const missing: string[] = [];
      if (!formFullName.trim()) missing.push('fullName');
      const cleanPhone = formContactNumber.replace(/[^0-9+]/g, '');
      if (cleanPhone.length < 7) missing.push('contactNumber');
      const cleanWA = formWhatsAppNumber.replace(/[^0-9+]/g, '');
      if (cleanWA.length < 7) missing.push('whatsAppNumber');
      if (!formAddress.trim()) missing.push('address');

      if (missing.length > 0) {
        triggerValidationShake(missing);
        return;
      }
    } else if (regPage === 3) {
      if (!formDocs.aadhaar) {
        triggerValidationShake(['aadhaar']);
        return;
      }
    } else if (regPage === 4) {
      if (availablePlans.length > 0 && !formSelectedPlanId) {
        triggerValidationShake(['membershipPlan']);
        return;
      }
    }

    setFormError(null);
    setMissingFieldErrors({});
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
    if (!formPaymentMethod) {
      triggerValidationShake(['paymentMethod']);
      setFormError('Please select a payment method.');
      return;
    }
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
      // ─────────────────────────────────────────────────────────────
      // EDIT MEMBER MODE: Update existing member details
      // ─────────────────────────────────────────────────────────────
      if (memberFormMode === 'edit' && editingMemberId) {
        // Compose physical & health notes
        const notesParts: string[] = [];
        if (formHeight) notesParts.push(`Height: ${formHeight} ${formHeightUnit}`);
        if (formWeight) notesParts.push(`Weight: ${formWeight} ${formWeightUnit}`);
        if (formBloodGroup) notesParts.push(`Blood: ${formBloodGroup}`);
        if (formWhatsAppNumber && formWhatsAppNumber !== formContactNumber) {
          notesParts.push(`WhatsApp: ${formWhatsAppNumber}`);
        }
        const notes = notesParts.length > 0 ? notesParts.join(' | ') : undefined;

        if (isDatabaseOpen()) {
          await localMutationService.updateMember(editingMemberId, {
            fullName: formFullName.trim(),
            phone: cleanPhone,
            alternatePhone: formWhatsAppNumber.trim() || null,
            email: formEmail.trim() || null,
            gender: formGender.toUpperCase(),
            dob: formDob.trim() || null,
            address: formAddress.trim(),
            profilePhotoUrl: formProfilePhoto || null,
            notes: notes || null,
          });
        }

        // Also call cloud backend if reachable
        try {
          await OwnerMembersService.updateMember(editingMemberId, {
            fullName: formFullName.trim(),
            phone: cleanPhone,
            alternatePhone: formWhatsAppNumber.trim() || undefined,
            email: formEmail.trim() || undefined,
            gender: formGender.toUpperCase(),
            dob: formDob.trim() || undefined,
            address: formAddress.trim(),
            notes: notes || undefined,
          });
        } catch (cloudErr) {
          console.warn('Backend update sync note:', cloudErr);
        }

        // Refresh roster list
        refetch();

        // Instantly update the currently visible profile modal with the new edited attributes
        setSelectedMemberForView((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            fullName: formFullName.trim(),
            phone: cleanPhone,
            alternatePhone: formWhatsAppNumber.trim() || undefined,
            email: formEmail.trim() || undefined,
            gender: formGender.toUpperCase(),
            dob: formDob.trim() || undefined,
            address: formAddress.trim(),
            profilePhotoUrl: formProfilePhoto || prev.profilePhotoUrl,
            notes: notes || prev.notes,
          };
        });

        // Close Add/Edit Member Modal FIRST, then present custom success modal
        const updatedName = formFullName.trim();
        const updatedPhone = formContactNumber.trim();
        const selectedPlan = availablePlans.find((p) => p.id === formSelectedPlanId);
        const planName = selectedPlan?.planName;

        closeAddMemberModal(() => {
          resetRegistrationForm();
          setTimeout(() => {
            setSuccessModalData({
              memberId: editingMemberId || undefined,
              fullName: updatedName,
              phone: updatedPhone,
              planName,
              isEdit: true,
            });
            setSuccessModalVisible(true);
          }, 150);
        });
        return;
      }

      // ─────────────────────────────────────────────────────────────
      // NEW REGISTRATION MODE: Create & Enroll Member
      // ─────────────────────────────────────────────────────────────
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

      let createdMemberId: string | undefined = undefined;
      if (isDatabaseOpen()) {
        const result = await localMutationService.admitMember({
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
        createdMemberId = result?.member?.id;
      }

      // Refresh list
      refetch();

      const registeredName = formFullName.trim();
      const registeredPhone = formContactNumber.trim();
      const planName = selectedPlan?.planName;

      // Close Add Member modal FIRST, then present Custom Success Modal from bottom to top
      closeAddMemberModal(() => {
        resetRegistrationForm();
        setTimeout(() => {
          setSuccessModalData({
            memberId: createdMemberId,
            fullName: registeredName,
            phone: registeredPhone,
            planName,
            isEdit: false,
          });
          setSuccessModalVisible(true);
        }, 150);
      });
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

const renderRegistrationFormSheet = () => (
    <View style={styles.modalRoot} pointerEvents="box-none">
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
                      {memberFormMode === 'edit'
                        ? 'MODIFY REGISTRATION'
                        : regPage === 1 && 'NEW REGISTRATION'}
                      {regPage === 2 && 'IDENTITY CAPTURE'}
                      {regPage === 3 && 'DOCUMENT UPLOAD'}
                      {regPage === 4 && 'PLAN SELECTION'}
                      {regPage === 5 && 'PAYMENT SETTLEMENT'}
                    </Text>
                    <Text style={[styles.modalTitle, styles.registrationHeaderTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                      {memberFormMode === 'edit' && regPage === 1
                        ? 'Edit Member Details'
                        : regPage === 1 && 'Add New Member'}
                      {regPage === 2 && 'Capture Member Photo'}
                      {regPage === 3 && 'Upload Member Documents'}
                      {regPage === 4 && 'Membership Planning'}
                      {regPage === 5 && 'Bill Summary & Pay'}
                    </Text>
                    <Text style={[styles.modalSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                      {memberFormMode === 'edit' && regPage === 1
                        ? 'Update profile details, contact information and biometrics.'
                        : regPage === 1 && 'Start a clean new profile with key member info in one focused flow.'}
                      {regPage === 2 && 'Upload a clear profile photo for identification & membership card.'}
                      {regPage === 3 && 'Add supporting documents to complete the member profile.'}
                      {regPage === 4 && 'Select a membership plan and payment schedule for the new member.'}
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
                  keyboardDismissMode="on-drag"
                  scrollEventThrottle={16}
                  decelerationRate="normal"
                  bounces={true}
                  nestedScrollEnabled={true}
                  overScrollMode="always"
                >
                  {/* PAGE 1: Personal Details, Demographics & Metrics */}
                  {regPage === 1 && (
                    <>
                      {/* Section 1: Primary Identity & Contact */}
                      <View style={styles.formSectionBox}>
                        <Animated.View
                          style={[
                            styles.formField,
                            missingFieldErrors.fullName && {
                              transform: [{ translateX: shakeAnim }],
                            },
                          ]}
                        >
                          <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                            Full Name <Text style={{ color: '#EF4444' }}>*</Text>
                          </Text>
                          <TextInput
                            style={[
                              styles.formInput,
                              {
                                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                borderColor: missingFieldErrors.fullName
                                  ? '#EF4444'
                                  : isDark ? '#334155' : '#E2E8F0',
                                borderWidth: missingFieldErrors.fullName ? 1.5 : 1,
                                color: isDark ? '#FFFFFF' : '#0F172A',
                              },
                            ]}
                            placeholder="Enter member name"
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            value={formFullName}
                            onChangeText={(txt) => {
                              setFormFullName(txt);
                              if (missingFieldErrors.fullName) {
                                setMissingFieldErrors((prev) => ({ ...prev, fullName: false }));
                              }
                            }}
                            autoCapitalize="words"
                          />
                        </Animated.View>

                        <View style={styles.formRowTwoCol}>
                          <Animated.View
                            style={[
                              styles.formField,
                              { flex: 1 },
                              missingFieldErrors.contactNumber && {
                                transform: [{ translateX: shakeAnim }],
                              },
                            ]}
                          >
                            <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                              Contact Number <Text style={{ color: '#EF4444' }}>*</Text>
                            </Text>
                            <TextInput
                              style={[
                                styles.formInput,
                                {
                                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                  borderColor: missingFieldErrors.contactNumber
                                    ? '#EF4444'
                                    : isDark ? '#334155' : '#E2E8F0',
                                  borderWidth: missingFieldErrors.contactNumber ? 1.5 : 1,
                                  color: isDark ? '#FFFFFF' : '#0F172A',
                                },
                              ]}
                              placeholder="Primary phone"
                              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                              value={formContactNumber}
                              onChangeText={(txt) => {
                                setFormContactNumber(txt);
                                if (missingFieldErrors.contactNumber) {
                                  setMissingFieldErrors((prev) => ({ ...prev, contactNumber: false }));
                                }
                                if (!formWhatsAppNumber) setFormWhatsAppNumber(txt);
                              }}
                              keyboardType="phone-pad"
                            />
                          </Animated.View>

                          <Animated.View
                            style={[
                              styles.formField,
                              { flex: 1 },
                              missingFieldErrors.whatsAppNumber && {
                                transform: [{ translateX: shakeAnim }],
                              },
                            ]}
                          >
                            <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                              WhatsApp Number <Text style={{ color: '#EF4444' }}>*</Text>
                            </Text>
                            <TextInput
                              style={[
                                styles.formInput,
                                {
                                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                  borderColor: missingFieldErrors.whatsAppNumber
                                    ? '#EF4444'
                                    : isDark ? '#334155' : '#E2E8F0',
                                  borderWidth: missingFieldErrors.whatsAppNumber ? 1.5 : 1,
                                  color: isDark ? '#FFFFFF' : '#0F172A',
                                },
                              ]}
                              placeholder="WhatsApp phone"
                              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                              value={formWhatsAppNumber}
                              onChangeText={(txt) => {
                                setFormWhatsAppNumber(txt);
                                if (missingFieldErrors.whatsAppNumber) {
                                  setMissingFieldErrors((prev) => ({ ...prev, whatsAppNumber: false }));
                                }
                              }}
                              keyboardType="phone-pad"
                            />
                          </Animated.View>
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
                              onChangeText={handleDobChange}
                              keyboardType="numeric"
                              maxLength={10}
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
                        <Animated.View
                          style={[
                            styles.formField,
                            missingFieldErrors.address && {
                              transform: [{ translateX: shakeAnim }],
                            },
                          ]}
                        >
                          <Text style={[styles.fieldLabel, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                            Residential Address <Text style={{ color: '#EF4444' }}>*</Text>
                          </Text>
                          <TextInput
                            style={[
                              styles.formInput,
                              {
                                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                borderColor: missingFieldErrors.address
                                  ? '#EF4444'
                                  : isDark ? '#334155' : '#E2E8F0',
                                borderWidth: missingFieldErrors.address ? 1.5 : 1,
                                color: isDark ? '#FFFFFF' : '#0F172A',
                                height: 60,
                                paddingTop: 8,
                              },
                            ]}
                            placeholder="Complete residential address"
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            value={formAddress}
                            onChangeText={(txt) => {
                              setFormAddress(txt);
                              if (missingFieldErrors.address) {
                                setMissingFieldErrors((prev) => ({ ...prev, address: false }));
                              }
                            }}
                            multiline
                          />
                        </Animated.View>
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
                              onPress={() => {
                                requestCustomPermission('camera', () => {
                                  setIsLiveCameraActive(true);
                                });
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
                                onPress={() => {
                                  requestCustomPermission('camera', () => {
                                    setIsLiveCameraActive(true);
                                  });
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
                                onPress={() => {
                                  requestCustomPermission('gallery', async () => {
                                    try {
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
                                  });
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
                    <View style={{ flex: 1, paddingBottom: 40, gap: 14 }}>
                      {/* 2x2 Grid of Professional Monochrome / Corporate Surface Cards */}
                      <View style={styles.docCardsGrid}>
                        {/* Row 1: Aadhaar Card & Residential Proof */}
                        <View style={styles.docCardsRow}>
                          {/* Card 1: Aadhaar Card (National ID) */}
                          <Animated.View
                            style={[
                              { flex: 1 },
                              missingFieldErrors.aadhaar && {
                                transform: [{ translateX: shakeAnim }],
                              },
                            ]}
                          >
                          <TouchableOpacity
                            style={[
                              styles.docCommCard,
                              {
                                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                borderColor: missingFieldErrors.aadhaar
                                  ? '#EF4444'
                                  : formDocs.aadhaar
                                  ? '#10B981'
                                  : isDark
                                  ? '#334155'
                                  : '#E2E8F0',
                                borderWidth: missingFieldErrors.aadhaar ? 1.8 : 1,
                              },
                            ]}
                            onPress={() => {
                              if (formDocs.aadhaar) {
                                setFormDocs({ ...formDocs, aadhaar: null });
                                return;
                              }
                              requestCustomPermission('documents', async () => {
                                try {
                                  const res = await ImagePicker.launchImageLibraryAsync({
                                    mediaTypes: ['images'],
                                    quality: 0.85,
                                  });
                                  if (!res.canceled && res.assets?.[0]?.uri) {
                                    setFormDocs((prev) => ({ ...prev, aadhaar: res.assets[0].uri }));
                                    if (missingFieldErrors.aadhaar) {
                                      setMissingFieldErrors((prev) => ({ ...prev, aadhaar: false }));
                                    }
                                  }
                                } catch (e: any) {
                                  Alert.alert('Error', e?.message || 'Could not select document');
                                }
                              });
                            }}
                            activeOpacity={0.82}
                          >
                            <View style={styles.docCommCardTop}>
                              <View
                                style={[
                                  styles.docCommIconBox,
                                  {
                                    backgroundColor: formDocs.aadhaar
                                      ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5')
                                      : (isDark ? '#0F172A' : '#F8FAFC'),
                                    borderColor: formDocs.aadhaar
                                      ? (isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0')
                                      : (isDark ? '#334155' : '#E2E8F0'),
                                  },
                                ]}
                              >
                                <CreditCard
                                  size={16}
                                  color={formDocs.aadhaar ? '#10B981' : (isDark ? '#94A3B8' : '#475569')}
                                  strokeWidth={2.2}
                                />
                              </View>
                            </View>

                            <View style={{ marginTop: 10 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text
                                  style={[
                                    styles.docCommTitle,
                                    { color: isDark ? '#FFFFFF' : '#0F172A' },
                                  ]}
                                  numberOfLines={1}
                                >
                                  Aadhaar Card
                                </Text>
                                <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '900', lineHeight: 16 }}>
                                  *
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.docCommDesc,
                                  { color: isDark ? '#94A3B8' : '#64748B' },
                                ]}
                                numberOfLines={1}
                              >
                                National ID · Front & Back
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.docCommActionBtn,
                                {
                                  backgroundColor: formDocs.aadhaar
                                    ? (isDark ? '#064E3B' : '#ECFDF5')
                                    : (isDark ? '#0F172A' : '#0F172A'),
                                  borderColor: formDocs.aadhaar
                                    ? (isDark ? '#047857' : '#A7F3D0')
                                    : (isDark ? '#334155' : '#0F172A'),
                                },
                              ]}
                            >
                              {formDocs.aadhaar ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  <Check size={11} color="#059669" strokeWidth={3} />
                                  <Text style={[styles.docCommActionBtnText, { color: '#059669' }]}>
                                    Uploaded · Tap to Remove
                                  </Text>
                                </View>
                              ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  <UploadCloud size={11} color="#FFFFFF" strokeWidth={2.4} />
                                  <Text style={[styles.docCommActionBtnText, { color: '#FFFFFF' }]}>
                                    Upload Document
                                  </Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                          </Animated.View>

                          {/* Card 2: Residential Proof */}
                          <TouchableOpacity
                            style={[
                              styles.docCommCard,
                              {
                                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                borderColor: formDocs.residential
                                  ? '#10B981'
                                  : isDark
                                  ? '#334155'
                                  : '#E2E8F0',
                              },
                            ]}
                            onPress={() => {
                              if (formDocs.residential) {
                                setFormDocs({ ...formDocs, residential: null });
                                return;
                              }
                              requestCustomPermission('documents', async () => {
                                try {
                                  const res = await ImagePicker.launchImageLibraryAsync({
                                    mediaTypes: ['images'],
                                    quality: 0.85,
                                  });
                                  if (!res.canceled && res.assets?.[0]?.uri) {
                                    setFormDocs((prev) => ({ ...prev, residential: res.assets[0].uri }));
                                  }
                                } catch (e: any) {
                                  Alert.alert('Error', e?.message || 'Could not select document');
                                }
                              });
                            }}
                            activeOpacity={0.82}
                          >
                            <View style={styles.docCommCardTop}>
                              <View
                                style={[
                                  styles.docCommIconBox,
                                  {
                                    backgroundColor: formDocs.residential
                                      ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5')
                                      : (isDark ? '#0F172A' : '#F8FAFC'),
                                    borderColor: formDocs.residential
                                      ? (isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0')
                                      : (isDark ? '#334155' : '#E2E8F0'),
                                  },
                                ]}
                              >
                                <Building2
                                  size={16}
                                  color={formDocs.residential ? '#10B981' : (isDark ? '#94A3B8' : '#475569')}
                                  strokeWidth={2.2}
                                />
                              </View>
                            </View>

                            <View style={{ marginTop: 10 }}>
                              <Text
                                style={[
                                  styles.docCommTitle,
                                  { color: isDark ? '#FFFFFF' : '#0F172A' },
                                ]}
                                numberOfLines={1}
                              >
                                Residential Proof
                              </Text>
                              <Text
                                style={[
                                  styles.docCommDesc,
                                  { color: isDark ? '#94A3B8' : '#64748B' },
                                ]}
                                numberOfLines={1}
                              >
                                Utility Bill · Rent Lease
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.docCommActionBtn,
                                {
                                  backgroundColor: formDocs.residential
                                    ? (isDark ? '#064E3B' : '#ECFDF5')
                                    : (isDark ? '#0F172A' : '#F8FAFC'),
                                  borderColor: formDocs.residential
                                    ? (isDark ? '#047857' : '#A7F3D0')
                                    : (isDark ? '#334155' : '#CBD5E1'),
                                },
                              ]}
                            >
                              {formDocs.residential ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  <Check size={11} color="#059669" strokeWidth={3} />
                                  <Text style={[styles.docCommActionBtnText, { color: '#059669' }]}>
                                    Uploaded · Tap to Remove
                                  </Text>
                                </View>
                              ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  <UploadCloud size={11} color={isDark ? '#CBD5E1' : '#334155'} strokeWidth={2.4} />
                                  <Text style={[styles.docCommActionBtnText, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                                    Upload File
                                  </Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        </View>

                        {/* Row 2: Health Certificate & Other Documents */}
                        <View style={styles.docCardsRow}>
                          {/* Card 3: Health Certificate */}
                          <TouchableOpacity
                            style={[
                              styles.docCommCard,
                              {
                                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                borderColor: formDocs.health
                                  ? '#10B981'
                                  : isDark
                                  ? '#334155'
                                  : '#E2E8F0',
                              },
                            ]}
                            onPress={() => {
                              if (formDocs.health) {
                                setFormDocs({ ...formDocs, health: null });
                                return;
                              }
                              requestCustomPermission('documents', async () => {
                                try {
                                  const res = await ImagePicker.launchImageLibraryAsync({
                                    mediaTypes: ['images'],
                                    quality: 0.85,
                                  });
                                  if (!res.canceled && res.assets?.[0]?.uri) {
                                    setFormDocs((prev) => ({ ...prev, health: res.assets[0].uri }));
                                  }
                                } catch (e: any) {
                                  Alert.alert('Error', e?.message || 'Could not select document');
                                }
                              });
                            }}
                            activeOpacity={0.82}
                          >
                            <View style={styles.docCommCardTop}>
                              <View
                                style={[
                                  styles.docCommIconBox,
                                  {
                                    backgroundColor: formDocs.health
                                      ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5')
                                      : (isDark ? '#0F172A' : '#F8FAFC'),
                                    borderColor: formDocs.health
                                      ? (isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0')
                                      : (isDark ? '#334155' : '#E2E8F0'),
                                  },
                                ]}
                              >
                                <ShieldCheck
                                  size={16}
                                  color={formDocs.health ? '#10B981' : (isDark ? '#94A3B8' : '#475569')}
                                  strokeWidth={2.2}
                                />
                              </View>
                            </View>

                            <View style={{ marginTop: 10 }}>
                              <Text
                                style={[
                                  styles.docCommTitle,
                                  { color: isDark ? '#FFFFFF' : '#0F172A' },
                                ]}
                                numberOfLines={1}
                              >
                                Health Certificate
                              </Text>
                              <Text
                                style={[
                                  styles.docCommDesc,
                                  { color: isDark ? '#94A3B8' : '#64748B' },
                                ]}
                                numberOfLines={1}
                              >
                                Medical Clearance · NOC
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.docCommActionBtn,
                                {
                                  backgroundColor: formDocs.health
                                    ? (isDark ? '#064E3B' : '#ECFDF5')
                                    : (isDark ? '#0F172A' : '#F8FAFC'),
                                  borderColor: formDocs.health
                                    ? (isDark ? '#047857' : '#A7F3D0')
                                    : (isDark ? '#334155' : '#CBD5E1'),
                                },
                              ]}
                            >
                              {formDocs.health ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  <Check size={11} color="#059669" strokeWidth={3} />
                                  <Text style={[styles.docCommActionBtnText, { color: '#059669' }]}>
                                    Uploaded · Tap to Remove
                                  </Text>
                                </View>
                              ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  <UploadCloud size={11} color={isDark ? '#CBD5E1' : '#334155'} strokeWidth={2.4} />
                                  <Text style={[styles.docCommActionBtnText, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                                    Upload File
                                  </Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>

                          {/* Card 4: Other Documents */}
                          <TouchableOpacity
                            style={[
                              styles.docCommCard,
                              {
                                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                borderColor: formDocs.others
                                  ? '#10B981'
                                  : isDark
                                  ? '#334155'
                                  : '#E2E8F0',
                              },
                            ]}
                            onPress={() => {
                              if (formDocs.others) {
                                setFormDocs({ ...formDocs, others: null });
                                return;
                              }
                              requestCustomPermission('documents', async () => {
                                try {
                                  const res = await ImagePicker.launchImageLibraryAsync({
                                    mediaTypes: ['images'],
                                    quality: 0.85,
                                  });
                                  if (!res.canceled && res.assets?.[0]?.uri) {
                                    setFormDocs((prev) => ({ ...prev, others: res.assets[0].uri }));
                                  }
                                } catch (e: any) {
                                  Alert.alert('Error', e?.message || 'Could not select document');
                                }
                              });
                            }}
                            activeOpacity={0.82}
                          >
                            <View style={styles.docCommCardTop}>
                              <View
                                style={[
                                  styles.docCommIconBox,
                                  {
                                    backgroundColor: formDocs.others
                                      ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5')
                                      : (isDark ? '#0F172A' : '#F8FAFC'),
                                    borderColor: formDocs.others
                                      ? (isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0')
                                      : (isDark ? '#334155' : '#E2E8F0'),
                                  },
                                ]}
                              >
                                <FileText
                                  size={16}
                                  color={formDocs.others ? '#10B981' : (isDark ? '#94A3B8' : '#475569')}
                                  strokeWidth={2.2}
                                />
                              </View>
                            </View>

                            <View style={{ marginTop: 10 }}>
                              <Text
                                style={[
                                  styles.docCommTitle,
                                  { color: isDark ? '#FFFFFF' : '#0F172A' },
                                ]}
                                numberOfLines={1}
                              >
                                Other Proofs
                              </Text>
                              <Text
                                style={[
                                  styles.docCommDesc,
                                  { color: isDark ? '#94A3B8' : '#64748B' },
                                ]}
                                numberOfLines={1}
                              >
                                Student ID · Corporate Pass
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.docCommActionBtn,
                                {
                                  backgroundColor: formDocs.others
                                    ? (isDark ? '#064E3B' : '#ECFDF5')
                                    : (isDark ? '#0F172A' : '#F8FAFC'),
                                  borderColor: formDocs.others
                                    ? (isDark ? '#047857' : '#A7F3D0')
                                    : (isDark ? '#334155' : '#CBD5E1'),
                                },
                              ]}
                            >
                              {formDocs.others ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  <Check size={11} color="#059669" strokeWidth={3} />
                                  <Text style={[styles.docCommActionBtnText, { color: '#059669' }]}>
                                    Uploaded · Tap to Remove
                                  </Text>
                                </View>
                              ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  <UploadCloud size={11} color={isDark ? '#CBD5E1' : '#334155'} strokeWidth={2.4} />
                                  <Text style={[styles.docCommActionBtnText, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                                    Upload File
                                  </Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Document Compliance & Non-Custodial Storage FAQs */}
                      <View style={{ marginTop: 8, gap: 8 }}>
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
                            Document Verification & Privacy FAQs
                          </Text>
                        </View>

                        {/* Doc FAQ 1: Which documents are mandatory */}
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
                              setExpandedFaqId(expandedFaqId === 'doc_mandatory' ? null : 'doc_mandatory')
                            }
                            activeOpacity={0.7}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <CreditCard size={14} color="#EA580C" strokeWidth={2.2} />
                              <Text
                                style={[
                                  styles.faqQuestionText,
                                  { color: isDark ? '#FFFFFF' : '#0F172A' },
                                ]}
                              >
                                Which documents are mandatory for registration?
                              </Text>
                            </View>
                            <ChevronDown
                              size={15}
                              color={isDark ? '#94A3B8' : '#64748B'}
                              style={{
                                transform: [{ rotate: expandedFaqId === 'doc_mandatory' ? '180deg' : '0deg' }],
                              }}
                            />
                          </TouchableOpacity>
                          {expandedFaqId === 'doc_mandatory' && (
                            <View style={styles.faqAnswerBody}>
                              <Text
                                style={[
                                  styles.faqAnswerText,
                                  { color: isDark ? '#94A3B8' : '#64748B' },
                                ]}
                              >
                                Only the government-issued identity proof (Aadhaar Card) is required to legally verify member age and KYC. Residential proofs and Health Certificates are recommended optional documents for emergency and liability records.
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Doc FAQ 2: Accepted formats & file size */}
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
                              setExpandedFaqId(expandedFaqId === 'doc_formats' ? null : 'doc_formats')
                            }
                            activeOpacity={0.7}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <UploadCloud size={14} color="#EA580C" strokeWidth={2.2} />
                              <Text
                                style={[
                                  styles.faqQuestionText,
                                  { color: isDark ? '#FFFFFF' : '#0F172A' },
                                ]}
                              >
                                What file formats and sizes are supported?
                              </Text>
                            </View>
                            <ChevronDown
                              size={15}
                              color={isDark ? '#94A3B8' : '#64748B'}
                              style={{
                                transform: [{ rotate: expandedFaqId === 'doc_formats' ? '180deg' : '0deg' }],
                              }}
                            />
                          </TouchableOpacity>
                          {expandedFaqId === 'doc_formats' && (
                            <View style={styles.faqAnswerBody}>
                              <Text
                                style={[
                                  styles.faqAnswerText,
                                  { color: isDark ? '#94A3B8' : '#64748B' },
                                ]}
                              >
                                JPG, PNG, and PDF formats up to 10MB per file are supported. Photos taken directly with your camera or chosen from your gallery are automatically optimized for local storage.
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Doc FAQ 3: How documents are stored and encrypted */}
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
                              setExpandedFaqId(expandedFaqId === 'doc_encryption' ? null : 'doc_encryption')
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
                                How are member documents protected?
                              </Text>
                            </View>
                            <ChevronDown
                              size={15}
                              color={isDark ? '#94A3B8' : '#64748B'}
                              style={{
                                transform: [{ rotate: expandedFaqId === 'doc_encryption' ? '180deg' : '0deg' }],
                              }}
                            />
                          </TouchableOpacity>
                          {expandedFaqId === 'doc_encryption' && (
                            <View style={styles.faqAnswerBody}>
                              <Text
                                style={[
                                  styles.faqAnswerText,
                                  { color: isDark ? '#94A3B8' : '#64748B' },
                                ]}
                              >
                                All attached identification files are saved in your local sandboxed app container and encrypted in GymDeck's local SQLite database. They are never transmitted to unauthorized cloud aggregators.
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  )}

                  {/* PAGE 4: Membership Planning (Plan Selection + Joining Fee + GST + Add-ons) */}
                  {regPage === 4 && (
                    <View style={{ flex: 1, paddingBottom: 50, gap: 14 }}>
                      {/* Section 1: Membership Plan Selection */}
                      <Animated.View
                        style={[
                          {
                            gap: 8,
                            padding: 4,
                            borderRadius: 14,
                            borderWidth: missingFieldErrors.membershipPlan ? 1.5 : 0,
                            borderColor: missingFieldErrors.membershipPlan ? '#EF4444' : 'transparent',
                          },
                          missingFieldErrors.membershipPlan && {
                            transform: [{ translateX: shakeAnim }],
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <CreditCard size={14} color="#EA580C" strokeWidth={2.4} />
                          <Text
                            style={{
                              fontSize: 11.5,
                              fontWeight: '800',
                              color: missingFieldErrors.membershipPlan ? '#EF4444' : (isDark ? '#FFFFFF' : '#0F172A'),
                              letterSpacing: 0.2,
                              textTransform: 'uppercase',
                            }}
                          >
                            Available Membership Packages
                          </Text>
                        </View>

                        {/* Plan Cards Rendering: Square Cards Side-by-Side / 2-per-page Scroll */}
                        {(() => {
                          const renderPlanSquareCard = (p: any, cardWidth?: number) => {
                            const isPlanSelected = formSelectedPlanId === p.id;
                            let category = 'General';
                            let planJoiningFee = 0;
                            let audience = 'All';
                            let goal = 'Fitness';
                            let durationLabel = `${p.durationDays}D`;

                            if (p.durationDays === 30) durationLabel = '1 Month';
                            else if (p.durationDays === 90) durationLabel = '3 Months';
                            else if (p.durationDays === 180) durationLabel = '6 Months';
                            else if (p.durationDays === 365) durationLabel = '1 Year';

                            const desc = (p as any).description || '';
                            if (desc.includes('||')) {
                              const parts = desc.split('||');
                              category = parts[0] || 'General';
                              planJoiningFee = parseFloat(parts[1]) || 0;
                              audience = parts[2] || 'All';
                              goal = parts[3] || 'Fitness';
                              if (parts.length >= 8 && parts[7]) {
                                durationLabel = parts[7];
                              }
                            }

                            return (
                              <TouchableOpacity
                                key={p.id}
                                style={[
                                  styles.planSquareCard,
                                  cardWidth ? { width: cardWidth } : { flex: 1 },
                                  {
                                    backgroundColor: isPlanSelected
                                      ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#F0FDF4')
                                      : (isDark ? '#1E293B' : '#FFFFFF'),
                                    borderColor: isPlanSelected
                                      ? '#10B981'
                                      : (isDark ? '#334155' : '#E2E8F0'),
                                  },
                                ]}
                                onPress={() => {
                                  setFormSelectedPlanId(isPlanSelected ? undefined : p.id);
                                  if (missingFieldErrors.membershipPlan) {
                                    setMissingFieldErrors((prev) => ({ ...prev, membershipPlan: false }));
                                  }
                                  if (!isPlanSelected && planJoiningFee > 0 && formJoiningFee === 0) {
                                    setFormJoiningFee(planJoiningFee);
                                  }
                                }}
                                activeOpacity={0.85}
                              >
                                {/* Top Header: Icon + Radio Indicator */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <View
                                    style={[
                                      styles.proIconBox,
                                      {
                                        width: 28,
                                        height: 28,
                                        borderRadius: 7,
                                        backgroundColor: isPlanSelected
                                          ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5')
                                          : (isDark ? '#0F172A' : '#F8FAFC'),
                                        borderColor: isPlanSelected
                                          ? (isDark ? 'rgba(16, 185, 129, 0.4)' : '#A7F3D0')
                                          : (isDark ? '#334155' : '#E2E8F0'),
                                      },
                                    ]}
                                  >
                                    <CreditCard
                                      size={14}
                                      color={isPlanSelected ? '#10B981' : (isDark ? '#94A3B8' : '#475569')}
                                      strokeWidth={2.2}
                                    />
                                  </View>

                                  <View
                                    style={[
                                      styles.planSquareRadio,
                                      isPlanSelected && { backgroundColor: '#10B981', borderColor: '#10B981' },
                                    ]}
                                  >
                                    {isPlanSelected && <Check size={10} color="#FFFFFF" strokeWidth={3.5} />}
                                  </View>
                                </View>

                                {/* Middle Content: Plan Name & Tags */}
                                <View style={{ marginTop: 6 }}>
                                  <Text
                                    style={{
                                      fontSize: 13,
                                      fontWeight: '800',
                                      color: isDark ? '#FFFFFF' : '#0F172A',
                                      letterSpacing: -0.2,
                                    }}
                                    numberOfLines={1}
                                  >
                                    {p.planName}
                                  </Text>
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      fontWeight: '600',
                                      color: isDark ? '#94A3B8' : '#64748B',
                                      marginTop: 1,
                                    }}
                                    numberOfLines={1}
                                  >
                                    {category} · {durationLabel}
                                  </Text>
                                </View>

                                {/* Bottom Pricing & Action Status */}
                                <View style={{ marginTop: 'auto', paddingTop: 8 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                                    <Text
                                      style={{
                                        fontSize: 16,
                                        fontWeight: '900',
                                        color: isDark ? '#FFFFFF' : '#0F172A',
                                        letterSpacing: -0.3,
                                      }}
                                    >
                                      ₹{Number(p.price).toLocaleString('en-IN')}
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: 9.5,
                                        fontWeight: '600',
                                        color: isDark ? '#94A3B8' : '#64748B',
                                      }}
                                    >
                                      /{p.durationDays}d
                                    </Text>
                                  </View>

                                  <View
                                    style={[
                                      styles.planSquareActionBtn,
                                      {
                                        backgroundColor: isPlanSelected
                                          ? (isDark ? '#064E3B' : '#ECFDF5')
                                          : (isDark ? '#0F172A' : '#0F172A'),
                                        borderColor: isPlanSelected
                                          ? (isDark ? '#047857' : '#A7F3D0')
                                          : (isDark ? '#334155' : '#0F172A'),
                                        marginTop: 6,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.planSquareActionText,
                                        { color: isPlanSelected ? '#059669' : '#FFFFFF' },
                                      ]}
                                    >
                                      {isPlanSelected ? 'Selected' : 'Select'}
                                    </Text>
                                  </View>
                                </View>
                              </TouchableOpacity>
                            );
                          };

                          const renderCreatePlanDottedCard = (cardWidth?: number) => (
                            <TouchableOpacity
                              key="add-new-plan-card"
                              style={[
                                styles.planDottedCard,
                                cardWidth ? { width: cardWidth } : { flex: 1 },
                                {
                                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(248, 250, 252, 0.8)',
                                  borderColor: isDark ? '#475569' : '#CBD5E1',
                                },
                              ]}
                              onPress={() => {
                                closeAddMemberModal();
                                router.push('/plans' as any);
                              }}
                              activeOpacity={0.75}
                            >
                              <View
                                style={[
                                  styles.planDottedIconBox,
                                  {
                                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                    borderColor: isDark ? '#475569' : '#E2E8F0',
                                  },
                                ]}
                              >
                                <Plus size={18} color={isDark ? '#E2E8F0' : '#475569'} strokeWidth={2.5} />
                              </View>
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: '800',
                                  color: isDark ? '#FFFFFF' : '#0F172A',
                                  marginTop: 8,
                                  textAlign: 'center',
                                }}
                              >
                                Create New Plan
                              </Text>
                              <Text
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: '500',
                                  color: isDark ? '#94A3B8' : '#64748B',
                                  textAlign: 'center',
                                  marginTop: 2,
                                  paddingHorizontal: 4,
                                }}
                              >
                                Configure custom terms & fees
                              </Text>
                            </TouchableOpacity>
                          );

                          // Case A: 0 plans available
                          if (availablePlans.length === 0) {
                            return (
                              <View style={styles.planSquareRow}>
                                {renderCreatePlanDottedCard()}
                              </View>
                            );
                          }

                          // Case B: Exactly 1 plan available -> Left: Plan card, Right: Dotted + card
                          if (availablePlans.length === 1) {
                            return (
                              <View style={styles.planSquareRow}>
                                {renderPlanSquareCard(availablePlans[0])}
                                {renderCreatePlanDottedCard()}
                              </View>
                            );
                          }

                          // Case C: Exactly 2 plans available -> Left: Plan 1, Right: Plan 2
                          if (availablePlans.length === 2) {
                            return (
                              <View style={styles.planSquareRow}>
                                {renderPlanSquareCard(availablePlans[0])}
                                {renderPlanSquareCard(availablePlans[1])}
                              </View>
                            );
                          }

                          // Case D: More than 2 plans available -> Horizontal scrollable, 2 cards per page view
                          const itemWidth = Math.floor((screenWidth - 50) / 2);
                          return (
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={{ gap: 10, paddingVertical: 2, paddingRight: 4 }}
                              decelerationRate="fast"
                              snapToInterval={itemWidth * 2 + 10}
                              snapToAlignment="start"
                            >
                              {availablePlans.map((p) => renderPlanSquareCard(p, itemWidth))}
                              {renderCreatePlanDottedCard(itemWidth)}
                            </ScrollView>
                          );
                        })()}
                      </Animated.View>

                      {/* Section 2: One-Time Joining Fee Card */}
                      <View
                        style={[
                          styles.proSurfaceCard,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                            borderColor: isDark ? '#334155' : '#E2E8F0',
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View
                            style={[
                              styles.proIconBox,
                              {
                                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                                borderColor: isDark ? '#334155' : '#E2E8F0',
                              },
                            ]}
                          >
                            <CreditCard size={15} color={isDark ? '#94A3B8' : '#475569'} strokeWidth={2.2} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.proSectionHeaderTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                              One-Time Joining Fee
                            </Text>
                            <Text style={[styles.proSectionHeaderDesc, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                              Discretionary admission & onboarding charge
                            </Text>
                          </View>
                        </View>

                        {/* Scaled Input & Quick Amount Presets */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11 }}>
                          <View
                            style={[
                              styles.proInputWrapper,
                              {
                                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                                borderColor: isDark ? '#334155' : '#E2E8F0',
                              },
                            ]}
                          >
                            <Text style={styles.proInputPrefix}>₹</Text>
                            <TextInput
                              style={[styles.proInputFieldText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
                              value={String(formJoiningFee)}
                              onChangeText={(val) => setFormJoiningFee(Number(val.replace(/[^0-9]/g, '')) || 0)}
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            />
                          </View>

                          <View style={{ flexDirection: 'row', gap: 5 }}>
                            {[0, 500, 1000, 1500].map((amount) => {
                              const isAmountActive = formJoiningFee === amount;
                              return (
                                <TouchableOpacity
                                  key={amount}
                                  style={[
                                    styles.proPresetPill,
                                    isAmountActive
                                      ? { backgroundColor: '#0F172A', borderColor: '#0F172A' }
                                      : {
                                          backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                                          borderColor: isDark ? '#334155' : '#E2E8F0',
                                        },
                                  ]}
                                  onPress={() => setFormJoiningFee(amount)}
                                  activeOpacity={0.8}
                                >
                                  <Text
                                    style={[
                                      styles.proPresetPillText,
                                      {
                                        color: isAmountActive
                                          ? '#FFFFFF'
                                          : isDark
                                          ? '#CBD5E1'
                                          : '#475569',
                                      },
                                    ]}
                                  >
                                    ₹{amount}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      </View>

                      {/* Section 3: GST Tax Control Card */}
                      <View
                        style={[
                          styles.proSurfaceCard,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                            borderColor: isDark ? '#334155' : '#E2E8F0',
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
                            <View
                              style={[
                                styles.proIconBox,
                                {
                                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                                  borderColor: isDark ? '#334155' : '#E2E8F0',
                                },
                              ]}
                            >
                              <Percent size={15} color={isDark ? '#94A3B8' : '#475569'} strokeWidth={2.2} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.proSectionHeaderTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                                GST Tax
                              </Text>
                              <Text style={[styles.proSectionHeaderDesc, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                                Goods & Services Tax levy on billable items
                              </Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.proToggleBtn,
                              {
                                backgroundColor: formGstEnabled
                                  ? (isDark ? '#064E3B' : '#ECFDF5')
                                  : (isDark ? '#0F172A' : '#F1F5F9'),
                                borderColor: formGstEnabled
                                  ? (isDark ? '#047857' : '#A7F3D0')
                                  : (isDark ? '#334155' : '#E2E8F0'),
                              },
                            ]}
                            onPress={() => setFormGstEnabled(!formGstEnabled)}
                            activeOpacity={0.8}
                          >
                            <View
                              style={[
                                styles.consentCheckbox,
                                { width: 14, height: 14, borderRadius: 3.5 },
                                formGstEnabled && { backgroundColor: '#10B981', borderColor: '#10B981' },
                              ]}
                            >
                              {formGstEnabled && <Check size={10} color="#FFFFFF" strokeWidth={3.5} />}
                            </View>
                            <Text
                              style={{
                                fontSize: 10.5,
                                fontWeight: '800',
                                color: formGstEnabled
                                  ? '#059669'
                                  : isDark
                                  ? '#CBD5E1'
                                  : '#475569',
                              }}
                            >
                              {formGstEnabled ? 'Enabled' : 'Apply Tax'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {formGstEnabled && (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginTop: 11,
                              paddingTop: 10,
                              borderTopWidth: 1,
                              borderTopColor: isDark ? '#334155' : '#F1F5F9',
                            }}
                          >
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              {([5, 12, 18] as const).map((rate) => {
                                const isRateActive = formGstRate === rate;
                                return (
                                  <TouchableOpacity
                                    key={rate}
                                    style={[
                                      styles.proPresetPill,
                                      isRateActive
                                        ? { backgroundColor: '#0F172A', borderColor: '#0F172A' }
                                        : {
                                            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                                            borderColor: isDark ? '#334155' : '#E2E8F0',
                                          },
                                    ]}
                                    onPress={() => setFormGstRate(rate)}
                                  >
                                    <Text
                                      style={[
                                        styles.proPresetPillText,
                                        {
                                          color: isRateActive
                                            ? '#FFFFFF'
                                            : isDark
                                            ? '#CBD5E1'
                                            : '#475569',
                                        },
                                      ]}
                                    >
                                      {rate}% GST
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>

                            {/* Tax Amount Display */}
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'baseline',
                                gap: 4,
                                paddingHorizontal: 9,
                                paddingVertical: 4.5,
                                borderRadius: 6,
                                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                                borderWidth: 1,
                                borderColor: isDark ? '#334155' : '#E2E8F0',
                              }}
                            >
                              <Text style={{ fontSize: 10, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '700' }}>
                                Tax:
                              </Text>
                              <Text style={{ fontSize: 12, color: isDark ? '#FFFFFF' : '#0F172A', fontWeight: '900' }}>
                                ₹{Math.round(
                                  ((Number(availablePlans.find((p) => p.id === formSelectedPlanId)?.price || 0) +
                                    Number(formJoiningFee || 0) +
                                    Object.values(formSelectedAddons).reduce((acc: number, curr: number) => acc + Number(curr || 0), 0) +
                                    formCustomAddons.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)) *
                                    formGstRate) /
                                    100
                                ).toLocaleString('en-IN')}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>

                      {/* Section 4: Add-on Amenities & Services Card */}
                      <View
                        style={[
                          styles.proSurfaceCard,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                            borderColor: isDark ? '#334155' : '#E2E8F0',
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View
                            style={[
                              styles.proIconBox,
                              {
                                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                                borderColor: isDark ? '#334155' : '#E2E8F0',
                              },
                            ]}
                          >
                            <Package size={15} color={isDark ? '#94A3B8' : '#475569'} strokeWidth={2.2} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.proSectionHeaderTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                              Add-on Amenities & Services
                            </Text>
                            <Text style={[styles.proSectionHeaderDesc, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                              Locker, personal training, spa, or custom charges
                            </Text>
                          </View>
                        </View>

                        {/* Preset Addons List */}
                        <View style={{ gap: 8, marginTop: 12 }}>
                          {[
                            { id: 'locker', name: 'Personal Locker', sub: 'Assigned safe locker in changing room', fee: 500, icon: Shield },
                            { id: 'pt', name: 'PT Starter Pack', sub: '3 One-on-one personal training sessions', fee: 1500, icon: Dumbbell },
                            { id: 'diet', name: 'Diet Consultation', sub: 'Customized nutritional meal breakdown', fee: 800, icon: Apple },
                            { id: 'sauna', name: 'Steam & Sauna', sub: 'Full wellness & recovery suite access', fee: 600, icon: Flame },
                          ].map((addon) => {
                            const isChecked = formSelectedAddons[addon.id] !== undefined;
                            return (
                              <TouchableOpacity
                                key={addon.id}
                                style={[
                                  styles.proAddonItemRow,
                                  {
                                    backgroundColor: isChecked
                                      ? (isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4')
                                      : (isDark ? '#0F172A' : '#F8FAFC'),
                                    borderColor: isChecked
                                      ? (isDark ? '#059669' : '#10B981')
                                      : (isDark ? '#334155' : '#E2E8F0'),
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
                                <View
                                  style={[
                                    styles.consentCheckbox,
                                    isChecked && { backgroundColor: '#10B981', borderColor: '#10B981' },
                                  ]}
                                >
                                  {isChecked && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                                </View>

                                <View
                                  style={[
                                    styles.proIconBox,
                                    {
                                      width: 28,
                                      height: 28,
                                      borderRadius: 6,
                                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                      borderColor: isDark ? '#334155' : '#E2E8F0',
                                    },
                                  ]}
                                >
                                  <addon.icon size={13} color={isChecked ? '#10B981' : (isDark ? '#94A3B8' : '#64748B')} strokeWidth={2.2} />
                                </View>

                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.proAddonTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                                    {addon.name}
                                  </Text>
                                  <Text style={[styles.proAddonSub, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                                    {addon.sub}
                                  </Text>
                                </View>

                                <View
                                  style={[
                                    styles.proAddonFeeBadge,
                                    {
                                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                      borderColor: isDark ? '#334155' : '#E2E8F0',
                                    },
                                  ]}
                                >
                                  <Text style={[styles.proAddonFeeText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                                    +₹{addon.fee}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}

                          {/* Custom Addons List */}
                          {formCustomAddons.map((ca) => (
                            <View
                              key={ca.id}
                              style={[
                                styles.proAddonItemRow,
                                {
                                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                                  borderColor: isDark ? '#334155' : '#E2E8F0',
                                },
                              ]}
                            >
                              <Tag size={13} color={isDark ? '#94A3B8' : '#64748B'} strokeWidth={2.2} />
                              <Text style={[styles.proAddonTitle, { flex: 1, color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                                {ca.name}
                              </Text>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981', marginRight: 8 }}>
                                +₹{ca.amount}
                              </Text>
                              <TouchableOpacity onPress={() => setFormCustomAddons(formCustomAddons.filter((x) => x.id !== ca.id))}>
                                <Trash2 size={14} color="#EF4444" strokeWidth={2} />
                              </TouchableOpacity>
                            </View>
                          ))}

                          {/* Custom Addon Input Bar */}
                          {showCustomAddonInput ? (
                            <View style={{ gap: 8, marginTop: 4 }}>
                              <TextInput
                                style={[
                                  styles.formInput,
                                  {
                                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                                    borderColor: isDark ? '#334155' : '#E2E8F0',
                                    color: isDark ? '#FFFFFF' : '#0F172A',
                                  },
                                ]}
                                placeholder="Service name (e.g. Gym Bag / Towel Kit)"
                                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                value={newCustomAddonName}
                                onChangeText={setNewCustomAddonName}
                              />
                              <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TextInput
                                  style={[
                                    styles.formInput,
                                    {
                                      flex: 1,
                                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                                      borderColor: isDark ? '#334155' : '#E2E8F0',
                                      color: isDark ? '#FFFFFF' : '#0F172A',
                                    },
                                  ]}
                                  placeholder="Fee (INR)"
                                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                  value={newCustomAddonAmount}
                                  onChangeText={setNewCustomAddonAmount}
                                  keyboardType="numeric"
                                />
                                <TouchableOpacity
                                  style={[
                                    styles.proPresetPill,
                                    {
                                      backgroundColor: '#0F172A',
                                      borderColor: '#0F172A',
                                      paddingHorizontal: 16,
                                      justifyContent: 'center',
                                    },
                                  ]}
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
                                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Add</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[
                                styles.proAddCustomBtn,
                                {
                                  borderColor: isDark ? '#334155' : '#CBD5E1',
                                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                                },
                              ]}
                              onPress={() => setShowCustomAddonInput(true)}
                              activeOpacity={0.8}
                            >
                              <Plus size={13} color={isDark ? '#94A3B8' : '#475569'} strokeWidth={2.4} />
                              <Text style={[styles.proAddCustomBtnText, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                                Add Custom Service / Fee
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {/* Section 5: Plan Policies & Membership FAQs */}
                      <View style={{ marginTop: 4, gap: 8 }}>
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
                            Membership Planning & Billing FAQs
                          </Text>
                        </View>

                        {/* FAQ 1: Can membership plans be upgraded or changed later? */}
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
                              setExpandedFaqId(expandedFaqId === 'plan_upgrade' ? null : 'plan_upgrade')
                            }
                            activeOpacity={0.7}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <CreditCard size={14} color="#EA580C" strokeWidth={2.2} />
                              <Text
                                style={[
                                  styles.faqQuestionText,
                                  { color: isDark ? '#FFFFFF' : '#0F172A' },
                                ]}
                              >
                                Can a member upgrade or change plans later?
                              </Text>
                            </View>
                            <ChevronDown
                              size={15}
                              color={isDark ? '#94A3B8' : '#64748B'}
                              style={{
                                transform: [{ rotate: expandedFaqId === 'plan_upgrade' ? '180deg' : '0deg' }],
                              }}
                            />
                          </TouchableOpacity>
                          {expandedFaqId === 'plan_upgrade' && (
                            <View style={styles.faqAnswerBody}>
                              <Text
                                style={[
                                  styles.faqAnswerText,
                                  { color: isDark ? '#94A3B8' : '#64748B' },
                                ]}
                              >
                                Yes. You can renew, extend, or upgrade the membership tier at any time from the member profile screen. Any remaining term can be prorated or extended automatically.
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* FAQ 2: When does the membership start and expire? */}
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
                              setExpandedFaqId(expandedFaqId === 'plan_expiry' ? null : 'plan_expiry')
                            }
                            activeOpacity={0.7}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <Clock size={14} color="#EA580C" strokeWidth={2.2} />
                              <Text
                                style={[
                                  styles.faqQuestionText,
                                  { color: isDark ? '#FFFFFF' : '#0F172A' },
                                ]}
                              >
                                When does the membership start and expire?
                              </Text>
                            </View>
                            <ChevronDown
                              size={15}
                              color={isDark ? '#94A3B8' : '#64748B'}
                              style={{
                                transform: [{ rotate: expandedFaqId === 'plan_expiry' ? '180deg' : '0deg' }],
                              }}
                            />
                          </TouchableOpacity>
                          {expandedFaqId === 'plan_expiry' && (
                            <View style={styles.faqAnswerBody}>
                              <Text
                                style={[
                                  styles.faqAnswerText,
                                  { color: isDark ? '#94A3B8' : '#64748B' },
                                ]}
                              >
                                By default, membership duration starts today upon payment settlement. GymDeck calculates the expiry date automatically based on the package days and tracks automated renewal alerts.
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* FAQ 3: How are taxes and joining fees accounted for? */}
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
                              setExpandedFaqId(expandedFaqId === 'plan_tax' ? null : 'plan_tax')
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
                                How are taxes and one-time joining fees recorded?
                              </Text>
                            </View>
                            <ChevronDown
                              size={15}
                              color={isDark ? '#94A3B8' : '#64748B'}
                              style={{
                                transform: [{ rotate: expandedFaqId === 'plan_tax' ? '180deg' : '0deg' }],
                              }}
                            />
                          </TouchableOpacity>
                          {expandedFaqId === 'plan_tax' && (
                            <View style={styles.faqAnswerBody}>
                              <Text
                                style={[
                                  styles.faqAnswerText,
                                  { color: isDark ? '#94A3B8' : '#64748B' },
                                ]}
                              >
                                All line items—membership fee, joining fee, taxes, and add-on services—are itemized on the final tax invoice, stored securely in local SQLite records, and summarized in your daily revenue reports.
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  )}

                  {/* PAGE 5: Payment Settlement & Bill Summary */}
                  {regPage === 5 && (
                    <View style={{ flex: 1, paddingBottom: 60, gap: 14 }}>
                      {/* Official Tax Invoice Itemization Card */}
                      <View
                        style={[
                          styles.proBillCard,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                            borderColor: isDark ? '#334155' : '#E2E8F0',
                          },
                        ]}
                      >
                        {/* Subtle Geometric Watermark on Bottom Right (Enlarged) */}
                        <View style={styles.proBillWatermark} pointerEvents="none">
                          <Svg width={220} height={220} viewBox="0 0 220 220" fill="none">
                            <Circle cx={160} cy={160} r={105} stroke={isDark ? '#FFFFFF' : '#0F172A'} strokeWidth={1.2} strokeOpacity={isDark ? 0.05 : 0.045} strokeDasharray="4 4" />
                            <Circle cx={160} cy={160} r={75} stroke={isDark ? '#FFFFFF' : '#0F172A'} strokeWidth={1.4} strokeOpacity={isDark ? 0.06 : 0.055} />
                            <Circle cx={160} cy={160} r={45} stroke={isDark ? '#FFFFFF' : '#0F172A'} strokeWidth={1} strokeOpacity={isDark ? 0.05 : 0.04} />
                            <Rect x={105} y={105} width={110} height={110} rx={22} transform="rotate(25 160 160)" stroke={isDark ? '#FFFFFF' : '#0F172A'} strokeWidth={1.2} strokeOpacity={isDark ? 0.05 : 0.045} />
                            <Path d="M110 220 L220 110 M135 220 L220 135 M160 220 L220 160 M185 220 L220 185" stroke={isDark ? '#FFFFFF' : '#0F172A'} strokeWidth={1.2} strokeOpacity={isDark ? 0.06 : 0.055} />
                          </Svg>
                        </View>

                        {/* Official Bill Header */}
                        <View style={styles.proBillHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View
                              style={[
                                styles.proIconBox,
                                {
                                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                                  borderColor: isDark ? '#334155' : '#E2E8F0',
                                },
                              ]}
                            >
                              <Receipt size={16} color={isDark ? '#CBD5E1' : '#334155'} strokeWidth={2.2} />
                            </View>
                            <View>
                              <Text style={[styles.proSectionHeaderTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                                INVOICE ITEMIZATION
                              </Text>
                              <Text style={[styles.proSectionHeaderDesc, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                                Official bill breakdown & charges
                              </Text>
                            </View>
                          </View>

                          <View style={{ alignItems: 'flex-end' }}>
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: isDark ? '#94A3B8' : '#64748B',
                                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                                letterSpacing: 0.3,
                              }}
                            >
                              #TX-GD-REC-24B
                            </Text>
                          </View>
                        </View>

                        {/* Bill Column Header */}
                        <View
                          style={[
                            styles.proBillColumnsHeader,
                            {
                              backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                              borderColor: isDark ? '#334155' : '#E2E8F0',
                            },
                          ]}
                        >
                          <Text style={[styles.proBillColTitle, { color: isDark ? '#94A3B8' : '#64748B', flex: 1 }]}>
                            DESCRIPTION
                          </Text>
                          <Text style={[styles.proBillColTitle, { color: isDark ? '#94A3B8' : '#64748B', textAlign: 'right' }]}>
                            AMOUNT (INR)
                          </Text>
                        </View>

                        {/* Itemized Rows */}
                        <View style={styles.proBillTable}>
                          {/* Row 1: Membership Plan */}
                          <View
                            style={[
                              styles.proBillTableRow,
                              { borderBottomColor: isDark ? 'rgba(51, 65, 85, 0.5)' : '#F1F5F9' },
                            ]}
                          >
                            <View style={{ flex: 1, paddingRight: 10 }}>
                              <Text style={[styles.proBillItemName, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                                {availablePlans.find((p) => p.id === formSelectedPlanId)?.planName || 'Standard Membership Tier'}
                              </Text>
                              <Text style={[styles.proBillItemSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                                Primary subscription access fee
                              </Text>
                            </View>
                            <Text style={[styles.proBillItemPrice, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                              ₹{Number(availablePlans.find((p) => p.id === formSelectedPlanId)?.price || 0).toLocaleString('en-IN')}
                            </Text>
                          </View>

                          {/* Row 2: Joining Fee */}
                          <View
                            style={[
                              styles.proBillTableRow,
                              { borderBottomColor: isDark ? 'rgba(51, 65, 85, 0.5)' : '#F1F5F9' },
                            ]}
                          >
                            <View style={{ flex: 1, paddingRight: 10 }}>
                              <Text style={[styles.proBillItemName, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                                One-Time Joining Fee
                              </Text>
                              <Text style={[styles.proBillItemSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                                Registration & profile onboarding charge
                              </Text>
                            </View>
                            <Text style={[styles.proBillItemPrice, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                              ₹{Number(formJoiningFee || 0).toLocaleString('en-IN')}
                            </Text>
                          </View>

                          {/* Row 3: Add-on Amenities (if any selected) */}
                          {(Object.values(formSelectedAddons).reduce((acc: number, curr: number) => acc + Number(curr || 0), 0) +
                            formCustomAddons.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) > 0) && (
                            <View
                              style={[
                                styles.proBillTableRow,
                                { borderBottomColor: isDark ? 'rgba(51, 65, 85, 0.5)' : '#F1F5F9' },
                              ]}
                            >
                              <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={[styles.proBillItemName, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                                  Add-on Amenities & Services
                                </Text>
                                <Text style={[styles.proBillItemSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                                  Selected facility & coaching add-ons
                                </Text>
                              </View>
                              <Text style={[styles.proBillItemPrice, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                                ₹{(
                                  Object.values(formSelectedAddons).reduce((acc: number, curr: number) => acc + Number(curr || 0), 0) +
                                  formCustomAddons.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
                                ).toLocaleString('en-IN')}
                              </Text>
                            </View>
                          )}

                          {/* Row 4: Taxes & Levies */}
                          <View
                            style={[
                              styles.proBillTableRow,
                              { borderBottomColor: isDark ? 'rgba(51, 65, 85, 0.5)' : '#F1F5F9' },
                            ]}
                          >
                            <View style={{ flex: 1, paddingRight: 10 }}>
                              <Text style={[styles.proBillItemName, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                                Taxes & Surcharges
                              </Text>
                              <Text style={[styles.proBillItemSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                                {formGstEnabled ? `GST applied at ${formGstRate}%` : 'Standard inclusive taxation (0% applied)'}
                              </Text>
                            </View>
                            <Text style={[styles.proBillItemPrice, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                              ₹{formGstEnabled
                                ? Math.round(
                                    ((Number(availablePlans.find((p) => p.id === formSelectedPlanId)?.price || 0) +
                                      Number(formJoiningFee || 0) +
                                      Object.values(formSelectedAddons).reduce((acc: number, curr: number) => acc + Number(curr || 0), 0) +
                                      formCustomAddons.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)) *
                                      formGstRate) /
                                      100
                                  ).toLocaleString('en-IN')
                                : '0'}
                            </Text>
                          </View>
                        </View>

                        {/* Official Grand Total Banner Styled in Black */}
                        <View
                          style={[
                            styles.proBillTotalBanner,
                            {
                              backgroundColor: '#0F172A',
                              borderColor: '#1E293B',
                            },
                          ]}
                        >
                          <View>
                            <Text style={[styles.proBillTotalLabel, { color: '#FFFFFF' }]}>
                              Total Amount Payable
                            </Text>
                            <Text style={[styles.proBillTotalSub, { color: '#94A3B8' }]}>
                              Final net invoice balance
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.proBillTotalNumber,
                              { color: '#FFFFFF' },
                            ]}
                          >
                            ₹{Math.round(
                              (Number(availablePlans.find((p) => p.id === formSelectedPlanId)?.price || 0) +
                                Number(formJoiningFee || 0) +
                                Object.values(formSelectedAddons).reduce((acc: number, curr: number) => acc + Number(curr || 0), 0) +
                                formCustomAddons.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)) *
                                (formGstEnabled ? 1 + formGstRate / 100 : 1)
                            ).toLocaleString('en-IN')}
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

                  {memberFormMode === 'edit' ? (
                    <TouchableOpacity
                      style={styles.registrationSubmitBtn}
                      onPress={handleRegisterMember}
                      disabled={formIsSubmitting}
                      activeOpacity={0.85}
                    >
                      {formIsSubmitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <CheckCircle2
                            size={15}
                            color="#FFFFFF"
                            strokeWidth={2.4}
                          />
                          <Text style={styles.registrationSubmitBtnText}>
                            Save Changes
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : regPage < 5 ? (
                    <TouchableOpacity
                      style={styles.registrationSubmitBtn}
                      onPress={handleNextPage}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.registrationSubmitBtnText}>
                        NEXT
                      </Text>
                      <ArrowRight
                        size={14}
                        color="#FFFFFF"
                        strokeWidth={2.4}
                      />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.registrationSubmitBtn}
                      onPress={handleRegisterMember}
                      disabled={formIsSubmitting}
                      activeOpacity={0.85}
                    >
                      {formIsSubmitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <UserPlus
                            size={15}
                            color="#FFFFFF"
                            strokeWidth={2.4}
                          />
                          <Text style={styles.registrationSubmitBtnText}>
                            Save & Finish
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>

          {/* Custom Device Permission Access Request Modal Rendered Directly Inside Registration Sheet */}
          <PermissionAccessModal
            visible={permissionModalVisible}
            type={permissionModalType}
            isDark={isDark}
            canAskAgain={permissionCanAskAgain}
            onClose={() => setPermissionModalVisible(false)}
            onGrantPermission={async () => {
              if (pendingPermissionActionRef.current) {
                await pendingPermissionActionRef.current();
              }
            }}
          />
    </View>
  );

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
        visible={isAddMemberModalOpen && !isViewMemberModalOpen}
        transparent
        animationType="none"
        onRequestClose={closeAddMemberModal}
      >
        {renderRegistrationFormSheet()}
      </Modal>

      {/* MEMBER PROFILE Modal: Bottom Sheet Modal sliding up with Luxury Profile Card inside */}
      <Modal
        visible={isViewMemberModalOpen}
        transparent
        animationType="none"
        onRequestClose={closeViewMemberModal}
      >
        <View style={styles.modalRoot}>
          {/* Smooth Fade-Only Dim Backdrop */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: viewModalBackdropAnim,
                backgroundColor: 'rgba(0, 0, 0, 0.52)',
              },
            ]}
          >
            <TouchableWithoutFeedback onPress={closeViewMemberModal}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
          </Animated.View>

          {/* Bottom Sheet Card sliding up from bottom with matching height & styling */}
          <Animated.View
            style={[
              styles.registrationSheetContainer,
              {
                transform: [{ translateY: viewModalSheetTranslateY }],
              },
            ]}
          >
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

              {/* Modal Top Header with Close Button */}
              <View style={[styles.modalHeaderRow, { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9', marginBottom: 12 }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.registrationKickerText}>
                    MEMBER PROFILE
                  </Text>
                  <Text style={[styles.modalTitle, styles.registrationHeaderTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {selectedMemberForView?.fullName || 'Member Details'}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                    View complete membership profile and card.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closeViewMemberModal}
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

              {/* High-Performance Smooth Scrollable Container */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                  paddingHorizontal: 4,
                  paddingTop: 8,
                  paddingBottom: 70,
                  gap: 16,
                }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                scrollEventThrottle={16}
                decelerationRate="normal"
                bounces={true}
                nestedScrollEnabled={true}
                overScrollMode="always"
              >
                  {/* TOP SECTION: The Luxury Profile Card (Preserved as requested) */}
                  <View style={{ alignItems: 'center', width: '100%' }}>
                    <View style={styles.luxuryProfileCard}>
                      {/* Inner Border Inset */}
                      <View style={styles.luxuryProfileCardInnerBorder} pointerEvents="none" />

                      {/* Full-Bleed Portrait Background */}
                      <View style={styles.cardPortraitWrap}>
                        {selectedMemberForView?.profilePhotoUrl ? (
                          <Image
                            source={{ uri: selectedMemberForView.profilePhotoUrl }}
                            style={styles.cardPortrait}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.cardPortraitSvgWrap}>
                            <SvgXml
                              xml={getDefaultAvatarXml(
                                (selectedMemberForView as any)?.gender,
                                selectedMemberForView?.fullName || 'Member'
                              )}
                              width="100%"
                              height="100%"
                            />
                          </View>
                        )}
                      </View>

                      {/* Smooth Faded Dark Gradient Overlay */}
                      <View style={StyleSheet.absoluteFill} pointerEvents="none">
                        <Svg width="100%" height="100%" preserveAspectRatio="none">
                          <Defs>
                            <LinearGradient id="desktopExactCardFade" x1="0" y1="0" x2="0" y2="1">
                              <Stop offset="0%" stopColor="#030712" stopOpacity="0" />
                              <Stop offset="22%" stopColor="#030712" stopOpacity="0.04" />
                              <Stop offset="38%" stopColor="#030712" stopOpacity="0.28" />
                              <Stop offset="52%" stopColor="#030712" stopOpacity="0.62" />
                              <Stop offset="68%" stopColor="#030712" stopOpacity="0.88" />
                              <Stop offset="82%" stopColor="#030712" stopOpacity="0.97" />
                              <Stop offset="100%" stopColor="#030712" stopOpacity="1" />
                            </LinearGradient>
                          </Defs>
                          <Rect x="0" y="0" width="100%" height="100%" fill="url(#desktopExactCardFade)" />
                        </Svg>
                      </View>

                      {/* Frosted Glass Overlay with Identity, Bio, Stats & Download */}
                      <View style={styles.cardGlassOverlay} pointerEvents="box-none">
                        <View style={styles.cardContent}>
                          {/* Identity Section */}
                          <View style={styles.cardIdentity}>
                            <View style={styles.cardNameRow}>
                              <Text style={styles.cardName} numberOfLines={1}>
                                {selectedMemberForView?.fullName || 'Member Record'}
                              </Text>
                              <View style={styles.cardVerifyCheck}>
                                <CheckCircle2 size={19} color="#FFFFFF" fill="#0EA5E9" strokeWidth={1.8} />
                              </View>
                            </View>

                            <Text style={styles.cardBio} numberOfLines={3}>
                              Transforming strength into legacy. Elite member committed to peak performance.
                            </Text>
                          </View>

                          {/* Footer Refined */}
                          <View style={styles.cardFooterRefined}>
                            <View style={styles.cardStats}>
                              <View style={styles.statItem}>
                                <Calendar size={15} color="rgba(255, 255, 255, 0.65)" strokeWidth={2} />
                                <Text style={styles.statValue}>
                                  {selectedMemberForView?.createdAt
                                    ? new Date(selectedMemberForView.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                    : 'May 2026'}
                                </Text>
                              </View>

                              <View style={styles.statItem}>
                                <User size={15} color="rgba(255, 255, 255, 0.65)" strokeWidth={2} />
                                <Text style={styles.statValue}>
                                  #{selectedMemberForView?.memberCode || (selectedMemberForView?.id ? String(selectedMemberForView.id).slice(-4) : '1972')}
                                </Text>
                              </View>
                            </View>

                            {/* Download Button */}
                            <TouchableOpacity
                              style={styles.btnCardBottomDownload}
                              onPress={() => {
                                Alert.alert('Download Record', 'Member portrait and identification card ready for export.');
                              }}
                              activeOpacity={0.8}
                            >
                              <Download size={19} color="#FFFFFF" strokeWidth={2.4} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* EXECUTIVE MEMBER INTELLIGENCE DOSSIER (Bold Professional Spec) */}
                  {/* ───────────────────────────────────────────────────────────── */}

                  {/* 1. Header Card: Identity Barcode, Primary Name & Membership Status */}
                  <View
                    style={[
                      styles.dossierHeaderBox,
                      {
                        backgroundColor: isDark ? '#111827' : '#FFFFFF',
                        borderColor: isDark ? '#374151' : '#E5E7EB',
                      },
                    ]}
                  >
                    <View style={styles.dossierHeaderTop}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.dossierPreTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                          MEMBER DOSSIER
                        </Text>
                        <Text style={[styles.dossierMemberName, { color: isDark ? '#FFFFFF' : '#0B0F19' }]} numberOfLines={1}>
                          {selectedMemberForView?.fullName || 'UNREGISTERED MEMBER'}
                        </Text>
                      </View>

                      <View style={styles.dossierHeaderBadgeCol}>
                        <View style={[styles.dossierIdBadge, { backgroundColor: isDark ? '#1F2937' : '#0F172A' }]}>
                          <Text style={styles.dossierIdBadgeText}>
                            {selectedMemberForView?.memberCode || (selectedMemberForView?.id ? `GD-${String(selectedMemberForView.id).slice(-4)}` : 'GD-RECORD')}
                          </Text>
                        </View>
                        <View style={[
                          styles.dossierStatusBadge,
                          {
                            backgroundColor: selectedMemberForView?.membershipStatus === 'ACTIVE'
                              ? (isDark ? '#064E3B' : '#ECFDF5')
                              : (isDark ? '#374151' : '#F3F4F6'),
                            borderColor: selectedMemberForView?.membershipStatus === 'ACTIVE'
                              ? '#10B981'
                              : '#9CA3AF',
                          }
                        ]}>
                          <View style={[
                            styles.dossierStatusDot,
                            {
                              backgroundColor: selectedMemberForView?.membershipStatus === 'ACTIVE'
                                ? '#10B981'
                                : '#6B7280',
                            }
                          ]} />
                          <Text style={[
                            styles.dossierStatusText,
                            {
                              color: selectedMemberForView?.membershipStatus === 'ACTIVE'
                                ? (isDark ? '#34D399' : '#047857')
                                : (isDark ? '#D1D5DB' : '#374151'),
                            }
                          ]}>
                            {selectedMemberForView?.membershipStatus || 'ACTIVE'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Quick Executive Metadata Bar */}
                    <View style={[styles.dossierQuickBar, { borderTopColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                      <View style={styles.dossierQuickItem}>
                        <Text style={[styles.dossierQuickLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>ENROLLED</Text>
                        <Text style={[styles.dossierQuickValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                          {selectedMemberForView?.joinedAt
                            ? new Date(selectedMemberForView.joinedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : selectedMemberForView?.createdAt
                            ? new Date(selectedMemberForView.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '-'}
                        </Text>
                      </View>

                      <View style={[styles.dossierQuickDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />

                      <View style={styles.dossierQuickItem}>
                        <Text style={[styles.dossierQuickLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>PLAN TIER</Text>
                        <Text style={[styles.dossierQuickValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                          {selectedMemberForView?.membershipPlan || 'Standard Tier'}
                        </Text>
                      </View>

                      <View style={[styles.dossierQuickDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />

                      <View style={styles.dossierQuickItem}>
                        <Text style={[styles.dossierQuickLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>VALID UNTIL</Text>
                        <Text style={[styles.dossierQuickValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                          {selectedMemberForView?.expiresAt
                            ? new Date(selectedMemberForView.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'Open Access'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* 2. Structured Section: PRIMARY BIOMETRICS & PERSONAL SPECS */}
                  <View style={[styles.dossierSectionCard, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
                    <View style={[styles.dossierSectionHead, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
                      <View style={[styles.dossierSectionIndicator, { backgroundColor: '#0F172A' }]} />
                      <Text style={[styles.dossierSectionHeadTitle, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                        BIOMETRIC & PERSONAL SPECIFICATIONS
                      </Text>
                    </View>

                    <View style={styles.dossierTable}>
                      {/* Row 1: Full Name & Member ID */}
                      <View style={[styles.dossierTableRow, { borderBottomColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                        <View style={styles.dossierTableCellHalf}>
                          <Text style={[styles.dossierCellCaption, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>FULL LEGAL NAME</Text>
                          <Text style={[styles.dossierCellValue, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                            {selectedMemberForView?.fullName || '-'}
                          </Text>
                        </View>
                        <View style={styles.dossierTableCellHalf}>
                          <Text style={[styles.dossierCellCaption, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>INTERNAL ID</Text>
                          <Text style={[styles.dossierCellValueMono, { color: isDark ? '#F3F4F6' : '#0F172A' }]}>
                            {selectedMemberForView?.memberCode || (selectedMemberForView?.id ? `GD-${String(selectedMemberForView.id).slice(-4)}` : '-')}
                          </Text>
                        </View>
                      </View>

                      {/* Row 2: Date of Birth, Age & Gender */}
                      <View style={[styles.dossierTableRow, { borderBottomColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                        <View style={styles.dossierTableCellThird}>
                          <Text style={[styles.dossierCellCaption, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>DATE OF BIRTH</Text>
                          <Text style={[styles.dossierCellValue, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                            {selectedMemberForView?.dob || '-'}
                          </Text>
                        </View>
                        <View style={styles.dossierTableCellThird}>
                          <Text style={[styles.dossierCellCaption, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>CALCULATED AGE</Text>
                          <Text style={[styles.dossierCellValue, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                            {selectedMemberForView?.dob
                              ? `${Math.max(0, new Date().getFullYear() - new Date(selectedMemberForView.dob).getFullYear())} YRS`
                              : '-'}
                          </Text>
                        </View>
                        <View style={styles.dossierTableCellThird}>
                          <Text style={[styles.dossierCellCaption, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>GENDER</Text>
                          <Text style={[styles.dossierCellValue, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                            {selectedMemberForView?.gender || '-'}
                          </Text>
                        </View>
                      </View>

                      {/* Row 3: Height, Weight & Blood Group */}
                      <View style={styles.dossierTableRowLast}>
                        <View style={styles.dossierTableCellThird}>
                          <Text style={[styles.dossierCellCaption, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>STATURE (HEIGHT)</Text>
                          <Text style={[styles.dossierCellValue, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                            {selectedMemberForView?.height ? `${selectedMemberForView.height} CM` : '-'}
                          </Text>
                        </View>
                        <View style={styles.dossierTableCellThird}>
                          <Text style={[styles.dossierCellCaption, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>BODY MASS (WEIGHT)</Text>
                          <Text style={[styles.dossierCellValue, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                            {selectedMemberForView?.weight ? `${selectedMemberForView.weight} KG` : '-'}
                          </Text>
                        </View>
                        <View style={styles.dossierTableCellThird}>
                          <Text style={[styles.dossierCellCaption, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>BLOOD GROUP</Text>
                          <Text style={[styles.dossierCellValue, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                            {selectedMemberForView?.bloodGroup || '-'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* 3. Structured Section: DIRECT CONTACT CHANNELS */}
                  <View style={[styles.dossierSectionCard, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
                    <View style={[styles.dossierSectionHead, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
                      <View style={[styles.dossierSectionIndicator, { backgroundColor: '#0F172A' }]} />
                      <Text style={[styles.dossierSectionHeadTitle, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                        COMMUNICATION CHANNELS & RESIDENCE
                      </Text>
                    </View>

                    <View style={styles.dossierTable}>
                      {/* Row 1: Primary & Alternate Phone */}
                      <View style={[styles.dossierTableRow, { borderBottomColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                        <View style={styles.dossierTableCellHalf}>
                          <Text style={[styles.dossierCellCaption, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>PRIMARY PHONE</Text>
                          <Text style={[styles.dossierCellValueMono, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                            {selectedMemberForView?.phone || '-'}
                          </Text>
                        </View>
                        <View style={styles.dossierTableCellHalf}>
                          <Text style={[styles.dossierCellCaption, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>ALTERNATE CONTACT</Text>
                          <Text style={[styles.dossierCellValueMono, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                            {selectedMemberForView?.alternatePhone || '-'}
                          </Text>
                        </View>
                      </View>

                      {/* Row 2: Email */}
                      <View style={[styles.dossierTableRow, { borderBottomColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.dossierCellCaption, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>OFFICIAL EMAIL</Text>
                          <Text style={[styles.dossierCellValue, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                            {selectedMemberForView?.email || '-'}
                          </Text>
                        </View>
                      </View>

                      {/* Row 3: Physical Address */}
                      <View style={styles.dossierTableRowLast}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.dossierCellCaption, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>REGISTERED ADDRESS</Text>
                          <Text style={[styles.dossierCellValue, { color: isDark ? '#FFFFFF' : '#0B0F19', lineHeight: 20 }]}>
                            {selectedMemberForView?.address || '-'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* 4. Structured Section: ENROLLMENT & MEMBERSHIP ACCREDITATION */}
                  <View style={[styles.dossierSectionCard, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
                    <View style={[styles.dossierSectionHead, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
                      <View style={[styles.dossierSectionIndicator, { backgroundColor: '#0F172A' }]} />
                      <Text style={[styles.dossierSectionHeadTitle, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                        MEMBERSHIP STATUS & CONTRACT PARAMETERS
                      </Text>
                    </View>

                    <View style={styles.dossierTable}>
                      <View style={[styles.dossierTableRow, { borderBottomColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                        <View style={styles.dossierTableCellHalf}>
                          <Text style={[styles.dossierCellCaption, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>ASSIGNED SUBSCRIPTION</Text>
                          <Text style={[styles.dossierCellValue, { color: isDark ? '#FFFFFF' : '#0B0F19', fontWeight: '800' }]}>
                            {selectedMemberForView?.membershipPlan || 'Active Contract'}
                          </Text>
                        </View>
                        <View style={styles.dossierTableCellHalf}>
                          <Text style={[styles.dossierCellCaption, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>CONTRACT TERM</Text>
                          <Text style={[styles.dossierCellValue, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                            12 MONTHS
                          </Text>
                        </View>
                      </View>

                      <View style={styles.dossierTableRowLast}>
                        <View style={styles.dossierTableCellHalf}>
                          <Text style={[styles.dossierCellCaption, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>COMMENCEMENT DATE</Text>
                          <Text style={[styles.dossierCellValue, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                            {selectedMemberForView?.joinedAt
                              ? new Date(selectedMemberForView.joinedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '-'}
                          </Text>
                        </View>
                        <View style={styles.dossierTableCellHalf}>
                          <Text style={[styles.dossierCellCaption, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>TERMINATION / EXPIRY</Text>
                          <Text style={[styles.dossierCellValue, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                            {selectedMemberForView?.expiresAt
                              ? new Date(selectedMemberForView.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              : 'ONGOING VALIDITY'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* 5. Structured Section: COMPLIANCE REPOSITORY & VAULT ARCHIVE */}
                  <View style={[styles.dossierSectionCard, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
                    <View style={[styles.dossierSectionHead, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
                      <View style={[styles.dossierSectionIndicator, { backgroundColor: '#0F172A' }]} />
                      <Text style={[styles.dossierSectionHeadTitle, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                        SECURITY VAULT & VERIFICATION ARCHIVE
                      </Text>
                    </View>

                    {/* Executive 2x2 Clean Grid Layout */}
                    <View style={{ gap: 12 }}>
                      {/* Row 1: Aadhaar Card & PAN Card */}
                      <View style={styles.dashDocRow}>
                        {/* Doc 1: Aadhaar Card */}
                        <TouchableOpacity
                          style={[styles.dashDocCard, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                          onPress={() => {
                            Alert.alert('Aadhaar Document Archive', 'Verification Status: VERIFIED\nGovernment identity record encrypted and catalogued.');
                          }}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.dashDocIconBox, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: isDark ? '#374151' : '#D1D5DB' }]}>
                            <CreditCard size={18} color={isDark ? '#F3F4F6' : '#0F172A'} strokeWidth={2} />
                          </View>
                          <View style={{ alignItems: 'center', width: '100%', gap: 4 }}>
                            <Text style={[styles.dashDocName, { color: isDark ? '#FFFFFF' : '#0B0F19' }]} numberOfLines={1}>AADHAAR CARD</Text>
                            <View style={[styles.dossierDocVerifiedBadge, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                              <Text style={styles.dossierDocVerifiedText}>VERIFIED</Text>
                            </View>
                          </View>
                        </TouchableOpacity>

                        {/* Doc 2: PAN Card */}
                        <TouchableOpacity
                          style={[styles.dashDocCard, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                          onPress={() => {
                            Alert.alert('PAN Document Archive', 'Verification Status: VERIFIED\nFiscal identification record encrypted and catalogued.');
                          }}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.dashDocIconBox, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: isDark ? '#374151' : '#D1D5DB' }]}>
                            <CreditCard size={18} color={isDark ? '#F3F4F6' : '#0F172A'} strokeWidth={2} />
                          </View>
                          <View style={{ alignItems: 'center', width: '100%', gap: 4 }}>
                            <Text style={[styles.dashDocName, { color: isDark ? '#FFFFFF' : '#0B0F19' }]} numberOfLines={1}>PAN CARD</Text>
                            <View style={[styles.dossierDocVerifiedBadge, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                              <Text style={styles.dossierDocVerifiedText}>VERIFIED</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </View>

                      {/* Row 2: Medical Certificate & Member Agreement */}
                      <View style={styles.dashDocRow}>
                        {/* Doc 3: Medical Certificate */}
                        <TouchableOpacity
                          style={[styles.dashDocCard, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                          onPress={() => {
                            Alert.alert('Medical Clearance Record', 'Verification Status: PENDING\nFitness medical attestation submission awaiting audit.');
                          }}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.dashDocIconBox, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: isDark ? '#374151' : '#D1D5DB' }]}>
                            <FileText size={18} color={isDark ? '#F3F4F6' : '#0F172A'} strokeWidth={2} />
                          </View>
                          <View style={{ alignItems: 'center', width: '100%', gap: 4 }}>
                            <Text style={[styles.dashDocName, { color: isDark ? '#FFFFFF' : '#0B0F19' }]} numberOfLines={1}>MEDICAL CERT</Text>
                            <View style={[styles.dossierDocPendingBadge, { backgroundColor: isDark ? '#451A03' : '#FFFBEB' }]}>
                              <Text style={styles.dossierDocPendingText}>PENDING</Text>
                            </View>
                          </View>
                        </TouchableOpacity>

                        {/* Doc 4: Member Agreement */}
                        <TouchableOpacity
                          style={[styles.dashDocCard, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                          onPress={() => {
                            Alert.alert('Facility Contract Agreement', 'Verification Status: EXECUTED\nLegal facility consent signed and archived.');
                          }}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.dashDocIconBox, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: isDark ? '#374151' : '#D1D5DB' }]}>
                            <FileText size={18} color={isDark ? '#F3F4F6' : '#0F172A'} strokeWidth={2} />
                          </View>
                          <View style={{ alignItems: 'center', width: '100%', gap: 4 }}>
                            <Text style={[styles.dashDocName, { color: isDark ? '#FFFFFF' : '#0B0F19' }]} numberOfLines={1}>AGREEMENT</Text>
                            <View style={[styles.dossierDocSignedBadge, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' }]}>
                              <Text style={styles.dossierDocSignedText}>EXECUTED</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                {/* Always-Visible Bottom Actions Bar (Safe Area protected for iOS & Android) */}
                <View
                  style={[
                    styles.viewMemberBottomBar,
                    {
                      borderTopColor: isDark ? '#1E293B' : '#F1F5F9',
                      paddingBottom: Math.max(insets.bottom, 16),
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    },
                  ]}
                >
                  {/* Delete Button (Left side, matching Cancel button position & style) */}
                  <TouchableOpacity
                    style={[
                      styles.viewMemberDeleteBtn,
                      {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                        borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
                      },
                    ]}
                    onPress={openDeleteModal}
                    activeOpacity={0.8}
                  >
                    <Trash2 size={15} color="#EF4444" strokeWidth={2.2} />
                    <Text style={styles.viewMemberDeleteBtnText}>Delete</Text>
                  </TouchableOpacity>

                  {/* Edit Member Button (Right side, matching Next button position & style) */}
                  <TouchableOpacity
                    style={styles.viewMemberEditBtn}
                    onPress={() => openEditMemberModal(selectedMemberForView)}
                    activeOpacity={0.85}
                  >
                    <Edit3 size={15} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.viewMemberEditBtnText}>Edit Member</Text>
                  </TouchableOpacity>
                </View>
              </View>
          </Animated.View>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SETUP GUIDE STYLE: CONFIRM PERMANENT MEMBER DELETION OVERLAY */}
          {/* Compact, executive, highly professional with minimal text     */}
          {/* ───────────────────────────────────────────────────────────── */}
          {isDeleteModalOpen && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: deleteModalBackdropAnim,
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  zIndex: 99999,
                  elevation: 99999,
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
                  styles.setupGuideModalContainer,
                  {
                    transform: [{ scale: deleteModalScaleAnim }],
                    width: '100%',
                    maxWidth: 390,
                  },
                ]}
              >
                <View
                  style={[
                    styles.setupGuideCard,
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
                      styles.setupGuideCloseBtn,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                  >
                    <X size={15} color={isDark ? '#CBD5E1' : '#64748B'} strokeWidth={2.4} />
                  </TouchableOpacity>

                  {/* Header Kicker Badge */}
                  <View style={styles.setupGuideKickerRow}>
                    <View style={styles.setupGuideKickerBadge}>
                      <AlertTriangle size={12} color="#DC2626" strokeWidth={2.6} />
                      <Text style={styles.setupGuideKickerText}>CONFIRM ACTION</Text>
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={[styles.setupGuideTitle, { color: isDark ? '#FFFFFF' : '#0B0F19' }]}>
                    Delete Member Record
                  </Text>

                  {/* Subtitle / Explanatory Description (Bold, Professional & Compact) */}
                  <Text style={[styles.setupGuideSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Are you sure you want to permanently delete{' '}
                    <Text style={{ fontWeight: '900', color: isDark ? '#FFFFFF' : '#0F172A' }}>
                      {selectedMemberForView?.fullName || 'this member'}
                    </Text>
                    ? All active plans, attendance logs, and vault records will be purged immediately.
                  </Text>



                  {/* Action Buttons: Cancel vs Permanent Delete */}
                  <View style={styles.setupGuideActionRow}>
                    <TouchableOpacity
                      style={[
                        styles.setupGuideCancelBtn,
                        {
                          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                          borderColor: isDark ? '#334155' : '#CBD5E1',
                        },
                      ]}
                      onPress={closeDeleteModal}
                      activeOpacity={0.8}
                      disabled={isDeletingMember}
                    >
                      <Text style={[styles.setupGuideCancelBtnText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.setupGuideDeleteBtn}
                      onPress={handleConfirmPermanentDelete}
                      activeOpacity={0.85}
                      disabled={isDeletingMember}
                    >
                      {isDeletingMember ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Trash2 size={14} color="#FFFFFF" strokeWidth={2.4} />
                          <Text style={styles.setupGuideDeleteBtnText}>
                            Delete
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            </Animated.View>
          )}

          {/* EDIT MEMBER OVERLAY: Renders the Registration / Edit Sheet on top of the Member Profile Modal */}
          {isAddMemberModalOpen && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { zIndex: 9999, elevation: 9999 },
              ]}
              pointerEvents="box-none"
            >
              {renderRegistrationFormSheet()}
            </Animated.View>
          )}
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
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedMemberForView(member);
                      setIsViewMemberModalOpen(true);
                    }}
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
                    onPress={() => {
                      setSelectedMemberForView(member);
                      setIsViewMemberModalOpen(true);
                    }}
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

      {/* 6. Custom Device Permission Access Request Modal */}
      <PermissionAccessModal
        visible={permissionModalVisible}
        type={permissionModalType}
        isDark={isDark}
        canAskAgain={permissionCanAskAgain}
        onClose={() => setPermissionModalVisible(false)}
        onGrantPermission={async () => {
          if (pendingPermissionActionRef.current) {
            await pendingPermissionActionRef.current();
          }
        }}
      />

      {/* 7. Member Registered / Updated Success Modal (Custom Bottom-Sheet) */}
      <MemberRegisteredSuccessModal
        visible={successModalVisible}
        data={successModalData}
        isDark={isDark}
        onClose={() => {
          setSuccessModalVisible(false);
          setSuccessModalData(null);
        }}
        onViewProfile={(memberId) => {
          const found = allMembers.find((m) => m.id === memberId);
          if (found) {
            setSelectedMemberForView(found);
            setIsViewMemberModalOpen(true);
          }
        }}
      />
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
    paddingBottom: 60,
    paddingHorizontal: 6,
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
  /* Professional Plan Selection & Membership Planning Styles (Matching Document Upload Theme) */
  /* Plan Square Cards Layout (Side-by-Side & Horizontal Scrollable) */
  planSquareRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  planSquareCard: {
    borderRadius: 14,
    borderWidth: 1.2,
    padding: 12,
    minHeight: 142,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  planSquareRadio: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planSquareActionBtn: {
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planSquareActionText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  planDottedCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 12,
    minHeight: 142,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planDottedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Official Tax Invoice & Bill Breakdown Styles */
  proBillCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  proBillWatermark: {
    position: 'absolute',
    right: -25,
    bottom: -30,
    opacity: 0.95,
  },
  proBillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  proBillReceiptBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  proBillReceiptText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  proBillColumnsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
  },
  proBillColTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  proBillTable: {
    gap: 0,
  },
  proBillTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  proBillItemName: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  proBillItemSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  proBillItemPrice: {
    fontSize: 13,
    fontWeight: '800',
  },
  proBillTotalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  proBillTotalLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  proBillTotalSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  proBillTotalNumber: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  proSurfaceCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  proIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proSectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  proSectionHeaderDesc: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  proToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  proInlineWaiveBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  proInlineWaiveText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  proInputWrapper: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
  },
  proInputPrefix: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#64748B',
    marginRight: 3,
  },
  proInputFieldText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    padding: 0,
  },
  proPresetPill: {
    paddingHorizontal: 7.5,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proPresetPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  proMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  proMetaPillText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  proCardActionBtn: {
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proCardActionBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  proAddonItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8.5,
    borderWidth: 1,
    gap: 9,
  },
  proAddonTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  proAddonSub: {
    fontSize: 9.5,
    marginTop: 1,
  },
  proAddonFeeBadge: {
    paddingHorizontal: 6.5,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  proAddonFeeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  proAddCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  proAddCustomBtnText: {
    fontSize: 11,
    fontWeight: '700',
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
  registrationSubmitBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  registrationSubmitBtnTextDisabled: {
    color: '#94A3B8',
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
  /* Page 3 Communication Hub-Styled Document Cards */
  docCardsGrid: {
    gap: 12,
  },
  docCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  docCommCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 140,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  docCommCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  docCommIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCommBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  docCommBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  docCommTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  docCommDesc: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 8,
  },
  docCommActionBtn: {
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCommActionBtnText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
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
  /* Luxury Profile Card Modal (Direct 1:1 Desktop Architecture & UX/UI) */
  luxuryModalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  luxuryProfileCard: {
    position: 'relative',
    width: '94%',
    maxWidth: 350,
    aspectRatio: 0.68,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#111111',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
    flexDirection: 'column',
  },
  luxuryProfileCardInnerBorder: {
    position: 'absolute',
    top: 14,
    bottom: 14,
    left: 14,
    right: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 36,
    zIndex: 30,
    pointerEvents: 'none',
  },
  btnCardTopClose: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  cardPortraitWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  cardPortrait: {
    width: '100%',
    height: '100%',
  },
  cardPortraitSvgWrap: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGlassOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingBottom: 28,
    zIndex: 20,
    justifyContent: 'flex-end',
  },
  cardContent: {
    gap: 8,
  },
  cardIdentity: {
    marginBottom: 12,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    lineHeight: 31,
    flexShrink: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  cardVerifyCheck: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBio: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 18.5,
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardFooterRefined: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  cardStats: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  btnCardBottomDownload: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Member Intelligence Dashboard Modal Styles (Desktop 1:1 Match) */
  profileDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    width: '94%',
    maxWidth: 350,
  },
  profileDeleteBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.3,
  },
  dashMainHeaderBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  dashMemberFullName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  dashBadgeId: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  dashBadgeIdText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  dashStatusBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 99,
  },
  dashStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  dashStatusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.3,
  },
  // Executive Dossier Spec Styles (Bold & Professional)
  dossierHeaderBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
  },
  dossierHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  dossierPreTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dossierMemberName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  dossierHeaderBadgeCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  dossierIdBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dossierIdBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.8,
  },
  dossierStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  dossierStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dossierStatusText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  dossierQuickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  dossierQuickItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  dossierQuickDivider: {
    width: 1,
    height: 22,
  },
  dossierQuickLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  dossierQuickValue: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  dossierSectionCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dossierSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  dossierSectionIndicator: {
    width: 3.5,
    height: 12,
    borderRadius: 1.5,
  },
  dossierSectionHeadTitle: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  dossierTable: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  dossierTableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  dossierTableRowLast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 12,
  },
  dossierTableCellHalf: {
    flex: 1,
    gap: 3,
  },
  dossierTableCellThird: {
    flex: 1,
    gap: 3,
  },
  dossierCellCaption: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  dossierCellValue: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dossierCellValueMono: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.3,
  },
  dossierDocVerifiedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  dossierDocVerifiedText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.6,
  },
  dossierDocPendingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  dossierDocPendingText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 0.6,
  },
  dossierDocSignedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  dossierDocSignedText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: 0.6,
  },
  dashDocSignedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dashPanelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 16,
  },
  dashGridCol: {
    width: '46%',
    gap: 3,
  },
  dashDataLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dashDataValue: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  dashMemberIdPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  dashMemberIdPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  dashPlanDistinguishedBadge: {
    backgroundColor: '#F5F3FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  dashPlanDistinguishedText: {
    color: '#4F46E5',
    fontSize: 11.5,
    fontWeight: '800',
  },
  dashRemainingDaysPill: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  dashRemainingDaysText: {
    color: '#4F46E5',
    fontSize: 11.5,
    fontWeight: '800',
  },
  dashDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dashDocCard: {
    flex: 1,
    aspectRatio: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 5,
    borderWidth: 1,
  },
  dashDocIconBox: {
    width: 44,
    height: 44,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashDocName: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  dashDocStatusVerified: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.3,
  },
  dashDocStatusPending: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.3,
  },
  dashDocStatusSigned: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.3,
  },
  viewMemberBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  viewMemberDeleteBtn: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  viewMemberDeleteBtnText: {
    color: '#EF4444',
    fontSize: 13.5,
    fontWeight: '700',
  },
  viewMemberEditBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0F172A',
  },
  viewMemberEditBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* ───────────────────────────────────────────────────────────── */
  /* SETUP GUIDE STYLE DELETION CONFIRMATION MODAL STYLES         */
  /* ───────────────────────────────────────────────────────────── */
  setupGuideModalContainer: {
    width: '90%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  setupGuideCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 20,
    position: 'relative',
  },
  setupGuideCloseBtn: {
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
  setupGuideKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  setupGuideKickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    backgroundColor: '#FEE2E2',
  },
  setupGuideKickerText: {
    color: '#DC2626',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  setupGuideTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  setupGuideSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  compactSecurityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 18,
  },
  compactSecurityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  compactSecurityText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  setupGuideActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  setupGuideCancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupGuideCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  setupGuideDeleteBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  setupGuideDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

