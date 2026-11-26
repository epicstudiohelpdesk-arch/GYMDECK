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
} from 'react-native';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
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
  ArrowRight,
  Layers,
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
import { Avatar } from './ui';
import { BrandSignatureFooter } from './BrandSignatureFooter';

interface EmailHubViewProps {
  isDark?: boolean;
  onClose?: () => void;
}

const TABS = [
  { id: 'compose', label: 'Broadcast', icon: Send },
  { id: 'history', label: 'Ledger & Logs', icon: Clock },
  { id: 'templates', label: 'Templates & Rules', icon: Bookmark },
];

const CAMPAIGN_TYPES = [
  {
    id: 'announcement',
    label: 'Gym Announcement',
    desc: 'Facility updates, holiday hours & notices',
    badge: 'Broadcast',
    icon: Sparkles,
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
  const [activeTab, setActiveTab] = useState<'compose' | 'history' | 'templates'>('compose');

  // Loading & Syncing States
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [overview, setOverview] = useState<EmailOverview | null>(null);
  const [history, setHistory] = useState<EmailRecentMessage[]>([]);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);

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
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [inspectData, setInspectData] = useState<EmailMessageDetails | null>(null);
  const [loadingInspect, setLoadingInspect] = useState(false);

  // Toast / Banners
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

  // Animated Values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const syncSpinAnim = useRef(new Animated.Value(0)).current;

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

  // Fetch Recipient Members Directory
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

      // If user isn't searching, auto-select current segment members
      if (!search.trim()) {
        setSelectedMemberIds(validEmails.map((m) => m.id));
      }
    } catch (err: any) {
      console.warn('Recipient query warning:', err);
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
    setShowConfirmModal(false);

    try {
      await ownerEmailService.sendEmail({
        subject: subject.trim(),
        bodyHtml: messageBody,
        senderDisplayName: senderDisplayName.trim() || undefined,
        replyToAddress: replyToAddress.trim() || undefined,
        recipients: recipientsToSend,
        idempotencyKey: `email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });

      setToastNotice(`Email broadcast successfully queued for ${recipientsToSend.length} members.`);
      setSelectedMemberIds([]);
      setActiveTab('history');
      loadOverviewData();
      loadHistoryLogs();
    } catch (err: any) {
      setToastError(err.message || 'Failed to dispatch email broadcast.');
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
          <Text style={styles.statCaption}>Sent this month</Text>
        </View>

        <View style={[styles.statTile, isDark && styles.statTileDark]}>
          <Text style={styles.statOverline}>DELIVERY RATE</Text>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>
            {overview?.metrics?.totalSentThisMonth && overview.metrics.totalSentThisMonth > 0
              ? `${overview.metrics.successRate}%`
              : '100%'}
          </Text>
          <Text style={styles.statCaption}>MTA confirmed</Text>
        </View>

        <View style={[styles.statTile, isDark && styles.statTileDark]}>
          <Text style={styles.statOverline}>REMAINING QUOTA</Text>
          <Text style={[styles.statNumber, { color: '#4F46E5' }]}>
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
                      color: isDark ? '#E2E8F0' : '#4F46E5',
                      strokeWidth: 2.2,
                    })}
                  </View>
                  <Text style={[styles.intentTriggerLabel, isDark && styles.textWhite]} numberOfLines={1}>
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
                            <Icon size={14} color={active ? '#4F46E5' : isDark ? '#E2E8F0' : '#475569'} strokeWidth={2.2} />
                          </View>
                          <View>
                            <Text
                              style={[
                                styles.dropdownMenuItemTitle,
                                active && { color: '#4F46E5' },
                                isDark && !active && styles.textWhite,
                              ]}
                            >
                              {c.label}
                            </Text>
                            <Text style={styles.dropdownMenuItemDesc}>{c.desc}</Text>
                          </View>
                        </View>
                        {active && <Check size={14} color="#4F46E5" strokeWidth={2.4} />}
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

                <TouchableOpacity
                  style={[styles.intentSelectorTrigger, isDark && styles.intentSelectorTriggerDark]}
                  onPress={() => setShowSegmentDropdown(!showSegmentDropdown)}
                  activeOpacity={0.8}
                >
                  <Users size={13} color={isDark ? '#E2E8F0' : '#4F46E5'} />
                  <Text style={[styles.intentTriggerLabel, isDark && styles.textWhite]}>
                    {activeSegmentObj.label} ({selectedMemberIds.length})
                  </Text>
                  <ChevronDown size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              {/* Segment Dropdown */}
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
                          <Icon size={14} color={active ? '#4F46E5' : isDark ? '#94A3B8' : '#64748B'} strokeWidth={2.2} />
                          <Text
                            style={[
                              styles.segmentMenuItemText,
                              active && { color: '#4F46E5', fontWeight: '800' },
                              isDark && !active && styles.textWhite,
                            ]}
                          >
                            {s.label}
                          </Text>
                        </View>
                        {active && <Check size={14} color="#4F46E5" strokeWidth={2.4} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Member Search Bar */}
              <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
                <Search size={14} color={isDark ? '#64748B' : '#94A3B8'} />
                <TextInput
                  style={[styles.searchInput, isDark && styles.textWhite]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search member name or email..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                  </TouchableOpacity>
                )}
              </View>

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
                            size="sm"
                            style={{ marginRight: 10 }}
                          />
                          <View style={styles.memberInfoCol}>
                            <View style={styles.memberNameRow}>
                              <Text style={[styles.memberNameText, isDark && styles.textWhite]} numberOfLines={1}>
                                {member.fullName}
                              </Text>
                              <Text style={styles.memberStatusBadge}>{member.membershipStatus}</Text>
                            </View>
                            <Text style={[styles.memberEmailText, isDark && { color: '#94A3B8' }]} numberOfLines={1}>
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
                        + {filteredRecipients.length - 5} more recipients selected
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

              {/* Dynamic Personalization Token Chips */}
              <View style={styles.tokensWrapper}>
                <View style={styles.tokensHeader}>
                  <Sparkles size={11} color="#4F46E5" />
                  <Text style={styles.tokensLabel}>INSERT DYNAMIC TAG:</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tokensScroll}>
                  {VARIABLE_TOKENS.map((tokenObj) => (
                    <TouchableOpacity
                      key={tokenObj.token}
                      style={[styles.tokenChipPill, isDark && styles.tokenChipPillDark]}
                      onPress={() => insertToken(tokenObj.token)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tokenChipText, isDark && styles.textWhite]}>
                        +{tokenObj.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

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
                  <Mail size={14} color="#4F46E5" />
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
                    <ShieldCheck size={11} color="#10B981" />
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
                    Review & Dispatch ({selectedMemberIds.length})
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : activeTab === 'history' ? (
          /* ═══════════════════════════════════════════════════════════
             TAB 2: TRANSMISSION LEDGER & AUDIT LOGS
          ═══════════════════════════════════════════════════════════ */
          <View style={styles.tabContent}>
            <View style={styles.ledgerHeaderRow}>
              <View>
                <Text style={[styles.ledgerTitle, isDark && styles.textWhite]}>
                  TRANSMISSION AUDIT LEDGER
                </Text>
                <Text style={[styles.ledgerSubtitle, isDark && { color: '#94A3B8' }]}>
                  Permanent MTA server delivery logs & bounced telemetry
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.ledgerRefreshBtn, isDark && styles.ledgerRefreshBtnDark]}
                onPress={loadHistoryLogs}
                activeOpacity={0.7}
              >
                <RefreshCw size={12} color={isDark ? '#E2E8F0' : '#0F172A'} />
                <Text style={[styles.ledgerRefreshText, isDark && styles.textWhite]}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {history.length > 0 ? (
              <View style={styles.ledgerCardsList}>
                {history.map((msg) => (
                  <View
                    key={msg.id}
                    style={[styles.ledgerCardItem, isDark && styles.ledgerCardItemDark]}
                  >
                    <View style={styles.ledgerCardTop}>
                      <View style={styles.ledgerSubjectCol}>
                        <Text style={[styles.ledgerSubjectText, isDark && styles.textWhite]} numberOfLines={1}>
                          {msg.subject}
                        </Text>
                        <Text style={styles.ledgerTimestamp}>
                          {new Date(msg.createdAt).toLocaleDateString()} • {msg.recipientCount} recipients
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.ledgerStatusPill,
                          msg.status === 'COMPLETED'
                            ? styles.statusCompletedPill
                            : msg.status === 'SENDING'
                            ? styles.statusSendingPill
                            : styles.statusDefaultPill,
                        ]}
                      >
                        <Text
                          style={[
                            styles.ledgerStatusText,
                            msg.status === 'COMPLETED'
                              ? styles.statusCompletedText
                              : msg.status === 'SENDING'
                              ? styles.statusSendingText
                              : styles.statusDefaultText,
                          ]}
                        >
                          {msg.status}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.ledgerCardBottom, isDark && styles.ledgerCardBottomDark]}>
                      <Text style={styles.ledgerSenderEmail} numberOfLines={1}>
                        From: {msg.senderDisplayName || 'GymDeck'} &lt;{msg.fromAddress || 'notifications@mail.epic-studio.in'}&gt;
                      </Text>
                      <TouchableOpacity
                        style={[styles.ledgerInspectBtn, isDark && styles.ledgerInspectBtnDark]}
                        onPress={() => handleInspect(msg.id)}
                        activeOpacity={0.7}
                      >
                        <Eye size={12} color={isDark ? '#E2E8F0' : '#4F46E5'} />
                        <Text style={[styles.ledgerInspectBtnText, isDark && styles.textWhite]}>Inspect</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyLedgerBox}>
                <Inbox size={26} color={isDark ? '#475569' : '#94A3B8'} />
                <Text style={[styles.emptyLedgerTitle, isDark && styles.textWhite]}>
                  No sent email records found
                </Text>
                <Text style={[styles.emptyLedgerDesc, isDark && { color: '#64748B' }]}>
                  Dispatched broadcasts will automatically appear here with full delivery verification.
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* ═══════════════════════════════════════════════════════════
             TAB 3: TEMPLATES & AUTOMATIONS
          ═══════════════════════════════════════════════════════════ */
          <View style={styles.tabContent}>
            {/* Executive Automated Rules Banner */}
            <View style={styles.autoHeaderCardOuter}>
              <View style={[styles.autoHeaderCard, isDark && styles.autoHeaderCardDark]}>
                <View style={styles.autoHeaderTopRow}>
                  <View style={styles.autoHeaderBadge}>
                    <Zap size={11} color="#A7F3D0" />
                    <Text style={styles.autoHeaderBadgeText}>ENTERPRISE AUTONOMY</Text>
                  </View>
                  <View style={styles.autoStatusPill}>
                    <View style={styles.autoPulseDot} />
                    <Text style={styles.autoStatusText}>ENGINE ACTIVE</Text>
                  </View>
                </View>
                <Text style={styles.autoHeaderTitle}>Managed Transactional Triggers</Text>
                <Text style={styles.autoHeaderDesc}>
                  GymDeck automatically schedules and dispatches emails on critical membership lifecycle events.
                </Text>
              </View>
            </View>

            {/* Standard Automation Rules Cards */}
            <View style={styles.templatesList}>
              {[
                {
                  id: 'auto-renewal',
                  title: 'Automated 3-Day Expiry Notice',
                  desc: 'Triggers automatically 3 days prior to plan expiry with renewal instructions',
                  badge: 'Retention',
                  enabled: true,
                },
                {
                  id: 'auto-receipt',
                  title: 'Instant Fee Receipt on Payment',
                  desc: 'Dispatches GST compliant tax invoice immediately when fees are collected',
                  badge: 'Finance',
                  enabled: true,
                },
                {
                  id: 'auto-welcome',
                  title: 'New Member Induction Welcome',
                  desc: 'Sends gym onboarding kit, locker rules & guidelines on registration',
                  badge: 'Onboarding',
                  enabled: true,
                },
              ].map((rule) => (
                <View
                  key={rule.id}
                  style={[styles.autoRuleCard, isDark && styles.autoRuleCardDark]}
                >
                  <View style={styles.autoRuleTop}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.autoRuleTitle, isDark && styles.textWhite]}>
                          {rule.title}
                        </Text>
                        <View style={styles.autoRuleBadge}>
                          <Text style={styles.autoRuleBadgeText}>{rule.badge}</Text>
                        </View>
                      </View>
                      <Text style={[styles.autoRuleDesc, isDark && { color: '#94A3B8' }]}>
                        {rule.desc}
                      </Text>
                    </View>
                    <Switch
                      value={rule.enabled}
                      onValueChange={() => {}}
                      trackColor={{ false: '#94A3B8', true: '#4F46E5' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* Standard Pre-built Templates Library */}
            <Text style={[styles.sectionHeadingTitle, isDark && styles.textWhite, { marginTop: 14 }]}>
              STANDARD OPERATIONAL TEMPLATES
            </Text>
            <View style={styles.presetTemplatesGrid}>
              {CAMPAIGN_TYPES.slice(0, 4).map((tmpl) => (
                <View
                  key={tmpl.id}
                  style={[styles.templateCardItem, isDark && styles.templateCardItemDark]}
                >
                  <View style={styles.templateCardItemHeader}>
                    <Text style={[styles.templateCardItemTitle, isDark && styles.textWhite]}>
                      {tmpl.label}
                    </Text>
                    <View style={styles.templateTagPill}>
                      <Text style={styles.templateTagText}>{tmpl.badge}</Text>
                    </View>
                  </View>
                  <Text style={[styles.templateSubjectBox, isDark && styles.templateSubjectBoxDark]} numberOfLines={1}>
                    Subject: {tmpl.subject}
                  </Text>
                  <Text style={[styles.templateBodySnippet, isDark && { color: '#94A3B8' }]} numberOfLines={3}>
                    {tmpl.body}
                  </Text>
                  <TouchableOpacity
                    style={[styles.templateApplyBtn, isDark && styles.templateApplyBtnDark]}
                    onPress={() => {
                      handleSelectCampaign(tmpl.id);
                      setActiveTab('compose');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.templateApplyBtnText, isDark && styles.textWhite]}>
                      Use in Composer
                    </Text>
                    <ArrowRight size={12} color={isDark ? '#FFFFFF' : '#4F46E5'} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* ─── CONFIRMATION DISPATCH MODAL ─── */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, isDark && styles.modalBoxDark]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Send size={16} color="#4F46E5" />
                <Text style={[styles.modalTitle, isDark && styles.textWhite]}>Confirm Dispatch</Text>
              </View>
              <TouchableOpacity onPress={() => setShowConfirmModal(false)} activeOpacity={0.7}>
                <X size={18} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalDetailCard, isDark && styles.modalDetailCardDark]}>
              <View style={styles.modalDetailRow}>
                <Text style={[styles.modalDetailLabel, isDark && { color: '#94A3B8' }]}>Subject:</Text>
                <Text style={[styles.modalDetailValue, isDark && styles.textWhite]} numberOfLines={1}>
                  {subject}
                </Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={[styles.modalDetailLabel, isDark && { color: '#94A3B8' }]}>Recipients:</Text>
                <Text style={[styles.modalDetailValue, isDark && styles.textWhite]}>
                  {selectedMemberIds.length} members
                </Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={[styles.modalDetailLabel, isDark && { color: '#94A3B8' }]}>Quota Impact:</Text>
                <Text style={styles.modalQuotaImpact}>-{selectedMemberIds.length} units</Text>
              </View>
              <View style={[styles.modalDetailRow, { borderTopWidth: 1, borderTopColor: isDark ? '#1F2937' : '#E2E8F0', paddingTop: 6, marginTop: 4 }]}>
                <Text style={[styles.modalDetailLabel, isDark && { color: '#94A3B8' }]}>Remaining:</Text>
                <Text style={styles.modalRemainingValue}>
                  {Math.max(0, quota.remainingQuota - selectedMemberIds.length)} units
                </Text>
              </View>
            </View>

            <Text style={[styles.modalDisclaimer, isDark && { color: '#94A3B8' }]}>
              This broadcast will be dispatched through the authenticated SMTP relay and delivered directly to the inbox of verified members.
            </Text>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalCancelButton, isDark && styles.modalCancelButtonDark]}
                onPress={() => setShowConfirmModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelButtonText, isDark && styles.textWhite]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleConfirmDispatch}
                disabled={isSending}
                activeOpacity={0.8}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Send size={13} color="#FFFFFF" />
                    <Text style={styles.modalConfirmButtonText}>Confirm & Send</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── INSPECTION MODAL ─── */}
      <Modal visible={showInspectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBoxLarge, isDark && styles.modalBoxDark]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Eye size={16} color="#4F46E5" />
                <View>
                  <Text style={[styles.modalTitle, isDark && styles.textWhite]}>Delivery Inspection</Text>
                  <Text style={[styles.modalSubSubject, isDark && { color: '#94A3B8' }]} numberOfLines={1}>
                    {inspectData?.message?.subject}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowInspectModal(false)} activeOpacity={0.7}>
                <X size={18} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            {loadingInspect ? (
              <View style={styles.centerLoadingSmall}>
                <ActivityIndicator size="small" color="#4F46E5" />
                <Text style={[styles.loadingTextSmall, isDark && { color: '#94A3B8' }]}>
                  Loading delivery breakdown...
                </Text>
              </View>
            ) : (
              <View style={styles.inspectContent}>
                {/* 3 Telemetry Tiles */}
                <View style={styles.inspectStatsGrid}>
                  <View style={[styles.inspectStatCard, isDark && styles.inspectStatCardDark]}>
                    <Text style={[styles.inspectStatLabel, isDark && { color: '#94A3B8' }]}>TOTAL</Text>
                    <Text style={[styles.inspectStatValue, isDark && styles.textWhite]}>
                      {inspectData?.message?.recipientCount ?? 0}
                    </Text>
                  </View>
                  <View style={[styles.inspectStatCard, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                    <Text style={styles.inspectStatLabelEmerald}>DELIVERED</Text>
                    <Text style={styles.inspectStatValueEmerald}>
                      {inspectData?.message?.deliveredCount ?? 0}
                    </Text>
                  </View>
                  <View style={[styles.inspectStatCard, { backgroundColor: isDark ? '#450A0A' : '#FEF2F2' }]}>
                    <Text style={styles.inspectStatLabelRose}>BOUNCED</Text>
                    <Text style={styles.inspectStatValueRose}>
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
                    inspectData.recipients.map((rec) => (
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
                        <View
                          style={[
                            styles.deliveryStatusBadge,
                            rec.deliveryStatus === 'DELIVERED'
                              ? styles.statusCompletedPill
                              : rec.deliveryStatus === 'BOUNCED'
                              ? styles.statusBouncedPill
                              : styles.statusDefaultPill,
                          ]}
                        >
                          <Text
                            style={[
                              styles.deliveryStatusText,
                              rec.deliveryStatus === 'DELIVERED'
                                ? styles.statusCompletedText
                                : rec.deliveryStatus === 'BOUNCED'
                                ? styles.statusBouncedText
                                : styles.statusDefaultText,
                            ]}
                          >
                            {rec.deliveryStatus}
                          </Text>
                        </View>
                      </View>
                    ))
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
              onPress={() => setShowInspectModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseButtonBottomText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── BRAND SIGNATURE FOOTER ─── */}
      <BrandSignatureFooter isDark={isDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingBottom: 24,
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
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  statTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  statTileDark: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
  },
  statOverline: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#94A3B8',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  statCaption: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
  },

  /* 3. Sub Tabs */
  subTabsContainer: {
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  subTabsTrack: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subTabsTrackDark: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
  },
  subTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  subTabItemActive: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  subTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#FFFFFF',
  },

  /* 4. Workspace Body & Cards */
  workspaceBody: {
    paddingHorizontal: 12,
  },
  tabContent: {
    gap: 12,
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  contentCardDark: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotLight: {
    backgroundColor: '#EEF2FF',
  },
  stepDotDark: {
    backgroundColor: '#312E81',
  },
  stepDotText: {
    fontSize: 11,
    fontWeight: '900',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  intentSelectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  intentSelectorTriggerDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  intentMiniIcon: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentMiniIconDark: {
    backgroundColor: '#312E81',
  },
  intentTriggerLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  charCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },

  /* Dropdown Menus */
  dropdownMenu: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    overflow: 'hidden',
  },
  dropdownMenuDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
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
    backgroundColor: '#EEF2FF',
  },
  dropdownMenuItemActiveDark: {
    backgroundColor: '#1E1B4B',
  },
  dropdownMenuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownMenuIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownMenuIconBoxDark: {
    backgroundColor: '#1E293B',
  },
  dropdownMenuItemTitle: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  dropdownMenuItemDesc: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  segmentMenuItemText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* Search & Member Directory */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    height: 38,
    marginTop: 10,
  },
  searchBoxDark: {
    backgroundColor: '#1E293B',
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    padding: 10,
  },
  recipientListCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
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
    color: '#4F46E5',
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
    backgroundColor: '#EEF2FF',
  },
  memberRowItemActiveDark: {
    backgroundColor: '#1E1B4B',
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
    marginTop: 1,
  },
  checkboxSquare: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSquareActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
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
    color: '#94A3B8',
    marginTop: 10,
    marginBottom: 4,
  },
  subjectTextInput: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#94A3B8',
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    paddingBottom: 14,
  },
  previewRecipientPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
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
    color: '#4F46E5',
  },
  envelopeCanvas: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    overflow: 'hidden',
  },
  envelopeCanvasDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  envelopeHeader: {
    padding: 12,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelopeSenderInitial: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  envelopeSenderMeta: {
    flex: 1,
  },
  envelopeSenderName: {
    fontSize: 12,
    fontWeight: '800',
  },
  envelopeFromEmail: {
    fontSize: 9.5,
    color: '#94A3B8',
  },
  envelopeTimeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  envelopeSubjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  envelopeSubjectTag: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  envelopeSubjectText: {
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },
  envelopeBodyContainer: {
    padding: 12,
  },
  envelopeBodyText: {
    fontSize: 11.5,
    lineHeight: 18,
    fontWeight: '500',
  },
  envelopeFooter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
  },
  envelopeFooterDark: {
    backgroundColor: '#111827',
    borderTopColor: '#1F2937',
  },
  envelopeVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  envelopeVerifiedText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#059669',
  },

  /* Dispatch Button */
  dispatchBtn: {
    backgroundColor: '#4F46E5',
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dispatchBtnDisabled: {
    opacity: 0.45,
  },
  dispatchBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  /* Ledger Styles */
  ledgerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ledgerTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  ledgerSubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  ledgerRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  ledgerRefreshBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  ledgerRefreshText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ledgerCardsList: {
    gap: 10,
  },
  ledgerCardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  ledgerCardItemDark: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
  },
  ledgerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ledgerSubjectCol: {
    flex: 1,
    paddingRight: 8,
  },
  ledgerSubjectText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  ledgerTimestamp: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  ledgerStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
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
  ledgerStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
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
  ledgerCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  ledgerCardBottomDark: {
    borderTopColor: '#1F2937',
  },
  ledgerSenderEmail: {
    fontSize: 10,
    color: '#94A3B8',
    flex: 1,
    paddingRight: 8,
  },
  ledgerInspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  ledgerInspectBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  ledgerInspectBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  emptyLedgerBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyLedgerTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  emptyLedgerDesc: {
    fontSize: 11,
    textAlign: 'center',
    color: '#64748B',
    paddingHorizontal: 16,
  },

  /* Automations & Templates */
  autoHeaderCardOuter: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  autoHeaderCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
  },
  autoHeaderCardDark: {
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
  autoHeaderTitle: {
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
  inspectContent: {
    gap: 10,
  },
  inspectStatsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  inspectStatCard: {
    flex: 1,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  inspectStatCardDark: {
    backgroundColor: '#1E293B',
  },
  inspectStatLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748B',
  },
  inspectStatValue: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  inspectStatLabelEmerald: {
    fontSize: 9,
    fontWeight: '900',
    color: '#065F46',
  },
  inspectStatValueEmerald: {
    fontSize: 15,
    fontWeight: '900',
    color: '#047857',
    marginTop: 2,
  },
  inspectStatLabelRose: {
    fontSize: 9,
    fontWeight: '900',
    color: '#991B1B',
  },
  inspectStatValueRose: {
    fontSize: 15,
    fontWeight: '900',
    color: '#B91C1C',
    marginTop: 2,
  },
  inspectListTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  inspectListScroll: {
    maxHeight: 180,
    borderRadius: 10,
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
    padding: 8,
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
    fontWeight: '800',
  },
  inspectRecipientEmail: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
  },
  deliveryStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  deliveryStatusText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  modalCloseButtonBottom: {
    backgroundColor: '#0F172A',
    height: 38,
    borderRadius: 10,
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
  loadingTextSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
});
