/**
 * GymDeck Owner Mobile - Email Line Workspace
 * Complete redesign matching WhatsApp Line's visual hierarchy, typography, ambient hero, and tactile controls.
 *
 * Design Pillars (Aligned with WhatsAppHubView):
 * 1. Signature Violet/Indigo Gradient Hero Command Card:
 *    - Indigo/Violet ambient gradient (#312E81 -> #4338CA -> #6366F1)
 *    - Watermark Mail/Envelope SVG backdrop
 *    - Live Signal Indicator / Relay status capsule with glowing pulse dot
 *    - Synchronize & Refresh action buttons with smooth rotation
 * 2. High-Impact Stats Strip:
 *    - 3 balanced glass metric tiles (DISPATCHED, SUCCESS RATE %, REMAINING QUOTA)
 * 3. Elevated Tactile Segmented Tab Navigation:
 *    - [Compose Broadcast, Transmission Ledger, Automations & Templates]
 * 4. Step-by-Step Ergonomic Broadcast Composer:
 *    - Step 1: Campaign Intent & Template Preset Dropdown (Renewal Notice, Payment Receipt, Announcement, Workshop, Custom)
 *    - Step 2: Target Audience Segment Pills & Search Drawer with avatars and multi-select checkboxes
 *    - Step 3: Message Editor (Subject line, Sender display name, Reply-to address, dynamic token chips, Body)
 *    - Step 4: Authentic Email Card Preview (Sender identity, subject line badge, personalized preview text, recipient pill)
 *    - High-visibility full-width dispatch button with tactile loading state
 * 5. Permanent Transmission History Ledger:
 *    - Grouped audit rows, status pills (COMPLETED, SENDING, BOUNCED), recipient count, and Delivery Inspection drilldown modal
 * 6. Automations & Templates Tab:
 *    - Pre-built operational email triggers (Instant Payment Receipt, Expiry 3-day Alert, Welcome Kit, Monthly Attendance Summary)
 *    - Interactive switches and expandable preview cards
 * 7. Bottom Sheet Confirmation & Inspection Modals with smooth spring physics
 * 8. BrandSignatureFooter
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
  Platform,
  useWindowDimensions,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop, Pattern } from 'react-native-svg';
import {
  Mail,
  Send,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Trash2,
  RefreshCw,
  Eye,
  X,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Check,
  Sparkles,
  Inbox,
  Megaphone,
  ArrowRight,
  Layers,
  Receipt,
  FileCheck,
  ChevronUp,
  CircleHelp,
  HelpCircle,
  Bell,
  CheckCheck,
  Bookmark,
  FileEdit,
  Info,
  BarChart3,
  Server,
  Zap,
  Wifi,
  WifiOff,
  UserCheck,
  CreditCard,
  CalendarCheck,
  MessageSquare,
  Lock,
  History,
  ListFilter,
  Filter,
  Calendar,
} from 'lucide-react-native';
import {
  ownerEmailService,
  EmailOverview,
  EmailRecipient,
  EmailRecentMessage,
  EmailDraft,
  EmailTemplate,
  EmailMessageDetails,
} from '../services/api/ownerEmailService';
import { useAuthStore } from '../store/authStore';
import { LocalDatabaseManager } from '../database/LocalDatabaseManager';
import { MemberRepository } from '../database/repositories/MemberRepository';
import { Avatar } from './ui';
import { BrandSignatureFooter } from './BrandSignatureFooter';
import { layout } from '../theme/spacing';

interface EmailHubViewProps {
  isDark?: boolean;
  onClose?: () => void;
}

const TABS = [
  { id: 'compose', label: 'Broadcast', icon: Send },
  { id: 'automation', label: 'Automations', icon: Bell },
  { id: 'history', label: 'Logs', icon: History },
];

const CAMPAIGN_TYPES = [
  {
    id: 'announcement',
    label: 'Gym Announcement',
    desc: 'Facility updates, holiday hours & notices',
    badge: 'Broadcast',
    icon: Megaphone,
    subject: 'Important Announcement from {{gym_name}}',
    body: 'Dear {{member_name}},\n\nWe would like to inform you about important operational updates at {{gym_name}}.\n\nThank you for being part of our fitness community!',
  },
  {
    id: 'renewal',
    label: 'Renewal Notice',
    desc: 'Membership expiry reminder with renewal link',
    badge: 'Urgent',
    icon: Clock,
    subject: 'Your {{gym_name}} Membership is Expiring Soon',
    body: 'Dear {{member_name}},\n\nYour {{plan_name}} membership at {{gym_name}} is set to expire on {{expiry_date}}.\n\nPlease renew online or visit the front desk to ensure continuous access to all facilities and training programs.\n\nStay consistent, stay strong!',
  },
  {
    id: 'receipt',
    label: 'Fee Receipt / Invoice',
    desc: 'Official payment receipt & membership confirmation',
    badge: 'Billing',
    icon: CreditCard,
    subject: 'Payment Receipt & Statement from {{gym_name}}',
    body: 'Dear {{member_name}},\n\nThank you for your payment. Please find your official gym fee statement and membership validity recorded at {{gym_name}}.\n\nWe look forward to seeing you at your next training session!',
  },
  {
    id: 'workshop',
    label: 'Workshop & Events',
    desc: 'Special training seminars & masterclasses',
    badge: 'Events',
    icon: FileText,
    subject: 'Exclusive Strength & Conditioning Workshop at {{gym_name}}',
    body: 'Dear {{member_name}},\n\nJoin our certified coaching staff this weekend for an exclusive Strength & Mobility Workshop.\n\nReserved attendee slots are limited — reserve your spot at the front desk.',
  },
  {
    id: 'custom',
    label: 'Custom Broadcast',
    desc: 'Freeform personalized email broadcast',
    badge: 'Custom',
    icon: MessageSquare,
    subject: 'Update from {{gym_name}}',
    body: 'Dear {{member_name}},\n\n',
  },
];

const AUDIENCE_SEGMENTS = [
  { id: 'ALL', label: 'All Members', icon: Users },
  { id: 'ACTIVE', label: 'Active Roster', icon: UserCheck },
  { id: 'EXPIRED', label: 'Expiring / Expired', icon: Clock },
  { id: 'TRIAL', label: 'Trial Members', icon: AlertCircle },
];

const VARIABLE_TOKENS = [
  { token: '{{member_name}}', label: 'Name' },
  { token: '{{gym_name}}', label: 'Gym' },
  { token: '{{plan_name}}', label: 'Plan' },
  { token: '{{expiry_date}}', label: 'Expiry' },
];

export default function EmailHubView({ isDark = false, onClose }: EmailHubViewProps) {
  const { width: windowWidth } = useWindowDimensions();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'compose' | 'history' | 'automation'>('compose');

  // Loading & Syncing States
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [overview, setOverview] = useState<EmailOverview | null>(null);
  const [history, setHistory] = useState<EmailRecentMessage[]>([]);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);

  // Automations Tab States (Aligned with WhatsApp Line)
  const [autoRules, setAutoRules] = useState([
    {
      id: 'auto-expiry',
      title: 'Membership Expiry Alert',
      desc: 'Timely reminders before plan expiration with renewal link',
      enabled: true,
    },
    {
      id: 'auto-due',
      title: 'Payment & Fee Receipts',
      desc: 'Instant official digital invoice dispatched upon payment',
      enabled: true,
    },
    {
      id: 'auto-checkin',
      title: 'Attendance Check-In',
      desc: 'Instant facility check-in confirmation to members',
      enabled: false,
    },
    {
      id: 'auto-welcome',
      title: 'New Member Induction',
      desc: 'Gym onboarding kit, locker rules & guidelines sent upon joining',
      enabled: true,
    },
  ]);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Composer Form States
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('announcement');
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false);
  const [activeSegment, setActiveSegment] = useState<string>('ALL');
  const [showSegmentDropdown, setShowSegmentDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableRecipients, setAvailableRecipients] = useState<EmailRecipient[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const [subject, setSubject] = useState(CAMPAIGN_TYPES[0].subject);
  const [messageBody, setMessageBody] = useState(CAMPAIGN_TYPES[0].body);
  const [senderDisplayName, setSenderDisplayName] = useState('');
  const [replyToAddress, setReplyToAddress] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dispatchModalStep, setDispatchModalStep] = useState<'review' | 'sending' | 'success' | 'error'>('review');
  const [dispatchStatusMsg, setDispatchStatusMsg] = useState('');
  const [dispatchedCount, setDispatchedCount] = useState(0);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [inspectData, setInspectData] = useState<EmailMessageDetails | null>(null);
  const [loadingInspect, setLoadingInspect] = useState(false);

  // Inspect Modal Bottom Sheet Animation
  const inspectBackdropAnim = useRef(new Animated.Value(0)).current;
  const inspectSheetTranslateY = useRef(new Animated.Value(450)).current;

  // Logs Filtering & Pagination (Styled like WhatsAppHubView)
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logFilter, setLogFilter] = useState<'ALL' | 'COMPLETED' | 'SENDING' | 'BOUNCED' | 'FAILED'>('ALL');
  const [logTimeFilter, setLogTimeFilter] = useState<'ALL' | 'TODAY' | '7_DAYS' | 'THIS_MONTH' | 'LAST_MONTH'>('ALL');
  const [showCategoryFilterMenu, setShowCategoryFilterMenu] = useState(false);
  const [showTimeFilterMenu, setShowTimeFilterMenu] = useState(false);
  const [logCurrentPage, setLogCurrentPage] = useState(1);
  const categoryChevronAnim = useRef(new Animated.Value(0)).current;
  const timeChevronAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(categoryChevronAnim, {
      toValue: showCategoryFilterMenu ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [showCategoryFilterMenu, categoryChevronAnim]);

  useEffect(() => {
    Animated.timing(timeChevronAnim, {
      toValue: showTimeFilterMenu ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [showTimeFilterMenu, timeChevronAnim]);

  // Toast / Banners
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

  // Animated Values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const syncSpinAnim = useRef(new Animated.Value(0)).current;

  // Confirm Dispatch Bottom Sheet Animation
  const confirmBackdropAnim = useRef(new Animated.Value(0)).current;
  const confirmSheetTranslateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (showConfirmModal) {
      confirmSheetTranslateY.setValue(400);
      Animated.parallel([
        Animated.timing(confirmBackdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(confirmSheetTranslateY, {
          toValue: 0,
          friction: 8.5,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(confirmBackdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(confirmSheetTranslateY, {
          toValue: 400,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showConfirmModal]);

  const closeConfirmModal = () => {
    Animated.parallel([
      Animated.timing(confirmBackdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(confirmSheetTranslateY, {
        toValue: 400,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowConfirmModal(false);
      setDispatchModalStep('review');
    });
  };

  useEffect(() => {
    if (showInspectModal) {
      inspectSheetTranslateY.setValue(450);
      Animated.parallel([
        Animated.timing(inspectBackdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(inspectSheetTranslateY, {
          toValue: 0,
          friction: 9,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(inspectBackdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(inspectSheetTranslateY, {
          toValue: 450,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showInspectModal]);

  const closeInspectModal = () => {
    Animated.parallel([
      Animated.timing(inspectBackdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(inspectSheetTranslateY, {
        toValue: 450,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowInspectModal(false);
    });
  };

  // Pulse animation for online indicator
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

  // Sync spin animation
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isSyncing) {
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
  }, [isSyncing, syncSpinAnim]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (!toastNotice && !toastError) return;
    const timer = setTimeout(() => {
      setToastNotice(null);
      setToastError(null);
    }, 3800);
    return () => clearTimeout(timer);
  }, [toastNotice, toastError]);

  // Fetch Overview Data
  const loadOverviewData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const data = await ownerEmailService.getOverview();
      setOverview(data);
      if (data?.recentMessages) {
        setHistory(data.recentMessages);
      }
    } catch (err: any) {
      console.warn('Email overview load warning:', err);
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  }, []);

  // Fetch Recipient Members Directory (Network with seamless local SQLite fallback)
  const loadRecipients = useCallback(async (status: string, search: string) => {
    setLoadingRecipients(true);
    try {
      const res = await ownerEmailService.getRecipients({
        status: status === 'ALL' ? undefined : status,
        search: search.trim() || undefined,
        limit: 150,
      });
      const validEmails = (res?.members || []).filter((m) => m.email && m.email.trim().length > 0);
      setAvailableRecipients(validEmails);
      // By default do not select all members
    } catch (err: any) {
      console.warn('Recipient query cloud warning, falling back to local database:', err);
      try {
        const gymId = useAuthStore.getState().user?.gymId;
        const dbManager = LocalDatabaseManager.getInstance();
        if (gymId && dbManager.isOpen()) {
          const repo = new MemberRepository(dbManager);
          const localRecords = await repo.list({
            gymId,
            status: status === 'ALL' ? undefined : status,
            search: search.trim() || undefined,
          });
          const localValid: EmailRecipient[] = localRecords
            .filter((m) => m.email && m.email.trim().length > 0)
            .map((m) => ({
              id: m.id,
              memberCode: m.member_code,
              fullName: m.full_name,
              email: m.email!,
              phone: m.phone,
              membershipStatus: m.membership_status,
              expiresAt: m.expires_at || undefined,
              profilePhotoUrl: m.profile_photo_url || null,
              gender: m.gender || null,
            }));
          setAvailableRecipients(localValid);
          // By default do not select all members
          return;
        }
      } catch (localErr) {
        console.warn('Local recipient query fallback warning:', localErr);
      }
      setAvailableRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  // Fetch Sent History
  const loadHistoryLogs = useCallback(async () => {
    try {
      const res = await ownerEmailService.getHistory({ limit: 40 });
      setHistory(res?.messages || []);
    } catch (err: any) {
      console.warn('History query warning:', err);
    }
  }, []);

  // Initial Boot
  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  useEffect(() => {
    if (activeTab === 'compose') {
      loadRecipients(activeSegment, searchQuery);
    } else if (activeTab === 'history') {
      loadHistoryLogs();
    }
  }, [activeTab, activeSegment, searchQuery, loadRecipients, loadHistoryLogs]);

  // Filtered recipients
  const filteredRecipients = useMemo(() => {
    if (!searchQuery.trim()) return availableRecipients;
    const q = searchQuery.toLowerCase().trim();
    return availableRecipients.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.memberCode && m.memberCode.toLowerCase().includes(q))
    );
  }, [availableRecipients, searchQuery]);

  // Selected Members array
  const selectedMembers = useMemo(() => {
    const idSet = new Set(selectedMemberIds);
    return availableRecipients.filter((m) => idSet.has(m.id));
  }, [availableRecipients, selectedMemberIds]);

  // Toggle Member Checkbox
  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select / Deselect All
  const handleSelectAll = () => {
    setSelectedMemberIds(filteredRecipients.map((m) => m.id));
  };
  const handleDeselectAll = () => {
    setSelectedMemberIds([]);
  };

  // Change Campaign Preset
  const handleSelectCampaign = (cId: string) => {
    setSelectedCampaignId(cId);
    setShowCampaignDropdown(false);
    const preset = CAMPAIGN_TYPES.find((c) => c.id === cId);
    if (preset) {
      setSubject(preset.subject);
      setMessageBody(preset.body);
    }
  };

  // Insert Variable Token
  const insertToken = (token: string) => {
    setMessageBody((prev) => `${prev} ${token} `);
  };

  // Personalized Preview Formatter
  const formatEmailPreview = useCallback(
    (member?: EmailRecipient) => {
      const gymName = user?.gymName || 'GymDeck Fitness Hub';
      const memberName = member?.fullName || 'Rahul Sharma';
      const planName = member?.planName || 'Annual Platinum Pass';
      const expiryDate = member?.expiresAt
        ? new Date(member.expiresAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '31 Dec 2026';

      return messageBody
        .replace(/\{\{member_name\}\}/gi, memberName)
        .replace(/\{\{gym_name\}\}/gi, gymName)
        .replace(/\{\{plan_name\}\}/gi, planName)
        .replace(/\{\{expiry_date\}\}/gi, expiryDate);
    },
    [messageBody, user?.gymName]
  );

  const formatSubjectPreview = useCallback(
    (member?: EmailRecipient) => {
      const gymName = user?.gymName || 'GymDeck Fitness Hub';
      const memberName = member?.fullName || 'Rahul Sharma';
      const planName = member?.planName || 'Annual Platinum Pass';
      const expiryDate = member?.expiresAt
        ? new Date(member.expiresAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '31 Dec 2026';

      return subject
        .replace(/\{\{member_name\}\}/gi, memberName)
        .replace(/\{\{gym_name\}\}/gi, gymName)
        .replace(/\{\{plan_name\}\}/gi, planName)
        .replace(/\{\{expiry_date\}\}/gi, expiryDate);
    },
    [subject, user?.gymName]
  );

  // Inspect Modal
  const handleInspect = async (msgId: string) => {
    setLoadingInspect(true);
    setShowInspectModal(true);
    try {
      const details = await ownerEmailService.getMessageDetails(msgId);
      setInspectData(details);
    } catch (err: any) {
      setToastError(err.message || 'Could not load message telemetry.');
      setShowInspectModal(false);
    } finally {
      setLoadingInspect(false);
    }
  };

  // Dispatch Broadcast
  const handleConfirmDispatch = async () => {
    if (isSending) return;

    const idSet = new Set(selectedMemberIds);
    const recipientsToSend = availableRecipients
      .filter((m) => idSet.has(m.id))
      .map((m) => ({
        memberId: m.id,
        email: m.email,
        name: m.fullName,
      }));

    if (recipientsToSend.length === 0) {
      setToastError('Please select at least 1 recipient with a valid email.');
      return;
    }

    setIsSending(true);
    setDispatchModalStep('sending');
    setDispatchedCount(recipientsToSend.length);

    try {
      await ownerEmailService.sendEmail({
        subject: subject.trim(),
        bodyHtml: messageBody,
        senderDisplayName: senderDisplayName.trim() || undefined,
        replyToAddress: replyToAddress.trim() || undefined,
        recipients: recipientsToSend,
        idempotencyKey: `email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });

      setDispatchStatusMsg(`Email broadcast queued successfully for ${recipientsToSend.length} ${recipientsToSend.length === 1 ? 'member' : 'members'}.`);
      setDispatchModalStep('success');
      setSelectedMemberIds([]);
      loadOverviewData();
      loadHistoryLogs();
    } catch (err: any) {
      setDispatchStatusMsg(err.message || 'Failed to dispatch email broadcast. Please try again.');
      setDispatchModalStep('error');
    } finally {
      setIsSending(false);
    }
  };

  const quota = overview?.quota || {
    allocatedQuota: 300,
    consumedCount: 0,
    reservedCount: 0,
    remainingQuota: 300,
    billingPeriod: 'Current Month',
  };

  const activeCampaignObj = useMemo(() => {
    return CAMPAIGN_TYPES.find((c) => c.id === selectedCampaignId) || CAMPAIGN_TYPES[0];
  }, [selectedCampaignId]);

  const activeSegmentObj = useMemo(() => {
    return AUDIENCE_SEGMENTS.find((s) => s.id === activeSegment) || AUDIENCE_SEGMENTS[0];
  }, [activeSegment]);

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#080E14' : '#F8FAFC' }]}>
      {/* ─── FLOATING TOAST NOTICES ─── */}
      {toastNotice ? (
        <View style={styles.floatingToastSuccess}>
          <CheckCircle2 size={16} color="#34D399" />
          <Text style={styles.floatingToastText}>{toastNotice}</Text>
        </View>
      ) : null}
      {toastError ? (
        <View style={styles.floatingToastError}>
          <AlertCircle size={16} color="#F87171" />
          <Text style={styles.floatingToastText}>{toastError}</Text>
        </View>
      ) : null}

      {/* ============================================================ */}
      {/* 1. SIGNATURE EMAIL HERO COMMAND CARD                         */}
      {/* Properly scaled, elegant Indigo gradient with upper cutout    */}
      {/* ============================================================ */}
      <View style={styles.heroSection}>
        <View style={styles.heroCardOuterWrapper}>
          {/* Sculpted Top-Middle Inverted Cutout Notch */}
          <View style={styles.heroTopCutoutWrapper} pointerEvents="none">
            <View
              style={[
                styles.heroTopCutoutNotch,
                {
                  backgroundColor: isDark ? '#080E14' : '#F8FAFC',
                },
              ]}
            />
          </View>

          <View style={styles.indigoHeroCard}>
            {/* Ambient SVG Mesh Depth */}
            <View style={styles.meshAura} pointerEvents="none">
              <Svg width="100%" height="100%" viewBox="0 0 360 160" preserveAspectRatio="none" fill="none">
                <Defs>
                  <LinearGradient id="emailHeroGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#312E81" />
                    <Stop offset="55%" stopColor="#3730A3" />
                    <Stop offset="100%" stopColor="#4F46E5" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#emailHeroGrad)" rx="18" />
                <Circle cx="340" cy="20" r="95" fill="#818CF8" fillOpacity="0.12" />
                <Circle cx="40" cy="140" r="75" fill="#FFFFFF" fillOpacity="0.03" />
              </Svg>
            </View>

            {/* Watermark Mail Vector */}
            <View style={styles.heroWatermark} pointerEvents="none">
              <Mail size={110} color="rgba(255, 255, 255, 0.07)" strokeWidth={1.5} />
            </View>

            {/* Top Row: Clean Brand */}
            <View style={styles.heroTopRow}>
              <View style={styles.brandTitleRow}>
                <View style={styles.brandLogoBox}>
                  <Mail size={16} color="#FFFFFF" strokeWidth={2.4} />
                </View>
                <Text style={styles.brandBadgeText}>EMAIL LINE</Text>
              </View>
            </View>

            {/* Hero Main Body: Title & Infrastructure Subtext */}
            <View style={styles.heroContent}>
              <Text style={styles.heroMainTitle} numberOfLines={1} adjustsFontSizeToFit>
                Enterprise Mail Relay
              </Text>
              <Text style={styles.heroSubText} numberOfLines={2}>
                Transactional notices, renewal reminders & broadcast campaigns
              </Text>
            </View>

            {/* Hero Actions Row: Clean sender address & professional sync button */}
            <View style={styles.heroActionsRow}>
              <View style={styles.heroSenderAddressRow}>
                <ShieldCheck size={14} color="#A7F3D0" strokeWidth={2.2} style={styles.shrinkZero} />
                <Text style={styles.heroSenderAddressText} numberOfLines={1} ellipsizeMode="middle">
                  {overview?.relayInfo?.senderEmail || 'notifications@mail.epic-studio.in'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.heroRefreshBtn}
                onPress={loadOverviewData}
                activeOpacity={0.8}
                disabled={isSyncing}
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
                  <RefreshCw size={12} color="#FFFFFF" strokeWidth={2.4} />
                </Animated.View>
                <Text style={styles.heroRefreshText}>Sync</Text>
              </TouchableOpacity>
            </View>
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
            {quota.consumedCount}
          </Text>
          <Text style={styles.statCaption}>Sent msgs</Text>
        </View>

        <View style={[styles.statTile, isDark && styles.statTileDark]}>
          <Text style={styles.statOverline}>DELIVERY RATE</Text>
          <Text style={[styles.statNumber, { color: '#0284C7' }]}>
            {overview?.metrics?.totalSentThisMonth && overview.metrics.totalSentThisMonth > 0
              ? `${overview.metrics.successRate}%`
              : '100%'}
          </Text>
          <Text style={styles.statCaption}>Confirmed</Text>
        </View>

        <View style={[styles.statTile, isDark && styles.statTileDark]}>
          <Text style={styles.statOverline}>REMAINING</Text>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>
            {quota.remainingQuota}
          </Text>
          <Text style={styles.statCaption}>of {quota.allocatedQuota} units</Text>
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
                  size={13}
                  color={active ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B'}
                  strokeWidth={active ? 2.5 : 2}
                />
                <Text
                  style={[
                    styles.subTabText,
                    active && styles.subTabTextActive,
                    isDark && !active && { color: '#94A3B8' },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
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
        {loading ? (
          <View style={styles.centerLoadingBox}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={[styles.loadingText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Connecting to Mail Gateway...
            </Text>
          </View>
        ) : activeTab === 'compose' ? (
          /* ═══════════════════════════════════════════════════════════
             TAB 1: BROADCAST COMPOSER (Organized 4-Step Architecture)
          ═══════════════════════════════════════════════════════════ */
          <View style={styles.tabContent}>
            {/* STEP 1: Campaign Preset Selector */}
            <View style={[styles.contentCard, isDark && styles.contentCardDark]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.stepDot, isDark ? styles.stepDotDark : styles.stepDotLight]}>
                    <Text style={[styles.stepDotText, isDark ? styles.textWhite : { color: '#0F172A' }]}>1</Text>
                  </View>
                  <Text style={[styles.cardTitle, isDark && styles.textWhite]}>
                    Campaign Intent
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.intentSelectorTrigger, isDark && styles.intentSelectorTriggerDark]}
                  onPress={() => setShowCampaignDropdown(!showCampaignDropdown)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.intentMiniIcon, isDark && styles.intentMiniIconDark]}>
                    {React.createElement(activeCampaignObj.icon, {
                      size: 13,
                      color: isDark ? '#E2E8F0' : '#1E293B',
                      strokeWidth: 2.2,
                    })}
                  </View>
                  <Text style={[styles.intentTriggerLabel, isDark && styles.textWhite]} numberOfLines={1} ellipsizeMode="tail">
                    {activeCampaignObj.label}
                  </Text>
                  <ChevronDown size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              {/* Collapsible Campaign Dropdown */}
              {showCampaignDropdown && (
                <View style={[styles.dropdownMenu, isDark && styles.dropdownMenuDark]}>
                  {CAMPAIGN_TYPES.map((c) => {
                    const active = c.id === selectedCampaignId;
                    const Icon = c.icon;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.dropdownMenuItem,
                          isDark && styles.dropdownMenuItemDark,
                          active && (isDark ? styles.dropdownMenuItemActiveDark : styles.dropdownMenuItemActive),
                        ]}
                        onPress={() => handleSelectCampaign(c.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.dropdownMenuItemLeft}>
                          <View style={[styles.dropdownMenuIconBox, isDark && styles.dropdownMenuIconBoxDark]}>
                            <Icon size={14} color={isDark ? '#E2E8F0' : '#334155'} strokeWidth={2.2} />
                          </View>
                          <View style={{ flex: 1, paddingRight: 6 }}>
                            <Text
                              style={[
                                styles.dropdownMenuItemTitle,
                                active && { color: isDark ? '#38BDF8' : '#0F172A', fontWeight: '800' },
                                isDark && !active && styles.textWhite,
                              ]}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {c.label}
                            </Text>
                            <Text style={styles.dropdownMenuItemDesc} numberOfLines={1} ellipsizeMode="tail">{c.desc}</Text>
                          </View>
                        </View>
                        {active && <Check size={14} color={isDark ? '#38BDF8' : '#0F172A'} strokeWidth={2.5} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* STEP 2: Target Audience Segment & Search Drawer */}
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

              {/* Search Bar on Left & Segment Dropdown Trigger on Right (Matching WhatsApp Line) */}
              <View style={styles.audienceControlRow}>
                <View style={[styles.audienceSearchWrap, isDark && styles.audienceSearchWrapDark]}>
                  <Search size={14} color="#94A3B8" />
                  <TextInput
                    style={[styles.audienceSearchInput, isDark && styles.textWhite]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search member name or email..."
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <X size={13} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.audienceDropdownBtn, isDark && styles.audienceDropdownBtnDark]}
                  onPress={() => setShowSegmentDropdown(!showSegmentDropdown)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.audienceDropdownText, isDark && styles.textWhite]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {activeSegmentObj.label}
                  </Text>
                  <ChevronDown size={14} color={isDark ? '#94A3B8' : '#475569'} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>

              {/* Segment Dropdown List */}
              {showSegmentDropdown && (
                <View style={[styles.dropdownMenu, isDark && styles.dropdownMenuDark]}>
                  {AUDIENCE_SEGMENTS.map((s) => {
                    const active = s.id === activeSegment;
                    const Icon = s.icon;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.dropdownMenuItem,
                          isDark && styles.dropdownMenuItemDark,
                          active && (isDark ? styles.dropdownMenuItemActiveDark : styles.dropdownMenuItemActive),
                        ]}
                        onPress={() => {
                          setActiveSegment(s.id);
                          setShowSegmentDropdown(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Icon size={14} color={isDark ? (active ? '#38BDF8' : '#94A3B8') : (active ? '#0F172A' : '#64748B')} strokeWidth={2.2} />
                          <Text
                            style={[
                              styles.segmentMenuItemText,
                              active && { color: isDark ? '#38BDF8' : '#0F172A', fontWeight: '800' },
                              isDark && !active && styles.textWhite,
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {s.label}
                          </Text>
                        </View>
                        {active && <Check size={14} color={isDark ? '#38BDF8' : '#0F172A'} strokeWidth={2.4} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Search Matching Drawer / Member Checkboxes */}
              <View style={[styles.recipientListCard, isDark && styles.recipientListCardDark]}>
                <View style={styles.recipientListHeader}>
                  <Text style={[styles.recipientListTitle, isDark && styles.textWhite]}>
                    Eligible Members ({filteredRecipients.length})
                  </Text>
                  <View style={styles.recipientActionButtonsRow}>
                    <TouchableOpacity onPress={handleSelectAll} activeOpacity={0.7}>
                      <Text style={styles.recipientActionLink}>Select All</Text>
                    </TouchableOpacity>
                    <Text style={[styles.dividerPill, { color: isDark ? '#334155' : '#CBD5E1' }]}>|</Text>
                    <TouchableOpacity onPress={handleDeselectAll} activeOpacity={0.7}>
                      <Text style={[styles.recipientClearLink, isDark && { color: '#94A3B8' }]}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {loadingRecipients ? (
                  <View style={styles.centerLoadingSmall}>
                    <ActivityIndicator size="small" color="#4F46E5" />
                    <Text style={[styles.loadingTextSmall, isDark && { color: '#94A3B8' }]}>
                      Loading members...
                    </Text>
                  </View>
                ) : filteredRecipients.length === 0 ? (
                  <View style={styles.noRecipientsBox}>
                    <Text style={[styles.noRecipientsText, isDark && { color: '#94A3B8' }]}>
                      No members with registered email found.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.memberItemsContainer}>
                    {filteredRecipients.slice(0, 5).map((member) => {
                      const isSelected = selectedMemberIds.includes(member.id);
                      return (
                        <TouchableOpacity
                          key={member.id}
                          style={[
                            styles.memberRowItem,
                            isDark && styles.memberRowItemDark,
                            isSelected && (isDark ? styles.memberRowItemActiveDark : styles.memberRowItemActive),
                          ]}
                          onPress={() => toggleMemberSelection(member.id)}
                          activeOpacity={0.7}
                        >
                          <Avatar
                            name={member.fullName}
                            photoUrl={member.profilePhotoUrl}
                            gender={member.gender}
                            size="sm"
                            style={{ marginRight: 10 }}
                          />
                          <View style={styles.memberInfoCol}>
                            <View style={styles.memberNameRow}>
                              <Text style={[styles.memberNameText, isDark && styles.textWhite]} numberOfLines={1} ellipsizeMode="tail">
                                {member.fullName}
                              </Text>
                              <Text style={styles.memberStatusBadge}>{member.membershipStatus}</Text>
                            </View>
                            <Text style={[styles.memberEmailText, isDark && { color: '#94A3B8' }]} numberOfLines={1} ellipsizeMode="tail">
                              {member.email}
                            </Text>
                          </View>
                          <View style={[styles.checkboxSquare, isSelected && styles.checkboxSquareActive]}>
                            {isSelected && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    {filteredRecipients.length > 5 && (
                      <Text style={styles.moreRecipientsText}>
                        + {filteredRecipients.length - 5} more eligible members available
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* STEP 3: Message Content & Variable Chips */}
            <View style={[styles.contentCard, isDark && styles.contentCardDark]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.stepDot, isDark ? styles.stepDotDark : styles.stepDotLight]}>
                    <Text style={[styles.stepDotText, isDark ? styles.textWhite : { color: '#0F172A' }]}>3</Text>
                  </View>
                  <Text style={[styles.cardTitle, isDark && styles.textWhite]}>
                    Message Body & Sender
                  </Text>
                </View>
                <Text style={styles.charCountText}>
                  {messageBody.length} characters
                </Text>
              </View>

              {/* Subject Input */}
              <Text style={styles.fieldSectionLabel}>SUBJECT LINE</Text>
              <TextInput
                style={[styles.subjectTextInput, isDark && styles.subjectTextInputDark]}
                value={subject}
                onChangeText={setSubject}
                placeholder="Enter subject line..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              />

              {/* Body Content Editor */}
              <Text style={[styles.fieldSectionLabel, { marginTop: 12 }]}>MESSAGE CONTENT</Text>
              <View style={[styles.editorWrap, isDark && styles.editorWrapDark]}>
                <TextInput
                  style={[styles.editorInput, isDark && styles.textWhite]}
                  multiline
                  numberOfLines={5}
                  value={messageBody}
                  onChangeText={setMessageBody}
                  placeholder="Type broadcast message content here..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* STEP 4: Live Email Envelope Preview */}
            <View style={[styles.contentCard, styles.previewContentCard, isDark && styles.contentCardDark]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Mail size={14} color={isDark ? '#E2E8F0' : '#0F172A'} strokeWidth={2.4} />
                  <Text style={[styles.cardTitle, { marginLeft: 6 }, isDark && styles.textWhite]}>
                    Email Client Preview
                  </Text>
                </View>
                <View style={[styles.previewRecipientPill, isDark && styles.previewRecipientPillDark]}>
                  <Text style={[styles.previewTargetText, isDark && styles.previewTargetTextDark]} numberOfLines={1}>
                    To: <Text style={styles.previewTargetHighlight}>{selectedMembers.length > 1 ? `${selectedMembers.length} Members` : selectedMembers[0]?.fullName || 'Rahul Sharma'}</Text>
                  </Text>
                </View>
              </View>

              {/* Envelope Paper Card */}
              <View style={[styles.envelopeCanvas, isDark && styles.envelopeCanvasDark]}>
                {/* Email Header Meta */}
                <View style={[styles.envelopeHeader, isDark && styles.envelopeHeaderDark]}>
                  <View style={styles.envelopeSenderRow}>
                    <View style={styles.envelopeSenderAvatar}>
                      <Text style={styles.envelopeSenderInitial}>
                        {(senderDisplayName || user?.gymName || 'G')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.envelopeSenderMeta}>
                      <Text style={[styles.envelopeSenderName, isDark && styles.textWhite]}>
                        {senderDisplayName || user?.gymName || 'GymDeck Fitness Desk'}
                      </Text>
                      <Text style={styles.envelopeFromEmail}>
                        &lt;{overview?.relayInfo?.senderEmail || 'notifications@mail.epic-studio.in'}&gt;
                      </Text>
                    </View>
                    <Text style={styles.envelopeTimeText}>Just now</Text>
                  </View>

                  <View style={styles.envelopeSubjectRow}>
                    <Text style={styles.envelopeSubjectTag}>SUBJECT</Text>
                    <Text style={[styles.envelopeSubjectText, isDark && styles.textWhite]} numberOfLines={1}>
                      {formatSubjectPreview(selectedMembers[0])}
                    </Text>
                  </View>
                </View>

                {/* Email Body Preview Content */}
                <View style={styles.envelopeBodyContainer}>
                  <Text style={[styles.envelopeBodyText, isDark && styles.textWhite]}>
                    {formatEmailPreview(selectedMembers[0])}
                  </Text>
                </View>

                {/* Email Verified Signature Footer */}
                <View style={[styles.envelopeFooter, isDark && styles.envelopeFooterDark]}>
                  <View style={styles.envelopeVerifiedBadge}>
                    <ShieldCheck size={12} color="#E2E8F0" strokeWidth={2.2} />
                    <Text style={styles.envelopeVerifiedText}>
                      Signed by {user?.gymName || 'GymDeck'} • Encrypted Relay
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Dispatch Action Button */}
            <TouchableOpacity
              style={[
                styles.dispatchBtn,
                (selectedMemberIds.length === 0 || !subject.trim() || !messageBody.trim() || isSending) &&
                  styles.dispatchBtnDisabled,
              ]}
              onPress={() => setShowConfirmModal(true)}
              disabled={selectedMemberIds.length === 0 || !subject.trim() || !messageBody.trim() || isSending}
              activeOpacity={0.85}
            >
              {isSending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Send size={16} color="#FFFFFF" />
                  <Text style={styles.dispatchBtnText}>
                    {selectedMemberIds.length > 0
                      ? `Review & Dispatch (${selectedMemberIds.length})`
                      : 'Review & Dispatch'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : activeTab === 'history' ? (
          /* ═══════════════════════════════════════════════════════════
             TAB 2: DISPATCH LOGS & AUDIT (Redesigned like WhatsAppHubView)
          ═══════════════════════════════════════════════════════════ */
          <View style={styles.tabContent}>
            {/* Executive Logs Header Hero Card (Clean Deep Slate / Cobalt with subtle Grid) */}
            <View style={styles.autoHeaderCardOuter}>
              <View
                style={[
                  styles.autoHeaderCard,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#1E293B',
                    borderColor: '#334155',
                  },
                ]}
              >
                {/* Subtle Faded Grid Background Pattern */}
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  <Svg width="100%" height="100%">
                    <Defs>
                      <Pattern id="emailLogHeroGrid" width="16" height="16" patternUnits="userSpaceOnUse">
                        <Path
                          d="M 16 0 L 0 0 0 16"
                          fill="none"
                          stroke="#94A3B8"
                          strokeWidth="1"
                          opacity={isDark ? 0.08 : 0.12}
                        />
                      </Pattern>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#emailLogHeroGrid)" />
                  </Svg>
                </View>

                {/* Subtle Watermark History Icon Attached to Inner Bottom Right */}
                <View style={styles.autoWatermarkLogo} pointerEvents="none">
                  <Svg width={72} height={72} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 8v4l3 3"
                      stroke="#818CF8"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.16}
                    />
                    <Circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="#818CF8"
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
                      Dispatch Logs & Audit
                    </Text>
                    <Text style={styles.autoHeaderSubtitle}>
                      Real-time delivery telemetry, bounce monitoring and server transmission receipts
                    </Text>
                  </View>
                </View>
              </View>

              {/* Sculpted Bottom-Middle Cutout Notch */}
              <View style={styles.autoBottomCutoutWrapper} pointerEvents="none">
                <View
                  style={[
                    styles.autoBottomCutoutNotch,
                    {
                      backgroundColor: isDark ? '#080E14' : '#F8FAFC',
                      borderColor: '#334155',
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

            {/* Metric KPI Strip (Clean High-Impact Overview) */}
            {(() => {
              const totalBroadcasts = history.length;
              const totalRecipients = history.reduce((acc, m) => acc + (m.recipientCount || 0), 0);
              const completedCount = history.filter((m) => m.status === 'COMPLETED').length;
              const deliveryRate = totalBroadcasts > 0 ? Math.round((completedCount / totalBroadcasts) * 100) : 100;
              const sendingCount = history.filter((m) => m.status === 'SENDING').length;

              return (
                <View style={[styles.logKpiRow, isDark && styles.logKpiRowDark]}>
                  <View style={styles.logKpiItem}>
                    <Text style={styles.logKpiLabel}>TOTAL CAMPAIGNS</Text>
                    <Text style={[styles.logKpiValue, isDark && styles.textWhite]}>
                      {totalBroadcasts}
                    </Text>
                    <Text style={styles.logKpiSub}>{totalRecipients} targets</Text>
                  </View>

                  <View style={[styles.logKpiDivider, isDark && styles.permDividerDark]} />

                  <View style={styles.logKpiItem}>
                    <Text style={styles.logKpiLabel}>DELIVERY RATE</Text>
                    <Text style={[styles.logKpiValue, { color: '#10B981' }]}>
                      {deliveryRate}%
                    </Text>
                    <Text style={styles.logKpiSub}>{completedCount} verified</Text>
                  </View>

                  <View style={[styles.logKpiDivider, isDark && styles.permDividerDark]} />

                  <View style={styles.logKpiItem}>
                    <Text style={styles.logKpiLabel}>IN TRANSIT</Text>
                    <Text style={[styles.logKpiValue, { color: sendingCount > 0 ? '#4F46E5' : '#64748B' }]}>
                      {sendingCount}
                    </Text>
                    <Text style={styles.logKpiSub}>{sendingCount === 0 ? 'All delivered' : 'Active queue'}</Text>
                  </View>
                </View>
              );
            })()}

            {/* Search Bar + Category Dropdown Button + Time Filter Dropdown Button Row */}
            <View style={styles.logControlsSection}>
              <View style={styles.logSearchAndFilterRow}>
                <View style={[styles.logSearchBox, isDark && styles.logSearchBoxDark]}>
                  <Search size={15} color="#94A3B8" strokeWidth={2.2} />
                  <TextInput
                    style={[styles.logSearchInput, isDark && styles.textWhite]}
                    placeholder="Search logs..."
                    placeholderTextColor="#94A3B8"
                    value={logSearchQuery}
                    onChangeText={(text) => {
                      setLogSearchQuery(text);
                      setLogCurrentPage(1);
                    }}
                    autoCorrect={false}
                  />
                  {logSearchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setLogSearchQuery('');
                        setLogCurrentPage(1);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Category Filter Dropdown Trigger Button */}
                <TouchableOpacity
                  style={[
                    styles.logDropdownBtn,
                    isDark && styles.logDropdownBtnDark,
                    logFilter !== 'ALL' && styles.logDropdownBtnActive,
                  ]}
                  onPress={() => {
                    setShowTimeFilterMenu(false);
                    setShowCategoryFilterMenu((prev) => !prev);
                  }}
                  activeOpacity={0.75}
                >
                  <ListFilter size={14} color={logFilter !== 'ALL' ? '#0F172A' : '#64748B'} strokeWidth={2.2} />
                  <Text
                    style={[
                      styles.logDropdownBtnText,
                      isDark && styles.textWhite,
                      logFilter !== 'ALL' && styles.logDropdownBtnTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {logFilter === 'COMPLETED'
                      ? 'Delivered'
                      : logFilter === 'SENDING'
                      ? 'Sending'
                      : logFilter === 'BOUNCED'
                      ? 'Bounced'
                      : 'All Logs'}
                  </Text>
                  <Animated.View
                    style={{
                      transform: [
                        {
                          rotate: categoryChevronAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '180deg'],
                          }),
                        },
                      ],
                    }}
                  >
                    <ChevronDown
                      size={12}
                      color={logFilter !== 'ALL' ? '#0F172A' : '#64748B'}
                    />
                  </Animated.View>
                </TouchableOpacity>

                {/* Filter Dropdown Trigger Button */}
                <TouchableOpacity
                  style={[
                    styles.logDropdownBtn,
                    isDark && styles.logDropdownBtnDark,
                    logTimeFilter !== 'ALL' && styles.logDropdownBtnActive,
                  ]}
                  onPress={() => {
                    setShowCategoryFilterMenu(false);
                    setShowTimeFilterMenu((prev) => !prev);
                  }}
                  activeOpacity={0.75}
                >
                  <Filter size={14} color={logTimeFilter !== 'ALL' ? '#0F172A' : '#64748B'} strokeWidth={2.2} />
                  <Text
                    style={[
                      styles.logDropdownBtnText,
                      isDark && styles.textWhite,
                      logTimeFilter !== 'ALL' && styles.logDropdownBtnTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {logTimeFilter === 'TODAY'
                      ? 'Today'
                      : logTimeFilter === '7_DAYS'
                      ? '7 Days'
                      : logTimeFilter === 'THIS_MONTH'
                      ? 'This Mo'
                      : logTimeFilter === 'LAST_MONTH'
                      ? 'Last Mo'
                      : 'Date'}
                  </Text>
                  <Animated.View
                    style={{
                      transform: [
                        {
                          rotate: timeChevronAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '180deg'],
                          }),
                        },
                      ],
                    }}
                  >
                    <ChevronDown
                      size={12}
                      color={logTimeFilter !== 'ALL' ? '#0F172A' : '#64748B'}
                    />
                  </Animated.View>
                </TouchableOpacity>
              </View>

              {/* Category Filter Menu Dropdown Popover */}
              {showCategoryFilterMenu && (
                <View style={[styles.logDropdownMenu, isDark && styles.logDropdownMenuDark]}>
                  <Text style={styles.logDropdownMenuHeader}>FILTER BY TRANSMISSION STATUS</Text>
                  {[
                    { id: 'ALL', label: 'All Logs', count: history.length, icon: History },
                    {
                      id: 'COMPLETED',
                      label: 'Delivered',
                      count: history.filter((m) => m.status === 'COMPLETED').length,
                      icon: CheckCircle2,
                    },
                    {
                      id: 'SENDING',
                      label: 'Sending',
                      count: history.filter((m) => m.status === 'SENDING').length,
                      icon: Clock,
                    },
                    {
                      id: 'BOUNCED',
                      label: 'Bounced / Dropped',
                      count: history.filter((m) => m.status === 'BOUNCED' || m.status === 'FAILED').length,
                      icon: AlertCircle,
                    },
                  ].map((opt) => {
                    const isSelected = logFilter === opt.id;
                    const IconComponent = opt.icon;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          styles.logDropdownOption,
                          isSelected && (isDark ? styles.logDropdownOptionSelectedDark : styles.logDropdownOptionSelected),
                        ]}
                        onPress={() => {
                          setLogFilter(opt.id as any);
                          setShowCategoryFilterMenu(false);
                          setLogCurrentPage(1);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <IconComponent
                            size={14}
                            color={isSelected ? '#4F46E5' : isDark ? '#94A3B8' : '#64748B'}
                            strokeWidth={2}
                          />
                          <Text
                            style={[
                              styles.logDropdownOptionText,
                              isDark && styles.textWhite,
                              isSelected && styles.logDropdownOptionTextSelected,
                            ]}
                          >
                            {opt.label}
                          </Text>
                          {opt.count > 0 && (
                            <View
                              style={[
                                styles.logDropdownBadge,
                                isSelected && styles.logDropdownBadgeSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.logDropdownBadgeText,
                                  isSelected && styles.logDropdownBadgeTextSelected,
                                ]}
                              >
                                {opt.count}
                              </Text>
                            </View>
                          )}
                        </View>
                        {isSelected && <Check size={14} color="#4F46E5" strokeWidth={2.4} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Time Filter Menu Dropdown Popover */}
              {showTimeFilterMenu && (
                <View style={[styles.logDropdownMenu, isDark && styles.logDropdownMenuDark]}>
                  <Text style={styles.logDropdownMenuHeader}>FILTER BY TIMELINE</Text>
                  {[
                    { id: 'ALL', label: 'All Time', icon: History },
                    { id: 'TODAY', label: 'Today (Last 24 Hours)', icon: Clock },
                    { id: '7_DAYS', label: 'Past 7 Days', icon: Calendar },
                    { id: 'THIS_MONTH', label: 'This Month', icon: CalendarCheck },
                    { id: 'LAST_MONTH', label: 'Last Month', icon: Calendar },
                  ].map((opt) => {
                    const isSelected = logTimeFilter === opt.id;
                    const IconComponent = opt.icon;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          styles.logDropdownOption,
                          isSelected && (isDark ? styles.logDropdownOptionSelectedDark : styles.logDropdownOptionSelected),
                        ]}
                        onPress={() => {
                          setLogTimeFilter(opt.id as any);
                          setShowTimeFilterMenu(false);
                          setLogCurrentPage(1);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <IconComponent
                            size={14}
                            color={isSelected ? '#4F46E5' : isDark ? '#94A3B8' : '#64748B'}
                            strokeWidth={2}
                          />
                          <Text
                            style={[
                              styles.logDropdownOptionText,
                              isDark && styles.textWhite,
                              isSelected && styles.logDropdownOptionTextSelected,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </View>
                        {isSelected && <Check size={14} color="#4F46E5" strokeWidth={2.4} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* List Header Count & Quick Refresh */}
            <View style={styles.logListHeaderRow}>
              <Text style={styles.logListHeaderTitle}>
                TRANSMISSION AUDIT & LOGS
              </Text>
              <TouchableOpacity
                style={styles.logRefreshBtn}
                onPress={loadHistoryLogs}
                activeOpacity={0.7}
              >
                <RefreshCw size={12} color="#000000" strokeWidth={2.4} />
                <Text style={styles.logRefreshBtnText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {/* History Feed */}
            {(() => {
              const now = new Date();
              const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
              const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
              const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
              const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
              const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();

              const filtered = history.filter((item) => {
                const status = (item.status || '').toUpperCase();
                if (logFilter === 'COMPLETED' && status !== 'COMPLETED') return false;
                if (logFilter === 'SENDING' && status !== 'SENDING') return false;
                if (logFilter === 'BOUNCED' && status !== 'BOUNCED' && status !== 'FAILED') return false;

                // Time filter
                const itemTime = new Date(item.createdAt).getTime();
                if (logTimeFilter === 'TODAY' && itemTime < startOfToday) return false;
                if (logTimeFilter === '7_DAYS' && itemTime < sevenDaysAgo) return false;
                if (logTimeFilter === 'THIS_MONTH' && itemTime < startOfThisMonth) return false;
                if (logTimeFilter === 'LAST_MONTH' && (itemTime < startOfLastMonth || itemTime > endOfLastMonth)) return false;

                // Text search query
                if (logSearchQuery.trim()) {
                  const q = logSearchQuery.toLowerCase().trim();
                  const matchSubject = item.subject ? item.subject.toLowerCase().includes(q) : false;
                  const matchSender = item.senderDisplayName ? item.senderDisplayName.toLowerCase().includes(q) : false;
                  const matchFrom = item.fromAddress ? item.fromAddress.toLowerCase().includes(q) : false;
                  if (!matchSubject && !matchSender && !matchFrom) return false;
                }

                return true;
              });

              if (filtered.length === 0) {
                return (
                  <View style={[styles.logEmptyCard, isDark && styles.logEmptyCardDark]}>
                    <View style={[styles.logEmptyIconBox, isDark && styles.logEmptyIconBoxDark]}>
                      <History size={24} color="#64748B" strokeWidth={2} />
                    </View>
                    <Text style={[styles.logEmptyTitle, isDark && styles.textWhite]}>
                      {logSearchQuery.trim() || logTimeFilter !== 'ALL' || logFilter !== 'ALL'
                        ? 'No Matching Logs Found'
                        : 'No Email Logs Recorded'}
                    </Text>
                    <Text style={[styles.logEmptySub, isDark && { color: '#94A3B8' }]}>
                      {logSearchQuery.trim() || logTimeFilter !== 'ALL' || logFilter !== 'ALL'
                        ? 'Try clearing the search query or adjusting your filters.'
                        : 'Every broadcast email dispatched through GymDeck MTA relay will be verified and logged here.'}
                    </Text>
                    {(logSearchQuery.trim().length > 0 || logTimeFilter !== 'ALL' || logFilter !== 'ALL') && (
                      <TouchableOpacity
                        style={styles.logResetFilterBtn}
                        onPress={() => {
                          setLogSearchQuery('');
                          setLogFilter('ALL');
                          setLogTimeFilter('ALL');
                          setLogCurrentPage(1);
                        }}
                      >
                        <Text style={styles.logResetFilterBtnText}>Reset All Filters</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }

              // Pagination
              const LOGS_PER_PAGE = 10;
              const totalItems = filtered.length;
              const totalPages = Math.ceil(totalItems / LOGS_PER_PAGE);
              const validPage = Math.min(Math.max(logCurrentPage, 1), totalPages);
              const startIndex = (validPage - 1) * LOGS_PER_PAGE;
              const paginatedItems = filtered.slice(startIndex, startIndex + LOGS_PER_PAGE);

              return (
                <View>
                  <View style={styles.logFeedList}>
                    {paginatedItems.map((item) => {
                      const status = (item.status || 'COMPLETED').toUpperCase();
                      const isSuccess = status === 'COMPLETED';
                      const isSendingStatus = status === 'SENDING';
                      const isFailed = status === 'BOUNCED' || status === 'FAILED';

                      const statusBg = isSuccess ? '#ECFDF5' : isFailed ? '#FEF2F2' : '#EEF2FF';
                      const statusBorder = isSuccess ? '#A7F3D0' : isFailed ? '#FECACA' : '#C7D2FE';
                      const statusText = isSuccess ? '#059669' : isFailed ? '#DC2626' : '#4F46E5';
                      const StatusIcon = isSuccess ? CheckCheck : isFailed ? AlertCircle : Clock;

                      const dateObj = new Date(item.createdAt);
                      const formattedDate = dateObj.toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                      const formattedTime = dateObj.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      const statusDotColor = isSuccess ? '#10B981' : isFailed ? '#EF4444' : '#6366F1';

                      return (
                        <View
                          key={item.id}
                          style={[styles.logCleanCard, isDark && styles.logCleanCardDark]}
                        >
                          {/* Card Header Row: Icon + Subject/Campaign + Minimal Status Indicator */}
                          <View style={styles.logCleanHeaderRow}>
                            <View style={[styles.logCleanAvatarBox, isDark && styles.logCleanAvatarBoxDark]}>
                              <Mail size={15} color={isDark ? '#E2E8F0' : '#1E293B'} strokeWidth={2.2} />
                            </View>

                            <View style={styles.logCleanHeaderTextContainer}>
                              <Text style={[styles.logCleanIntentTag, isDark && styles.textWhite]} numberOfLines={1}>
                                {item.subject || 'UNTITLED BROADCAST'}
                              </Text>
                              <View style={styles.logCleanMetaRow}>
                                <Clock size={10} color="#94A3B8" strokeWidth={2} />
                                <Text style={styles.logCleanTimestamp}>
                                  {formattedDate} • {formattedTime}
                                </Text>
                              </View>
                            </View>

                            {/* Official Clean Status Indicator (No loud colorful tabs) */}
                            <View style={[styles.logCleanStatusBadge, isDark && styles.logCleanStatusBadgeDark]}>
                              <View style={[styles.logCleanStatusDot, { backgroundColor: statusDotColor }]} />
                              <Text style={[styles.logCleanStatusText, isDark && styles.textWhite]}>
                                {status}
                              </Text>
                            </View>
                          </View>

                          {/* Sender Identity Info */}
                          <View style={[styles.logCleanContentBox, isDark && styles.logCleanContentBoxDark]}>
                            <Text style={[styles.logCleanSenderText, isDark && { color: '#94A3B8' }]} numberOfLines={1}>
                              From: <Text style={{ fontWeight: '700', color: isDark ? '#E2E8F0' : '#0F172A' }}>{item.senderDisplayName || 'GymDeck'}</Text> &lt;{item.fromAddress || 'notifications@mail.epic-studio.in'}&gt;
                            </Text>
                          </View>

                          {/* Footer Telemetry Row: Recipient count & Inspect Button */}
                          <View style={styles.logCleanFooterRow}>
                            <View style={styles.logCleanFooterLeft}>
                              <View style={styles.logRecipientDataRow}>
                                <Users size={12} color="#64748B" />
                                <Text style={styles.logRecipientDataText} numberOfLines={1}>
                                  Targeted: <Text style={{ fontWeight: '700', color: isDark ? '#E2E8F0' : '#0F172A' }}>{item.recipientCount} {item.recipientCount === 1 ? 'member' : 'members'}</Text>
                                </Text>
                              </View>
                            </View>

                            <View style={styles.logCleanFooterRight}>
                              <TouchableOpacity
                                style={styles.logInspectActionBtn}
                                onPress={() => handleInspect(item.id)}
                                activeOpacity={0.8}
                              >
                                <Eye size={12} color="#FFFFFF" strokeWidth={2.2} />
                                <Text style={styles.logInspectActionBtnText}>
                                  Inspect
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* Pagination Bar */}
                  {totalPages > 1 && (
                    <View style={styles.paginationContainer}>
                      <TouchableOpacity
                        style={[
                          styles.pageBtn,
                          validPage <= 1 && styles.pageBtnDisabled,
                          { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
                        ]}
                        onPress={() => setLogCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={validPage <= 1}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.pageBtnText,
                            { color: validPage <= 1 ? (isDark ? '#475569' : '#94A3B8') : (isDark ? '#F8FAFC' : '#0F172A') },
                          ]}
                        >
                          ← Prev
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.pageInfoBox}>
                        <Text style={[styles.pageInfoText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                          Page <Text style={{ fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A' }}>{String(validPage).padStart(2, '0')}</Text>/<Text style={{ fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A' }}>{String(totalPages).padStart(2, '0')}</Text>
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.pageBtn,
                          validPage >= totalPages && styles.pageBtnDisabled,
                          { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
                        ]}
                        onPress={() => setLogCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={validPage >= totalPages}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.pageBtnText,
                            { color: validPage >= totalPages ? (isDark ? '#475569' : '#94A3B8') : (isDark ? '#F8FAFC' : '#0F172A') },
                          ]}
                        >
                          Next →
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        ) : (
          /* ── TAB 2: AUTOMATIONS ── */
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
                      <Pattern id="autoEmailGrid" width="16" height="16" patternUnits="userSpaceOnUse">
                        <Path
                          d="M 16 0 L 0 0 0 16"
                          fill="none"
                          stroke="#94A3B8"
                          strokeWidth="1"
                          opacity={isDark ? 0.08 : 0.12}
                        />
                      </Pattern>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#autoEmailGrid)" />
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
                    onValueChange={(newVal) => {
                      setSavingRuleId('master');
                      setTimeout(() => {
                        setAutoRules((prev) => prev.map((r) => ({ ...r, enabled: newVal })));
                        setSavingRuleId(null);
                      }, 250);
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
                    desc: 'Timely reminders before plan expiration with renewal link',
                  },
                  {
                    id: 'auto-due',
                    icon: Receipt,
                    title: 'Payment & Fee Receipts',
                    desc: 'Instant digital invoice and fee receipt sent upon payment',
                  },
                  {
                    id: 'auto-checkin',
                    icon: CalendarCheck,
                    title: 'Attendance Check-In',
                    desc: 'Instant facility visit confirmation to members',
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
                          onValueChange={() => {
                            setSavingRuleId(item.id);
                            setTimeout(() => {
                              setAutoRules((prev) =>
                                prev.map((r) => (r.id === item.id ? { ...r, enabled: !rule.enabled } : r))
                              );
                              setSavingRuleId(null);
                            }, 250);
                          }}
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
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Svg width="100%" height="100%">
                  <Defs>
                    <LinearGradient id="emailFaqFadeGrad" x1="0" y1="0" x2="0" y2="1">
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
                  <Rect width="100%" height="100%" fill="url(#emailFaqFadeGrad)" rx={14} />
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
                  a: 'Every notification is triggered instantly by GymDeck system events (such as biometric/manual check-in, fee payments, and upcoming expiration cycles). Messages are transmitted in the background through your verified GymDeck Mail relay without requiring manual intervention.',
                },
                {
                  id: 'faq-2',
                  q: 'Are payment receipts and expiration warnings sent automatically?',
                  a: 'Yes. Upon receiving a member payment, an itemized GST-ready digital receipt is generated and dispatched immediately to the member’s email address. Expiration reminders are scheduled ahead of membership maturity to maximize renewals.',
                },
                {
                  id: 'faq-3',
                  q: 'How is member privacy and consent maintained?',
                  a: 'GymDeck strictly honors member communication preferences. If a member requests not to receive notifications, their profile delivery flag is respected and automated promotional messages will not be sent.',
                },
                {
                  id: 'faq-4',
                  q: 'Are there extra message fees or third-party API costs?',
                  a: 'No. Automations run directly through your official verified gym domain via GymDeck Mail MTA with zero third-party per-message fees or subscription surcharges.',
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
      </View>

      {/* ─── CONFIRMATION DISPATCH BOTTOM-SHEET MODAL ─── */}
      <Modal visible={showConfirmModal} transparent animationType="none" onRequestClose={closeConfirmModal}>
        <View style={styles.confirmModalRoot}>
          {/* Smooth Fade-Only Dim Backdrop */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.confirmModalBackdrop,
              { opacity: confirmBackdropAnim },
            ]}
          >
            <TouchableWithoutFeedback onPress={closeConfirmModal}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
          </Animated.View>

          {/* Bottom Sheet Card sliding up from bottom */}
          <Animated.View
            style={[
              styles.confirmSheetContainer,
              isDark && styles.confirmSheetContainerDark,
              { transform: [{ translateY: confirmSheetTranslateY }] },
            ]}
          >
            {/* Pull indicator */}
            <View style={styles.confirmPullIndicatorWrapper}>
              <View style={[styles.confirmPullIndicator, isDark && { backgroundColor: '#334155' }]} />
            </View>

            {/* Content Switcher based on dispatchModalStep */}
            {dispatchModalStep === 'review' && (
              <>
                {/* Header */}
                <View style={styles.confirmHeaderRow}>
                  <View style={styles.confirmHeaderLeft}>
                    <View style={[styles.confirmBadgeIcon, isDark && { backgroundColor: '#1E1B4B' }]}>
                      <Send size={15} color="#6366F1" strokeWidth={2.5} />
                    </View>
                    <View>
                      <Text style={[styles.confirmTitle, isDark && styles.textWhite]}>Confirm Dispatch</Text>
                      <Text style={[styles.confirmSubtitle, isDark && { color: '#94A3B8' }]}>
                        Review recipient scope before sending
                      </Text>
                    </View>
                  </View>

                  {/* Square close button with 5px curved corners */}
                  <TouchableOpacity
                    onPress={closeConfirmModal}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[styles.confirmSquareCloseBtn, isDark && styles.confirmSquareCloseBtnDark]}
                    activeOpacity={0.7}
                  >
                    <X size={14} color={isDark ? '#94A3B8' : '#64748B'} strokeWidth={2.4} />
                  </TouchableOpacity>
                </View>

                {/* Clean KPI / Scope Summary Card */}
                <View style={[styles.confirmSummaryCard, isDark && styles.confirmSummaryCardDark]}>
                  <View style={styles.confirmSummaryRow}>
                    <View style={styles.confirmSummaryItem}>
                      <Text style={[styles.confirmSummaryLabel, isDark && { color: '#94A3B8' }]}>AUDIENCE</Text>
                      <View style={styles.confirmValueRow}>
                        <Users size={13} color={isDark ? '#60A5FA' : '#2563EB'} strokeWidth={2.2} />
                        <Text style={[styles.confirmSummaryValue, isDark && styles.textWhite]}>
                          {selectedMemberIds.length} <Text style={{ fontSize: 11, fontWeight: '500' }}>members</Text>
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.confirmSummaryDivider, isDark && { backgroundColor: '#334155' }]} />
                    <View style={styles.confirmSummaryItem}>
                      <Text style={[styles.confirmSummaryLabel, isDark && { color: '#94A3B8' }]}>QUOTA BALANCE</Text>
                      <View style={styles.confirmValueRow}>
                        <ShieldCheck size={13} color="#10B981" strokeWidth={2.2} />
                        <Text style={[styles.confirmSummaryValue, { color: '#10B981' }]}>
                          {Math.max(0, quota.remainingQuota - selectedMemberIds.length)} <Text style={{ fontSize: 11, fontWeight: '500', color: isDark ? '#94A3B8' : '#64748B' }}>left</Text>
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Subject Row */}
                  <View style={[styles.confirmSubjectRow, isDark && { borderTopColor: '#334155' }]}>
                    <Text style={[styles.confirmSubjectLabel, isDark && { color: '#94A3B8' }]}>Subject</Text>
                    <Text style={[styles.confirmSubjectText, isDark && styles.textWhite]} numberOfLines={1}>
                      {subject}
                    </Text>
                  </View>
                </View>

                {/* Action Row */}
                <View style={styles.confirmActionRow}>
                  <TouchableOpacity
                    style={[styles.confirmCancelBtn, isDark && styles.confirmCancelBtnDark]}
                    onPress={closeConfirmModal}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.confirmCancelBtnText, isDark && styles.textWhite]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmSendBtn}
                    onPress={handleConfirmDispatch}
                    disabled={isSending}
                    activeOpacity={0.85}
                  >
                    <Send size={13} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.confirmSendBtnText}>Dispatch Broadcast</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* In-Flight Sending State */}
            {dispatchModalStep === 'sending' && (
              <View style={styles.dispatchStatusContainer}>
                <View style={[styles.dispatchLoadingIconBox, isDark && styles.dispatchLoadingIconBoxDark]}>
                  <ActivityIndicator size="large" color="#10B981" />
                </View>
                <Text style={[styles.dispatchStatusTitle, isDark && styles.textWhite]}>
                  Queueing Broadcast...
                </Text>
                <Text style={[styles.dispatchStatusSubtitle, isDark && { color: '#94A3B8' }]}>
                  Encrypting message packets & dispatching to {dispatchedCount} member {dispatchedCount === 1 ? 'inbox' : 'inboxes'}
                </Text>
              </View>
            )}

            {/* Success State - Emerald Green Aesthetics */}
            {dispatchModalStep === 'success' && (
              <View style={styles.dispatchStatusContainer}>
                {/* Square close button in corner */}
                <View style={styles.dispatchModalTopBar}>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity
                    onPress={() => {
                      closeConfirmModal();
                      setActiveTab('history');
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[styles.confirmSquareCloseBtn, isDark && styles.confirmSquareCloseBtnDark]}
                    activeOpacity={0.7}
                  >
                    <X size={14} color={isDark ? '#94A3B8' : '#64748B'} strokeWidth={2.4} />
                  </TouchableOpacity>
                </View>

                {/* Emerald Success Icon Badge */}
                <View style={[styles.dispatchSuccessBadge, isDark && styles.dispatchSuccessBadgeDark]}>
                  <CheckCircle2 size={32} color="#059669" strokeWidth={2.4} />
                </View>

                <Text style={[styles.dispatchSuccessTitle, isDark && { color: '#34D399' }]}>
                  Successfully Queued
                </Text>
                <Text style={[styles.dispatchSuccessSubtitle, isDark && { color: '#A7F3D0' }]}>
                  {dispatchStatusMsg || `Broadcast has been safely scheduled and relayed to ${dispatchedCount} members.`}
                </Text>

                {/* Highlight Pill */}
                <View style={[styles.dispatchSuccessPill, isDark && styles.dispatchSuccessPillDark]}>
                  <ShieldCheck size={14} color="#059669" strokeWidth={2.2} />
                  <Text style={[styles.dispatchSuccessPillText, isDark && { color: '#6EE7B7' }]}>
                    Relay Verified · Delivery In Progress
                  </Text>
                </View>

                {/* Dismiss Button */}
                <TouchableOpacity
                  style={[styles.dispatchSuccessDoneBtn, isDark && styles.dispatchSuccessDoneBtnDark]}
                  onPress={() => {
                    closeConfirmModal();
                    setActiveTab('history');
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.dispatchSuccessDoneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Error State */}
            {dispatchModalStep === 'error' && (
              <View style={styles.dispatchStatusContainer}>
                <View style={styles.dispatchModalTopBar}>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity
                    onPress={closeConfirmModal}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[styles.confirmSquareCloseBtn, isDark && styles.confirmSquareCloseBtnDark]}
                    activeOpacity={0.7}
                  >
                    <X size={14} color={isDark ? '#94A3B8' : '#64748B'} strokeWidth={2.4} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.dispatchErrorBadge, isDark && styles.dispatchErrorBadgeDark]}>
                  <AlertCircle size={32} color="#DC2626" strokeWidth={2.4} />
                </View>

                <Text style={[styles.dispatchErrorTitle, isDark && { color: '#F87171' }]}>
                  Dispatch Failed
                </Text>
                <Text style={[styles.dispatchErrorSubtitle, isDark && { color: '#94A3B8' }]}>
                  {dispatchStatusMsg}
                </Text>

                <View style={styles.confirmActionRow}>
                  <TouchableOpacity
                    style={[styles.confirmCancelBtn, isDark && styles.confirmCancelBtnDark]}
                    onPress={closeConfirmModal}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.confirmCancelBtnText, isDark && styles.textWhite]}>Close</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmSendBtn}
                    onPress={handleConfirmDispatch}
                    activeOpacity={0.85}
                  >
                    <RefreshCw size={13} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.confirmSendBtnText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* ─── INSPECTION MODAL (Smooth Bottom-to-Top Animation) ─── */}
      <Modal visible={showInspectModal} transparent animationType="none" onRequestClose={closeInspectModal}>
        <View style={styles.inspectModalRoot}>
          {/* Backdrop with fade animation */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.inspectModalBackdrop,
              { opacity: inspectBackdropAnim },
            ]}
          >
            <TouchableWithoutFeedback onPress={closeInspectModal}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
          </Animated.View>

          {/* Bottom Sheet Card sliding up smoothly */}
          <Animated.View
            style={[
              styles.inspectSheetContainer,
              isDark && styles.inspectSheetContainerDark,
              { transform: [{ translateY: inspectSheetTranslateY }] },
            ]}
          >
            {/* Pull indicator */}
            <View style={styles.confirmPullIndicatorWrapper}>
              <View style={[styles.confirmPullIndicator, isDark && { backgroundColor: '#334155' }]} />
            </View>

            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.confirmBadgeIcon, isDark && { backgroundColor: '#1E293B' }]}>
                  <Eye size={15} color={isDark ? '#E2E8F0' : '#0F172A'} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, isDark && styles.textWhite]}>Delivery Inspection</Text>
                  <Text style={[styles.modalSubSubject, isDark && { color: '#94A3B8' }]} numberOfLines={1}>
                    {inspectData?.message?.subject || 'Message Telemetry'}
                  </Text>
                </View>
              </View>

              {/* Square close button with 5px curved corners */}
              <TouchableOpacity
                onPress={closeInspectModal}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[styles.confirmSquareCloseBtn, isDark && styles.confirmSquareCloseBtnDark]}
                activeOpacity={0.7}
              >
                <X size={14} color={isDark ? '#94A3B8' : '#64748B'} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            {loadingInspect ? (
              <View style={styles.centerLoadingSmall}>
                <ActivityIndicator size="small" color="#0F172A" />
                <Text style={[styles.loadingTextSmall, isDark && { color: '#94A3B8' }]}>
                  Loading delivery breakdown...
                </Text>
              </View>
            ) : (
              <View style={styles.inspectContent}>
                {/* 3 Telemetry Tiles (Official, Clean & Non-Clumsy) */}
                <View style={styles.inspectStatsGrid}>
                  <View style={[styles.inspectStatCard, isDark && styles.inspectStatCardDark]}>
                    <Text style={[styles.inspectStatLabel, isDark && { color: '#94A3B8' }]}>TOTAL TARGETED</Text>
                    <Text style={[styles.inspectStatValue, isDark && styles.textWhite]}>
                      {inspectData?.message?.recipientCount ?? 0}
                    </Text>
                  </View>
                  <View style={[styles.inspectStatCard, isDark && styles.inspectStatCardDark]}>
                    <Text style={[styles.inspectStatLabel, isDark && { color: '#94A3B8' }]}>DELIVERED</Text>
                    <Text style={[styles.inspectStatValue, isDark && styles.textWhite]}>
                      {inspectData?.message?.deliveredCount ?? 0}
                    </Text>
                  </View>
                  <View style={[styles.inspectStatCard, isDark && styles.inspectStatCardDark]}>
                    <Text style={[styles.inspectStatLabel, isDark && { color: '#94A3B8' }]}>BOUNCED</Text>
                    <Text style={[styles.inspectStatValue, isDark && styles.textWhite]}>
                      {inspectData?.message?.bouncedCount ?? 0}
                    </Text>
                  </View>
                </View>

                {/* Recipient Details List */}
                <Text style={[styles.inspectListTitle, isDark && styles.textWhite]}>
                  RECIPIENT BREAKDOWN
                </Text>
                <ScrollView style={[styles.inspectListScroll, isDark && styles.inspectListScrollDark]}>
                  {inspectData?.recipients && inspectData.recipients.length > 0 ? (
                    inspectData.recipients.map((rec) => {
                      const isDelivered = rec.deliveryStatus === 'DELIVERED';
                      const isBounced = rec.deliveryStatus === 'BOUNCED';
                      const recDotColor = isDelivered ? '#10B981' : isBounced ? '#EF4444' : '#64748B';

                      return (
                        <View
                          key={rec.id}
                          style={[styles.inspectRecipientRow, isDark && styles.inspectRecipientRowDark]}
                        >
                          <View style={styles.inspectRecipientLeft}>
                            <Text style={[styles.inspectRecipientName, isDark && styles.textWhite]} numberOfLines={1}>
                              {rec.recipientName || 'Member'}
                            </Text>
                            <Text style={[styles.inspectRecipientEmail, isDark && { color: '#94A3B8' }]} numberOfLines={1}>
                              {rec.recipientEmail}
                            </Text>
                          </View>
                          {/* Official Clean Status Indicator (Dot + Clean Monochromatic Badge) */}
                          <View style={[styles.deliveryStatusBadge, isDark && styles.deliveryStatusBadgeDark]}>
                            <View style={[styles.logCleanStatusDot, { backgroundColor: recDotColor }]} />
                            <Text style={[styles.deliveryStatusText, isDark && styles.textWhite]}>
                              {rec.deliveryStatus}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={[styles.noRecipientsText, isDark && { color: '#94A3B8' }, { marginVertical: 14 }]}>
                      No recipient delivery telemetry found.
                    </Text>
                  )}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalCloseButtonBottom}
              onPress={closeInspectModal}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCloseButtonBottomText}>Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* ─── BRAND SIGNATURE FOOTER ─── */}
      <View style={{ paddingBottom: layout.bottomNavHeight + 64 }}>
        <BrandSignatureFooter isDark={isDark} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  floatingToastSuccess: {
    backgroundColor: '#064E3B',
    borderColor: '#059669',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  floatingToastError: {
    backgroundColor: '#450A0A',
    borderColor: '#DC2626',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  floatingToastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },

  /* 1. Hero Card Styles */
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    marginBottom: 14,
  },
  heroCardOuterWrapper: {
    position: 'relative',
  },
  heroTopCutoutWrapper: {
    position: 'absolute',
    top: -1,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
    elevation: 10,
  },
  heroTopCutoutNotch: {
    width: 190,
    height: 10,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  indigoHeroCard: {
    borderRadius: 18,
    position: 'relative',
    paddingHorizontal: 16,
    paddingVertical: 16,
    overflow: 'hidden',
    backgroundColor: '#3730A3',
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
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
  brandLogoBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    color: '#FFFFFF',
  },
  heroContent: {
    marginTop: 12,
    marginBottom: 14,
    zIndex: 2,
  },
  heroMainTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  heroSubText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 3,
    lineHeight: 16,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    zIndex: 2,
  },
  heroSenderAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  heroSenderAddressText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    flexShrink: 1,
  },
  heroRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    flexShrink: 0,
  },
  heroRefreshText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  shrinkZero: {
    flexShrink: 0,
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

  /* 3. Sub Tabs */
  subTabsContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 14,
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
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  subTabItemActive: {
    backgroundColor: '#0F172A',
  },
  subTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    flexShrink: 1,
  },
  subTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* 4. Workspace Body & Cards */
  workspaceBody: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  tabContent: {
    gap: 10,
  },
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
    maxWidth: 160,
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
    flexShrink: 1,
  },
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
  charCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },

  /* Dropdown Menus */
  dropdownMenu: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  dropdownMenuDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownMenuItemDark: {
    borderBottomColor: '#1E293B',
  },
  dropdownMenuItemActive: {
    backgroundColor: '#F1F5F9',
  },
  dropdownMenuItemActiveDark: {
    backgroundColor: '#1E293B',
  },
  dropdownMenuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownMenuIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownMenuIconBoxDark: {
    backgroundColor: '#1E293B',
  },
  dropdownMenuItemTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  dropdownMenuItemDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  segmentMenuItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  /* Search & Member Directory */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    height: 38,
    marginTop: 10,
  },
  searchBoxDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    fontSize: 11.5,
    padding: 0,
    fontWeight: '500',
  },
  recipientListCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    padding: 10,
  },
  recipientListCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  recipientListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  recipientListTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  recipientActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recipientActionLink: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },
  dividerPill: {
    fontSize: 11,
  },
  recipientClearLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  memberItemsContainer: {
    marginTop: 4,
    gap: 4,
  },
  memberRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
  },
  memberRowItemDark: {
    backgroundColor: 'transparent',
  },
  memberRowItemActive: {
    backgroundColor: '#F1F5F9',
  },
  memberRowItemActiveDark: {
    backgroundColor: '#1E293B',
  },
  memberInfoCol: {
    flex: 1,
    paddingRight: 8,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberNameText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  memberStatusBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
  },
  memberEmailText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  checkboxSquare: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSquareActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  moreRecipientsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 4,
  },
  noRecipientsBox: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noRecipientsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },

  /* Form Fields */
  fieldSectionLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#64748B',
    marginTop: 10,
    marginBottom: 4,
  },
  subjectTextInput: {
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '700',
  },
  subjectTextInputDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    color: '#FFFFFF',
  },
  tokensWrapper: {
    marginTop: 8,
  },
  tokensHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  tokensLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#64748B',
  },
  tokensScroll: {
    gap: 6,
  },
  tokenChipPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tokenChipPillDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  tokenChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  editorWrap: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    padding: 10,
  },
  editorWrapDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  editorInput: {
    minHeight: 110,
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: '500',
    padding: 0,
  },

  /* Preview Card */
  previewContentCard: {
    paddingBottom: 12,
  },
  previewRecipientPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  previewRecipientPillDark: {
    backgroundColor: '#1E293B',
  },
  previewTargetText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  previewTargetTextDark: {
    color: '#94A3B8',
  },
  previewTargetHighlight: {
    fontWeight: '800',
    color: '#0284C7',
  },
  envelopeCanvas: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    overflow: 'hidden',
  },
  envelopeCanvasDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  envelopeHeader: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  envelopeHeaderDark: {
    backgroundColor: '#1E293B',
    borderBottomColor: '#334155',
  },
  envelopeSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  envelopeSenderAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelopeSenderInitial: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  envelopeSenderMeta: {
    flex: 1,
  },
  envelopeSenderName: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  envelopeFromEmail: {
    fontSize: 9,
    color: '#94A3B8',
  },
  envelopeTimeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  envelopeSubjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  envelopeSubjectTag: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  envelopeSubjectText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  envelopeBodyContainer: {
    padding: 10,
  },
  envelopeBodyText: {
    fontSize: 11.5,
    lineHeight: 18,
    fontWeight: '500',
  },
  envelopeFooter: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: '#0F172A',
    backgroundColor: '#0A0F1D',
  },
  envelopeFooterDark: {
    backgroundColor: '#030712',
    borderTopColor: '#111827',
  },
  envelopeVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  envelopeVerifiedText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.1,
  },

  /* Dispatch Button */
  dispatchBtn: {
    backgroundColor: '#0F172A',
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  dispatchBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  dispatchBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  /* Executive Dispatch Logs & Audit Hero Card */
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

  /* Redesigned Dispatch Logs & Audit KPI Strip */
  logKpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  logKpiRowDark: {
    borderColor: '#1E293B',
  },
  logKpiItem: {
    flex: 1,
    flexBasis: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  logKpiDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  logKpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  logKpiValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginTop: 2,
    textAlign: 'center',
  },
  logKpiSub: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 1,
    textAlign: 'center',
  },
  permDividerDark: {
    borderColor: '#1E293B',
  },

  /* Search & Dropdown Controls */
  logControlsSection: {
    gap: 10,
    marginBottom: 14,
    zIndex: 20,
    width: '100%',
  },
  logSearchAndFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  logSearchBox: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 40,
  },
  logSearchBoxDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  logSearchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 11.5,
    color: '#0F172A',
    fontWeight: '500',
    padding: 0,
  },
  logDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    height: 40,
    width: 96,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logDropdownBtnDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  logDropdownBtnActive: {
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
  },
  logDropdownBtnText: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    textAlign: 'left',
  },
  logDropdownBtnTextActive: {
    color: '#0284C7',
  },
  logDropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 4,
  },
  logDropdownMenuDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  logDropdownMenuHeader: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logDropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logDropdownOptionSelected: {
    backgroundColor: '#EEF2FF',
  },
  logDropdownOptionSelectedDark: {
    backgroundColor: '#1E293B',
  },
  logDropdownOptionText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  logDropdownOptionTextSelected: {
    fontWeight: '800',
    color: '#4F46E5',
  },
  logDropdownBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  logDropdownBadgeSelected: {
    backgroundColor: '#E0E7FF',
  },
  logDropdownBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
  },
  logDropdownBadgeTextSelected: {
    color: '#4F46E5',
  },

  /* List Header */
  logListHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  logListHeaderTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  logRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
  },
  logRefreshBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#000000',
  },

  /* Clean Professional Log Card */
  logFeedList: {
    gap: 10,
    marginBottom: 14,
  },
  logCleanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  logCleanCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  logCleanHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  logCleanAvatarBox: {
    width: 32,
    height: 32,
    borderRadius: 7,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logCleanAvatarBoxDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  logCleanHeaderTextContainer: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  logCleanIntentTag: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  logCleanMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logCleanTimestamp: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
  logCleanStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignSelf: 'flex-start',
  },
  logCleanStatusBadgeDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  logCleanStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  logCleanStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#334155',
  },
  logCleanContentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginBottom: 10,
  },
  logCleanContentBoxDark: {
    backgroundColor: '#080E14',
    borderColor: '#1E293B',
  },
  logCleanSenderText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  logCleanFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  logCleanFooterLeft: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  logRecipientDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logRecipientDataText: {
    fontSize: 11,
    color: '#64748B',
  },
  logCleanFooterRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logInspectActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#000000',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logInspectActionBtnDark: {
    backgroundColor: '#000000',
  },
  logInspectActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Empty State */
  logEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logEmptyCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  logEmptyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logEmptyIconBoxDark: {
    backgroundColor: '#1E293B',
  },
  logEmptyTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  logEmptySub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },
  logResetFilterBtn: {
    marginTop: 12,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logResetFilterBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },

  /* Pagination Bar */
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 16,
    marginBottom: 16,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7.5,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.45,
  },
  pageBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  /* Status pills for inspection modal */
  statusCompletedPill: {
    backgroundColor: '#ECFDF5',
  },
  statusSendingPill: {
    backgroundColor: '#EEF2FF',
  },
  statusBouncedPill: {
    backgroundColor: '#FEF2F2',
  },
  statusDefaultPill: {
    backgroundColor: '#F1F5F9',
  },
  statusCompletedText: {
    color: '#065F46',
  },
  statusSendingText: {
    color: '#4338CA',
  },
  statusBouncedText: {
    color: '#991B1B',
  },
  statusDefaultText: {
    color: '#64748B',
  },

  pageInfoBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageInfoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  autoRuleHeaderCardOuter: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  autoRuleHeaderCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
  },
  autoRuleHeaderCardDark: {
    backgroundColor: '#090D16',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  autoHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  autoHeaderBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#A7F3D0',
  },
  autoStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  autoPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#34D399',
  },
  autoStatusText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#34D399',
  },
  autoRuleHeaderTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 8,
  },
  autoHeaderDesc: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 3,
    lineHeight: 15,
  },
  templatesList: {
    gap: 8,
    marginTop: 6,
  },
  autoRuleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  autoRuleCardDark: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
  },
  autoRuleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoRuleTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  autoRuleBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#EEF2FF',
  },
  autoRuleBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#4F46E5',
  },
  autoRuleDesc: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 14,
  },
  sectionHeadingTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#64748B',
  },
  presetTemplatesGrid: {
    gap: 8,
    marginTop: 6,
  },
  templateCardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 6,
  },
  templateCardItemDark: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
  },
  templateCardItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templateCardItemTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  templateTagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#EEF2FF',
  },
  templateTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F46E5',
  },
  templateSubjectBox: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#F8FAFC',
    padding: 6,
    borderRadius: 6,
    color: '#64748B',
  },
  templateSubjectBoxDark: {
    backgroundColor: '#1E293B',
    color: '#94A3B8',
  },
  templateBodySnippet: {
    fontSize: 11,
    lineHeight: 15,
    color: '#64748B',
  },
  templateApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginTop: 4,
  },
  templateApplyBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  templateApplyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },

  /* Modals */
  confirmModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  confirmModalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  confirmSheetContainer: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 20,
    gap: 12,
  },
  confirmSheetContainerDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  confirmPullIndicatorWrapper: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  confirmPullIndicator: {
    width: 32,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  confirmHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  confirmHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  confirmBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: '#0F172A',
  },
  confirmSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  confirmSquareCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSquareCloseBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  confirmSummaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 12,
    gap: 10,
  },
  confirmSummaryCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  confirmSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmSummaryItem: {
    flex: 1,
  },
  confirmSummaryLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  confirmValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confirmSummaryValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  confirmSummaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  confirmSubjectRow: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  confirmSubjectLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  confirmSubjectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  confirmActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  confirmCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  confirmCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  confirmSendBtn: {
    flex: 1.5,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmSendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Dispatch Modal In-Flight & Result States */
  dispatchStatusContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  dispatchModalTopBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  dispatchLoadingIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dispatchLoadingIconBoxDark: {
    backgroundColor: '#064E3B',
  },
  dispatchStatusTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  dispatchStatusSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  dispatchSuccessBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dispatchSuccessBadgeDark: {
    backgroundColor: '#064E3B',
    borderColor: '#059669',
  },
  dispatchSuccessTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#065F46',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  dispatchSuccessSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#047857',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  dispatchSuccessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  dispatchSuccessPillDark: {
    backgroundColor: '#064E3B',
    borderColor: '#047857',
  },
  dispatchSuccessPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  dispatchSuccessDoneBtn: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  dispatchSuccessDoneBtnDark: {
    backgroundColor: '#10B981',
  },
  dispatchSuccessDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dispatchErrorBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dispatchErrorBadgeDark: {
    backgroundColor: '#450A0A',
    borderColor: '#991B1B',
  },
  dispatchErrorTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  dispatchErrorSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
    marginBottom: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  modalBoxLarge: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  modalBoxDark: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  modalSubSubject: {
    fontSize: 10,
    marginTop: 1,
  },
  modalDetailCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 10,
    gap: 6,
  },
  modalDetailCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalDetailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  modalDetailValue: {
    fontSize: 11,
    fontWeight: '800',
    maxWidth: 180,
  },
  modalQuotaImpact: {
    fontSize: 11,
    fontWeight: '900',
    color: '#D97706',
  },
  modalRemainingValue: {
    fontSize: 11,
    fontWeight: '900',
    color: '#10B981',
  },
  modalDisclaimer: {
    fontSize: 10,
    lineHeight: 14,
    color: '#64748B',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalCancelButton: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonDark: {
    borderColor: '#334155',
  },
  modalCancelButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalConfirmButton: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  /* Inspect Modal Bottom Sheet */
  inspectModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  inspectModalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  inspectSheetContainer: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 20,
    gap: 12,
  },
  inspectSheetContainerDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },

  inspectContent: {
    gap: 10,
  },
  inspectStatsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  inspectStatCard: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inspectStatCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  inspectStatLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  inspectStatValue: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
    color: '#0F172A',
  },
  inspectListTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  inspectListScroll: {
    maxHeight: 180,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inspectListScrollDark: {
    borderColor: '#1E293B',
  },
  inspectRecipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  inspectRecipientRowDark: {
    borderBottomColor: '#1E293B',
  },
  inspectRecipientLeft: {
    flex: 1,
    paddingRight: 8,
  },
  inspectRecipientName: {
    fontSize: 11,
    fontWeight: '700',
  },
  inspectRecipientEmail: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
  },
  deliveryStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  deliveryStatusBadgeDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  deliveryStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.3,
  },
  modalCloseButtonBottom: {
    backgroundColor: '#000000',
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonBottomText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  centerLoadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  centerLoadingSmall: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textMutedDark: {
    color: '#94A3B8',
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
  loadingTextSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
});
