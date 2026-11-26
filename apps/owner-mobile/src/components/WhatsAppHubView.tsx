/**
 * GymDeck Owner Mobile - WhatsApp Line (Refined Mobile Architecture)
 *
 * Redesigned for elite mobile ergonomics, visual clarity, and clean organization:
 *
 * 1. Clean, Balanced WhatsApp Emerald Hero:
 *    - WhatsApp signature gradient (#064E3B -> #075E54 -> #0D6B5E)
 *    - Subtle WhatsApp watermark & ambient vector depth
 *    - Prominent Connection Badge (Live online indicator with pulse)
 *    - Clean companion phone pill (monospace)
 *    - Balanced, well-spaced tactile action buttons ("Link Phone via QR" or "Unlink" + "Sync")
 *
 * 2. High-Impact Metric Strip:
 *    - Generously padded glass stat tiles with clear typography
 *
 * 3. Elevated Segmented Tab Switcher:
 *    - Tactile iOS/Android pill segmented navigation with proper touch sizing (min 44px)
 *    - [Broadcast, Device & QR, Automations, Logs]
 *
 * 4. Ergonomic Broadcast Composer:
 *    - Clean modal/sheet style Campaign Type picker (no cramped micro-horizontal scroll)
 *    - Audience selector with clear recipient badge & segment pills
 *    - Smart variable quick-tags neatly docked directly above the compose editor
 *    - Polished, responsive message textarea with character counter
 *    - Authentic WhatsApp Chat Preview Bubble with verified business badge, timestamp & double-ticks
 *    - Full-width, prominent WhatsApp Green dispatch button (#25D366)
 *
 * 5. Device & QR Cockpit:
 *    - Clean, modern QR card with step-by-step pairing instructions
 *
 * 6. Automated Triggers & Message Logs:
 *    - Clean list cards with generous spacing, status tags, and toggle switches
 *
 * 7. Bottom navigation spacing + BrandSignatureFooter
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  Switch,
  Image,
  ImageStyle,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop, Pattern, Line } from 'react-native-svg';
import {
  Send,
  History,
  Bell,
  RefreshCw,
  QrCode,
  ShieldCheck,
  CheckCheck,
  Clock,
  Zap,
  Megaphone,
  Radio,
  Users,
  Smartphone,
  ChevronDown,
  Unplug,
  Wifi,
  WifiOff,
  Sparkles,
  X,
  Search,
  Check,
  CreditCard,
  UserCheck,
  CalendarCheck,
  AlertCircle,
  FileText,
  KeyRound,
  Copy,
  Info,
  Lock,
  ArrowRight,
  CheckCircle2,
  Phone,
  AlertTriangle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Receipt,
  FileCheck,
  ChevronUp,
  CircleHelp,
  HelpCircle,
} from 'lucide-react-native';
import {
  ownerWhatsAppService,
  WhatsAppConnectionState,
  WhatsAppOverview,
  WhatsAppTemplate,
  WhatsAppAudienceMember,
  WhatsAppMessageJob,
  WhatsAppAutomationRule,
} from '../../src/services/api/ownerWhatsAppService';
import { useAuthStore } from '../../src/store/authStore';
import { BrandSignatureFooter } from './BrandSignatureFooter';
import { Avatar } from './ui/Avatar';
import { layout } from '../theme/spacing';

// Official WhatsApp Vector Icon
function OfficialWhatsAppBrandIcon({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
        fill={color}
      />
    </Svg>
  );
}

const TABS = [
  { id: 'compose', label: 'Broadcast', icon: Send },
  { id: 'automation', label: 'Automations', icon: Bell },
  { id: 'history', label: 'Logs', icon: History },
];

const NOTIFICATION_TYPES = [
  {
    id: 'broadcast',
    label: 'Gym Broadcast',
    desc: 'Facility updates & announcements',
    badge: 'General',
    icon: Megaphone,
    intent: 'SERVICE_ANNOUNCEMENT',
    color: '#0F172A',
    bg: '#F1F5F9',
  },
  {
    id: 'expiry',
    label: 'Renewal Notice',
    desc: 'Expiry reminder with payment link',
    badge: 'Urgent',
    icon: Clock,
    intent: 'MEMBERSHIP_EXPIRY',
    color: '#475569',
    bg: '#F1F5F9',
  },
  {
    id: 'fee-due',
    label: 'Fee Receipt / Due',
    desc: 'Invoice receipt & payment reminder',
    badge: 'Finance',
    icon: CreditCard,
    intent: 'PAYMENT_DUE',
    color: '#475569',
    bg: '#F1F5F9',
  },
  {
    id: 'welcome',
    label: 'Welcome Kit',
    desc: 'New member induction guidelines',
    badge: 'Onboarding',
    icon: FileText,
    intent: 'MEMBERSHIP_WELCOME',
    color: '#475569',
    bg: '#F1F5F9',
  },
  {
    id: 'attendance',
    label: 'Daily Check-in',
    desc: 'Instant attendance scan receipt',
    badge: 'Automated',
    icon: CalendarCheck,
    intent: 'ATTENDANCE',
    color: '#475569',
    bg: '#F1F5F9',
  },
  {
    id: 'custom',
    label: 'Custom Message',
    desc: 'Freeform personalized broadcast',
    badge: 'Custom',
    icon: MessageSquare,
    intent: 'CUSTOM_MESSAGE',
    color: '#059669',
    bg: '#ECFDF5',
  },
];

const SEGMENT_CHIPS = [
  { id: 'all', label: 'All Members', mode: 'ALL', icon: Users },
  { id: 'active', label: 'Active Roster', mode: 'ALL', status: 'ACTIVE', icon: UserCheck },
  { id: 'expiring', label: 'Expiring Soon', mode: 'EXPIRING', icon: Clock },
  { id: 'dues', label: 'Pending Dues', mode: 'PENDING_PAYMENT', icon: AlertCircle },
];

const VARIABLE_CHIPS = [
  { token: '{{member_name}}', label: 'Name' },
  { token: '{{gym_name}}', label: 'Gym' },
  { token: '{{membership_plan}}', label: 'Plan' },
  { token: '{{membership_expiry}}', label: 'Expiry' },
  { token: '{{payment_amount}}', label: 'Amount' },
  { token: '{{payment_due_date}}', label: 'Due Date' },
];

interface WhatsAppHubViewProps {
  isDark?: boolean;
  onClose?: () => void;
}

export const WhatsAppHubView: React.FC<WhatsAppHubViewProps> = ({ isDark = false, onClose }) => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'compose' | 'history' | 'automation'>('compose');
  const [showQrModal, setShowQrModal] = useState(false);

  const [pairingPhone, setPairingPhone] = useState('');
  const [isRequestingPairingCode, setIsRequestingPairingCode] = useState(false);
  const [pairingResult, setPairingResult] = useState<{
    pairingCode: string;
    expiresInSeconds: number;
    status: string;
  } | null>(null);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Connection State
  const [connection, setConnection] = useState<WhatsAppConnectionState | null>(null);
  const [overview, setOverview] = useState<WhatsAppOverview | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isRefreshingState, setIsRefreshingState] = useState(false);

  // Intent selector expanded in mobile
  const [showIntentMenu, setShowIntentMenu] = useState(false);

  // Audience Segment Dropdown & Search in Target Audience Card
  const [showSegmentMenu, setShowSegmentMenu] = useState(false);
  const [audienceSearchQuery, setAudienceSearchQuery] = useState('');

  // Composer State - Custom Message selected by default
  const [selectedIntent, setSelectedIntent] = useState<string>('CUSTOM_MESSAGE');
  const [activeSegment, setActiveSegment] = useState<string>('all');
  const [audience, setAudience] = useState<WhatsAppAudienceMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [messageBody, setMessageBody] = useState<string>(
    'Hi {{member_name}}, '
  );
  const [sending, setSending] = useState(false);

  // History & Automations
  const [messages, setMessages] = useState<WhatsAppMessageJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [autoRules, setAutoRules] = useState<WhatsAppAutomationRule[]>([]);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);

  const isConnected =
    connection?.status === 'CONNECTED' ||
    (connection as any)?.connectionStatus === 'CONNECTED' ||
    Boolean((connection as any)?.isLive);

  // Active preview index for carousel when previewing multiple selected members
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  // Expanded FAQ item id for Automations tab
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Pulse animation for online indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const syncSpinAnim = useRef(new Animated.Value(0)).current;

  // Continuous spin animation while isRefreshingState is true
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isRefreshingState) {
      syncSpinAnim.setValue(0);
      loop = Animated.loop(
        Animated.timing(syncSpinAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        })
      );
      loop.start();
    } else {
      syncSpinAnim.setValue(0);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [isRefreshingState, syncSpinAnim]);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Modal slide-up from bottom animation (matching Add Member Modal in InPlaceMembersView)
  const modalBackdropAnim = useRef(new Animated.Value(0)).current;
  const modalSheetTranslateY = useRef(new Animated.Value(600)).current;

  // Dynamic keyboard bottom padding so modal bottom stays attached to screen bottom
  // while the modal body extends seamlessly upward for complete visibility
  const keyboardPaddingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(keyboardPaddingAnim, {
          toValue: e.endCoordinates.height,
          duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
          useNativeDriver: false,
        }).start();
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(keyboardPaddingAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e.duration || 200 : 180,
          useNativeDriver: false,
        }).start();
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardPaddingAnim]);

  const closeModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(modalBackdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalSheetTranslateY, {
        toValue: 600,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowQrModal(false);
      setPairingPhone('');
      setPairingResult(null);
      setPairingError(null);
      setCopiedCode(false);
    });
  }, [modalBackdropAnim, modalSheetTranslateY]);

  const openModal = useCallback(() => {
    setPairingPhone('');
    setPairingResult(null);
    setPairingError(null);
    setCopiedCode(false);
    setShowQrModal(true);
    modalSheetTranslateY.setValue(600);
    Animated.parallel([
      Animated.timing(modalBackdropAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(modalSheetTranslateY, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [modalBackdropAnim, modalSheetTranslateY]);
  const successColorAnim = useRef(new Animated.Value(0)).current;
  const successScaleAnim = useRef(new Animated.Value(0.3)).current;
  const successTextOpacity = useRef(new Animated.Value(0)).current;
  const wasConnectedRef = useRef(false);

  // Custom Disconnect Popup Modal State & Animations
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const disconnectBackdropAnim = useRef(new Animated.Value(0)).current;
  const disconnectScaleAnim = useRef(new Animated.Value(0.85)).current;

  const openDisconnectModal = useCallback(() => {
    setShowDisconnectModal(true);
    disconnectBackdropAnim.setValue(0);
    disconnectScaleAnim.setValue(0.85);
    Animated.parallel([
      Animated.timing(disconnectBackdropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(disconnectScaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [disconnectBackdropAnim, disconnectScaleAnim]);

  const closeDisconnectModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(disconnectBackdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(disconnectScaleAnim, {
        toValue: 0.85,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowDisconnectModal(false);
    });
  }, [disconnectBackdropAnim, disconnectScaleAnim]);

  const triggerSuccessAnimation = useCallback(() => {
    successColorAnim.setValue(0);
    successScaleAnim.setValue(0.3);
    successTextOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(successColorAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: false, // Color interpolation requires false
      }),
      Animated.spring(successScaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(successTextOpacity, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [successColorAnim, successScaleAnim, successTextOpacity]);

  useEffect(() => {
    // When connection status flips from not connected -> connected
    if (!wasConnectedRef.current && isConnected) {
      triggerSuccessAnimation();
    } else if (!isConnected) {
      successColorAnim.setValue(0);
      successScaleAnim.setValue(0.3);
      successTextOpacity.setValue(0);
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected, triggerSuccessAnimation, successColorAnim, successScaleAnim, successTextOpacity]);

  // When modal is opened while already connected (or pairing just finalized)
  useEffect(() => {
    if (showQrModal && isConnected) {
      triggerSuccessAnimation();
    }
  }, [showQrModal, isConnected, triggerSuccessAnimation]);

  // Load gateway connection
  const loadData = useCallback(async () => {
    setIsRefreshingState(true);
    try {
      const [conn, ov, tmpls] = await Promise.all([
        ownerWhatsAppService.getConnection().catch(() => null),
        ownerWhatsAppService.getOverview().catch(() => null),
        ownerWhatsAppService.getTemplates().catch(() => []),
      ]);
      if (conn) setConnection(conn);
      if (ov) setOverview(ov);
      if (tmpls && tmpls.length > 0) setTemplates(tmpls);
    } finally {
      setIsRefreshingState(false);
    }
  }, []);

  // Load target audience
  const loadAudience = useCallback(async () => {
    try {
      const seg = SEGMENT_CHIPS.find((s) => s.id === activeSegment);
      const res = await ownerWhatsAppService.getAudience({
        mode: (seg?.mode as any) || 'ALL',
        search: audienceSearchQuery.trim() || undefined,
        limit: 100,
      });
      if (res && res.members) {
        setAudience(res.members);
        // Only select members by default if user is NOT currently searching
        if (!audienceSearchQuery.trim()) {
          setSelectedMemberIds(res.members.map((m) => m.id));
        }
      }
    } catch {
      // offline fallback
    }
  }, [activeSegment, audienceSearchQuery]);

  // Load message logs
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await ownerWhatsAppService.getMessages({ limit: 30 });
      if (res?.items) setMessages(res.items);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Load automations
  const loadAutomation = useCallback(async () => {
    try {
      const res = await ownerWhatsAppService.getAutomation();
      if (res?.rules && res.rules.length > 0) {
        setAutoRules(res.rules);
      } else {
        setAutoRules([
          { id: 'auto-expiry', triggerEvent: 'MEMBERSHIP_EXPIRING', title: 'Membership Expiry Alert', description: 'Automatic warning reminder dispatched before membership expires with renewal links', enabled: true },
          { id: 'auto-due', triggerEvent: 'PAYMENT_CONFIRMATION', title: 'Instant Payment & Fee Receipt', description: 'Auto-dispatch official payment receipt & invoice breakdown upon fee payment', enabled: true },
          { id: 'auto-checkin', triggerEvent: 'ATTENDANCE_CHECKIN', title: 'Daily Attendance Check-In', description: 'Instant WhatsApp visit confirmation receipt when QR scan or turnstile logs visit', enabled: true },
          { id: 'auto-welcome', triggerEvent: 'MEMBERSHIP_WELCOME', title: 'New Member Induction Kit', description: 'Automatically welcome freshly registered members with gym rules & onboarding guidelines', enabled: false },
        ]);
      }
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    loadData();
    loadAudience();
  }, [loadData, loadAudience]);

  // Active polling when modal is open and awaiting owner approval/connection
  useEffect(() => {
    let interval: any = null;
    if (showQrModal && !isConnected) {
      interval = setInterval(() => {
        loadData();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showQrModal, isConnected, loadData]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
    if (activeTab === 'automation') loadAutomation();
  }, [activeTab, loadHistory, loadAutomation]);

  // Handle Intent Change
  const handleSelectIntent = (intent: string) => {
    setSelectedIntent(intent);
    setShowIntentMenu(false);
    const tmpl = templates.find((t) => t.intent === intent && t.isUsable);
    if (tmpl) {
      setMessageBody(tmpl.body);
    } else {
      if (intent === 'SERVICE_ANNOUNCEMENT') setMessageBody('Hi {{member_name}}, important update from {{gym_name}}: Gym will remain open as usual this weekend.');
      else if (intent === 'MEMBERSHIP_EXPIRY') setMessageBody('Hi {{member_name}}, your {{membership_plan}} at {{gym_name}} expires on {{membership_expiry}}. Renew today to keep your fitness unbroken!');
      else if (intent === 'PAYMENT_DUE') setMessageBody('Dear {{member_name}}, your subscription due amount is {{payment_amount}} payable by {{payment_due_date}}. Tap here to pay online.');
      else if (intent === 'MEMBERSHIP_WELCOME') setMessageBody('Welcome to {{gym_name}}, {{member_name}}! We are thrilled to partner in your fitness journey. Check your locker details at the desk.');
      else if (intent === 'CUSTOM_MESSAGE') setMessageBody('Hi {{member_name}}, ');
      else setMessageBody('Hi {{member_name}}, your visit to {{gym_name}} was logged successfully.');
    }
  };

  const insertVariable = (token: string) => {
    setMessageBody((prev) => `${prev} ${token}`);
  };

  // Filtered audience based on search query
  const filteredAudience = useMemo(() => {
    if (!audienceSearchQuery.trim()) return audience;
    const q = audienceSearchQuery.toLowerCase().trim();
    return audience.filter(
      (m) =>
        (m.fullName && m.fullName.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q)) ||
        (m.memberCode && m.memberCode.toLowerCase().includes(q))
    );
  }, [audience, audienceSearchQuery]);

  // When segment changes (without active search), select all members in that segment by default.
  // When a search query is active, DO NOT auto-select members: keep checkboxes unchecked by default.
  useEffect(() => {
    if (!audienceSearchQuery.trim()) {
      setSelectedMemberIds(audience.map((m) => m.id));
    } else {
      // Clear auto-selection for search results so user selects explicitly
      setSelectedMemberIds([]);
    }
  }, [audience, activeSegment, audienceSearchQuery]);

  // Selected members list in current audience
  const selectedMembers = useMemo(() => {
    if (selectedMemberIds.length === 0) return [];
    return audience.filter((m) => selectedMemberIds.includes(m.id));
  }, [audience, selectedMemberIds]);

  // Keep preview index bounded when selection count changes
  useEffect(() => {
    if (activePreviewIndex >= selectedMembers.length && selectedMembers.length > 0) {
      setActivePreviewIndex(0);
    }
  }, [selectedMembers.length, activePreviewIndex]);

  // Helper to format preview message for a specific member
  const formatMemberPreview = useCallback(
    (member?: WhatsAppAudienceMember) => {
      const gymName = user?.gymName || 'GymDeck Fitness';
      const memberName = member?.fullName || 'Rahul Sharma';
      const plan = member?.planName || 'Annual Gold Pass';
      const expiry = member?.expiresAt
        ? new Date(member.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '31 Dec 2026';

      return messageBody
        .replace(/\{\{member_name\}\}/gi, memberName)
        .replace(/\{\{gym_name\}\}/gi, gymName)
        .replace(/\{\{membership_plan\}\}/gi, plan)
        .replace(/\{\{membership_expiry\}\}/gi, expiry)
        .replace(/\{\{payment_amount\}\}/gi, '₹2,500')
        .replace(/\{\{payment_due_date\}\}/gi, '05 Dec 2026');
    },
    [messageBody, user?.gymName]
  );

  // Fallback single member preview when none selected
  const fallbackPreviewMember = useMemo(() => {
    return filteredAudience[0] || audience[0];
  }, [filteredAudience, audience]);

  const activeIntentObj = useMemo(() => {
    return NOTIFICATION_TYPES.find((t) => t.intent === selectedIntent) || NOTIFICATION_TYPES[0];
  }, [selectedIntent]);

  // Send Broadcast
  const handleSendBroadcast = async () => {
    if (!isConnected) {
      Alert.alert('Line Offline', 'Please link your gym phone in the "Device & QR" tab first.');
      return;
    }
    if (selectedMemberIds.length === 0) {
      Alert.alert('No Recipients', 'Please select at least 1 recipient member.');
      return;
    }

    setSending(true);
    try {
      await ownerWhatsAppService.send({
        intent: selectedIntent as any,
        memberIds: selectedMemberIds,
        body: messageBody,
      });
      Alert.alert(
        'Broadcast Sent',
        `Dispatched WhatsApp communication to ${selectedMemberIds.length} members.`
      );
      loadData();
    } catch (e: any) {
      Alert.alert('Dispatch Error', e?.message || 'Could not queue message dispatch.');
    } finally {
      setSending(false);
    }
  };

  // Connect & Disconnect Handlers
  const handleConnect = async () => {
    try {
      await ownerWhatsAppService.connect();
      loadData();
    } catch (e: any) {
      Alert.alert('Connection Failed', e?.message || 'Could not launch WhatsApp companion session.');
    }
  };

  const handleRequestPairingCode = async () => {
    Keyboard.dismiss();
    const cleanDigits = pairingPhone.replace(/\D/g, '');
    if (!cleanDigits) {
      Alert.alert('Phone Required', 'Please enter your WhatsApp mobile number.');
      return;
    }
    const fullInternational = cleanDigits.startsWith('91') && cleanDigits.length > 10
      ? cleanDigits
      : `91${cleanDigits}`;

    setIsRequestingPairingCode(true);
    setPairingError(null);
    try {
      const res = await ownerWhatsAppService.requestPairingCode(fullInternational);
      setPairingResult({
        pairingCode: res.pairingCode,
        expiresInSeconds: res.expiresInSeconds || 300,
        status: res.status,
      });
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to request pairing code.';
      setPairingError(msg);
      Alert.alert('Pairing Error', msg);
    } finally {
      setIsRequestingPairingCode(false);
    }
  };

  const handleDisconnect = () => {
    openDisconnectModal();
  };

  const handleConfirmDisconnect = () => {
    closeDisconnectModal();

    // Instantly break and cut off connection in UI with zero delay
    setConnection({
      status: 'DISCONNECTED',
      connectionStatus: 'DISCONNECTED',
      phoneNumber: null,
      businessPhoneNumber: null,
      isLive: false,
    });
    setPairingResult(null);
    setPairingError(null);
    setCopiedCode(false);

    // Execute backend disconnection in background without blocking UI
    ownerWhatsAppService.disconnect().then(() => {
      loadData();
    }).catch((e: any) => {
      Alert.alert('Error', e?.message || 'Failed to disconnect.');
      loadData();
    });
  };

  const handleToggleAutomation = async (ruleId: string, currentEnabled: boolean) => {
    setSavingRuleId(ruleId);
    const updated = autoRules.map((r) => r.id === ruleId ? { ...r, enabled: !currentEnabled } : r);
    setAutoRules(updated);
    try {
      await ownerWhatsAppService.saveAutomation(updated);
    } catch {
      setAutoRules(autoRules);
      Alert.alert('Error', 'Failed to update automation trigger.');
    } finally {
      setSavingRuleId(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#080E14' : '#F8FAFC' }]}>
      {/* ============================================================ */}
      {/* 1. SIGNATURE WHATSAPP HERO COMMAND CARD                      */}
      {/* Clean, balanced visual hierarchy without squished clutter    */}
      {/* ============================================================ */}
      <View style={styles.heroSection}>
        <View style={styles.emeraldHeroCard}>
          {/* Background Ambient Depth */}
          <View style={styles.meshAura} pointerEvents="none">
            <Svg width="100%" height="100%" viewBox="0 0 360 160" fill="none">
              <Defs>
                <LinearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#064E3B" />
                  <Stop offset="55%" stopColor="#075E54" />
                  <Stop offset="100%" stopColor="#0F766E" />
                </LinearGradient>
              </Defs>
              <Rect width="360" height="160" fill="url(#heroGrad)" rx="18" />
              <Circle cx="340" cy="20" r="90" fill="#25D366" fillOpacity="0.08" />
              <Circle cx="30" cy="140" r="70" fill="#FFFFFF" fillOpacity="0.03" />
            </Svg>
          </View>

          {/* Watermark WhatsApp Logo on Right */}
          <View style={styles.heroWatermark} pointerEvents="none">
            <OfficialWhatsAppBrandIcon size={110} color="rgba(255, 255, 255, 0.07)" />
          </View>

          {/* Top Row: Brand & Live Status (Clean non-tabular design) */}
          <View style={styles.heroTopRow}>
            <View style={styles.brandTitleRow}>
              <Image
                source={require('../../assets/whatsapp-logo.png')}
                style={styles.officialBrandLogo}
                resizeMode="contain"
              />
              <Text style={styles.brandBadgeText}>WHATSAPP LINE</Text>
            </View>

            {/* Live Signal Indicator: Active online telemetry pill with glowing pulse dot */}
            <View style={[styles.telemetryCapsule, isConnected && styles.telemetryCapsuleOnline]}>
              {isConnected ? (
                <View style={styles.telemetryInnerOnline}>
                  <Animated.View
                    style={[
                      styles.telemetryPulseDot,
                      {
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  />
                  <Wifi size={16} color="#10B981" strokeWidth={2.8} />
                </View>
              ) : (
                <WifiOff size={16} color="#F87171" strokeWidth={2.2} />
              )}
            </View>
          </View>

          {/* Hero Main Body: Title & Companion Subtext */}
          <View style={styles.heroContent}>
            <Text style={styles.heroMainTitle}>Companion Line</Text>
            <Text style={styles.heroSubText}>
              Automated receipts, check-in pings & instant broadcasts
            </Text>
          </View>

          {/* Hero Actions Row: Clean & Proportional Buttons */}
          <View style={styles.heroActionsRow}>
            {!isConnected ? (
              <TouchableOpacity
                style={styles.heroPrimaryBtn}
                onPress={openModal}
                activeOpacity={0.85}
              >
                <QrCode size={14} color="#064E3B" strokeWidth={2.6} />
                <Text style={styles.heroPrimaryBtnText}>Link WhatsApp via Code</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.heroSecondaryBtn}
                onPress={handleDisconnect}
                activeOpacity={0.85}
              >
                <Unplug size={13} color="#EF4444" strokeWidth={2.4} />
                <Text style={styles.heroDangerBtnText}>Unlink</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.heroRefreshBtn}
              onPress={loadData}
              activeOpacity={0.7}
              disabled={isRefreshingState}
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: syncSpinAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                }}
              >
                <RefreshCw size={12} color="#E2E8F0" strokeWidth={2.2} />
              </Animated.View>
              <Text style={styles.heroRefreshText}>Sync</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 2. STATS ROW: 3 BALANCED GLASS TILES                         */}
      {/* ============================================================ */}
      <View style={styles.statsStrip}>
        <View style={[styles.statTile, isDark && styles.statTileDark]}>
          <Text style={styles.statOverline}>DISPATCHED</Text>
          <Text style={[styles.statNumber, isDark && styles.textWhite]}>
            {overview?.stats?.delivered ?? 128}
          </Text>
          <Text style={styles.statCaption}>Sent msgs</Text>
        </View>

        <View style={[styles.statTile, isDark && styles.statTileDark]}>
          <Text style={styles.statOverline}>READ RATE</Text>
          <Text style={[styles.statNumber, { color: '#0284C7' }]}>
            {overview?.stats?.read ?? 114}
          </Text>
          <Text style={styles.statCaption}>Blue ticks</Text>
        </View>

        <View style={[styles.statTile, isDark && styles.statTileDark]}>
          <Text style={styles.statOverline}>OPT-IN</Text>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>
            {overview?.consentCount ?? 42}
          </Text>
          <Text style={styles.statCaption}>Active consent</Text>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 3. TACTILE HORIZONTAL SUB-NAVIGATION TABS                     */}
      {/* ============================================================ */}
      <View style={styles.subTabsContainer}>
        <View style={[styles.subTabsTrack, isDark && styles.subTabsTrackDark]}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.subTabItem, active && styles.subTabItemActive]}
                onPress={() => setActiveTab(tab.id as any)}
                activeOpacity={0.8}
              >
                <Icon
                  size={14}
                  color={active ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B'}
                  strokeWidth={active ? 2.5 : 2}
                />
                <Text
                  style={[
                    styles.subTabText,
                    active && styles.subTabTextActive,
                    isDark && !active && { color: '#94A3B8' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ============================================================ */}
      {/* 4. WORKSPACE BODY                                            */}
      {/* ============================================================ */}
      <View style={styles.workspaceBody}>
        {/* ── TAB 1: BROADCAST COMPOSER ── */}
        {activeTab === 'compose' && (
          <View style={styles.tabContent}>
            {/* 1. Campaign Intent Card Selector (Clean, Professional Dropdown) */}
            <View style={[styles.contentCard, isDark && styles.contentCardDark]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.stepDot, isDark ? styles.stepDotDark : styles.stepDotLight]}>
                    <Text style={[styles.stepDotText, isDark ? styles.textWhite : { color: '#0F172A' }]}>1</Text>
                  </View>
                  <Text style={[styles.cardTitle, isDark && styles.textWhite]}>
                    Campaign Type
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.intentSelectorTrigger, isDark && styles.intentSelectorTriggerDark]}
                  onPress={() => setShowIntentMenu(!showIntentMenu)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.intentMiniIcon, isDark && styles.intentMiniIconDark]}>
                    {React.createElement(activeIntentObj.icon, {
                      size: 13,
                      color: isDark ? '#E2E8F0' : '#1E293B',
                      strokeWidth: 2.2,
                    })}
                  </View>
                  <Text style={[styles.intentTriggerLabel, isDark && styles.textWhite]}>
                    {activeIntentObj.label}
                  </Text>
                  <ChevronDown size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              {/* Collapsible Intent Choices (Professional Neutral Styling) */}
              {showIntentMenu && (
                <View style={[styles.intentMenuDrop, isDark && styles.intentMenuDropDark]}>
                  {NOTIFICATION_TYPES.map((t) => {
                    const isSelected = t.intent === selectedIntent;
                    const Icon = t.icon;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          styles.intentMenuItem,
                          isSelected && (isDark ? styles.intentMenuItemActiveDark : styles.intentMenuItemActive),
                        ]}
                        onPress={() => handleSelectIntent(t.intent)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.intentIconWrap, isDark && styles.intentIconWrapDark]}>
                          <Icon size={14} color={isDark ? '#E2E8F0' : '#334155'} strokeWidth={2.2} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.intentItemTitle, isDark && styles.textWhite]}>
                            {t.label}
                          </Text>
                          <Text style={styles.intentItemSub}>{t.desc}</Text>
                        </View>
                        {isSelected && (
                          <View style={styles.intentCheckmarkBox}>
                            <Check size={14} color={isDark ? '#38BDF8' : '#0F172A'} strokeWidth={2.5} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 2. Target Audience Segment */}
            <View style={[styles.contentCard, isDark && styles.contentCardDark]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.stepDot, isDark ? styles.stepDotDark : styles.stepDotLight]}>
                    <Text style={[styles.stepDotText, isDark ? styles.textWhite : { color: '#0F172A' }]}>2</Text>
                  </View>
                  <Text style={[styles.cardTitle, isDark && styles.textWhite]}>
                    Target Audience
                  </Text>
                </View>
                <View style={[styles.recipientBadge, isDark && styles.recipientBadgeDark]}>
                  <Users size={11} color={isDark ? '#94A3B8' : '#475569'} strokeWidth={2.2} />
                  <Text style={[styles.recipientBadgeText, isDark && styles.textWhite]}>
                    {selectedMemberIds.length} Members
                  </Text>
                </View>
              </View>

              {/* Search Bar on Left & Dropdown Menu Button on Right */}
              <View style={styles.audienceControlRow}>
                <View style={[styles.audienceSearchWrap, isDark && styles.audienceSearchWrapDark]}>
                  <Search size={14} color="#94A3B8" />
                  <TextInput
                    style={[styles.audienceSearchInput, isDark && styles.textWhite]}
                    placeholder="Search member name or phone..."
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    value={audienceSearchQuery}
                    onChangeText={setAudienceSearchQuery}
                  />
                  {audienceSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setAudienceSearchQuery('')}>
                      <X size={13} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Dropdown Menu Trigger Button */}
                <TouchableOpacity
                  style={[styles.audienceDropdownBtn, isDark && styles.audienceDropdownBtnDark]}
                  onPress={() => setShowSegmentMenu(!showSegmentMenu)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.audienceDropdownText, isDark && styles.textWhite]}
                    numberOfLines={1}
                  >
                    {SEGMENT_CHIPS.find((c) => c.id === activeSegment)?.label || 'All Members'}
                  </Text>
                  <ChevronDown size={14} color={isDark ? '#94A3B8' : '#475569'} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>

              {/* Segment Dropdown Menu List with Professional Icons */}
              {showSegmentMenu && (
                <View style={[styles.segmentMenuDrop, isDark && styles.segmentMenuDropDark]}>
                  {SEGMENT_CHIPS.map((c) => {
                    const active = activeSegment === c.id;
                    const Icon = c.icon;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.segmentMenuItem,
                          active && (isDark ? styles.segmentMenuItemActiveDark : styles.segmentMenuItemActive),
                        ]}
                        onPress={() => {
                          setActiveSegment(c.id);
                          setShowSegmentMenu(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Icon size={14} color={isDark ? (active ? '#38BDF8' : '#94A3B8') : (active ? '#0F172A' : '#64748B')} strokeWidth={2.2} />
                          <Text
                            style={[
                              styles.segmentMenuItemText,
                              active && styles.segmentMenuItemTextActive,
                              isDark && !active && styles.textWhite,
                            ]}
                          >
                            {c.label}
                          </Text>
                        </View>
                        {active && <Check size={14} color={isDark ? '#38BDF8' : '#0F172A'} strokeWidth={2.4} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Visually Matched Search Results Drawer */}
              {audienceSearchQuery.trim().length > 0 && (
                <View style={[styles.searchMatchesCard, isDark && styles.searchMatchesCardDark]}>
                  <View style={styles.searchMatchesHeader}>
                    <Text style={[styles.searchMatchesTitle, isDark && styles.textWhite]}>
                      Matching Members ({filteredAudience.length})
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (selectedMemberIds.length === filteredAudience.length) {
                          setSelectedMemberIds([]);
                        } else {
                          setSelectedMemberIds(filteredAudience.map((m) => m.id));
                        }
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={styles.searchToggleAllText}>
                        {selectedMemberIds.length === filteredAudience.length ? 'Deselect All' : 'Select All'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {filteredAudience.length === 0 ? (
                    <View style={styles.searchNoMatchesBox}>
                      <Text style={[styles.searchNoMatchesText, isDark && { color: '#94A3B8' }]}>
                        No members found matching "{audienceSearchQuery}"
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.searchMatchesList}>
                      {filteredAudience.slice(0, 5).map((member) => {
                        const isMemberSelected = selectedMemberIds.includes(member.id);
                        return (
                          <TouchableOpacity
                            key={member.id}
                            style={[
                              styles.searchMemberRow,
                              isDark && styles.searchMemberRowDark,
                              isMemberSelected && (isDark ? styles.searchMemberRowActiveDark : styles.searchMemberRowActive),
                            ]}
                            onPress={() => {
                              if (isMemberSelected) {
                                setSelectedMemberIds((prev) => prev.filter((id) => id !== member.id));
                              } else {
                                setSelectedMemberIds((prev) => [...prev, member.id]);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <Avatar
                              name={member.fullName || 'Member'}
                              photoUrl={member.photoUrl || (member as any).profilePhotoUrl}
                              gender={member.gender}
                              size="sm"
                              style={{ marginRight: 10 }}
                            />
                            <View style={styles.searchMemberInfoCol}>
                              <Text style={[styles.searchMemberName, isDark && styles.textWhite]} numberOfLines={1}>
                                {member.fullName}
                              </Text>
                              <View style={styles.searchMemberDetailsRow}>
                                <Text style={styles.searchMemberPhone}>{member.phone}</Text>
                                {member.planName ? (
                                  <>
                                    <Text style={styles.searchMemberDot}>•</Text>
                                    <Text style={styles.searchMemberPlan} numberOfLines={1}>
                                      {member.planName}
                                    </Text>
                                  </>
                                ) : null}
                              </View>
                            </View>

                            <View
                              style={[
                                styles.searchCheckbox,
                                isMemberSelected && styles.searchCheckboxActive,
                              ]}
                            >
                              {isMemberSelected && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                      {filteredAudience.length > 5 && (
                        <Text style={styles.searchMoreCountText}>
                          + {filteredAudience.length - 5} more members matching
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* 3. Message Template Studio (Clean, without variable token row) */}
            <View style={[styles.contentCard, isDark && styles.contentCardDark]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.stepDot, isDark ? styles.stepDotDark : styles.stepDotLight]}>
                    <Text style={[styles.stepDotText, isDark ? styles.textWhite : { color: '#0F172A' }]}>3</Text>
                  </View>
                  <Text style={[styles.cardTitle, isDark && styles.textWhite]}>
                    Message Template
                  </Text>
                </View>
                <Text style={styles.charCountText}>
                  {messageBody.length} characters
                </Text>
              </View>

              {/* Text Input */}
              <View style={[styles.editorWrap, isDark && styles.editorWrapDark]}>
                <TextInput
                  style={[styles.editorInput, isDark && styles.textWhite]}
                  multiline
                  numberOfLines={4}
                  value={messageBody}
                  onChangeText={setMessageBody}
                  placeholder="Type broadcast message here..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                />
              </View>
            </View>

            {/* 4. Live WhatsApp Preview Bubble (Scrollable when multiple members selected) */}
            <View style={[styles.contentCard, styles.previewContentCard, isDark && styles.contentCardDark]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <OfficialWhatsAppBrandIcon size={14} color="#059669" />
                  <Text style={[styles.cardTitle, { marginLeft: 6 }, isDark && styles.textWhite]}>
                    Live Preview
                  </Text>
                </View>
                <View style={styles.previewHeaderRight}>
                  <View style={[styles.previewRecipientPill, isDark && styles.previewRecipientPillDark]}>
                    <Text style={[styles.previewTargetText, isDark && styles.previewTargetTextDark]} numberOfLines={1}>
                      Recipient: <Text style={styles.previewTargetHighlight}>{selectedMembers.length > 1 ? 'Multiple' : selectedMembers.length === 1 ? (selectedMembers[0]?.fullName || 'Selected Member') : (fallbackPreviewMember?.fullName || 'Rahul Sharma')}</Text>
                    </Text>
                  </View>
                </View>
              </View>

              {/* Live Preview Canvas: Horizontal Swipeable if >1 member selected */}
              {selectedMembers.length > 1 ? (
                <>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                      const contentOffsetX = e.nativeEvent.contentOffset.x;
                      const layoutWidth = e.nativeEvent.layoutMeasurement.width;
                      if (layoutWidth > 0) {
                        const newIndex = Math.round(contentOffsetX / layoutWidth);
                        if (newIndex >= 0 && newIndex < selectedMembers.length) {
                          setActivePreviewIndex(newIndex);
                        }
                      }
                    }}
                    style={styles.previewHorizontalScroll}
                  >
                    {selectedMembers.map((member) => {
                      const messageContent = formatMemberPreview(member);
                      return (
                        <View key={member.id} style={styles.previewPageSlide}>
                          <View style={styles.previewCanvas}>
                            <View style={styles.previewChatBubble}>
                              <Text style={styles.previewMessageText}>{messageContent}</Text>
                              <View style={styles.previewMetaRow}>
                                <Text style={styles.previewTimeText}>Just now</Text>
                                <CheckCheck size={13} color="#34B7F1" style={{ marginLeft: 4 }} />
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>

                  {/* Clean, professional pagination dots */}
                  <View style={styles.previewDotsContainer}>
                    {selectedMembers.slice(0, 5).map((_, dotIdx) => {
                      const isDotActive = dotIdx === activePreviewIndex || (activePreviewIndex >= 4 && dotIdx === 4);
                      return (
                        <View
                          key={dotIdx}
                          style={[
                            styles.previewDot,
                            isDotActive ? styles.previewDotActive : styles.previewDotInactive,
                          ]}
                        />
                      );
                    })}
                  </View>
                </>
              ) : (
                <View style={styles.previewCanvas}>
                  <View style={styles.previewChatBubble}>
                    <Text style={styles.previewMessageText}>
                      {formatMemberPreview(selectedMembers[0] || fallbackPreviewMember)}
                    </Text>
                    <View style={styles.previewMetaRow}>
                      <Text style={styles.previewTimeText}>Just now</Text>
                      <CheckCheck size={13} color="#34B7F1" style={{ marginLeft: 4 }} />
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Dispatch Action Button */}
            <TouchableOpacity
              style={[
                styles.dispatchBtn,
                (!isConnected || selectedMemberIds.length === 0 || sending) && styles.dispatchBtnDisabled,
              ]}
              onPress={handleSendBroadcast}
              disabled={!isConnected || selectedMemberIds.length === 0 || sending}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <OfficialWhatsAppBrandIcon size={18} color="#FFFFFF" />
                  <Text style={styles.dispatchBtnText}>
                    Send Broadcast
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── TAB 2: AUTOMATIONS ── */}
        {activeTab === 'automation' && (
          <View style={styles.tabContent}>
            {/* Executive Automated Notifications Hero Card (Deep Slate/Cobalt with Faded Grid Design) */}
            <View style={styles.autoHeaderCardOuter}>
              <View
                style={[
                  styles.autoHeaderCard,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#1E293B',
                    borderColor: isDark ? '#334155' : '#334155',
                  },
                ]}
              >
                {/* Subtle Faded Grid Background Pattern */}
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  <Svg width="100%" height="100%">
                    <Defs>
                      <Pattern id="autoHeroGrid" width="16" height="16" patternUnits="userSpaceOnUse">
                        <Path
                          d="M 16 0 L 0 0 0 16"
                          fill="none"
                          stroke="#94A3B8"
                          strokeWidth="1"
                          opacity={isDark ? 0.08 : 0.12}
                        />
                      </Pattern>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#autoHeroGrid)" />
                  </Svg>
                </View>

                {/* Subtle Watermark Bell Icon Attached to Inner Bottom Right */}
                <View style={styles.autoWatermarkLogo} pointerEvents="none">
                  <Svg width={72} height={72} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                      stroke="#38BDF8"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.16}
                    />
                    <Path
                      d="M13.73 21a2 2 0 0 1-3.46 0"
                      stroke="#38BDF8"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.16}
                    />
                  </Svg>
                </View>

                <View style={styles.autoHeaderCardTop}>
                  <View style={{ flex: 1, zIndex: 1 }}>
                    <Text style={styles.autoHeaderTitle}>
                      Automated Notifications
                    </Text>
                    <Text style={styles.autoHeaderSubtitle}>
                      Instant member dispatch for expiration warnings, digital receipts, access check-in & welcome onboarding
                    </Text>
                  </View>
                </View>
              </View>

              {/* Sculpted Bottom-Middle Cutout Notch - Perfectly Placed Over the Bottom Border */}
              <View style={styles.autoBottomCutoutWrapper} pointerEvents="none">
                <View
                  style={[
                    styles.autoBottomCutoutNotch,
                    {
                      backgroundColor: isDark ? '#080E14' : '#F8FAFC',
                      borderColor: isDark ? '#334155' : '#334155',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.autoBottomCutoutPill,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#CBD5E1',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* ── CARDLESS PERMISSION & ACCESS SECTION ── */}
            <View style={styles.permSection}>
              {/* Section Header */}
              <View style={styles.permHeaderRow}>
                <View style={[styles.permShieldIconWrap, isDark && styles.permShieldIconWrapDark]}>
                  <ShieldCheck size={18} color={isDark ? '#E2E8F0' : '#0F172A'} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.permOverline}>DISPATCH AUTHORIZATION</Text>
                  <Text style={[styles.permMainTitle, isDark && styles.textWhite]}>
                    Automated Notifications
                  </Text>
                </View>
              </View>

              {/* Master Permission Toggle Row */}
              <View style={[styles.permMasterRow, isDark && styles.permDividerDark]}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.permMasterTitle, isDark && styles.textWhite]}>
                    Member Automation Dispatches
                  </Text>
                  <Text style={[styles.permMasterSub, isDark && styles.textMutedDark]}>
                    Authorize automated notifications across all channels
                  </Text>
                </View>

                {savingRuleId === 'master' ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Switch
                    value={autoRules.some((r) => r.enabled)}
                    onValueChange={async (newVal) => {
                      setSavingRuleId('master');
                      const updated = autoRules.map((r) => ({ ...r, enabled: newVal }));
                      setAutoRules(updated);
                      try {
                        await ownerWhatsAppService.saveAutomation(updated);
                      } catch {
                        setAutoRules(autoRules);
                        Alert.alert('Error', 'Failed to update automation permissions.');
                      } finally {
                        setSavingRuleId(null);
                      }
                    }}
                    trackColor={{ false: '#CBD5E1', true: '#0F172A' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#CBD5E1"
                  />
                )}
              </View>

              {/* Permission Channels List */}
              <View style={styles.permList}>
                {[
                  {
                    id: 'auto-expiry',
                    icon: Clock,
                    title: 'Membership Expiry Alert',
                    desc: 'Timely reminders before plan expiration',
                  },
                  {
                    id: 'auto-due',
                    icon: Receipt,
                    title: 'Payment & Fee Receipts',
                    desc: 'Instant digital invoice sent upon payment',
                  },
                  {
                    id: 'auto-checkin',
                    icon: CalendarCheck,
                    title: 'Attendance Check-In',
                    desc: 'Instant visit confirmation to members',
                  },
                  {
                    id: 'auto-welcome',
                    icon: UserCheck,
                    title: 'New Member Induction',
                    desc: 'Welcome kit and rules sent upon joining',
                  },
                ].map((item, idx, arr) => {
                  const rule = autoRules.find((r) => r.id === item.id) || { enabled: false };
                  const isLast = idx === arr.length - 1;
                  const Icon = item.icon;

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.permItemRow,
                        !isLast && styles.permItemBorder,
                        !isLast && isDark && styles.permDividerDark,
                      ]}
                    >
                      <View style={[styles.permItemIconWrap, isDark && styles.permItemIconWrapDark]}>
                        <Icon size={16} color={isDark ? '#CBD5E1' : '#334155'} strokeWidth={2.2} />
                      </View>

                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={[styles.permItemTitle, isDark && styles.textWhite]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.permItemDesc, isDark && styles.textMutedDark]}>
                          {item.desc}
                        </Text>
                      </View>

                      {savingRuleId === item.id ? (
                        <ActivityIndicator size="small" color="#0F172A" />
                      ) : (
                        <Switch
                          value={rule.enabled}
                          onValueChange={() => handleToggleAutomation(item.id, rule.enabled)}
                          trackColor={{ false: '#CBD5E1', true: '#0F172A' }}
                          thumbColor="#FFFFFF"
                          ios_backgroundColor="#CBD5E1"
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Interactive FAQs Card */}
            <View style={[styles.autoFaqCard, isDark && styles.autoFaqCardDark]}>
              {/* Card Background Gradient fading to page background at the bottom */}
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Svg width="100%" height="100%">
                  <Defs>
                    <LinearGradient id="faqFadeGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop
                        offset="0%"
                        stopColor={isDark ? '#0F172A' : '#FFFFFF'}
                        stopOpacity={1}
                      />
                      <Stop
                        offset="65%"
                        stopColor={isDark ? '#0F172A' : '#FFFFFF'}
                        stopOpacity={1}
                      />
                      <Stop
                        offset="100%"
                        stopColor={isDark ? '#080E14' : '#F8FAFC'}
                        stopOpacity={0.88}
                      />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#faqFadeGrad)" rx={14} />
                </Svg>
              </View>

              <View style={[styles.autoFaqHeader, isDark && styles.autoFaqHeaderDark]}>
                <View style={[styles.autoFaqIconWrap, isDark && styles.autoFaqIconWrapDark]}>
                  <HelpCircle size={18} color={isDark ? '#38BDF8' : '#0284C7'} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.autoFaqKicker}>FREQUENTLY ASKED QUESTIONS</Text>
                  <Text style={[styles.autoFaqHeaderTitle, isDark && styles.textWhite]}>
                    Automation Rules & Delivery FAQ
                  </Text>
                </View>
              </View>

              {[
                {
                  id: 'faq-1',
                  q: 'How are automated member updates dispatched?',
                  a: 'Every notification is triggered instantly by GymDeck system events (such as biometric/manual check-in, fee payments, and upcoming expiration cycles). Messages are transmitted in the background through your linked WhatsApp gym line without requiring manual intervention.',
                },
                {
                  id: 'faq-2',
                  q: 'Are payment receipts and expiration warnings sent automatically?',
                  a: 'Yes. Upon receiving a member payment, an itemized digital receipt is generated and dispatched immediately to the member’s phone. Expiration reminders are scheduled ahead of membership maturity to maximize renewals.',
                },
                {
                  id: 'faq-3',
                  q: 'How is member privacy and consent maintained?',
                  a: 'GymDeck strictly honors member communication preferences. If a member requests not to receive notifications, their profile delivery flag is respected and automated promotional messages will not be sent.',
                },
                {
                  id: 'faq-4',
                  q: 'Are there extra message fees or third-party API costs?',
                  a: 'No. Automations run directly through your official linked phone line using GymDeck WhatsApp Companion with zero third-party per-message fees or subscription surcharges.',
                },
              ].map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <View key={faq.id} style={[styles.autoFaqItem, isDark && styles.autoFaqItemDark]}>
                    <TouchableOpacity
                      style={styles.autoFaqQuestionRow}
                      onPress={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.autoFaqQuestionText, isDark && styles.textWhite]}>
                        {faq.q}
                      </Text>
                      {isExpanded ? (
                        <ChevronUp size={16} color={isDark ? '#94A3B8' : '#475569'} strokeWidth={2.2} />
                      ) : (
                        <ChevronDown size={16} color={isDark ? '#94A3B8' : '#475569'} strokeWidth={2.2} />
                      )}
                    </TouchableOpacity>
                    {isExpanded && (
                      <Text style={[styles.autoFaqAnswerText, isDark && styles.textMutedDark]}>
                        {faq.a}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── TAB 3: MESSAGE HISTORY / LOGS ── */}
        {activeTab === 'history' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>
                Broadcast Dispatch Logs
              </Text>
              <Text style={styles.sectionSub}>{messages.length} Records</Text>
            </View>

            {historyLoading ? (
              <ActivityIndicator color="#059669" style={{ marginVertical: 32 }} />
            ) : messages.length === 0 ? (
              <View style={[styles.emptyWrap, isDark && styles.emptyWrapDark]}>
                <History size={32} color="#94A3B8" />
                <Text style={[styles.emptyTitle, isDark && styles.textWhite]}>
                  No Broadcasts Yet
                </Text>
                <Text style={styles.emptySub}>
                  Messages dispatched from Composer Studio will appear here with delivery receipts.
                </Text>
              </View>
            ) : (
              messages.map((item) => (
                <View
                  key={item.id}
                  style={[styles.historyCard, isDark && styles.historyCardDark]}
                >
                  <View style={styles.historyCardHeader}>
                    <Text style={[styles.historyTitle, isDark && styles.textWhite]}>
                      {item.title || item.intent || 'Broadcast Campaign'}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            item.status === 'SENT' || item.status === 'DELIVERED'
                              ? '#DCFCE7'
                              : '#FEF3C7',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color:
                              item.status === 'SENT' || item.status === 'DELIVERED'
                                ? '#15803D'
                                : '#B45309',
                          },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.historyBody} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <View style={styles.historyFooter}>
                    <Text style={styles.historyMeta}>
                      {item.sentCount} / {item.totalRecipients} Delivered
                    </Text>
                    <Text style={styles.historyMeta}>
                      {new Date(item.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      {/* ============================================================ */}
      {/* 5. BRAND SIGNATURE FOOTER                                    */}
      {/* ============================================================ */}
      <View style={{ paddingBottom: layout.bottomNavHeight + 64 }}>
        <BrandSignatureFooter isDark={isDark} />
      </View>

      {/* ============================================================ */}
      {/* 6. LINK PHONE CODE / QR MODAL                                */}
      {/* ============================================================ */}
      <Modal
        visible={showQrModal}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <View style={styles.bottomSheetRoot} pointerEvents="box-none">
          {/* Smooth Fade-Only Dim Backdrop */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: modalBackdropAnim,
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
              },
            ]}
          >
            <TouchableWithoutFeedback onPress={closeModal}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
          </Animated.View>

          {/* Bottom Sheet Card sliding up from bottom with matching Add Member animation */}
          <Animated.View
            style={[
              styles.bottomSheetContainer,
              {
                transform: [{ translateY: modalSheetTranslateY }],
              },
            ]}
            pointerEvents="box-none"
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <Animated.View
                style={[
                  styles.modalContentCard,
                  isDark && styles.modalContentCardDark,
                  {
                    paddingBottom: Animated.add(
                      new Animated.Value(28),
                      keyboardPaddingAnim
                    ),
                  },
                  isConnected && [
                    styles.modalContentCardConnected,
                    {
                      backgroundColor: successColorAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [isDark ? '#0F172A' : '#FFFFFF', '#25D366'],
                      }),
                    },
                  ],
                ]}
              >
                {/* Drag Handle Bar */}
                <View style={styles.modalDragHandleContainer}>
                  <View
                    style={[
                      styles.modalDragHandle,
                      { backgroundColor: isConnected ? 'rgba(255, 255, 255, 0.5)' : isDark ? '#334155' : '#CBD5E1' },
                    ]}
                  />
                </View>

                {/* Header: Clean close button, hidden title when connected */}
                <View style={[styles.modalHeader, isConnected && styles.modalHeaderSuccess]}>
                  {!isConnected ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={styles.modalIconWrap}>
                        <KeyRound size={17} color="#25D366" strokeWidth={2.4} />
                      </View>
                      <View>
                        <Text style={[styles.modalTitle, isDark && styles.textWhite]}>
                          Link WhatsApp Line
                        </Text>
                        <Text style={styles.modalSubHeader}>
                          Companion device pairing
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}
                  <TouchableOpacity
                    onPress={closeModal}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={[styles.modalCloseBtn, isConnected && styles.modalCloseBtnSuccess]}
                  >
                    <X size={20} color={isConnected ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B'} strokeWidth={3} />
                  </TouchableOpacity>
                </View>

                {isConnected ? (
                  <View style={styles.successScreenContainer}>
                    {/* BOLD WATERMARK TEXT IN THE BACKGROUND OF THE TICK */}
                    <Animated.View
                      style={[
                        styles.watermarkContainer,
                        {
                          opacity: successTextOpacity.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.22],
                          }),
                        },
                      ]}
                    >
                      <Text style={styles.watermarkBoldText} numberOfLines={1} adjustsFontSizeToFit>
                        SUCCESSFUL
                      </Text>
                    </Animated.View>

                    {/* ANIMATED CENTER TICK MARK */}
                    <Animated.View
                      style={[
                        styles.centerTickCircle,
                        {
                          transform: [{ scale: successScaleAnim }],
                        },
                      ]}
                    >
                      <Check size={42} color="#25D366" strokeWidth={4.2} />
                    </Animated.View>

                    {/* BOLD SUCCESS HEADLINE */}
                    <Text style={styles.successMainTitle}>
                      Line Connected
                    </Text>
                  </View>
                ) : (
                  <View style={styles.qrCanvasWrap}>
                    {pairingResult?.pairingCode ? (
                      <View style={styles.pairingDisplayBox}>
                        <Text style={[styles.pairingSubtitle, isDark && { color: '#94A3B8' }]}>
                          Enter this 8-character pairing code in WhatsApp:
                        </Text>
                        <View style={[styles.pairingCodeCard, isDark && styles.pairingCodeCardDark]}>
                          <Text style={styles.pairingCodeText}>{pairingResult.pairingCode}</Text>
                        </View>

                        <View style={[styles.pairingInstructionsBox, isDark && styles.pairingInstructionsBoxDark]}>
                          <View style={styles.instructionStepRow}>
                            <View style={styles.stepNumberBadge}>
                              <Text style={styles.stepNumberText}>1</Text>
                            </View>
                            <Text style={[styles.instructionStepText, isDark && styles.textWhite]}>
                              Open <Text style={{ fontWeight: '800' }}>WhatsApp</Text> on this phone
                            </Text>
                          </View>
                          <View style={styles.instructionStepRow}>
                            <View style={styles.stepNumberBadge}>
                              <Text style={styles.stepNumberText}>2</Text>
                            </View>
                            <Text style={[styles.instructionStepText, isDark && styles.textWhite]}>
                              Go to <Text style={{ fontWeight: '800' }}>Settings &gt; Linked Devices</Text>
                            </Text>
                          </View>
                          <View style={styles.instructionStepRow}>
                            <View style={styles.stepNumberBadge}>
                              <Text style={styles.stepNumberText}>3</Text>
                            </View>
                            <Text style={[styles.instructionStepText, isDark && styles.textWhite]}>
                              Tap <Text style={{ fontWeight: '800' }}>Link a Device &gt; Link with phone number</Text>
                            </Text>
                          </View>
                          <View style={styles.instructionStepRow}>
                            <View style={styles.stepNumberBadge}>
                              <Text style={styles.stepNumberText}>4</Text>
                            </View>
                            <Text style={[styles.instructionStepText, isDark && styles.textWhite]}>
                              Type the pairing code displayed above
                            </Text>
                          </View>
                        </View>

                        <View style={styles.pairingTimerRow}>
                          <Clock size={12} color="#059669" strokeWidth={2.4} />
                          <Text style={styles.pairingTimerText}>Active code • Expires in 5 minutes</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.pairingInputBox}>
                        <View style={styles.phoneLabelRow}>
                          <Text style={[styles.pairingInputLabel, isDark && styles.textWhite]}>
                            WhatsApp Phone Number
                          </Text>
                          <View style={styles.secureTag}>
                            <Lock size={10} color="#059669" />
                            <Text style={styles.secureTagText}>Direct Link</Text>
                          </View>
                        </View>

                        {/* Phone input with auto +91 badge */}
                        <View style={[styles.phoneInputRow, isDark && styles.phoneInputRowDark]}>
                          <View style={[styles.countryCodeBadge, isDark && styles.countryCodeBadgeDark]}>
                            <Text style={styles.countryFlag}>🇮🇳</Text>
                            <Text style={[styles.countryCodeText, isDark && styles.textWhite]}>+91</Text>
                          </View>
                          <View style={styles.phoneDivider} />
                          <TextInput
                            style={[styles.phoneTextInput, isDark && styles.textWhite]}
                            value={pairingPhone}
                            onChangeText={(text) => {
                              // Strip any accidental leading +91 if user pastes full number
                              const clean = text.replace(/[^\d\s-]/g, '');
                              if (clean.replace(/\D/g, '').startsWith('91') && clean.replace(/\D/g, '').length > 10) {
                                setPairingPhone(clean.replace(/\D/g, '').slice(2));
                              } else {
                                setPairingPhone(clean);
                              }
                            }}
                            placeholder="98765 43210"
                            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                            keyboardType="phone-pad"
                            maxLength={15}
                          />
                        </View>

                        <View style={styles.infoNoticeRow}>
                          <Info size={13} color="#059669" strokeWidth={2.2} style={{ marginTop: 1 }} />
                          <Text style={styles.pairingInputHelper}>
                            We will generate an instant pairing code so you can connect without scanning a QR code from another device.
                          </Text>
                        </View>

                        {pairingError && (
                          <View style={styles.pairingErrorRow}>
                            <AlertCircle size={13} color="#EF4444" />
                            <Text style={styles.pairingErrorText}>{pairingError}</Text>
                          </View>
                        )}
                        {isRequestingPairingCode && (
                          <View style={styles.pairingLoadingRow}>
                            <ActivityIndicator size="small" color="#059669" />
                            <Text style={styles.pairingLoadingText}>Requesting code from WhatsApp...</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}

                <View style={{ marginTop: !isConnected ? 14 : 0 }}>
                  {!isConnected ? (
                    pairingResult?.pairingCode ? (
                      <View style={{ gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                          onPress={handleRequestPairingCode}
                          disabled={isRequestingPairingCode}
                          activeOpacity={0.8}
                        >
                          <RefreshCw size={15} color="#FFFFFF" strokeWidth={2.4} />
                          <Text style={styles.actionBtnText}>Request New Code</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                        onPress={handleRequestPairingCode}
                        disabled={isRequestingPairingCode}
                        activeOpacity={0.8}
                      >
                        {isRequestingPairingCode ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <KeyRound size={15} color="#FFFFFF" strokeWidth={2.4} />
                            <Text style={styles.actionBtnText}>Get Pairing Code</Text>
                            <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.4} />
                          </>
                        )}
                      </TouchableOpacity>
                    )
                  ) : null}
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </View>
      </Modal>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CUSTOM MODAL POPUP: DISCONNECT WHATSAPP LINE CONFIRMATION    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={showDisconnectModal}
        transparent
        animationType="none"
        onRequestClose={closeDisconnectModal}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.disconnectModalBackdrop,
            {
              opacity: disconnectBackdropAnim,
            },
          ]}
        >
          <TouchableWithoutFeedback onPress={closeDisconnectModal}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.disconnectModalContainer,
              {
                transform: [{ scale: disconnectScaleAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.disconnectCard,
                isDark && styles.disconnectCardDark,
              ]}
            >
              {/* Top-Right Square Close Button */}
              <TouchableOpacity
                onPress={closeDisconnectModal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[
                  styles.disconnectCloseBtn,
                  isDark && styles.disconnectCloseBtnDark,
                ]}
              >
                <X size={15} color={isDark ? '#CBD5E1' : '#64748B'} strokeWidth={2.4} />
              </TouchableOpacity>

              {/* Warning Kicker Pill */}
              <View style={styles.disconnectKickerRow}>
                <View style={styles.disconnectKickerBadge}>
                  <AlertTriangle size={12} color="#DC2626" strokeWidth={2.6} />
                  <Text style={styles.disconnectKickerText}>UNLINK WHATSAPP</Text>
                </View>
              </View>

              {/* Title & Subtitle */}
              <Text style={[styles.disconnectTitle, isDark && styles.textWhite]}>
                Disconnect WhatsApp Line
              </Text>
              <Text style={[styles.disconnectSubtitle, isDark && { color: '#94A3B8' }]}>
                Are you sure you want to unlink the companion gym phone? Automatic fee receipts, invoice alerts, and automated member messages will be paused until re-linked.
              </Text>

              {/* Notice Strip */}
              <View style={[styles.disconnectNoticeStrip, isDark && styles.disconnectNoticeStripDark]}>
                <Info size={13} color="#DC2626" strokeWidth={2.2} />
                <Text style={[styles.disconnectNoticeText, isDark && { color: '#FCA5A5' }]}>
                  You can reconnect any time via 8-character pairing code.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.disconnectActionsRow}>
                <TouchableOpacity
                  style={[
                    styles.disconnectCancelBtn,
                    isDark && styles.disconnectCancelBtnDark,
                  ]}
                  onPress={closeDisconnectModal}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.disconnectCancelBtnText, isDark && { color: '#CBD5E1' }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.disconnectConfirmBtn}
                  onPress={handleConfirmDisconnect}
                  activeOpacity={0.85}
                >
                  <Unplug size={14} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.disconnectConfirmBtnText}>
                    Unlink Phone
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  textWhite: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },

  /* 1. Signature Hero Card */
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  emeraldHeroCard: {
    borderRadius: 18,
    minHeight: 160,
    backgroundColor: '#075E54',
    paddingHorizontal: 18,
    paddingVertical: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#075E54',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  meshAura: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroWatermark: {
    position: 'absolute',
    right: -10,
    bottom: -15,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  officialBrandLogo: {
    width: 24,
    height: 24,
  } as ImageStyle,
  brandBadgeText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.9,
  },
  telemetryCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  telemetryCapsuleOnline: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#34D399',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  telemetryInnerOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  telemetryPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  telemetryStatusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  heroContent: {
    marginTop: 12,
    zIndex: 2,
  },
  heroMainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  linkedNumberPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginTop: 4,
  },
  linkedNumberText: {
    fontSize: 11.5,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#064E3B',
  },
  heroSubText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.86)',
    lineHeight: 16,
    fontWeight: '500',
    marginTop: 3,
    maxWidth: 290,
  },

  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    zIndex: 2,
  },
  heroPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  heroPrimaryBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#064E3B',
  },
  heroSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7.5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  heroDangerBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#EF4444',
  },
  heroRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 11,
    paddingVertical: 7.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    minWidth: 62,
    height: 31,
  },
  heroRefreshText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* 2. Stats Strip */
  statsStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 10,
  },
  statTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  statTileDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  statOverline: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  statCaption: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 1,
  },

  /* 3. Sub-Navigation Tabs */
  subTabsContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  subTabsTrack: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
  },
  subTabsTrackDark: {
    backgroundColor: '#1E293B',
  },
  subTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 8,
  },
  subTabItemActive: {
    backgroundColor: '#0F172A',
  },
  subTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  subTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* 4. Workspace Content */
  workspaceBody: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  tabContent: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },

  /* Reusable Content Cards */
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  contentCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotLight: {
    backgroundColor: '#E2E8F0',
  },
  stepDotDark: {
    backgroundColor: '#334155',
  },
  stepDotText: {
    fontSize: 10.5,
    fontWeight: '900',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* Intent Dropdown */
  intentSelectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: '#F8FAFC',
  },
  intentSelectorTriggerDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  intentMiniIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentMiniIconDark: {
    backgroundColor: '#334155',
  },
  intentTriggerLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  intentMenuDrop: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
    gap: 3,
  },
  intentMenuDropDark: {
    borderTopColor: '#334155',
  },
  intentMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  intentMenuItemActive: {
    backgroundColor: '#F1F5F9',
  },
  intentMenuItemActiveDark: {
    backgroundColor: '#1E293B',
  },
  intentIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentIconWrapDark: {
    backgroundColor: '#1E293B',
  },
  intentItemTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  intentItemSub: {
    fontSize: 10,
    color: '#64748B',
  },
  intentCheckmarkBox: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Audience & Segment */
  recipientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recipientBadgeDark: {
    backgroundColor: '#1E293B',
  },
  recipientBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  audienceControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  audienceSearchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 9,
    height: 38,
    gap: 6,
  },
  audienceSearchWrapDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  audienceSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    paddingVertical: 0,
  },
  audienceDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    height: 38,
  },
  audienceDropdownBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  audienceDropdownText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 95,
  },
  segmentMenuDrop: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  segmentMenuDropDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  segmentMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  segmentMenuItemActive: {
    backgroundColor: '#F1F5F9',
  },
  segmentMenuItemActiveDark: {
    backgroundColor: '#1E293B',
  },
  segmentMenuItemText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  segmentMenuItemTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },

  /* Search Matches Drawer */
  searchMatchesCard: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  searchMatchesCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  searchMatchesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchMatchesTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  searchToggleAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  searchNoMatchesBox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchNoMatchesText: {
    fontSize: 11,
    color: '#64748B',
  },
  searchMatchesList: {
    gap: 4,
  },
  searchMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchMemberRowDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  searchMemberRowActive: {
    borderColor: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  searchMemberRowActiveDark: {
    borderColor: '#38BDF8',
    backgroundColor: '#0F172A',
  },
  searchMemberInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  searchMemberName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 16,
  },
  searchMemberDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  searchMemberPhone: {
    fontSize: 10.5,
    color: '#64748B',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  searchMemberDot: {
    fontSize: 9,
    color: '#94A3B8',
  },
  searchMemberPlan: {
    fontSize: 10.5,
    color: '#0284C7',
    fontWeight: '700',
    maxWidth: 130,
  },
  searchCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  searchCheckboxActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  searchMoreCountText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },

  /* Variables Dock & Editor */
  charCountText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
  },
  editorWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  editorWrapDark: {
    backgroundColor: '#0B132B',
    borderColor: '#1E293B',
  },
  editorInput: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#0F172A',
    minHeight: 68,
    textAlignVertical: 'top',
  },

  /* WhatsApp Preview Bubble */
  previewContentCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  previewHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  previewRecipientPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewRecipientPillDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  previewHorizontalScroll: {
    marginHorizontal: -4,
    marginTop: 2,
  },
  previewPageSlide: {
    width: 320,
    paddingHorizontal: 4,
  },
  previewDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 2,
  },
  previewDot: {
    height: 6,
    borderRadius: 3,
  },
  previewDotActive: {
    width: 20,
    backgroundColor: '#059669',
  },
  previewDotInactive: {
    width: 6,
    backgroundColor: '#CBD5E1',
  },
  previewTargetText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  previewTargetTextDark: {
    color: '#94A3B8',
  },
  previewTargetHighlight: {
    color: '#0F172A',
    fontWeight: '800',
  },
  previewCanvas: {
    backgroundColor: '#EFEAE2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E2DCD5',
    minHeight: 125,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  previewChatBubble: {
    backgroundColor: '#E7FFDB',
    borderRadius: 12,
    borderTopLeftRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: '92%',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2.5,
    elevation: 2,
  },
  previewMessageText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#111827',
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  previewTimeText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },

  /* Dispatch Button */
  dispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 13,
    gap: 8,
    marginTop: 2,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  dispatchBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
  },
  dispatchBtnText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  /* Cockpit / QR */
  cockpitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  cockpitCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  cockpitTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cockpitIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cockpitTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  cockpitSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  qrCanvasWrap: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  qrCanvasWrapConnected: {
    backgroundColor: '#047857',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    minHeight: 180,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  qrSuccessBox: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    width: '100%',
  },
  shieldCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 8,
  },
  connectedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  qrSuccessTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  connectedNumberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  connectedNumberPillDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  qrSuccessNumber: {
    fontSize: 12.5,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: '#059669',
  },
  qrSuccessSub: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16.5,
    marginTop: 2,
    paddingHorizontal: 8,
  },
  connectedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 12,
    width: '100%',
  },
  connectedMetaRowDark: {
    backgroundColor: '#1E293B',
  },
  connectedMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectedMetaDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  connectedMetaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  connectedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  doneActionBtn: {
    flex: 1,
    backgroundColor: '#059669',
  },
  disconnectActionBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 14,
  },
  disconnectBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  qrDisplayBox: {
    alignItems: 'center',
  },
  qrCodeBorder: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  qrImage: {
    width: 170,
    height: 170,
  } as ImageStyle,
  qrInstructions: {
    fontSize: 10.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 10,
    fontWeight: '500',
  },
  qrLoadingBox: {
    alignItems: 'center',
    gap: 8,
  },
  qrLoadingText: {
    fontSize: 11,
    color: '#64748B',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Executive Automated Notifications Hero Card (Deep Slate/Cobalt with Faded Grid Design) */
  autoHeaderCardOuter: {
    position: 'relative',
    marginBottom: 14,
  },
  autoHeaderCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  autoWatermarkLogo: {
    position: 'absolute',
    right: 4,
    bottom: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoHeaderCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoHeaderOverline: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  autoHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18.5,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  autoHeaderSubtitle: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 2.5,
    lineHeight: 14.5,
    maxWidth: '92%',
  },
  /* Sculpted Bottom-Middle Cutout Notch - Attached completely over the bottom edge */
  autoBottomCutoutWrapper: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
    elevation: 10,
  },
  autoBottomCutoutNotch: {
    width: 108,
    height: 14,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoBottomCutoutPill: {
    width: 34,
    height: 3,
    borderRadius: 1.5,
    marginTop: 2,
  },

  /* Cardless Permission & Access Section */
  permSection: {
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  permHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  permShieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  permShieldIconWrapDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  permOverline: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  permMainTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginTop: 1,
  },
  permMasterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 4,
  },
  permMasterTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  permMasterSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  permList: {
    paddingTop: 0,
  },
  permItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },
  permItemBorder: {
    borderBottomWidth: 1,
    borderColor: '#F8FAFC',
  },
  permDividerDark: {
    borderColor: '#1E293B',
  },
  permItemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 7,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  permItemIconWrapDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  permItemTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  permItemDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },

  /* Professional FAQ Card */
  autoFaqCard: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#E2E8F0',
    padding: 16,
    paddingBottom: 20,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  autoFaqCardDark: {
    borderColor: '#1E293B',
  },
  autoFaqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  autoFaqHeaderDark: {
    borderBottomColor: '#1E293B',
  },
  autoFaqIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  autoFaqIconWrapDark: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  autoFaqKicker: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  autoFaqHeaderTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  autoFaqItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  autoFaqItemDark: {
    borderBottomColor: '#1E293B',
  },
  autoFaqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoFaqQuestionText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
    lineHeight: 17,
  },
  autoFaqAnswerText: {
    fontSize: 11.5,
    lineHeight: 17.5,
    color: '#475569',
    marginTop: 8,
    paddingRight: 6,
    fontWeight: '500',
  },

  /* History / Logs */
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  historyCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  historyBody: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  historyMeta: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  emptyWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    alignItems: 'center',
  },
  emptyWrapDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },

  /* Link Phone QR Bottom Sheet Modal (Matching Add Member in InPlaceMembersView) */
  bottomSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  modalDragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 8,
  },
  modalDragHandle: {
    width: 42,
    height: 4.5,
    borderRadius: 2.5,
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 440,
    minHeight: 400,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 16,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#E2E8F0',
  },
  modalContentCardConnected: {
    backgroundColor: '#25D366',
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    minHeight: 400,
    maxWidth: 440,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
  modalContentCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderSuccess: {
    borderBottomWidth: 0,
    paddingBottom: 0,
    marginBottom: 4,
  },
  modalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconWrapSuccess: {
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubHeader: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
  },
  modalCloseBtnSuccess: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Professional Success Screen with Center Tick & SUCCESSFUL Watermark */
  successScreenContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 4,
    width: '100%',
    flex: 1,
    overflow: 'hidden',
  },
  watermarkContainer: {
    position: 'absolute',
    top: '32%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  watermarkBoldText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    textAlign: 'center',
    opacity: 0.9,
    includeFontPadding: false,
  },
  centerTickCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginTop: 4,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  successMainTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
    zIndex: 2,
  },
  successDescription: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.92)',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 4,
    zIndex: 2,
    marginBottom: 10,
  },
  successMetaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    width: '100%',
    zIndex: 2,
  },
  successMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  successMetaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successMetaDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 8,
  },
  doneActionBtnSuccess: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  doneActionBtnSuccessText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
  },
  disconnectActionBtnSuccess: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  disconnectBtnTextSuccess: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Pairing Code Display & Form */
  pairingDisplayBox: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 4,
  },
  pairingSubtitle: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  pairingCodeCard: {
    backgroundColor: '#064E3B',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#059669',
    marginBottom: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  pairingCodeCardDark: {
    backgroundColor: '#022C22',
    borderColor: '#10B981',
  },
  pairingCodeText: {
    fontSize: 27,
    fontWeight: '900',
    color: '#34D399',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  pairingInstructionsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  pairingInstructionsBoxDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  instructionStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepNumberBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  instructionStepText: {
    fontSize: 11.5,
    color: '#334155',
    flex: 1,
  },
  pairingTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pairingTimerText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  pairingInputBox: {
    width: '100%',
    paddingVertical: 4,
  },
  phoneLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pairingInputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  secureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  secureTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
  },
  infoNoticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  pairingInputHelper: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    flex: 1,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 48,
  },
  phoneInputRowDark: {
    backgroundColor: '#1E293B',
    borderColor: '#10B981',
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
  },
  countryCodeBadgeDark: {},
  countryFlag: {
    fontSize: 14,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  phoneDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'monospace',
  },
  pairingErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  pairingErrorText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
    flex: 1,
  },
  pairingLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  pairingLoadingText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },

  /* Custom Disconnect Confirmation Popup Modal */
  disconnectModalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 999,
  },
  disconnectModalContainer: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  disconnectCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    position: 'relative',
  },
  disconnectCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  disconnectCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  disconnectCloseBtnDark: {
    borderColor: '#334155',
    backgroundColor: '#1E293B',
  },
  disconnectKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  disconnectKickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  disconnectKickerText: {
    color: '#DC2626',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  disconnectTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  disconnectSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 12,
  },
  disconnectNoticeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 16,
  },
  disconnectNoticeStripDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  disconnectNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    flex: 1,
  },
  disconnectActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  disconnectCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectCancelBtnDark: {
    borderColor: '#334155',
    backgroundColor: '#1E293B',
  },
  disconnectCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  disconnectConfirmBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  disconnectConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
export default WhatsAppHubView;
