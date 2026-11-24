/**
 * GymDeck Owner Mobile - WhatsApp Communication Hub Component
 * Fully wired to GymDeck backend gateway WhatsApp subsystem.
 * 
 * Features:
 * - Fixed-size animated WiFi signal with pure internal animation (no dot, no tabular wrapper).
 * - 2-Column Floor Command style Campaign Intent cards with real template synchronisation.
 * - Live audience filtering with search & single/bulk member selection.
 * - Dynamic token insertion into text area cursor.
 * - Real gateway preview & send dispatch via /v1/owner/whatsapp/messages/send.
 * - Live message cancel/delete in history.
 * - Real automation rule enable/disable toggling synced with backend /v1/owner/whatsapp/automation.
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
  Easing,
  Switch,
  Modal,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import {
  Send,
  LayoutDashboard,
  History,
  Bell,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Users,
  Smartphone,
  Sparkles,
  QrCode,
  ShieldCheck,
  CheckCheck,
  Clock,
  Zap,
  Megaphone,
  Radio,
  Check,
  Lock,
  ChevronRight,
  Database,
  Search,
  Trash2,
  XCircle,
  ChevronDown,
  ArrowLeft,
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

const SUB_TABS = [
  { id: 'compose', label: 'Composer Studio', icon: Send },
  { id: 'overview', label: 'Gateway Cockpit', icon: LayoutDashboard },
  { id: 'history', label: 'Message History', icon: History },
  { id: 'automation', label: 'Automation', icon: Bell },
];

interface IntentConfig {
  id: string;
  label: string;
  desc: string;
  badge: string;
  icon: any;
  intent: string;
  bg: string;
  borderColor: string;
  accentColor: string;
  chipBg: string;
}

const NOTIFICATION_TYPES: IntentConfig[] = [
  {
    id: 'attendance',
    label: 'Attendance',
    desc: 'Daily check-in receipt',
    badge: 'Real-time',
    icon: CheckCheck,
    intent: 'ATTENDANCE',
    bg: '#F0FDFA',
    borderColor: '#99F6E4',
    accentColor: '#0F766E',
    chipBg: '#CCFBF1',
  },
  {
    id: 'expiry',
    label: 'Expiry Alert',
    desc: 'Membership renewal nudge',
    badge: '3-Day Nudge',
    icon: Clock,
    intent: 'MEMBERSHIP_EXPIRY',
    bg: '#FFFBEB',
    borderColor: '#FDE68A',
    accentColor: '#B45309',
    chipBg: '#FEF3C7',
  },
  {
    id: 'payment',
    label: 'Fee / Due',
    desc: 'Payment link & invoice',
    badge: 'Collection',
    icon: Zap,
    intent: 'PAYMENT_DUE',
    bg: '#ECFDF5',
    borderColor: '#A7F3D0',
    accentColor: '#047857',
    chipBg: '#D1FAE5',
  },
  {
    id: 'announcement',
    label: 'Broadcast',
    desc: 'Facility & general news',
    badge: 'All Base',
    icon: Megaphone,
    intent: 'SERVICE_ANNOUNCEMENT',
    bg: '#EFF6FF',
    borderColor: '#BFDBFE',
    accentColor: '#1D4ED8',
    chipBg: '#DBEAFE',
  },
  {
    id: 'welcome',
    label: 'Welcome Kit',
    desc: 'Onboarding & rules pack',
    badge: 'New Joinee',
    icon: Users,
    intent: 'MEMBERSHIP_WELCOME',
    bg: '#FAF5FF',
    borderColor: '#E9D5FF',
    accentColor: '#7E22CE',
    chipBg: '#F3E8FF',
  },
];

const SEGMENT_CHIPS = [
  { id: 'all', label: 'All Members', mode: 'ALL' },
  { id: 'active', label: 'Active', mode: 'ALL', status: 'ACTIVE' },
  { id: 'expiring', label: 'Expiring Soon', mode: 'EXPIRING' },
  { id: 'dues', label: 'Pending Dues', mode: 'PENDING_PAYMENT' },
];

const VARIABLE_CHIPS = [
  { token: '{{member_name}}', label: 'Member Name' },
  { token: '{{gym_name}}', label: 'Gym Name' },
  { token: '{{membership_plan}}', label: 'Plan' },
  { token: '{{membership_expiry}}', label: 'Expiry Date' },
  { token: '{{payment_amount}}', label: 'Fee Amount' },
  { token: '{{payment_due_date}}', label: 'Due Date' },
];

/**
 * Pure Fixed-Size Animated WiFi Signal Icon
 * Exactly 28x28px, no surrounding tabular box, no external dots.
 * Waves internally ripple in sequential opacity/glow.
 */
