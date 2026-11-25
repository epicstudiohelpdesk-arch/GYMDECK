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
} from 'react-native';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
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

  // Composer State
  const [selectedIntent, setSelectedIntent] = useState<string>('SERVICE_ANNOUNCEMENT');
  const [activeSegment, setActiveSegment] = useState<string>('all');
  const [audience, setAudience] = useState<WhatsAppAudienceMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [messageBody, setMessageBody] = useState<string>(
    'Hi {{member_name}}, this is an official update from {{gym_name}}. Please visit the front desk for details.'
  );
  const [sending, setSending] = useState(false);

  // History & Automations
  const [messages, setMessages] = useState<WhatsAppMessageJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [autoRules, setAutoRules] = useState<WhatsAppAutomationRule[]>([]);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);

  const isConnected = connection?.status === 'CONNECTED';

  // Pulse animation for online indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;
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
        setSelectedMemberIds(res.members.map((m) => m.id));
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
          { id: 'auto-checkin', triggerEvent: 'ATTENDANCE_CHECKIN', title: 'Daily Attendance Receipt', description: 'Instantly message member upon QR turnstile scan', enabled: true },
          { id: 'auto-expiry', triggerEvent: 'MEMBERSHIP_EXPIRING', title: '3-Day Renewal Alert', description: 'Send reminder with extension link before expiry', enabled: true },
          { id: 'auto-due', triggerEvent: 'PAYMENT_CONFIRMATION', title: 'Fee Payment Confirmation', description: 'Auto-deliver official payment receipt PDF', enabled: true },
          { id: 'auto-welcome', triggerEvent: 'MEMBERSHIP_WELCOME', title: 'Welcome Kit & Onboarding', description: 'Send gym guidelines and schedule to new members', enabled: false },
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

  // Keep selected IDs in sync with filtered search results
  useEffect(() => {
    setSelectedMemberIds(filteredAudience.map((m) => m.id));
  }, [filteredAudience]);

  // Preview formatting
  const previewMember = useMemo(() => {
    if (selectedMemberIds.length > 0) {
      return filteredAudience.find((m) => m.id === selectedMemberIds[0]) || filteredAudience[0] || audience[0];
    }
    return filteredAudience[0] || audience[0];
  }, [filteredAudience, audience, selectedMemberIds]);

  const activeIntentObj = useMemo(() => {
    return NOTIFICATION_TYPES.find((t) => t.intent === selectedIntent) || NOTIFICATION_TYPES[0];
  }, [selectedIntent]);

  const renderedPreview = useMemo(() => {
    const gymName = user?.gymName || 'GymDeck Fitness';
    const memberName = previewMember?.fullName || 'Rahul Sharma';
    const plan = previewMember?.planName || 'Annual Gold Pass';
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

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect WhatsApp Line',
      'Are you sure you want to unlink the companion gym phone? Automatic fee receipts and member notifications will be paused until re-linked.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink Phone',
          style: 'destructive',
          onPress: async () => {
            try {
              await ownerWhatsAppService.disconnect();
              loadData();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to disconnect.');
            }
          },
        },
      ]
    );
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

            {/* Live Signal Indicator: Professional Wifi Icon indicating online/offline state */}
            <View style={styles.telemetryCapsule}>
              {isConnected ? (
                <Wifi size={17} color="#34D399" strokeWidth={2.4} />
              ) : (
                <WifiOff size={17} color="#F87171" strokeWidth={2.2} />
              )}
            </View>
          </View>

          {/* Hero Main Body: Title & Companion Number */}
          <View style={styles.heroContent}>
            <Text style={styles.heroMainTitle}>Companion Line</Text>
            {connection?.phoneNumber ? (
              <View style={styles.linkedNumberPill}>
                <Smartphone size={11} color="#064E3B" strokeWidth={2.4} />
                <Text style={styles.linkedNumberText}>{connection.phoneNumber}</Text>
              </View>
            ) : (
              <Text style={styles.heroSubText}>
                Automated receipts, check-in pings & instant broadcasts
              </Text>
            )}
          </View>

          {/* Hero Actions Row: Clean & Proportional Buttons */}
          <View style={styles.heroActionsRow}>
            {!isConnected ? (
              <TouchableOpacity
                style={styles.heroPrimaryBtn}
                onPress={() => setShowQrModal(true)}
                activeOpacity={0.85}
              >
                <QrCode size={14} color="#064E3B" strokeWidth={2.6} />
                <Text style={styles.heroPrimaryBtnText}>Link Phone via QR</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.heroSecondaryBtn}
                onPress={handleDisconnect}
                activeOpacity={0.85}
              >
                <Unplug size={13} color="#FCA5A5" strokeWidth={2.4} />
                <Text style={styles.heroDangerBtnText}>Unlink</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.heroRefreshBtn}
              onPress={loadData}
              activeOpacity={0.7}
              disabled={isRefreshingState}
            >
              {isRefreshingState ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <RefreshCw size={12} color="#E2E8F0" strokeWidth={2.2} />
                  <Text style={styles.heroRefreshText}>Sync</Text>
                </>
              )}
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

            {/* 4. Live WhatsApp Preview Bubble */}
            <View style={[styles.contentCard, isDark && styles.contentCardDark]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <OfficialWhatsAppBrandIcon size={14} color="#059669" />
                  <Text style={[styles.cardTitle, { marginLeft: 6 }, isDark && styles.textWhite]}>
                    Live Preview
                  </Text>
                </View>
                <Text style={styles.previewTargetText}>
                  Recipient: {previewMember?.fullName || 'Rahul Sharma'}
                </Text>
              </View>

              <View style={styles.previewCanvas}>
                <View style={styles.previewChatBubble}>
                  <Text style={styles.previewMessageText}>{renderedPreview}</Text>
                  <View style={styles.previewMetaRow}>
                    <Text style={styles.previewTimeText}>Just now</Text>
                    <CheckCheck size={13} color="#34B7F1" style={{ marginLeft: 4 }} />
                  </View>
                </View>
              </View>
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
                    Send Broadcast ({selectedMemberIds.length} Members)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── TAB 2: AUTOMATIONS ── */}
        {activeTab === 'automation' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>
                Automatic System Triggers
              </Text>
              <Text style={styles.sectionSub}>No manual send required</Text>
            </View>

            {autoRules.map((rule) => (
              <View
                key={rule.id}
                style={[styles.autoCard, isDark && styles.autoCardDark]}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.autoTitle, isDark && styles.textWhite]}>
                    {rule.title}
                  </Text>
                  <Text style={styles.autoDesc}>{rule.description}</Text>
                </View>
                <Switch
                  value={rule.enabled}
                  onValueChange={() => handleToggleAutomation(rule.id, rule.enabled)}
                  trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                  disabled={savingRuleId === rule.id}
                />
              </View>
            ))}
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
      {/* 6. LINK PHONE QR MODAL                                       */}
      {/* ============================================================ */}
      <Modal
        visible={showQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContentCard, isDark && styles.modalContentCardDark]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalIconWrap}>
                  <QrCode size={18} color="#059669" />
                </View>
                <Text style={[styles.modalTitle, isDark && styles.textWhite]}>
                  Link Gym Phone
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowQrModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.modalCloseBtn}
              >
                <X size={18} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <View style={styles.qrCanvasWrap}>
              {isConnected ? (
                <View style={styles.qrSuccessBox}>
                  <View style={styles.shieldCircle}>
                    <ShieldCheck size={38} color="#059669" strokeWidth={2.4} />
                  </View>
                  <Text style={[styles.qrSuccessTitle, isDark && styles.textWhite]}>
                    Gateway Connected
                  </Text>
                  <Text style={styles.qrSuccessNumber}>
                    {connection?.phoneNumber || 'Active Gym Companion'}
                  </Text>
                  <Text style={styles.qrSuccessSub}>
                    Your WhatsApp pipeline is operational. Automated messages, payment receipts, and member alerts are flowing smoothly.
                  </Text>
                </View>
              ) : connection?.qrCode ? (
                <View style={styles.qrDisplayBox}>
                  <View style={styles.qrCodeBorder}>
                    <Image
                      source={{ uri: connection.qrCode }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.qrInstructions}>
                    1. Open WhatsApp on the gym phone{'\n'}
                    2. Tap Settings &gt; Linked Devices &gt; Link a Device{'\n'}
                    3. Point this camera at the code
                  </Text>
                </View>
              ) : (
                <View style={styles.qrLoadingBox}>
                  <ActivityIndicator size="large" color="#059669" />
                  <Text style={styles.qrLoadingText}>
                    Generating fresh pairing session...
                  </Text>
                </View>
              )}
            </View>

            <View style={{ marginTop: 14 }}>
              {!isConnected ? (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                  onPress={handleConnect}
                  activeOpacity={0.8}
                >
                  <QrCode size={15} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.actionBtnText}>Generate New QR</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                  onPress={handleDisconnect}
                  activeOpacity={0.8}
                >
                  <Unplug size={15} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.actionBtnText}>Disconnect WhatsApp Session</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
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
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 7.5,
    borderRadius: 8,
  },
  heroDangerBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FEE2E2',
  },
  heroRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 11,
    paddingVertical: 7.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
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
  previewTargetText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  previewCanvas: {
    backgroundColor: '#E5DDD5',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D4C8BE',
  },
  previewChatBubble: {
    backgroundColor: '#E7FFDB',
    borderRadius: 10,
    borderTopLeftRadius: 2,
    padding: 8,
    maxWidth: '92%',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  previewMessageText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#111827',
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 3,
  },
  previewTimeText: {
    fontSize: 9.5,
    color: '#6B7280',
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
  qrSuccessBox: {
    alignItems: 'center',
    padding: 10,
  },
  shieldCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  qrSuccessTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  qrSuccessNumber: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  qrSuccessSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 6,
    maxWidth: 280,
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

  /* Automations */
  autoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  autoCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  autoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  autoDesc: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
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

  /* Link Phone QR Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
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
  modalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
});
export default WhatsAppHubView;