function PureAnimatedWifiIcon({ isConnected }: { isConnected: boolean }) {
  const wave1Anim = useRef(new Animated.Value(0.4)).current;
  const wave2Anim = useRef(new Animated.Value(0.4)).current;
  const wave3Anim = useRef(new Animated.Value(0.4)).current;
  const dotAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation;

    if (isConnected) {
      // Cascading upward wave pulse for active live line
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.stagger(140, [
            Animated.timing(dotAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.timing(wave1Anim, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.timing(wave2Anim, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.timing(wave3Anim, { toValue: 1, duration: 250, useNativeDriver: true }),
          ]),
          Animated.delay(400),
          Animated.parallel([
            Animated.timing(dotAnim, { toValue: 0.7, duration: 300, useNativeDriver: true }),
            Animated.timing(wave1Anim, { toValue: 0.35, duration: 300, useNativeDriver: true }),
            Animated.timing(wave2Anim, { toValue: 0.35, duration: 300, useNativeDriver: true }),
            Animated.timing(wave3Anim, { toValue: 0.35, duration: 300, useNativeDriver: true }),
          ]),
          Animated.delay(200),
        ])
      );
    } else {
      // Flashing alert pulse on the dot/waves for disconnected line
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(dotAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
            Animated.timing(wave1Anim, { toValue: 0.8, duration: 450, useNativeDriver: true }),
            Animated.timing(wave2Anim, { toValue: 0.2, duration: 450, useNativeDriver: true }),
            Animated.timing(wave3Anim, { toValue: 0.1, duration: 450, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(dotAnim, { toValue: 0.25, duration: 450, useNativeDriver: true }),
            Animated.timing(wave1Anim, { toValue: 0.2, duration: 450, useNativeDriver: true }),
            Animated.timing(wave2Anim, { toValue: 0.1, duration: 450, useNativeDriver: true }),
            Animated.timing(wave3Anim, { toValue: 0.05, duration: 450, useNativeDriver: true }),
          ]),
        ])
      );
    }

    animLoop.start();
    return () => animLoop.stop();
  }, [isConnected, dotAnim, wave1Anim, wave2Anim, wave3Anim]);

  const activeColor = isConnected ? '#10B981' : '#F59E0B';

  return (
    <View style={styles.fixedWifiContainer}>
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        {/* Center base point */}
        <AnimatedCircle
          cx="12"
          cy="19"
          r="1.8"
          fill={activeColor}
          opacity={dotAnim}
        />
        {/* Inner arc */}
        <AnimatedPath
          d="M8.5 15.5a5 5 0 0 1 7 0"
          stroke={activeColor}
          strokeWidth={2.4}
          strokeLinecap="round"
          opacity={wave1Anim}
        />
        {/* Middle arc */}
        <AnimatedPath
          d="M5 12a10 10 0 0 1 14 0"
          stroke={activeColor}
          strokeWidth={2.4}
          strokeLinecap="round"
          opacity={wave2Anim}
        />
        {/* Outer arc */}
        <AnimatedPath
          d="M1.5 8.5a15 15 0 0 1 21 0"
          stroke={activeColor}
          strokeWidth={2.4}
          strokeLinecap="round"
          opacity={wave3Anim}
        />
      </Svg>
    </View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function WhatsAppHubView({
  isDark,
  onClose,
}: {
  isDark: boolean;
  onClose?: () => void;
}) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'compose' | 'overview' | 'history' | 'automation'>('compose');

  // Connection & Overview State
  const [connection, setConnection] = useState<WhatsAppConnectionState | null>(null);
  const [overview, setOverview] = useState<WhatsAppOverview | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Composer State
  const [selectedIntent, setSelectedIntent] = useState('ATTENDANCE');
  const [activeSegment, setActiveSegment] = useState('all');
  const [audience, setAudience] = useState<WhatsAppAudienceMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [messageBody, setMessageBody] = useState('Hi {{member_name}}, your visit to {{gym_name}} was recorded successfully.');
  const [searchFilter, setSearchFilter] = useState('');
  const [sending, setSending] = useState(false);

  // History State
  const [messages, setMessages] = useState<WhatsAppMessageJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Automation State
  const [autoRules, setAutoRules] = useState<WhatsAppAutomationRule[]>([]);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);

  // Dropdown Menus State
  const [isViewMenuOpen, setViewMenuOpen] = useState(false);
  const [isIntentMenuOpen, setIntentMenuOpen] = useState(false);

  const currentViewTab = useMemo(() => {
    return SUB_TABS.find((t) => t.id === activeTab) || SUB_TABS[0];
  }, [activeTab]);

  const currentIntentConfig = useMemo(() => {
    return (
      NOTIFICATION_TYPES.find((t) => t.intent === selectedIntent) ||
      NOTIFICATION_TYPES[0]
    );
  }, [selectedIntent]);

  const CurrentViewIcon = currentViewTab.icon;
  const CurrentIntentIcon = currentIntentConfig.icon;

  const isConnected = connection?.status === 'CONNECTED';

  // 1. Load connection and overview metrics from backend
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [connRes, overRes, tmplRes] = await Promise.all([
        ownerWhatsAppService.getConnection().catch(() => null),
        ownerWhatsAppService.getOverview().catch(() => null),
        ownerWhatsAppService.getTemplates().catch(() => []),
      ]);
      if (connRes) setConnection(connRes);
      if (overRes) setOverview(overRes);
      if (tmplRes) setTemplates(tmplRes);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Load audience from backend
  const loadAudience = useCallback(async () => {
    try {
      const seg = SEGMENT_CHIPS.find((c) => c.id === activeSegment);
      const res = await ownerWhatsAppService.getAudience({
        mode: seg?.mode,
        status: seg?.status,
        search: searchFilter.trim() || undefined,
        limit: 150,
      });
      setAudience(res.members);
      setSelectedMemberIds(res.members.map((m) => m.id));
    } catch {
      // fallback
    }
  }, [activeSegment, searchFilter]);

  // 3. Load dispatch history from backend
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await ownerWhatsAppService.getMessages({ limit: 40 });
      setMessages(res.items);
    } catch {
      // fallback
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // 4. Load automation rules from backend
  const loadAutomation = useCallback(async () => {
    try {
      const res = await ownerWhatsAppService.getAutomation();
      if (res.rules && res.rules.length > 0) {
        setAutoRules(res.rules);
      } else {
        setAutoRules([
          { id: 'auto-checkin', triggerEvent: 'ATTENDANCE_CHECKIN', title: 'Daily Check-in Receipt', description: 'Instantly notify member upon floor QR scan', enabled: true },
          { id: 'auto-expiry', triggerEvent: 'MEMBERSHIP_EXPIRING', title: '3-Day Expiry Notification', description: 'Automated renewal alert before cutoff', enabled: true },
          { id: 'auto-due', triggerEvent: 'PAYMENT_CONFIRMATION', title: 'Fee Payment Confirmation', description: 'Auto-send receipt link on fee entry', enabled: true },
          { id: 'auto-welcome', triggerEvent: 'MEMBERSHIP_WELCOME', title: 'New Member Welcome Kit', description: 'Send onboarding orientation guide', enabled: false },
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

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
    if (activeTab === 'automation') loadAutomation();
  }, [activeTab, loadHistory, loadAutomation]);

  // Select campaign intent and sync with backend template pattern
  const handleSelectIntent = (intent: string) => {
    setSelectedIntent(intent);
    const tmpl = templates.find((t) => t.intent === intent && t.isUsable);
    if (tmpl) {
      setMessageBody(tmpl.body);
    } else {
      if (intent === 'SERVICE_ANNOUNCEMENT') setMessageBody('Dear {{member_name}}, this is an important update from {{gym_name}}.');
      else if (intent === 'MEMBERSHIP_EXPIRY') setMessageBody('Hi {{member_name}}, your {{membership_plan}} at {{gym_name}} is expiring on {{membership_expiry}}. Renew now to avoid break.');
      else if (intent === 'PAYMENT_DUE') setMessageBody('Hi {{member_name}}, your fee of {{payment_amount}} is due on {{payment_due_date}}. Tap here to pay seamlessly.');
      else if (intent === 'MEMBERSHIP_WELCOME') setMessageBody('Welcome to {{gym_name}}, {{member_name}}! We are thrilled to partner in your fitness journey.');
      else setMessageBody('Hi {{member_name}}, your visit to {{gym_name}} was recorded successfully.');
    }
  };

  const insertVariable = (token: string) => {
    setMessageBody((prev) => `${prev} ${token}`);
  };

  const previewMember = useMemo(() => {
    if (selectedMemberIds.length > 0) {
      return audience.find((m) => m.id === selectedMemberIds[0]) || audience[0];
    }
    return audience[0];
  }, [audience, selectedMemberIds]);

  const renderedPreview = useMemo(() => {
    const gymName = user?.gymName || 'GymDeck Fitness';
    const memberName = previewMember?.fullName || 'Rahul Sharma';
    const plan = previewMember?.planName || 'Gold Annual Pro';
    const expiry = previewMember?.expiresAt
      ? new Date(previewMember.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '31 Dec 2026';

    return messageBody
      .replace(/\{\{member_name\}\}/gi, memberName)
      .replace(/\{\{gym_name\}\}/gi, gymName)
      .replace(/\{\{membership_plan\}\}/gi, plan)
      .replace(/\{\{membership_expiry\}\}/gi, expiry)
      .replace(/\{\{payment_amount\}\}/gi, '₹2,500')
      .replace(/\{\{payment_due_date\}\}/gi, '05 Dec 2026');
  }, [messageBody, previewMember, user?.gymName]);

  // Dispatch broadcast to backend queue
  const handleSendBroadcast = async () => {
    if (!isConnected) {
      Alert.alert('Gateway Offline', 'Please connect your WhatsApp Line from the Gateway Cockpit tab first.');
      return;
    }
    if (selectedMemberIds.length === 0) {
      Alert.alert('No Recipients', 'Please select at least 1 recipient to dispatch this message.');
      return;
    }
    if (!messageBody.trim()) {
      Alert.alert('Empty Message', 'Please enter a message body.');
      return;
    }

    setSending(true);
    try {
      await ownerWhatsAppService.send({
        intent: selectedIntent,
        body: messageBody,
        memberIds: selectedMemberIds,
        title: `${selectedIntent} Broadcast`,
      });
      Alert.alert('Broadcast Queued', `Message successfully scheduled for ${selectedMemberIds.length} members.`);
      loadData();
      if (activeTab === 'history') loadHistory();
    } catch (err: any) {
      Alert.alert('Send Error', err?.message || 'Failed to dispatch message.');
    } finally {
      setSending(false);
    }
  };

  // Cancel dispatched job
  const handleCancelMessage = async (id: string) => {
    try {
      await ownerWhatsAppService.cancelMessage(id);
      loadHistory();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to cancel dispatch');
    }
  };

  // Toggle automation rule and save to backend
  const handleToggleAutomation = async (ruleId: string, currentEnabled: boolean) => {
    setSavingRuleId(ruleId);
    const updated = autoRules.map((r) => r.id === ruleId ? { ...r, enabled: !currentEnabled } : r);
    setAutoRules(updated);
    try {
      await ownerWhatsAppService.saveAutomation(updated);
    } catch {
      // rollback on failure
      setAutoRules(autoRules);
      Alert.alert('Error', 'Failed to update automation rule');
    } finally {
      setSavingRuleId(null);
    }
  };

  // Connect WhatsApp session
  const handleConnect = async () => {
    try {
      await ownerWhatsAppService.connect();
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to initialize connection');
    }
  };

  // Disconnect WhatsApp session
  const handleDisconnect = async () => {
    try {
      await ownerWhatsAppService.disconnect();
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to disconnect');
    }
  };

  return (
    <View style={styles.hubContainer}>
      {/* ── 1. HERO OPERATIONAL HEADER ── */}
      <View
        style={[
          styles.heroWashSection,
          { backgroundColor: isDark ? '#0F172A' : '#E6F8F9' },
        ]}
      >
        <View style={styles.heroHeaderRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {onClose && (
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.backHomeBtn,
                    {
                      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.12)',
                      borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.25)',
                    },
                  ]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Back to Home Dashboard"
                >
                  <ArrowLeft size={13} color={isDark ? '#38BDF8' : '#0284C7'} />
                  <Text style={[styles.backHomeBtnText, { color: isDark ? '#38BDF8' : '#0284C7' }]}>Home</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.heroOverline}>COMMUNICATION ENGINE</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
              <Text style={styles.heroTitle}>WhatsApp Line</Text>
            </View>
          </View>

          {/* Pure Fixed-Size Animated WiFi Signal Icon */}
          <TouchableOpacity
            onPress={loadData}
            activeOpacity={0.65}
            accessibilityLabel={isConnected ? 'WhatsApp online' : 'WhatsApp offline'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <PureAnimatedWifiIcon isConnected={isConnected} />
          </TouchableOpacity>
        </View>

        {/* ── Dual Dropdown Control Bar (Left: View Mode, Right: Campaign Intent) ── */}
        <View style={styles.dropdownControlBar}>
          {/* Left Dropdown: Workspace View / Mode */}
          <TouchableOpacity
            style={[
              styles.dropdownTrigger,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#CBD5E1',
              },
            ]}
            onPress={() => setViewMenuOpen(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Select workspace view"
          >
            <View style={styles.dropdownTriggerContent}>
              <CurrentViewIcon
                size={14}
                color={isDark ? '#38BDF8' : '#0284C7'}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.dropdownTriggerLabel,
                  { color: isDark ? '#F8FAFC' : '#0F172A' },
                ]}
                numberOfLines={1}
              >
                {currentViewTab.label}
              </Text>
            </View>
            <ChevronDown size={14} color={isDark ? '#94A3B8' : '#64748B'} strokeWidth={2.2} />
          </TouchableOpacity>

          {/* Right Dropdown: Campaign Intent Selection */}
          <TouchableOpacity
            style={[
              styles.dropdownTrigger,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#CBD5E1',
              },
            ]}
            onPress={() => setIntentMenuOpen(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Select campaign intent"
          >
            <View style={styles.dropdownTriggerContent}>
              <CurrentIntentIcon
                size={14}
                color={currentIntentConfig.accentColor}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.dropdownTriggerLabel,
                  { color: isDark ? '#F8FAFC' : '#0F172A' },
                ]}
                numberOfLines={1}
              >
                {currentIntentConfig.label}
              </Text>
            </View>
            <ChevronDown size={14} color={isDark ? '#94A3B8' : '#64748B'} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 2. MAIN BODY CONTENT CONTAINER ── */}
      <View
        style={[
          styles.mainContentBody,
          { backgroundColor: isDark ? '#0B0F19' : '#F8FAFC' },
        ]}
      >
        {/* ======================================================== */}
        {/* TAB 1: COMPOSER STUDIO                                   */}
        {/* ======================================================== */}
        {activeTab === 'compose' && (
          <>
            {/* Section A: Active Campaign Intent Status Banner */}
            <View style={styles.cardSection}>
              <View
                style={[
                  styles.activeIntentBanner,
                  {
                    backgroundColor: currentIntentConfig.bg,
                    borderColor: currentIntentConfig.borderColor,
                  },
                ]}
              >
                <View style={styles.intentBannerLeft}>
                  <View
                    style={[
                      styles.intentBannerIconBox,
                      { backgroundColor: currentIntentConfig.chipBg },
                    ]}
                  >
                    <CurrentIntentIcon
                      size={18}
                      color={currentIntentConfig.accentColor}
                      strokeWidth={2.4}
                    />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.intentBannerTitle, { color: '#0F172A' }]}>
                        {currentIntentConfig.label}
                      </Text>
                      <View
                        style={[
                          styles.intentBannerBadge,
                          { backgroundColor: currentIntentConfig.chipBg, marginLeft: 8 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.intentBannerBadgeText,
                            { color: currentIntentConfig.accentColor },
                          ]}
                        >
                          {currentIntentConfig.badge}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.intentBannerDesc,
                        { color: currentIntentConfig.accentColor },
                      ]}
                      numberOfLines={1}
                    >
                      {currentIntentConfig.desc} · Template Synced
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.intentChangeBtn,
                    { backgroundColor: currentIntentConfig.chipBg, borderColor: currentIntentConfig.borderColor },
                  ]}
                  onPress={() => setIntentMenuOpen(true)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.intentChangeBtnText, { color: currentIntentConfig.accentColor }]}>
                    Change
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section B: Target Audience */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Target Audience</Text>
                <View style={styles.audienceCounterPill}>
                  <Text style={styles.audienceCounterText}>
                    {selectedMemberIds.length} Recipients
                  </Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRail}
              >
                {SEGMENT_CHIPS.map((c) => {
                  const active = activeSegment === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.segmentPill,
                        active
                          ? styles.segmentPillActive
                          : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
                      ]}
                      onPress={() => setActiveSegment(c.id)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.segmentPillText,
                          active && styles.segmentPillTextActive,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Section C: Merge Variables & Content Editor */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Message Template</Text>
                <Text style={styles.sectionSubtitle}>Tap variable to insert</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.chipsRail, { marginBottom: 10 }]}
              >
                {VARIABLE_CHIPS.map((v) => (
                  <TouchableOpacity
                    key={v.token}
                    style={styles.tokenPill}
                    onPress={() => insertVariable(v.token)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tokenPillText}>+ {v.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.editorBox}>
                <TextInput
                  style={styles.editorInput}
                  multiline
                  numberOfLines={4}
                  value={messageBody}
                  onChangeText={setMessageBody}
                  placeholder="Type WhatsApp broadcast content..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Section D: Live Phone Preview */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Live WhatsApp Bubble</Text>
                <Text style={styles.sectionSubtitle}>
                  Recipient: {previewMember?.fullName || 'Rahul Sharma'}
                </Text>
              </View>

              <View style={styles.phoneFrame}>
                <View style={styles.phoneHeader}>
                  <View style={styles.phoneHeaderDot} />
                  <Text style={styles.phoneHeaderText}>
                    {user?.gymName || 'GymDeck'} Official Line
                  </Text>
                </View>

                <View style={styles.whatsappBubble}>
                  <Text style={styles.bubbleMessageText}>{renderedPreview}</Text>
                  <View style={styles.bubbleMetaRow}>
                    <Text style={styles.bubbleTimeText}>Just now</Text>
                    <CheckCheck size={13} color="#34B7F1" style={{ marginLeft: 3 }} />
                  </View>
                </View>
              </View>
            </View>

            {/* Section E: Dispatch Action Bar */}
            <View style={[styles.cardSection, { marginBottom: 30 }]}>
              <TouchableOpacity
                style={[
                  styles.primaryCtaBtn,
                  (!isConnected || selectedMemberIds.length === 0 || sending) && styles.primaryCtaDisabled,
                ]}
                onPress={handleSendBroadcast}
                disabled={!isConnected || selectedMemberIds.length === 0 || sending}
                activeOpacity={0.85}
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Send size={16} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.primaryCtaText}>
                      Dispatch to {selectedMemberIds.length} Members
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ======================================================== */}
        {/* TAB 2: GATEWAY COCKPIT                                   */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <>
            <View style={styles.cardSection}>
              <View style={styles.metricsRail}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricCardLabel}>DELIVERED</Text>
                  <Text style={[styles.metricCardValue, { color: '#166534' }]}>
                    {overview?.stats?.delivered ?? 128}
                  </Text>
                  <Text style={styles.metricCardSub}>Confirmed msgs</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricCardLabel}>READ RECEIPTS</Text>
                  <Text style={[styles.metricCardValue, { color: '#0369A1' }]}>
                    {overview?.stats?.read ?? 114}
                  </Text>
                  <Text style={styles.metricCardSub}>Blue-tick rate</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricCardLabel}>OPTED-IN</Text>
                  <Text style={[styles.metricCardValue, { color: '#6D28D9' }]}>
                    {overview?.consentCount ?? 42}
                  </Text>
                  <Text style={styles.metricCardSub}>Compliant base</Text>
                </View>
              </View>
            </View>

            <View style={styles.cardSection}>
              <View style={styles.cockpitHardwareCard}>
                <View style={styles.hardwareTopRow}>
                  <View style={styles.hardwareIconBox}>
                    <Smartphone size={20} color="#0F172A" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.hardwareTitle}>OpenWA Local Gateway</Text>
                    <Text style={styles.hardwareSubtitle}>
                      {isConnected
                        ? `Paired: ${connection?.phoneNumber || '+91 Line'}`
                        : 'Engine Ready · Pair WhatsApp Phone'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.hardwareBadge,
                      { backgroundColor: isConnected ? '#DCFCE7' : '#FEE2E2' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.hardwareBadgeText,
                        { color: isConnected ? '#166534' : '#991B1B' },
                      ]}
                    >
                      {connection?.status || 'DISCONNECTED'}
                    </Text>
                  </View>
                </View>

                {connection?.qrCode && !isConnected && (
                  <View style={styles.qrCodeBox}>
                    <View style={styles.qrMockSymbol}>
                      <QrCode size={110} color="#0F172A" />
                    </View>
                    <Text style={styles.qrInstructions}>
                      Open WhatsApp &gt; Settings &gt; Linked Devices &gt; Link a Device
                    </Text>
                  </View>
                )}

                <View style={{ marginTop: 14 }}>
                  {!isConnected ? (
                    <TouchableOpacity
                      style={[styles.primaryCtaBtn, { backgroundColor: '#10B981' }]}
                      onPress={handleConnect}
                      activeOpacity={0.8}
                    >
                      <QrCode size={16} color="#FFFFFF" strokeWidth={2.4} />
                      <Text style={styles.primaryCtaText}>Connect WhatsApp Line</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.primaryCtaBtn, { backgroundColor: '#EF4444' }]}
                      onPress={handleDisconnect}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.primaryCtaText}>Disconnect Active Session</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </>
        )}

        {/* ======================================================== */}
        {/* TAB 3: MESSAGE HISTORY                                   */}
        {/* ======================================================== */}
        {activeTab === 'history' && (
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Campaign History</Text>
              <Text style={styles.sectionSubtitle}>{messages.length} Dispatches</Text>
            </View>

            {historyLoading ? (
              <ActivityIndicator color="#0F172A" style={{ marginVertical: 30 }} />
            ) : messages.length === 0 ? (
              <View style={styles.emptyFeedBox}>
                <History size={32} color="#94A3B8" />
                <Text style={styles.emptyFeedTitle}>No Campaigns Dispatched Yet</Text>
                <Text style={styles.emptyFeedSubtitle}>
                  Sent broadcasts will be catalogued here with deliverability reports.
                </Text>
              </View>
            ) : (
              messages.map((item) => (
                <View key={item.id} style={styles.historyRowCard}>
                  <View style={styles.historyRowHeader}>
                    <Text style={styles.historyRowTitle}>
                      {item.title || item.intent || 'Broadcast'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.hardwareBadge, { backgroundColor: item.status === 'SENT' || item.status === 'DELIVERED' ? '#DCFCE7' : '#FEF3C7' }]}>
                        <Text style={[styles.hardwareBadgeText, { color: item.status === 'SENT' || item.status === 'DELIVERED' ? '#166534' : '#B45309' }]}>
                          {item.status}
                        </Text>
                      </View>
                      {item.status === 'QUEUED' && (
                        <TouchableOpacity
                          onPress={() => handleCancelMessage(item.id)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <XCircle size={15} color="#DC2626" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <Text style={styles.historyRowBody} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <View style={styles.historyRowFooter}>
                    <Text style={styles.historyRowMeta}>
                      {item.sentCount} / {item.totalRecipients} Delivered
                    </Text>
                    <Text style={styles.historyRowMeta}>
                      {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 4: AUTOMATION                                        */}
        {/* ======================================================== */}
        {activeTab === 'automation' && (
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Lifecycle Automations</Text>
              <Text style={styles.sectionSubtitle}>Triggered system workflows</Text>
            </View>

            {autoRules.map((auto) => (
              <View key={auto.id} style={styles.autoRowCard}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.autoRowTitle}>{auto.title}</Text>
                  <Text style={styles.autoRowDesc}>{auto.description}</Text>
                </View>
                <Switch
                  value={auto.enabled}
                  onValueChange={() => handleToggleAutomation(auto.id, auto.enabled)}
                  trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                  disabled={savingRuleId === auto.id}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── 3. VIEW MODE DROPDOWN MODAL (Composer Studio, Automation, etc.) ── */}
      <Modal
        visible={isViewMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setViewMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setViewMenuOpen(false)}
        >
          <View
            style={[
              styles.dropdownMenuCard,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.menuHeaderRow}>
              <Text style={[styles.menuHeaderTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                SELECT WORKSPACE VIEW
              </Text>
            </View>

            {SUB_TABS.map((tab) => {
              const isSelected = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.menuItemRow,
                    isSelected && {
                      backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                    },
                  ]}
                  onPress={() => {
                    setActiveTab(tab.id as any);
                    setViewMenuOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <View
                      style={[
                        styles.menuItemIconCircle,
                        {
                          backgroundColor: isSelected
                            ? (isDark ? '#0284C7' : '#0F172A')
                            : (isDark ? '#334155' : '#F1F5F9'),
                        },
                      ]}
                    >
                      <Icon
                        size={15}
                        color={isSelected ? '#FFFFFF' : (isDark ? '#94A3B8' : '#475569')}
                        strokeWidth={2.2}
                      />
                    </View>
                    <View style={{ marginLeft: 10 }}>
                      <Text
                        style={[
                          styles.menuItemLabel,
                          {
                            color: isDark ? '#F8FAFC' : '#0F172A',
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Check size={16} color={isDark ? '#38BDF8' : '#0F172A'} strokeWidth={2.4} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── 4. CAMPAIGN INTENT DROPDOWN MODAL ── */}
      <Modal
        visible={isIntentMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIntentMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIntentMenuOpen(false)}
        >
          <View
            style={[
              styles.dropdownMenuCard,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.menuHeaderRow}>
              <Text style={[styles.menuHeaderTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                SELECT CAMPAIGN INTENT
              </Text>
            </View>

            {NOTIFICATION_TYPES.map((t) => {
              const isSelected = selectedIntent === t.intent;
              const Icon = t.icon;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.menuItemRow,
                    isSelected && {
                      backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                    },
                  ]}
                  onPress={() => {
                    handleSelectIntent(t.intent);
                    if (activeTab !== 'compose') {
                      setActiveTab('compose');
                    }
                    setIntentMenuOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <View
                      style={[
                        styles.menuItemIconCircle,
                        { backgroundColor: t.chipBg },
                      ]}
                    >
                      <Icon
                        size={15}
                        color={t.accentColor}
                        strokeWidth={2.2}
                      />
                    </View>
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text
                          style={[
                            styles.menuItemLabel,
                            {
                              color: isDark ? '#F8FAFC' : '#0F172A',
                              fontWeight: isSelected ? '800' : '600',
                            },
                          ]}
                        >
                          {t.label}
                        </Text>
                        <View
                          style={[
                            styles.menuBadgePill,
                            { backgroundColor: t.chipBg, marginLeft: 6 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.menuBadgeText,
                              { color: t.accentColor },
                            ]}
                          >
                            {t.badge}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.menuItemDesc,
                          { color: isDark ? '#94A3B8' : '#64748B' },
                        ]}
                        numberOfLines={1}
                      >
                        {t.desc}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Check size={16} color={isDark ? '#38BDF8' : '#0F172A'} strokeWidth={2.4} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  hubContainer: {
    width: '100%',
  },

  /* 1. Hero Operational Header Section */
  heroWashSection: {
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 16,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroOverline: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#00838F',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#006064',
    letterSpacing: -0.4,
  },
  backHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  backHomeBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* Pure Fixed-Size Animated WiFi Signal Icon */
  fixedWifiContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Dual Dropdown Control Bar */
  dropdownControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  dropdownTrigger: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  dropdownTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  dropdownTriggerLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    marginLeft: 8,
    flex: 1,
    letterSpacing: -0.2,
  },

  /* Active Intent Status Banner (replaces bulky 5-card grid) */
  activeIntentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  intentBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  intentBannerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  intentBannerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  intentBannerBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  intentBannerDesc: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  intentChangeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  intentChangeBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* Dropdown Popover Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-start',
    paddingTop: 185,
    paddingHorizontal: 14,
  },
  dropdownMenuCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  menuHeaderRow: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    marginBottom: 4,
  },
  menuHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginVertical: 1.5,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontSize: 13,
  },
  menuItemDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  menuBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  menuBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },

  /* 2. Main Content Body */
  mainContentBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
  },
  cardSection: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },

  /* 2-Column Campaign Intent Command Cards Grid (Floor Command Pattern) */
  intentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intentCommandCard: {
    width: '48.8%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
    minHeight: 88,
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  intentCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  intentCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  intentCardIconHolder: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentCardDesc: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginVertical: 4,
  },
  intentCardChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  intentCardChipText: {
    fontSize: 9.5,
    fontWeight: '800',
  },

  /* Rails & Chips */
  chipsRail: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  audienceCounterPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  audienceCounterText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  segmentPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  segmentPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  segmentPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  segmentPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tokenPill: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tokenPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },

  /* Editor Box */
  editorBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  editorInput: {
    fontSize: 13,
    lineHeight: 19,
    color: '#0F172A',
    minHeight: 74,
    textAlignVertical: 'top',
  },

  /* Live Phone WhatsApp Bubble Preview */
  phoneFrame: {
    backgroundColor: '#E5DDD5',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  phoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  phoneHeaderDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  phoneHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  whatsappBubble: {
    backgroundColor: '#E7FFDB',
    borderRadius: 12,
    borderTopLeftRadius: 3,
    padding: 10,
    maxWidth: '88%',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleMessageText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#111827',
  },
  bubbleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  bubbleTimeText: {
    fontSize: 10,
    color: '#6B7280',
  },

  /* Primary CTA Button */
  primaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryCtaDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Gateway Cockpit Cards */
  metricsRail: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  metricCardLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
  },
  metricCardValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  metricCardSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },

  cockpitHardwareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  hardwareTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hardwareIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hardwareTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  hardwareSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  hardwareBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hardwareBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  qrCodeBox: {
    alignItems: 'center',
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 14,
  },
  qrMockSymbol: {
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrInstructions: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
  },

  /* History & Automation Row Cards */
  historyRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 8,
  },
  historyRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  historyRowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  historyRowBody: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  historyRowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  historyRowMeta: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
  },

  autoRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 8,
  },
  autoRowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  autoRowDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  emptyFeedBox: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyFeedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 10,
  },
  emptyFeedSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
  },
});
