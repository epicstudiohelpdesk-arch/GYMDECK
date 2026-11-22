import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import BrandFooter from './BrandFooter.jsx';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Calendar,
  Check,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  History,
  Info,
  Layers,
  LayoutDashboard,
  Loader2,
  Lock,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Network,
  Pencil,
  Play,
  Plus,
  Radio,
  RefreshCcw,
  RefreshCw,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Target,
  Trash2,
  Type,
  UserCheck,
  Users,
  UserX,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { whatsappApi } from './whatsappApi.js';
import WhatsAppConnectionCard from './WhatsAppConnectionCard.jsx';

const TABS = [
  { id: 'compose', label: 'Composer Studio', icon: Send },
  { id: 'overview', label: 'Gateway Cockpit', icon: LayoutDashboard },
  { id: 'history', label: 'Message History', icon: History },
  { id: 'automation', label: 'Automation', icon: Bell },
  { id: 'settings', label: 'Settings & Consent', icon: Settings },
];

const NOTIFICATION_TYPES = [
  { id: 'announcement', label: 'Announcement', desc: 'General gym updates & facility news', icon: Megaphone, color: 'text-indigo-600', activeBg: 'bg-indigo-50/80', activeBorder: 'border-indigo-500', intent: 'SERVICE_ANNOUNCEMENT' },
  { id: 'expiry', label: 'Expiry Alert', desc: 'Membership expiring reminders', icon: Clock, color: 'text-amber-600', activeBg: 'bg-amber-50/80', activeBorder: 'border-amber-500', intent: 'MEMBERSHIP_EXPIRY' },
  { id: 'payment', label: 'Fee / Payment Due', desc: 'Pending fee alerts & receipts', icon: Zap, color: 'text-emerald-600', activeBg: 'bg-emerald-50/80', activeBorder: 'border-emerald-500', intent: 'PAYMENT_DUE' },
  { id: 'welcome', label: 'Welcome Kit', desc: 'New member orientation & details', icon: Users, color: 'text-blue-600', activeBg: 'bg-blue-50/80', activeBorder: 'border-blue-500', intent: 'MEMBERSHIP_WELCOME' },
  { id: 'attendance', label: 'Attendance Check-in', desc: 'Daily visit confirmation', icon: CheckCheck, color: 'text-teal-600', activeBg: 'bg-teal-50/80', activeBorder: 'border-teal-500', intent: 'ATTENDANCE' },
  { id: 'schedule', label: 'Class / Trainer', desc: 'Training session & slot timings', icon: CalendarIcon, color: 'text-purple-600', activeBg: 'bg-purple-50/80', activeBorder: 'border-purple-500', intent: 'CLASS_SCHEDULE' },
];

function CalendarIcon({ size = 16, className = '', strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
      <line x1="16" x2="16" y1="2" y2="6"/>
      <line x1="8" x2="8" y1="2" y2="6"/>
      <line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
  );
}

const SEGMENT_CHIPS = [
  { id: 'all', label: 'All Members', mode: 'ALL' },
  { id: 'active', label: 'Active', mode: 'ALL', status: 'ACTIVE' },
  { id: 'expiring', label: 'Expiring Soon', mode: 'EXPIRING' },
  { id: 'dues', label: 'Pending Dues', mode: 'PENDING_PAYMENT' },
  { id: 'attendance', label: 'Recent Visitors', mode: 'RECENT_ATTENDANCE' },
];

const VARIABLES = [
  '{{member_name}}',
  '{{gym_name}}',
  '{{membership_plan}}',
  '{{membership_expiry}}',
  '{{payment_amount}}',
  '{{payment_due_date}}',
  '{{trainer_name}}',
  '{{class_time}}',
];

const VARIABLE_CONFIGS = [
  { token: '{{member_name}}', label: 'Member Name', example: 'Rahul Sharma', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { token: '{{gym_name}}', label: 'Gym Name', example: 'GymDeck Fitness', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { token: '{{membership_plan}}', label: 'Plan Name', example: 'Gold Annual Pro', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { token: '{{membership_expiry}}', label: 'Expiry Date', example: '31 Dec 2026', color: 'bg-rose-50 text-rose-800 border-rose-200' },
  { token: '{{payment_amount}}', label: 'Fee Amount', example: '₹2,500', color: 'bg-teal-50 text-teal-800 border-teal-200' },
  { token: '{{payment_due_date}}', label: 'Due Date', example: '05 Dec 2026', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  { token: '{{trainer_name}}', label: 'Trainer Name', example: 'Vikram Singh', color: 'bg-purple-50 text-purple-800 border-purple-200' },
  { token: '{{class_time}}', label: 'Session Time', example: '07:30 AM', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
];

function getGymBrandName() {
  if (typeof localStorage !== 'undefined') {
    return (
      localStorage.getItem('gymdeck_gym_name') ||
      localStorage.getItem('gymdeck_gym_brand_name') ||
      'GymDeck Fitness'
    );
  }
  return 'GymDeck Fitness';
}

function renderVisualMessageText(templateText, selectedMember = null) {
  if (!templateText) return '';
  const gymName = getGymBrandName();
  const memberName = selectedMember
    ? (selectedMember.fullName || selectedMember.name || selectedMember.full_name || 'Rahul Sharma')
    : 'Rahul Sharma';
  const plan = selectedMember?.planName || selectedMember?.membership_plan || 'Gold Annual Pro';
  const expiry = selectedMember?.membershipExpiry || selectedMember?.expires_at
    ? new Date(selectedMember.membershipExpiry || selectedMember.expires_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '31 Dec 2026';

  const replacers = {
    '{{member_name}}': memberName,
    '{{gym_name}}': gymName,
    '{{membership_plan}}': plan,
    '{{membership_expiry}}': expiry,
    '{{payment_amount}}': '₹2,500',
    '{{payment_due_date}}': '05 Dec 2026',
    '{{trainer_name}}': selectedMember?.trainerName || 'Vikram Singh',
    '{{class_time}}': '07:30 AM',
  };

  return String(templateText).replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
    const full = `{{${key.toLowerCase()}}}`;
    return replacers[full] !== undefined ? replacers[full] : match;
  });
}

function convertVisualTextToTemplateTokens(text, selectedMember = null) {
  if (!text) return '';
  let converted = String(text);
  const gymName = getGymBrandName();
  if (selectedMember?.fullName) {
    converted = converted.split(selectedMember.fullName).join('{{member_name}}');
  }
  if (gymName) {
    converted = converted.split(gymName).join('{{gym_name}}');
  }
  if (selectedMember?.planName) {
    converted = converted.split(selectedMember.planName).join('{{membership_plan}}');
  }
  if (selectedMember?.trainerName) {
    converted = converted.split(selectedMember.trainerName).join('{{trainer_name}}');
  }
  return converted;
}

function resolveMemberPhoto(photo) {
  if (!photo || typeof photo !== 'string') return null;
  const p = photo.trim();
  if (!p || p.length < 5 || p.includes('dicebear.com')) return null;
  if (
    p.startsWith('data:') ||
    p.startsWith('http://') ||
    p.startsWith('https://') ||
    p.startsWith('blob:')
  ) {
    return p;
  }
  if (typeof window !== 'undefined' && window.__TAURI__?.core?.convertFileSrc) {
    try {
      return window.__TAURI__.core.convertFileSrc(p);
    } catch (e) {
      return p;
    }
  }
  return p;
}

const getAvatarStyle = (name) => {
  const styles = [
    { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { bg: 'bg-violet-50 text-violet-700 border-violet-200' },
    { bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    { bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { bg: 'bg-teal-50 text-teal-700 border-teal-200' },
  ];
  let hash = 0;
  const str = name || 'Member';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return styles[Math.abs(hash) % styles.length];
};

const STATUS_STYLES = {
  QUEUED: 'bg-sky-50 text-sky-700 border-sky-200',
  PROCESSING: 'bg-sky-50 text-sky-700 border-sky-200',
  ACCEPTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  SENT: 'bg-violet-50 text-violet-700 border-violet-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  READ: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  CANCELLED: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  DRAFT: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

function Badge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold tracking-wide font-mono ${
        STATUS_STYLES[status] || STATUS_STYLES.DRAFT
      }`}
    >
      {String(status || '').replace(/_/g, ' ')}
    </span>
  );
}

function CustomDropdown({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Select an option',
  className = '',
  buttonClassName = '',
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full h-10 px-3 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-2 shadow-2xs transition-all cursor-pointer focus:outline-none ${
          open ? 'ring-2 ring-indigo-500/20 border-indigo-500 bg-white' : ''
        } ${buttonClassName}`}
      >
        <span className="truncate text-left">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2.4}
          className={`text-slate-400 transition-transform duration-200 shrink-0 ${
            open ? 'transform rotate-180 text-indigo-600' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in-50 slide-in-from-top-1">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-xs text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <div className="min-w-0 flex-1 truncate">
                  <div className="truncate">{opt.label}</div>
                  {opt.sublabel && (
                    <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                      {opt.sublabel}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <Check size={13} strokeWidth={2.6} className="text-indigo-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs ${className}`}>{children}</div>
  );
}

function EmptyState({ title, description, icon: Icon = MessageCircle }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
        <Icon size={20} />
      </div>
      <p className="text-xs font-bold text-slate-800">{title}</p>
      <p className="text-[11px] text-slate-500 mt-1 max-w-sm leading-relaxed">{description}</p>
    </div>
  );
}

function Spinner({ label }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 py-6 justify-center">
      <Loader2 size={15} className="animate-spin text-indigo-600" />
      {label || 'Loading…'}
    </div>
  );
}

function ErrorNote({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
      <AlertCircle size={14} className="shrink-0 mt-0.5" />
      <span className="flex-1 leading-relaxed">{message}</span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="font-bold underline shrink-0 cursor-pointer">
          Retry
        </button>
      ) : null}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   1. COMPOSER STUDIO TAB (PARALLEL TO SEND NOTIFICATION)
════════════════════════════════════════════════════════════ */
function ComposeTab({ templates, onSent, connection, onNavigateTab }) {
  const [selectedType, setSelectedType] = useState('attendance');
  const [templateId, setTemplateId] = useState('');
  const [intent, setIntent] = useState('ATTENDANCE');
  const [messageTitle, setMessageTitle] = useState('');
  const [rawTemplatePattern, setRawTemplatePattern] = useState(
    'Hi {{member_name}}, your visit to {{gym_name}} was recorded successfully.'
  );
  const [body, setBody] = useState('');
  const isUserCustomEditRef = useRef(false);

  // Audience
  const [activeSegment, setActiveSegment] = useState('all');
  const [audienceRows, setAudienceRows] = useState([]);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceError, setAudienceError] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Preview & Send
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [error, setError] = useState('');
  const [showConnectNoticeModal, setShowConnectNoticeModal] = useState(false);
  const [showSendSuccessModal, setShowSendSuccessModal] = useState(false);
  const [dispatchedCount, setDispatchedCount] = useState(0);

  const textareaRef = useRef(null);

  const approvedTemplates = useMemo(
    () => (templates || []).filter((template) => template.isUsable),
    [templates]
  );

  // Currently focused / active selected member for visual live preview
  const selectedMember = useMemo(() => {
    if (selectedIds.length > 0) {
      const match = audienceRows.find((m) => m.id === selectedIds[0]);
      if (match) return match;
    }
    return audienceRows.length > 0 ? audienceRows[0] : null;
  }, [selectedIds, audienceRows]);

  // Sync selected campaign intent to template
  useEffect(() => {
    const matched = NOTIFICATION_TYPES.find((t) => t.id === selectedType);
    if (matched) {
      setIntent(matched.intent);
      const tmpl = approvedTemplates.find((t) => t.intent === matched.intent);
      if (tmpl) {
        setTemplateId(tmpl.id);
        const templatePattern = tmpl.body || '';
        setRawTemplatePattern(templatePattern);
        isUserCustomEditRef.current = false;
        setBody(renderVisualMessageText(templatePattern, selectedMember));
      } else {
        setTemplateId('');
      }
    }
  }, [selectedType, approvedTemplates]);

  // When selectedMember changes, update the body with this member's credentials if not custom edited
  useEffect(() => {
    if (!isUserCustomEditRef.current && rawTemplatePattern) {
      setBody(renderVisualMessageText(rawTemplatePattern, selectedMember));
    }
  }, [selectedMember, rawTemplatePattern]);

  // Load audience
  const loadAudience = useCallback(async () => {
    setAudienceLoading(true);
    setAudienceError('');
    try {
      const activeSeg = SEGMENT_CHIPS.find((c) => c.id === activeSegment) || SEGMENT_CHIPS[0];
      const result = await whatsappApi.getAudience({
        mode: activeSeg.mode,
        status: activeSeg.status,
        limit: 200,
      });

      let members = result?.members || [];

      // Check local Tauri database or window.cachedMembers for profile photos
      let localPhotoMap = new Map();
      if (typeof window !== 'undefined' && window.__TAURI__?.core?.invoke) {
        try {
          const dbMembers = await window.__TAURI__.core.invoke('get_members_command', {
            limit: 5000,
            offset: 0,
          });
          if (Array.isArray(dbMembers)) {
            for (const m of dbMembers) {
              const photo = m.profile_photo_path || m.photo_url || m.photoUrl || m.image || null;
              if (photo) {
                if (m.id) localPhotoMap.set(String(m.id), photo);
                if (m.member_code) localPhotoMap.set(String(m.member_code), photo);
                if (m.phone) localPhotoMap.set(String(m.phone).replace(/\D/g, ''), photo);
              }
            }
          }
        } catch (e) {
          console.warn('GymDeck: Could not load local member photos from Tauri', e);
        }
      }

      if (localPhotoMap.size === 0 && typeof window !== 'undefined' && Array.isArray(window.cachedMembers)) {
        for (const m of window.cachedMembers) {
          const photo = m.profile_photo_path || m.photo_url || m.photoUrl || m.image || null;
          if (photo) {
            if (m.id) localPhotoMap.set(String(m.id), photo);
            if (m.member_code) localPhotoMap.set(String(m.member_code), photo);
            if (m.phone) localPhotoMap.set(String(m.phone).replace(/\D/g, ''), photo);
          }
        }
      }

      if (localPhotoMap.size > 0) {
        members = members.map((m) => {
          if (m.profilePhotoUrl) return m;
          const phoneDigits = (m.phoneMasked || '').replace(/\D/g, '');
          const localPhoto =
            localPhotoMap.get(String(m.id)) ||
            localPhotoMap.get(String(m.memberCode)) ||
            (phoneDigits ? localPhotoMap.get(phoneDigits) : null);
          return localPhoto ? { ...m, profilePhotoUrl: localPhoto } : m;
        });
      }

      setAudienceRows(members);
    } catch (err) {
      setAudienceError(err.message || 'Could not load members.');
    } finally {
      setAudienceLoading(false);
    }
  }, [activeSegment]);

  useEffect(() => {
    loadAudience();
    const handleMemberChange = () => {
      loadAudience();
    };
    window.addEventListener('gymdeck:member-added', handleMemberChange);
    window.addEventListener('gymdeck:member-transferred', handleMemberChange);
    window.addEventListener('gymdeck:member-deleted', handleMemberChange);
    window.addEventListener('gymdeck:member-reactivated', handleMemberChange);
    return () => {
      window.removeEventListener('gymdeck:member-added', handleMemberChange);
      window.removeEventListener('gymdeck:member-transferred', handleMemberChange);
      window.removeEventListener('gymdeck:member-deleted', handleMemberChange);
      window.removeEventListener('gymdeck:member-reactivated', handleMemberChange);
    };
  }, [loadAudience]);

  // Filtered members by search
  const filteredMembers = useMemo(() => {
    const q = recipientSearch.toLowerCase().trim();
    if (!q) return audienceRows;
    return audienceRows.filter(
      (m) =>
        (m.fullName || '').toLowerCase().includes(q) ||
        (m.memberCode || '').toLowerCase().includes(q) ||
        (m.phoneMasked || '').includes(q)
    );
  }, [audienceRows, recipientSearch]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredMembers.length && filteredMembers.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMembers.map((m) => m.id));
    }
  };

  const toggleMember = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleInsertVariable = (variable) => {
    const el = textareaRef.current;
    if (!el) {
      setBody((prev) => `${prev} ${variable} `);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = body.slice(0, start) + variable + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + variable.length;
    });
  };

  const buildPayload = () => {
    // When sending to multiple or single recipients, if body has been personalized with a previewed member's name,
    // convert it back to generic template placeholders like {{member_name}} and {{gym_name}} so backend evaluates each recipient properly
    let finalBody = body.trim() || undefined;
    if (finalBody && !isUserCustomEditRef.current && rawTemplatePattern) {
      finalBody = rawTemplatePattern;
    } else if (finalBody && isUserCustomEditRef.current) {
      finalBody = convertVisualTextToTemplateTokens(finalBody, selectedMember);
    }

    return {
      audience: {
        mode: selectedIds.length > 0 ? 'SELECTED' : 'ALL',
        memberIds: selectedIds.length > 0 ? selectedIds : undefined,
      },
      body: finalBody,
      intent: intent || undefined,
      templateId: templateId || undefined,
    };
  };

  const handlePreview = async () => {
    // If WhatsApp is not connected, display the professional setup guide modal
    const isLive = connection?.connectionStatus === 'CONNECTED';
    if (!isLive) {
      setShowConnectNoticeModal(true);
      return;
    }

    setPreviewing(true);
    setError('');
    setSendResult(null);
    try {
      const res = await whatsappApi.preview(buildPayload());
      setPreview(res);
    } catch (err) {
      // If backend returns not connected error during preview
      if (err.message && /not connected|disconnected|session/i.test(err.message)) {
        setShowConnectNoticeModal(true);
      } else {
        setError(err.message || 'Could not prepare preview.');
      }
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    const isLive = connection?.connectionStatus === 'CONNECTED';
    if (!isLive) {
      setShowConnectNoticeModal(true);
      return;
    }
    if (!preview) {
      // Auto-preview first if not yet done
      setPreviewing(true);
      setError('');
      try {
        const previewRes = await whatsappApi.preview(buildPayload());
        setPreview(previewRes);
        if (!previewRes.canSend) {
          setError('Selected recipient is not eligible or missing required template variables.');
          setPreviewing(false);
          return;
        }
      } catch (err) {
        setError(err.message || 'Could not prepare preview.');
        setPreviewing(false);
        return;
      }
      setPreviewing(false);
    }

    setSending(true);
    setError('');
    const countToSend = selectedIds.length;
    try {
      const result = await whatsappApi.send({
        ...buildPayload(),
        confirm: true,
        clientBatchId:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : undefined,
      });
      setSendResult(result);
      setPreview(null);
      setDispatchedCount(result?.queued ?? countToSend);
      setSelectedIds([]);
      setShowSendSuccessModal(true);
      if (onSent) onSent();
    } catch (err) {
      setError(err.message || 'Could not queue the message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* ──── LEFT COLUMN (COL-SPAN-7): CONTENT STUDIO & SETTINGS ──── */}
      <div className="lg:col-span-7 space-y-4">
        {/* CARD 1: CAMPAIGN OBJECTIVE */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center font-mono">1</span>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Notification Objective
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Select campaign intent</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {NOTIFICATION_TYPES.map((type) => {
              const isSelected = selectedType === type.id;
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedType(type.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[72px] ${
                    isSelected
                      ? `${type.activeBg} ${type.activeBorder} shadow-2xs ring-1 ring-indigo-500/20`
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Icon size={16} className={isSelected ? type.color : 'text-slate-400'} strokeWidth={2.4} />
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div>
                    <div className={`text-xs font-black leading-tight ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                      {type.label}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium leading-tight truncate mt-0.5">
                      {type.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* CARD 2: MESSAGE CONTENT STUDIO */}
        <Card className="p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center font-mono">2</span>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Message Content Studio
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 font-mono">
              <span>{body.length} / 2000 chars</span>
            </div>
          </div>

          {/* Template Selector dropdown */}
          <CustomDropdown
            label="Active WhatsApp Template"
            value={templateId || intent}
            onChange={(val) => {
              const tmpl = approvedTemplates.find((t) => t.id === val);
              if (tmpl) {
                setTemplateId(tmpl.id);
                setIntent(tmpl.intent);
                const pattern = tmpl.body || '';
                setRawTemplatePattern(pattern);
                isUserCustomEditRef.current = false;
                setBody(renderVisualMessageText(pattern, selectedMember));
              } else {
                setTemplateId('');
                setIntent(val);
              }
            }}
            placeholder="Auto — use free text if customer window is open"
            options={[
              {
                value: '',
                label: 'Auto — use free text if customer window is open',
              },
              ...approvedTemplates.map((t) => ({
                value: t.id,
                label: `${t.label} (${t.templateName})`,
                sublabel: t.category ? `Category: ${t.category}` : undefined,
              })),
            ]}
          />

          {/* Message Body directly showing real member & gym credentials */}
          <div className="space-y-2">
            <div className="border border-slate-200/90 rounded-xl bg-white overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
              <textarea
                ref={textareaRef}
                rows={4}
                value={body}
                onChange={(e) => {
                  isUserCustomEditRef.current = true;
                  setBody(e.target.value.slice(0, 2000));
                }}
                placeholder="Type notification message here or choose an active template above..."
                className="w-full p-3.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
              />
              <div className="px-3 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>
                    Viewing details for: <strong className="text-slate-800">{selectedMember ? selectedMember.fullName : 'Select a member from directory'}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    isUserCustomEditRef.current = true;
                    setBody('');
                  }}
                  disabled={!body}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-xs ${
                    body
                      ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white cursor-pointer border border-rose-600'
                      : 'bg-rose-300 text-white/90 border border-rose-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Trash2 size={12} strokeWidth={2.4} />
                  <span>Clear Message</span>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* CARD 3: GATEWAY & ENGINE CONNECTION STATUS */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center font-mono">3</span>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Connected WhatsApp Line
              </h2>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              connection?.isLive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {connection?.isLive ? '● Engine Online' : '○ Offline'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200/80 flex items-center justify-center shadow-xs shrink-0">
                <img 
                  src="/whatsapp-logo.png" 
                  alt="WhatsApp" 
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 leading-tight">
                  {connection?.displayName || 'Registered Business Line'}
                </h4>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  {connection?.businessPhoneNumber ? `+${connection.businessPhoneNumber}` : '+91 6291773811'} · WhatsApp Linked Device
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                Direct Local Gateway
              </span>
            </div>
          </div>
        </Card>

        {/* PREVIEW CONTAINER */}
        {preview && (
          <Card className="p-5 border-indigo-200/80 bg-indigo-50/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-indigo-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Live Send Verification</h3>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-emerald-700 font-bold">{preview.counts?.eligible || 0} Eligible</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-medium">{preview.counts?.blocked || 0} Skipped</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              {preview.windowRule}
            </p>

            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200/80 rounded-xl bg-white shadow-2xs">
              {preview.recipients?.map((r) => (
                <div key={r.memberId} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {r.fullName} <span className="font-mono text-slate-400 font-normal">({r.phoneMasked || 'No phone'})</span>
                    </span>
                    <Badge status={r.eligible ? 'QUEUED' : 'REJECTED'} />
                  </div>
                  {r.eligible ? (
                    <p className="text-[11px] text-slate-700 mt-1 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {r.preview}
                    </p>
                  ) : (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold">{r.ownerMessage}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {sendResult && (
          <Card className="p-4 border-emerald-300 bg-emerald-50/60">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Broadcast dispatched successfully! {sendResult.queued} job(s) accepted into background delivery queue.</span>
            </div>
          </Card>
        )}

        <ErrorNote message={error} />
      </div>

      {/* ──── RIGHT COLUMN (COL-SPAN-5): AUDIENCE COCKPIT & LAUNCH ACTION ──── */}
      <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
        {/* AUDIENCE SELECTION COCKPIT */}
        <Card className="p-5 space-y-3.5">
          {/* Header with Selected Pill & Select All Toggle */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/80">
                <Users size={15} strokeWidth={2.4} />
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 leading-none">
                  Target Audience
                </h2>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                  Directory member selection
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span 
                className="px-2.5 py-1 rounded-lg text-xs font-black font-mono tracking-tight transition-all flex items-center gap-1 shadow-2xs"
                style={{
                  backgroundColor: selectedIds.length > 0 ? '#128C7E' : '#f1f5f9',
                  color: selectedIds.length > 0 ? '#ffffff' : '#64748b',
                  border: selectedIds.length > 0 ? '1px solid #075E54' : '1px solid #e2e8f0',
                }}
              >
                <span className={selectedIds.length > 0 ? 'text-white font-extrabold' : 'text-slate-600'}>
                  {String(selectedIds.length).padStart(2, '0')}
                </span>
                <span className={selectedIds.length > 0 ? 'text-white/60' : 'text-slate-400'}>/</span>
                <span className={selectedIds.length > 0 ? 'text-white/90' : 'text-slate-500'}>
                  {String(filteredMembers.length).padStart(2, '0')}
                </span>
              </span>

              <button
                type="button"
                onClick={toggleSelectAll}
                className="h-7 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
              >
                <CheckCheck size={12} strokeWidth={2.4} />
                <span>{selectedIds.length === filteredMembers.length && filteredMembers.length > 0 ? 'Deselect' : 'Select All'}</span>
              </button>
            </div>
          </div>

          {/* Instant Search Bar */}
          <div className="relative flex items-center w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={13} strokeWidth={2.2} />
            </div>
            <input
              type="text"
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              placeholder="Search member name, ID code, or phone..."
              className="w-full h-9 pl-9 pr-8 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200/90 focus:border-indigo-500 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
            />
            {recipientSearch ? (
              <button
                type="button"
                onClick={() => setRecipientSearch('')}
                className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={12} />
              </button>
            ) : null}
          </div>

          {/* Segment Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {SEGMENT_CHIPS.map((chip) => {
              const isActive = activeSegment === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveSegment(chip.id)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white font-black shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200/60'
                  }`}
                >
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>

          {/* Member Directory Scrollable List Container */}
          <div className="border border-slate-200/90 rounded-xl bg-white overflow-hidden shadow-2xs">
            <div className="bg-slate-50/90 border-b border-slate-100 px-3.5 py-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
              <span>Member Details ({filteredMembers.length})</span>
              <span>WhatsApp</span>
            </div>

            <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
              {audienceLoading ? (
                <Spinner label="Refreshing members from directory…" />
              ) : filteredMembers.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Users size={20} className="mx-auto mb-1 opacity-40" />
                  <p className="text-xs font-semibold text-slate-600">No members match search</p>
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const isSelected = selectedIds.includes(m.id);
                  const avatarStyle = getAvatarStyle(m.fullName);
                  const initials = (m.fullName || 'M')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  const photoSrc = resolveMemberPhoto(m.profilePhotoUrl);

                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleMember(m.id)}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none group ${
                        isSelected ? 'bg-indigo-50/60 hover:bg-indigo-50/80' : 'hover:bg-slate-50/90'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Visible Checkbox */}
                        <div
                          style={{
                            border: isSelected ? '2px solid #4f46e5' : '2px solid #94a3b8',
                            backgroundColor: isSelected ? '#4f46e5' : '#ffffff',
                            width: '20px',
                            height: '20px',
                            minWidth: '20px',
                            minHeight: '20px',
                          }}
                          className="rounded-md flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs group-hover:border-indigo-500"
                        >
                          {isSelected && <Check size={12} strokeWidth={3.5} className="text-white" />}
                        </div>

                        {/* Profile Avatar */}
                        <div
                          className={`relative w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] aspect-square rounded-full border flex items-center justify-center shrink-0 overflow-hidden select-none shadow-2xs font-black text-xs ${avatarStyle.bg}`}
                        >
                          <span className="text-[11px] font-black tracking-wider leading-none">
                            {initials}
                          </span>
                          {photoSrc ? (
                            <img
                              src={photoSrc}
                              alt={m.fullName}
                              className="absolute inset-0 w-full h-full object-cover object-center rounded-full aspect-square"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : null}
                        </div>

                        {/* Name & Phone */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-950 font-extrabold' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                              {m.fullName}
                            </span>
                            <span className="text-[9px] font-mono font-semibold text-slate-400 bg-slate-100 px-1 py-0.2 rounded border border-slate-200/60 shrink-0">
                              {m.memberCode}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium truncate mt-0.5">
                            <span className="font-mono">{m.phoneMasked || 'No phone'}</span>
                            <span className="text-slate-300">•</span>
                            <span className="capitalize">{m.membershipStatus}</span>
                          </div>
                        </div>
                      </div>

                      {/* WhatsApp Readiness Badge */}
                      <div className="shrink-0 pl-1">
                        {m.eligibleForWhatsApp ? (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 border bg-emerald-50 text-emerald-700 border-emerald-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ready
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 border bg-amber-50 text-amber-700 border-amber-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>

        {/* LAUNCH BROADCAST ACTION CARD */}
        <Card className="p-5 space-y-3.5">
          <div className="space-y-1.5 text-xs">
            {selectedIds.length > 0 ? (
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span>Selected Recipients:</span>
                <strong className="text-slate-900 font-bold font-mono">
                  {selectedIds.length} {selectedIds.length === 1 ? 'member' : 'members'}
                </strong>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span>Channel:</span>
              <strong className="text-slate-900 font-bold">WhatsApp Business Gateway</strong>
            </div>
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span>Delivery Mechanism:</span>
              <strong className="text-emerald-600 font-bold">Automated Headless Queue</strong>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewing || sending}
              className="h-12 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {previewing ? <Loader2 size={15} className="animate-spin text-indigo-600" /> : <RefreshCw size={14} />}
              <span>Preview</span>
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={sending || selectedIds.length === 0}
              className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all shadow-md ${
                sending
                  ? 'bg-slate-200 text-slate-400 cursor-wait shadow-none'
                  : selectedIds.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-98 cursor-pointer'
              }`}
            >
              {sending ? (
                <>
                  <RefreshCcw size={16} className="animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Send WhatsApp</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
            <Shield size={11} className="text-emerald-600" />
            <span>Dispatched through OpenWA headless gateway with webhook delivery receipts</span>
          </div>
        </Card>
      </div>

      {/* ─── MODAL: WHATSAPP NOT CONNECTED NOTICE (SETUP GUIDE STYLE) ─── */}
      {showConnectNoticeModal && typeof document !== 'undefined' ? (
        createPortal(
          <div 
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 transition-all duration-200 animate-in fade-in"
            style={{
              background: 'rgba(14, 18, 28, 0.44)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowConnectNoticeModal(false);
            }}
          >
            <div 
              className="w-full max-w-[440px] rounded-[32px] p-8 transition-all duration-200 text-left relative"
              style={{
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 32px 80px rgba(15, 23, 42, 0.22)',
              }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowConnectNoticeModal(false)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={17} />
              </button>

              <div className="mb-2">
                <p className="logout-dialog-kicker" style={{ margin: 0 }}>Connection required</p>
              </div>

              {/* Title with Official WhatsApp Branding */}
              <h2 className="text-slate-900 font-extrabold tracking-tight flex items-center flex-wrap gap-2.5" style={{ fontSize: '1.65rem', lineHeight: '1.25' }}>
                <span>Connect</span>
                <span 
                  className="inline-flex items-center gap-2"
                  style={{
                    color: '#25D366',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                  }}
                >
                  <img 
                    src="/whatsapp-logo.png" 
                    alt="WhatsApp" 
                    className="w-7 h-7 object-contain inline-block shrink-0 -mt-0.5"
                  />
                  <span>WhatsApp</span>
                </span>
              </h2>

              <p 
                className="text-slate-500 font-normal leading-relaxed"
                style={{
                  margin: '12px 0 0',
                  fontSize: '0.88rem',
                  lineHeight: '1.55',
                  color: '#556070',
                }}
              >
                Your gym WhatsApp account is not linked. To preview or dispatch automated receipts, membership reminders, and alerts, link the gym's official phone by QR:
              </p>

              {/* Quick Steps */}
              <div className="mt-5 space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 transition-colors hover:bg-slate-50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    1
                  </span>
                  <div className="text-xs text-slate-700 leading-snug pt-0.5">
                    Navigate to the <span className="font-semibold text-slate-900">Gateway Cockpit</span> tab.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 transition-colors hover:bg-slate-50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    2
                  </span>
                  <div className="text-xs text-slate-700 leading-snug pt-0.5">
                    Click <span className="font-semibold text-slate-900">Connect WhatsApp</span> to generate a secure QR code.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 transition-colors hover:bg-slate-50">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    3
                  </span>
                  <div className="text-xs text-slate-700 leading-snug pt-0.5">
                    Scan with gym WhatsApp &rarr; <span className="font-semibold text-slate-900">Linked devices</span>.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div 
                className="logout-dialog-actions"
                style={{
                  marginTop: '28px',
                  display: 'flex',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowConnectNoticeModal(false)}
                  className="dialog-btn dialog-btn-muted cursor-pointer"
                  style={{
                    minHeight: '48px',
                    borderRadius: '16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowConnectNoticeModal(false);
                    if (onNavigateTab) onNavigateTab('overview');
                  }}
                  className="dialog-btn dialog-btn-danger cursor-pointer"
                  style={{
                    minHeight: '48px',
                    borderRadius: '16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  <span>Go to Gateway</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-arrow-icon" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      ) : null}

      {/* ─── MODAL: MESSAGE SENT SUCCESS (SETUP GUIDE STYLE) ─── */}
      {showSendSuccessModal && typeof document !== 'undefined' ? (
        createPortal(
          <div 
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 transition-all duration-200 animate-in fade-in"
            style={{
              background: 'rgba(14, 18, 28, 0.44)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowSendSuccessModal(false);
            }}
          >
            <div 
              className="w-full max-w-[440px] rounded-[32px] p-8 transition-all duration-200 text-left relative"
              style={{
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 32px 80px rgba(15, 23, 42, 0.22)',
              }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowSendSuccessModal(false)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={17} />
              </button>

              <div className="mb-2">
                <p className="logout-dialog-kicker" style={{ margin: 0 }}>Dispatch Confirmed</p>
              </div>

              {/* Title with Official WhatsApp Branding */}
              <h2 className="text-slate-900 font-extrabold tracking-tight flex items-center flex-wrap gap-2.5" style={{ fontSize: '1.65rem', lineHeight: '1.25' }}>
                <span>Message</span>
                <span 
                  className="inline-flex items-center gap-2"
                  style={{
                    color: '#25D366',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                  }}
                >
                  <img 
                    src="/whatsapp-logo.png" 
                    alt="WhatsApp" 
                    className="w-7 h-7 object-contain inline-block shrink-0 -mt-0.5"
                  />
                  <span>Sent</span>
                </span>
                <span className="text-emerald-600">!</span>
              </h2>

              <p 
                className="text-slate-500 font-normal leading-relaxed"
                style={{
                  margin: '12px 0 0',
                  fontSize: '0.88rem',
                  lineHeight: '1.55',
                  color: '#556070',
                }}
              >
                Broadcast dispatched successfully through the gym's official line. The background queue has accepted the request with delivery receipts enabled.
              </p>

              {/* Status Graphic & Details Card */}
              <div className="mt-5 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-3.5 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs shrink-0">
                  <ShieldCheck size={26} strokeWidth={2.4} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                      Queue Accepted
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-[11px] font-mono text-emerald-800 mt-0.5 font-medium">
                    {dispatchedCount} {dispatchedCount === 1 ? 'message' : 'messages'} enqueued for dispatch
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div 
                className="logout-dialog-actions"
                style={{
                  marginTop: '28px',
                  display: 'flex',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowSendSuccessModal(false)}
                  className="dialog-btn dialog-btn-danger cursor-pointer"
                  style={{
                    minHeight: '48px',
                    borderRadius: '16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    width: '100%',
                  }}
                >
                  <span>Done & Close</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-arrow-icon" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      ) : null}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   2. GATEWAY COCKPIT (OVERVIEW)
════════════════════════════════════════════════════════════ */
function OverviewTab({ overview, loading, error, onRefresh }) {
  const [expandedFaqId, setExpandedFaqId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const toggleFaq = (id) => {
    setExpandedFaqId((curr) => (curr === id ? null : id));
  };

  const handleManualRefresh = async () => {
    if (refreshing || typeof onRefresh !== 'function') return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  if (loading && !overview) return <Spinner label="Reading WhatsApp activity…" />;

  const today = overview?.today || {};
  const queued = today.queued || 0;
  const accepted = today.accepted || 0;
  const delivered = today.delivered || 0;
  const read = today.read || 0;
  const failed = (today.failed || 0) + (today.rejected || 0);
  const totalVolume = queued + accepted + delivered + read + failed;

  // Calculate delivery success rate
  const successCount = delivered + read;
  const processedCount = successCount + failed;
  const deliveryRate = processedCount > 0 ? Math.round((successCount / processedCount) * 100) : 100;

  const totalMembers = overview?.consent?.totalMembers || 0;
  const optedInMembers = overview?.consent?.optedIn ?? overview?.consent?.granted ?? 0;
  const consentPercentage = totalMembers > 0 ? Math.round((optedInMembers / totalMembers) * 100) : 100;

  const statsCards = [
    {
      label: 'Queued',
      value: queued,
      sublabel: 'Pending dispatch',
      icon: Clock,
      tone: 'sky',
      badgeBg: 'bg-sky-50 text-sky-700 border-sky-200/80',
      iconBg: 'bg-sky-50 text-sky-600 border-sky-100',
    },
    {
      label: 'Accepted',
      value: accepted,
      sublabel: 'Gateway received',
      icon: Send,
      tone: 'indigo',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      label: 'Delivered',
      value: delivered,
      sublabel: 'Confirmed on handset',
      icon: CheckCheck,
      tone: 'emerald',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      label: 'Read by Member',
      value: read,
      sublabel: 'Blue tick receipt',
      icon: CheckCircle2,
      tone: 'teal',
      badgeBg: 'bg-teal-50 text-teal-800 border-teal-200/80',
      iconBg: 'bg-teal-50 text-teal-600 border-teal-100',
    },
    {
      label: 'Failed / Skipped',
      value: failed,
      sublabel: 'Blocked or invalid',
      icon: AlertCircle,
      tone: failed > 0 ? 'rose' : 'zinc',
      badgeBg: failed > 0 ? 'bg-rose-50 text-rose-700 border-rose-200/80' : 'bg-slate-100 text-slate-500 border-slate-200',
      iconBg: failed > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-100 text-slate-500 border-slate-200',
    },
  ];

  return (
    <div className="space-y-4">
      <ErrorNote message={error} onRetry={onRefresh} />

      {/* ─── COCKPIT TOP SUMMARY HEADER (PREMIUM OPERATIONAL DASHBOARD) ─── */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Activity size={19} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
                  Gateway Telemetry & Pipeline
                </h2>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Real-time outbound transmission metrics, compliance opt-in, and companion health.
              </p>
            </div>
          </div>

          {/* Quick Rate & Volume Indicators */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Today</span>
              <span className="text-sm font-black text-zinc-900 font-mono tabular-nums leading-none">{totalVolume}</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Success Rate</span>
              <span className="text-sm font-black text-emerald-700 font-mono tabular-nums leading-none">{deliveryRate}%</span>
            </div>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
              title="Refresh telemetry"
              aria-label="Refresh telemetry"
            >
              <RefreshCw size={13} strokeWidth={2.2} className={refreshing ? 'animate-spin text-emerald-600' : ''} />
            </button>
          </div>
        </div>

        {/* 5-Column Live Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-zinc-100">
          {statsCards.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="bg-zinc-50/70 hover:bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-xl p-3.5 transition-all shadow-2xs group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 truncate">
                    {s.label}
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-white border border-zinc-200/90 text-zinc-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <Icon size={12} strokeWidth={2.2} />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-zinc-900 tracking-tight tabular-nums font-mono leading-none">
                    {s.value}
                  </span>
                  <span className="text-[10px] font-medium text-zinc-400 font-mono">msgs</span>
                </div>
                <p className="text-[10.5px] text-zinc-500 font-normal truncate mt-1">
                  {s.sublabel}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION 2: CONNECTION HARDWARE & PIPELINE COMPLIANCE ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* CONNECTION CONTROL PANEL (COL-SPAN-8) */}
        <div className="lg:col-span-8 flex flex-col h-full">
          <WhatsAppConnectionCard onStatusChange={onRefresh} />
        </div>

        {/* COMPLIANCE & PROTOCOL TELEMETRY (COL-SPAN-4) */}
        <div className="lg:col-span-4 flex flex-col justify-between bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-2xs h-full">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-zinc-100 border border-zinc-200/80 text-zinc-800 flex items-center justify-center shrink-0 shadow-2xs">
                  <Database size={13} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 tracking-tight leading-none">
                    Pipeline Compliance
                  </h4>
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">Automated opt-in records</span>
                </div>
              </div>
              <span className="text-[10.5px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Opt-in {consentPercentage}%
              </span>
            </div>

            <div className="mt-3.5">
              <div className="p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/70 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Opted-In Members</span>
                  <span className="text-base font-black text-zinc-900 font-mono tabular-nums leading-tight block mt-1">
                    {optedInMembers} <span className="text-xs text-zinc-400 font-normal font-sans">/ {totalMembers} members</span>
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200/80 text-zinc-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <UserCheck size={15} strokeWidth={2} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 3: SECURITY & DATA GOVERNANCE (MATCHING BANKING & SETTLEMENT FAQ DESIGN) ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
        {/* Header Block matching Banking & Settlement */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldCheck size={18} strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
              Security & Non-Custodial Data Policy
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Common questions regarding companion WhatsApp connectivity, privacy permissions, and non-custodial safeguards.
            </p>
          </div>
        </div>

        {/* FAQ Accordion List matching Banking & Settlement Item Design */}
        <div className="space-y-2">
          {[
            {
              id: 'faq-whatsapp-device',
              icon: Smartphone,
              question: 'Does GymDeck access private chats or personal messages?',
              topic: 'Zero Chat Logging',
              tag: 'Non-Custodial',
              tagColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
              answer:
                'No. GymDeck functions strictly as an automated companion outbound pipeline for official transactional receipts and renewal notices. We never log, store, or read personal conversations or incoming private messages from your linked phone.',
            },
            {
              id: 'faq-whatsapp-connection',
              icon: Trash2,
              question: 'What happens when I disconnect or logout?',
              topic: 'Instant Session Purge',
              tag: 'Session Purged',
              tagColor: 'bg-zinc-100 text-zinc-700 border-zinc-200',
              answer:
                'Clicking Disconnect immediately sends a logout command to WhatsApp Web and purges local encryption tokens. No background daemon remains connected. Reconnecting requires a brand-new QR code scan.',
            },
            {
              id: 'faq-whatsapp-cost',
              icon: Zap,
              question: 'Are there Meta per-conversation API fees or template charges?',
              topic: 'Zero Platform Toll',
              tag: '₹0.00 Meta Fee',
              tagColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
              answer:
                'Zero Meta API fees. Messages dispatch through your gym phone line via local headless companion sockets. You do not need a Meta Cloud API developer account or paid WhatsApp Business conversation packs.',
            },
            {
              id: 'faq-whatsapp-custody',
              icon: ShieldAlert,
              question: 'Does GymDeck ever hold, pool, or custody member phone data?',
              topic: 'Non-Custodial Data',
              tag: 'Zero Data Brokerage',
              tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
              answer:
                'All contact records and invoice PDFs reside locally in your isolated gym database with AES-256 encryption. Phone numbers are masked across dashboards and never shared with third-party advertising brokers.',
            },
            {
              id: 'faq-whatsapp-autodebit',
              icon: Lock,
              question: 'Can messages ever be sent without gym owner consent or authorization?',
              topic: 'Zero Auto-Dispatch Abuse',
              tag: 'Opt-In Mandatory',
              tagColor: 'bg-zinc-100 text-zinc-700 border-zinc-200',
              answer:
                'Automated messages only dispatch for events explicitly toggled in your Automation settings (e.g. digital payment receipt or expiring membership). Mass broadcasts require manual owner composition and send confirmation.',
            },
            {
              id: 'faq-whatsapp-credentials',
              icon: Database,
              question: 'What WhatsApp credentials and secrets does GymDeck store?',
              topic: 'Zero Credential Storage',
              tag: 'Sandbox Stored',
              tagColor: 'bg-zinc-100 text-zinc-700 border-zinc-200',
              answer:
                'We strictly never store or transmit your WhatsApp account passwords, PINs, or cloud backups. WhatsApp Web companion authentication session tokens are stored in an encrypted sandbox on your local machine.',
            },
          ].map((faq) => {
            const isOpen = expandedFaqId === 'all' || expandedFaqId === faq.id;
            const IconComp = faq.icon;

            return (
              <div
                key={faq.id}
                className={`rounded-xl border transition-all duration-150 overflow-hidden ${
                  isOpen
                    ? 'border-zinc-300 bg-white shadow-2xs'
                    : 'border-zinc-200/80 bg-zinc-50/60 hover:bg-zinc-50 hover:border-zinc-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left gap-3 cursor-pointer select-none"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isOpen
                          ? 'bg-zinc-900 text-white'
                          : 'bg-white text-zinc-700 border border-zinc-200/80 shadow-2xs'
                      }`}
                    >
                      <IconComp size={14} strokeWidth={2} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-xs font-bold text-zinc-900">{faq.question}</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2.5">
                    <span className="text-[10px] text-zinc-400 font-mono hidden md:inline">{faq.topic}</span>
                    <ChevronDown
                      size={14}
                      strokeWidth={2}
                      className={`text-zinc-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-zinc-800' : ''
                      }`}
                    />
                  </div>
                </button>

                {isOpen ? (
                  <div className="px-4 pb-3.5 pt-1 border-t border-zinc-100 bg-white">
                    <p className="text-xs text-zinc-600 leading-relaxed pl-10">
                      {faq.answer}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Technical Security & Regulatory Specs Grid matching Banking & Settlement */}
        <div className="pt-1">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div
              title="Session credentials encrypted at rest using AES-256."
              className="p-2.5 bg-zinc-50/80 rounded-xl border border-zinc-200/80 flex items-center gap-2.5 hover:bg-zinc-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-white border border-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Lock size={13} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-zinc-900 text-xs truncate leading-tight">256-Bit Hardware AES</div>
                <div className="text-[10px] text-zinc-400 font-mono truncate leading-tight mt-0.5">Local Sandbox Vault</div>
              </div>
            </div>

            <div
              title="End-to-end cryptographic transit tunneling protecting companion socket events."
              className="p-2.5 bg-zinc-50/80 rounded-xl border border-zinc-200/80 flex items-center gap-2.5 hover:bg-zinc-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-white border border-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Network size={13} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-zinc-900 text-xs truncate leading-tight">TLS 1.3 Strict Tunnel</div>
                <div className="text-[10px] text-zinc-400 font-mono truncate leading-tight mt-0.5">Encrypted WebSocket</div>
              </div>
            </div>

            <div
              title="Full telecom compliance with WhatsApp outbound rate-limits and opt-in consent mandates."
              className="p-2.5 bg-zinc-50/80 rounded-xl border border-zinc-200/80 flex items-center gap-2.5 hover:bg-zinc-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-white border border-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck size={13} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-zinc-900 text-xs truncate leading-tight">Consent & Opt-In Rules</div>
                <div className="text-[10px] text-zinc-400 font-mono truncate leading-tight mt-0.5">Anti-Spam Safeguards</div>
              </div>
            </div>

            <div
              title="Official direct messaging pipeline with zero intermediary delays or third-party message hops."
              className="p-2.5 bg-zinc-50/80 rounded-xl border border-zinc-200/80 flex items-center gap-2.5 hover:bg-zinc-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-white border border-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle2 size={13} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-zinc-900 text-xs truncate leading-tight">Zero-Intermediary Rails</div>
                <div className="text-[10px] text-zinc-400 font-mono truncate leading-tight mt-0.5">Direct Outbound Pipeline</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   3. MESSAGE HISTORY TAB
════════════════════════════════════════════════════════════ */
function HistoryTab({ onChanged }) {
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [deletingId, setDeletingId] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await whatsappApi.getMessages({ status, search, limit: 100 });
      let loaded = result?.messages || [];

      // Check local Tauri database or window.cachedMembers for profile photos fallback
      let localPhotoMap = new Map();
      if (typeof window !== 'undefined' && window.__TAURI__?.core?.invoke) {
        try {
          const dbMembers = await window.__TAURI__.core.invoke('get_members_command', {
            limit: 5000,
            offset: 0,
          });
          if (Array.isArray(dbMembers)) {
            for (const m of dbMembers) {
              const photo = m.profile_photo_path || m.photo_url || m.photoUrl || m.image || null;
              if (photo) {
                if (m.id) localPhotoMap.set(String(m.id), photo);
                if (m.member_code) localPhotoMap.set(String(m.member_code), photo);
                if (m.phone) localPhotoMap.set(String(m.phone).replace(/\D/g, ''), photo);
              }
            }
          }
        } catch (e) {
          // ignore fallback error
        }
      }

      if (localPhotoMap.size === 0 && typeof window !== 'undefined' && Array.isArray(window.cachedMembers)) {
        for (const m of window.cachedMembers) {
          const photo = m.profile_photo_path || m.photo_url || m.photoUrl || m.image || null;
          if (photo) {
            if (m.id) localPhotoMap.set(String(m.id), photo);
            if (m.member_code) localPhotoMap.set(String(m.member_code), photo);
            if (m.phone) localPhotoMap.set(String(m.phone).replace(/\D/g, ''), photo);
          }
        }
      }

      if (localPhotoMap.size > 0) {
        loaded = loaded.map((m) => {
          if (m.recipientPhoto) return m;
          const phoneDigits = (m.recipientMasked || '').replace(/\D/g, '');
          const localPhoto =
            (m.memberId ? localPhotoMap.get(String(m.memberId)) : null) ||
            (phoneDigits ? localPhotoMap.get(phoneDigits) : null);
          return localPhoto ? { ...m, recipientPhoto: localPhoto } : m;
        });
      }

      setMessages(loaded);
    } catch (err) {
      setError(err.message || 'Could not load message history.');
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await whatsappApi.deleteMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
      if (onChanged) onChanged();
    } catch (err) {
      setError(err.message || 'Could not delete the message record.');
    } finally {
      setDeletingId('');
    }
  };

  const statusCounts = useMemo(() => {
    const counts = { ALL: messages.length, DELIVERED: 0, READ: 0, FAILED: 0, QUEUED: 0 };
    for (const m of messages) {
      if (m.deliveryStatus === 'DELIVERED') counts.DELIVERED++;
      else if (m.deliveryStatus === 'READ') counts.READ++;
      else if (m.deliveryStatus === 'FAILED' || m.deliveryStatus === 'REJECTED') counts.FAILED++;
      else if (m.deliveryStatus === 'QUEUED' || m.deliveryStatus === 'PROCESSING') counts.QUEUED++;
    }
    return counts;
  }, [messages]);

  return (
    <div className="space-y-4">
      {/* ─── METRIC CARDS / STAT TILES ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Total Logged
            </span>
            <div className="text-xl font-black text-slate-900 font-mono tabular-nums leading-tight">
              {statusCounts.ALL}
            </div>
            <span className="text-[10px] font-medium text-slate-500 block truncate mt-0.5">All transmissions</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/60">
            <Layers size={15} strokeWidth={2.4} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Delivered
            </span>
            <div className="text-xl font-black text-emerald-700 font-mono tabular-nums leading-tight">
              {statusCounts.DELIVERED}
            </div>
            <span className="text-[10px] font-medium text-slate-500 block truncate mt-0.5">Handset confirmed</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCheck size={15} strokeWidth={2.4} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Read by Member
            </span>
            <div className="text-xl font-black text-teal-700 font-mono tabular-nums leading-tight">
              {statusCounts.READ}
            </div>
            <span className="text-[10px] font-medium text-slate-500 block truncate mt-0.5">Blue tick receipt</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
            <CheckCircle2 size={15} strokeWidth={2.4} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Failed / Blocked
            </span>
            <div className="text-xl font-black text-rose-700 font-mono tabular-nums leading-tight">
              {statusCounts.FAILED}
            </div>
            <span className="text-[10px] font-medium text-slate-500 block truncate mt-0.5">Delivery exceptions</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-100">
            <AlertCircle size={15} strokeWidth={2.4} />
          </div>
        </div>
      </div>

      {/* ─── FILTER CONTROL BAR (COMPACT & MODERN) ─── */}
      <Card className="p-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CustomDropdown
              value={status}
              onChange={(val) => setStatus(val)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'QUEUED', label: 'Queued' },
                { value: 'PROCESSING', label: 'Processing' },
                { value: 'ACCEPTED', label: 'Accepted' },
                { value: 'SENT', label: 'Sent' },
                { value: 'DELIVERED', label: 'Delivered' },
                { value: 'READ', label: 'Read' },
                { value: 'FAILED', label: 'Failed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
              className="w-full sm:w-44"
              buttonClassName="h-9 rounded-xl border border-slate-200/90 text-xs font-bold shadow-2xs"
            />

            <div className="relative flex-1 min-w-44 flex items-center w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={13} strokeWidth={2.2} />
              </div>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search member name, ID code, or phone..."
                className="w-full h-9 pl-9 pr-8 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200/90 focus:border-indigo-500 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <span className="text-[11px] font-mono text-slate-400 font-medium sm:hidden">
              {messages.length} log(s)
            </span>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-all shrink-0"
            >
              <RefreshCw size={11} strokeWidth={2.4} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
        <ErrorNote message={error} onRetry={load} />
      </Card>

      {/* ─── DATA TABLE / AUDIT LEDGER ─── */}
      <Card className="overflow-hidden shadow-2xs border-slate-200">
        <div className="bg-slate-50/90 border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={14} className="text-slate-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Transmission Ledger
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-400 ml-0.5">
              ({messages.length})
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400">
            Real-time delivery receipts
          </span>
        </div>

        {loading ? (
          <Spinner label="Loading transmission records…" />
        ) : messages.length === 0 ? (
          <EmptyState
            title="No transmission records match"
            description="Broadcasts sent from Composer Studio or background automations appear here with live handset receipts."
            icon={History}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 text-[10.5px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold">Recipient</th>
                  <th className="px-4 py-3 font-bold">Channel / Type</th>
                  <th className="px-4 py-3 font-bold">Sent At</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Content Preview</th>
                  <th className="px-4 py-3 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.map((m) => {
                  const avatar = getAvatarStyle(m.recipientName);
                  const photoSrc = resolveMemberPhoto(m.recipientPhoto);
                  const isDeleting = deletingId === m.id;
                  return (
                    <tr 
                      key={m.id} 
                      onClick={() => setSelectedMessage(m)}
                      className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                      title="Click anywhere to inspect message log"
                    >
                      {/* RECIPIENT */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {photoSrc ? (
                            <img
                              src={photoSrc}
                              alt={m.recipientName || 'Member'}
                              className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200/90 shadow-2xs"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                  e.currentTarget.nextElementSibling.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${avatar.bg} ${photoSrc ? 'hidden' : ''}`}
                          >
                            {(m.recipientName || 'M').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 leading-tight truncate group-hover:text-indigo-600 transition-colors">
                              {m.recipientName || 'Member'}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5 leading-none">
                              {m.recipientMasked || '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* CHANNEL / TYPE */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100/90 text-slate-700 border border-slate-200/80">
                          {m.messageType === 'TEMPLATE'
                            ? m.templateName || 'Utility Template'
                            : 'Direct Message'}
                        </span>
                      </td>

                      {/* TIMESTAMP */}
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge status={m.deliveryStatus} />
                      </td>

                      {/* PREVIEW */}
                      <td className="px-4 py-3 text-[11.5px] text-slate-600 max-w-xs md:max-w-sm">
                        {m.failureReason ? (
                          <div className="flex items-center gap-1.5 text-rose-600 font-semibold truncate">
                            <AlertCircle size={12} className="shrink-0" />
                            <span className="truncate">{m.failureReason}</span>
                          </div>
                        ) : (
                          <span className="truncate block font-medium group-hover:text-slate-900 transition-colors">
                            {m.preview || '—'}
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, m.id)}
                            disabled={isDeleting}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200/60 cursor-pointer transition-all disabled:opacity-50"
                            title="Delete message record"
                            aria-label="Delete message record"
                          >
                            {isDeleting ? (
                              <Loader2 size={13} className="animate-spin text-rose-600" />
                            ) : (
                              <Trash2 size={13} strokeWidth={2} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ─── MESSAGE DETAILS MODAL ─── */}
      {selectedMessage && typeof document !== 'undefined' ? (
        createPortal(
          <div
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 transition-all duration-200 animate-in fade-in"
            style={{
              background: 'rgba(14, 18, 28, 0.44)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedMessage(null);
            }}
          >
            <div
              className="w-full max-w-[460px] rounded-[28px] p-6 transition-all duration-200 text-left relative bg-white border border-slate-100"
              style={{
                boxShadow: '0 32px 80px rgba(15, 23, 42, 0.22)',
              }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>

              <div className="mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Message Dispatch Record
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 mb-4 pr-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                    {selectedMessage.recipientName || 'Member'}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    {selectedMessage.recipientMasked || selectedMessage.recipientNumber}
                  </p>
                </div>
                <Badge status={selectedMessage.deliveryStatus} />
              </div>

              {/* Message Content Bubble (WhatsApp style preview) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Dispatched Text
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                  {selectedMessage.preview || selectedMessage.messagePayload || 'No content preview available.'}
                </p>
              </div>

              {/* Meta details grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] mb-5">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Type</span>
                  <span className="font-semibold text-slate-700">{selectedMessage.messageType || 'TEXT'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Sent Time</span>
                  <span className="font-semibold text-slate-700 font-mono text-[10px]">
                    {new Date(selectedMessage.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedMessage.failureReason && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs mb-4 flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Failure Diagnostics:</strong>
                    <span>{selectedMessage.failureReason}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Close Record
              </button>
            </div>
          </div>,
          document.body
        )
      ) : null}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   4. AUTOMATION TAB (PRO DOTTED STUDIO WITH CUSTOM FLOW BUILDER)
════════════════════════════════════════════════════════════ */
const CUSTOM_AUTOMATIONS_STORAGE_KEY = 'gymdeck_whatsapp_custom_automations_v1';

const DEFAULT_CUSTOM_FLOWS = [
  {
    id: 'flow-welcome-onboard',
    name: 'Day 1 Member Welcome & Locker Guidelines',
    category: 'ONBOARDING',
    targetSegment: 'active',
    targetSegmentLabel: 'Active Members',
    sendTime: '10:30',
    scheduleType: 'DAILY',
    scheduleDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    isEnabled: true,
    messageBody: 'Hello {{member_name}}! 🏋️ Welcome to {{gym_name}}. Your {{membership_plan}} plan is active. Please remember to bring a gym towel and clean indoor sneakers. See you on the floor!',
    lastTriggeredAt: null,
    dispatchedCount: 18,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'flow-weekend-bootcamp',
    name: 'Saturday Strength & HIIT Workout Reminder',
    category: 'CLASS_REMINDER',
    targetSegment: 'all',
    targetSegmentLabel: 'All Members',
    sendTime: '08:00',
    scheduleType: 'WEEKLY',
    scheduleDays: ['SAT'],
    isEnabled: true,
    messageBody: 'Rise & Grind, {{member_name}}! 🌅 Weekend HIIT & Core Conditioning starts today at 09:00 AM at {{gym_name}}. Book your slot with {{trainer_name}} to lock in your spot.',
    lastTriggeredAt: null,
    dispatchedCount: 42,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'flow-pending-dues-warning',
    name: 'Pending Fee Follow-up Notice',
    category: 'PAYMENT_FOLLOWUP',
    targetSegment: 'dues',
    targetSegmentLabel: 'Pending Dues',
    sendTime: '11:00',
    scheduleType: 'DAILY',
    scheduleDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    isEnabled: false,
    messageBody: 'Dear {{member_name}}, this is a friendly reminder that an outstanding payment of {{payment_amount}} is due on {{payment_due_date}}. Tap the front desk to settle via UPI or card.',
    lastTriggeredAt: null,
    dispatchedCount: 0,
    createdAt: new Date().toISOString(),
  },
];

function AutomationTab({ templates }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Sub-navigation view: 'system' (event triggers) vs 'custom' (user custom flows)
  const [subView, setSubView] = useState('custom'); // Default to custom as requested

  // Custom Automations state
  const [customFlows, setCustomFlows] = useState(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_AUTOMATIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_CUSTOM_FLOWS;
  });

  // Modal editor state for custom flow
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);
  const [testingFlow, setTestingFlow] = useState(null);
  const [testingMemberId, setTestingMemberId] = useState('');
  const [testSendBusy, setTestSendBusy] = useState(false);

  // Audience preview state inside builder modal
  const [audienceList, setAudienceList] = useState([]);
  const [audienceLoading, setAudienceLoading] = useState(false);

  // Save custom flows to local storage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_AUTOMATIONS_STORAGE_KEY, JSON.stringify(customFlows));
    } catch (_) {}
  }, [customFlows]);

  const approvedTemplates = useMemo(
    () => (templates || []).filter((template) => template.isUsable),
    [templates]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await whatsappApi.getAutomation();
      setRules(result?.rules || []);
    } catch (err) {
      setError(err.message || 'Could not load automation rules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateSystemRule = (id, patch) => {
    setRules((current) => current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
    setNotice('');
  };

  const saveSystemRules = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await whatsappApi.saveAutomation(
        rules.map((rule) => ({
          ruleType: rule.ruleType,
          offsetDays: Number(rule.offsetDays),
          sendTime: rule.sendTime,
          isEnabled: Boolean(rule.isEnabled),
          templateId: rule.templateId || null,
        }))
      );
      setRules(result?.rules || rules);
      setNotice('Automation rules saved successfully. Background workers evaluate schedule every hour.');
    } catch (err) {
      setError(err.message || 'Could not save automation rules.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCustomFlow = (id) => {
    setCustomFlows((prev) =>
      prev.map((flow) => (flow.id === id ? { ...flow, isEnabled: !flow.isEnabled } : flow))
    );
    setNotice('Custom automation updated.');
  };

  const handleDeleteCustomFlow = (id) => {
    if (!window.confirm('Delete this custom message automation flow?')) return;
    setCustomFlows((prev) => prev.filter((flow) => flow.id !== id));
    setNotice('Automation flow deleted.');
  };

  const handleOpenNewFlow = () => {
    setEditingFlow({
      id: `flow-${Date.now()}`,
      name: '',
      category: 'CUSTOM',
      targetSegment: 'all',
      targetSegmentLabel: 'All Members',
      sendTime: '10:00',
      scheduleType: 'DAILY',
      scheduleDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      isEnabled: true,
      messageBody: 'Hello {{member_name}}! This is an automated update from {{gym_name}}.',
      lastTriggeredAt: null,
      dispatchedCount: 0,
      createdAt: new Date().toISOString(),
    });
    setEditorOpen(true);
  };

  const handleEditFlow = (flow) => {
    setEditingFlow({ ...flow });
    setEditorOpen(true);
  };

  const handleSaveFlowModal = (savedFlow) => {
    if (!savedFlow.name?.trim()) {
      alert('Please provide a name for this automation.');
      return;
    }
    if (!savedFlow.messageBody?.trim()) {
      alert('Please provide message content for this automation.');
      return;
    }

    setCustomFlows((prev) => {
      const exists = prev.some((f) => f.id === savedFlow.id);
      if (exists) {
        return prev.map((f) => (f.id === savedFlow.id ? savedFlow : f));
      }
      return [savedFlow, ...prev];
    });

    setEditorOpen(false);
    setEditingFlow(null);
    setNotice(`Automation "${savedFlow.name}" saved successfully.`);
  };

  const handleTestDispatch = async (flow) => {
    setTestingFlow(flow);
  };

  const handleExecuteTestSend = async (targetMemberId) => {
    if (!targetMemberId || !testingFlow) return;
    setTestSendBusy(true);
    try {
      await whatsappApi.send({
        audience: { mode: 'SELECTED', memberIds: [targetMemberId] },
        body: testingFlow.messageBody,
        intent: 'SERVICE_ANNOUNCEMENT',
        confirm: true,
      });
      setCustomFlows((prev) =>
        prev.map((f) =>
          f.id === testingFlow.id
            ? {
                ...f,
                lastTriggeredAt: new Date().toISOString(),
                dispatchedCount: (f.dispatchedCount || 0) + 1,
              }
            : f
        )
      );
      setNotice(`Test message sent successfully for "${testingFlow.name}".`);
      setTestingFlow(null);
    } catch (err) {
      alert(err.message || 'Failed to dispatch test message.');
    } finally {
      setTestSendBusy(false);
    }
  };

  if (loading) return <Spinner label="Loading automation dispatchers…" />;

  const activeSystemCount = rules.filter((r) => r.isEnabled).length;
  const activeCustomCount = customFlows.filter((f) => f.isEnabled).length;

  return (
    <div className="space-y-6">
      {/* ─── PRO TOP BAR: STUDIO HEADER & STATS ─── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/80 shadow-2xs">
            <Radio size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                WhatsApp Automation &amp; Schedule Studio
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                {activeCustomCount + activeSystemCount} Active Pipelines
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 max-w-xl">
              Create customizable scheduled workflows, member audience targeting, and automated event dispatchers.
            </p>
          </div>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSubView('custom')}
              className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                subView === 'custom'
                  ? 'bg-white text-emerald-700 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles size={13} className={subView === 'custom' ? 'text-emerald-600' : 'text-slate-400'} />
              <span>Custom Workflows ({customFlows.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('system')}
              className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                subView === 'system'
                  ? 'bg-white text-indigo-700 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={13} className={subView === 'system' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>System Trigger Rules ({rules.length})</span>
            </button>
          </div>

          {subView === 'custom' ? (
            <button
              type="button"
              onClick={handleOpenNewFlow}
              style={{ backgroundColor: '#128C7E', color: '#ffffff' }}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-white text-xs font-bold hover:brightness-105 transition-all cursor-pointer shadow-md shadow-emerald-700/20 active:scale-95 shrink-0"
            >
              <Plus size={15} strokeWidth={2.8} />
              <span>Create Automation</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={saveSystemRules}
              disabled={saving}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-600 transition-all cursor-pointer shadow-md disabled:opacity-50 shrink-0"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={14} strokeWidth={2.4} />}
              <span>Save Rules</span>
            </button>
          )}
        </div>
      </div>

      <ErrorNote message={error} onRetry={load} />
      {notice && (
        <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice('')} className="text-slate-400 hover:text-slate-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── TAB CONTENT 1: CUSTOM MESSAGE AUTOMATION FLOWS (DOTTED CARDS) ─── */}
      {subView === 'custom' && (
        <div className="space-y-5">
          {customFlows.length === 0 ? (
            /* DOTTED EMPTY DROPZONE CARD */
            <div className="relative rounded-3xl border-2 border-dashed border-slate-300 hover:border-emerald-400/80 bg-slate-50/60 p-7 w-full mx-auto transition-colors overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.45] pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />
              <div className="relative z-10 flex flex-col items-center justify-center text-center py-6 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-emerald-600">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-800">No Custom Automations Created Yet</h3>
                <p className="text-xs text-slate-500 max-w-md">
                  Design automated messages for target member groups, set dispatch times, and schedule recurring days.
                </p>
                <button
                  type="button"
                  onClick={handleOpenNewFlow}
                  className="mt-2 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Plus size={15} />
                  <span>Build First Automation</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {customFlows.map((flow) => {
                const isEnabled = Boolean(flow.isEnabled);
                return (
                  <div
                    key={flow.id}
                    className={`relative rounded-3xl border transition-all duration-200 overflow-hidden flex flex-col justify-between p-5 gap-4 shadow-xs ${
                      isEnabled
                        ? 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md'
                        : 'border-slate-200/60 bg-slate-50/60 opacity-75'
                    }`}
                  >
                    {/* Subtle dotted canvas background for card */}
                    <div
                      className="absolute inset-0 opacity-[0.25] pointer-events-none"
                      style={{
                        backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                        backgroundSize: '16px 16px',
                      }}
                    />

                    {/* Top Row: Category Pill, Status Badge & Toggle */}
                    <div className="relative z-10 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                          {flow.category || 'CUSTOM'}
                        </span>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isEnabled ? 'bg-emerald-500 ring-4 ring-emerald-500/10' : 'bg-slate-300'
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleToggleCustomFlow(flow.id)}
                            className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                          />
                          <span
                            className={`text-[11px] font-bold ${isEnabled ? 'text-emerald-700' : 'text-slate-400'}`}
                          >
                            {isEnabled ? 'Active' : 'Paused'}
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Middle: Flow Name & Target Metadata */}
                    <div className="relative z-10 space-y-2.5 flex-1">
                      <h3 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-1" title={flow.name}>
                        {flow.name}
                      </h3>

                      {/* Schedule Chips & Audience */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs">
                          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                            Target Audience
                          </span>
                          <div className="font-bold text-slate-700 flex items-center gap-1 truncate">
                            <Users size={12} className="text-indigo-600 shrink-0" />
                            <span className="truncate">{flow.targetSegmentLabel || 'All Members'}</span>
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs">
                          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                            Dispatch Time
                          </span>
                          <div className="font-bold text-slate-700 flex items-center gap-1">
                            <Clock size={12} className="text-amber-600 shrink-0" />
                            <span className="font-mono">{flow.sendTime || '10:00'} IST</span>
                          </div>
                        </div>
                      </div>

                      {/* Active Days Pills */}
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => {
                          const active = flow.scheduleDays?.includes(day);
                          return (
                            <span
                              key={day}
                              className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold ${
                                active
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {day}
                            </span>
                          );
                        })}
                      </div>

                      {/* Visual Live Message Preview Box (Directly shows member & gym details) */}
                      <div className="p-3 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 text-[11px] text-slate-800 font-sans leading-relaxed space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Sparkles size={11} className="text-emerald-600" /> Member View
                          </span>
                          <span className="font-normal font-sans text-slate-400 capitalize">
                            Auto-personalized
                          </span>
                        </div>
                        <p className="line-clamp-3 whitespace-pre-wrap font-medium">
                          {renderVisualMessageText(flow.messageBody)}
                        </p>
                      </div>
                    </div>

                    {/* Bottom: Metrics & Actions */}
                    <div className="relative z-10 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="text-[10px] text-slate-400 font-mono">
                        Sent <span className="font-bold text-slate-700">{flow.dispatchedCount || 0}</span> times
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTestDispatch(flow)}
                          className="h-7 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="Test send to a sample member"
                        >
                          <Play size={10} strokeWidth={2.4} />
                          <span>Test</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditFlow(flow)}
                          className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="Edit flow"
                        >
                          <Pencil size={11} strokeWidth={2.2} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCustomFlow(flow.id)}
                          className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all cursor-pointer"
                          title="Delete flow"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB CONTENT 2: SYSTEM EVENT DISPATCHERS (EXISTING BACKEND RULES) ─── */}
      {subView === 'system' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <p>
              Pre-built system triggers linked directly to gym check-in hardware, membership expiration calendars, and payment status updates.
            </p>
            <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
              Evaluated Hourly
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map((rule) => {
              const isEnabled = Boolean(rule.isEnabled);
              return (
                <div
                  key={rule.id}
                  className={`relative p-5 rounded-3xl border transition-all shadow-xs flex flex-col justify-between space-y-4 overflow-hidden ${
                    isEnabled
                      ? 'border-slate-200/90 bg-white hover:shadow-md'
                      : 'border-slate-200/60 opacity-70 bg-slate-50/50'
                  }`}
                >
                  <div
                    className="absolute inset-0 opacity-[0.25] pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isEnabled ? 'bg-indigo-500 ring-4 ring-indigo-500/10' : 'bg-slate-300'
                          }`}
                        />
                        <span className="text-xs font-black text-slate-900">{rule.label || rule.ruleType}</span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => updateSystemRule(rule.id, { isEnabled: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                        />
                        <span className={`text-[11px] font-bold ${isEnabled ? 'text-indigo-700' : 'text-slate-400'}`}>
                          {isEnabled ? 'Active' : 'Disabled'}
                        </span>
                      </label>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-2.5">
                      {rule.ruleType === 'DAILY_CHECKIN'
                        ? 'Dispatches immediate confirmation receipt upon barcode or manual front desk check-in.'
                        : rule.ruleType === 'EXPIRY_REMINDER_3D'
                        ? 'Alerts members 3 days prior to expiration with personalized renewal details.'
                        : rule.ruleType === 'EXPIRY_REMINDER_TODAY'
                        ? 'Notifies member on their final active day to avoid workout interruptions.'
                        : 'Scheduled automated reminder triggered by background queue monitor.'}
                    </p>
                  </div>

                  <div className="relative z-10 space-y-3 pt-2 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Dispatch Time
                        </label>
                        <input
                          type="time"
                          value={rule.sendTime}
                          onChange={(e) => updateSystemRule(rule.id, { sendTime: e.target.value })}
                          className="h-9 px-2.5 rounded-xl border border-slate-200/90 bg-white font-mono text-xs w-full font-bold focus:outline-none focus:border-indigo-500 shadow-2xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Target Offset
                        </label>
                        <div className="h-9 px-2.5 rounded-xl border border-slate-200/80 bg-slate-100/70 font-mono text-xs flex items-center text-slate-700 font-bold">
                          {rule.offsetDays ? `${rule.offsetDays} days prior` : 'Immediate event'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <CustomDropdown
                        label="Assigned WhatsApp Template"
                        value={rule.templateId || ''}
                        onChange={(val) => updateSystemRule(rule.id, { templateId: val || null })}
                        placeholder="Auto-select template"
                        options={[
                          { value: '', label: 'Auto-select template' },
                          ...approvedTemplates.map((t) => ({
                            value: t.id,
                            label: `${t.label} (${t.templateName})`,
                          })),
                        ]}
                        buttonClassName="h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: CUSTOM AUTOMATION WORKFLOW BUILDER (PROFESSIONAL DESIGN) ─── */}
      {editorOpen && editingFlow && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              <div
                className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
                onClick={() => setEditorOpen(false)}
              />

              <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 z-10 animate-in fade-in-50 zoom-in-95 my-auto max-h-[92vh] overflow-y-auto custom-scrollbar">
                {/* Header with Dotted Subhead */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
                      <Sparkles size={18} strokeWidth={2.4} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {editingFlow.id.startsWith('flow-') && !customFlows.some((f) => f.id === editingFlow.id)
                          ? 'Design New Message Automation'
                          : 'Edit Automation Workflow'}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Configure target member audience, recurring schedule days, and personalized message content.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Form Inputs Grid */}
                <div className="space-y-4 text-xs">
                  {/* Name & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Automation Workflow Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editingFlow.name}
                        onChange={(e) => setEditingFlow({ ...editingFlow, name: e.target.value })}
                        placeholder="e.g. Weekly Workout Motivation, Personal Trainer Followup"
                        className="w-full h-10 px-3 rounded-xl border border-slate-200/90 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">Category Tag</label>
                      <select
                        value={editingFlow.category}
                        onChange={(e) => setEditingFlow({ ...editingFlow, category: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200/90 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-emerald-600 shadow-2xs"
                      >
                        <option value="CUSTOM">Custom Workflow</option>
                        <option value="ONBOARDING">Onboarding</option>
                        <option value="CLASS_REMINDER">Class Reminder</option>
                        <option value="PAYMENT_FOLLOWUP">Payment Follow-up</option>
                        <option value="RETENTION">Retention / Winback</option>
                        <option value="MOTIVATION">Motivation</option>
                      </select>
                    </div>
                  </div>

                  {/* Target Audience & Timing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block flex items-center gap-1.5">
                        <Users size={13} className="text-indigo-600" />
                        <span>Target Member Audience</span>
                      </label>
                      <select
                        value={editingFlow.targetSegment}
                        onChange={(e) => {
                          const val = e.target.value;
                          const seg = SEGMENT_CHIPS.find((s) => s.id === val);
                          setEditingFlow({
                            ...editingFlow,
                            targetSegment: val,
                            targetSegmentLabel: seg?.label || 'All Members',
                          });
                        }}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:border-emerald-600"
                      >
                        {SEGMENT_CHIPS.map((seg) => (
                          <option key={seg.id} value={seg.id}>
                            {seg.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10.5px] text-slate-400">
                        Automation evaluates members matching this filter.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block flex items-center gap-1.5">
                        <Clock size={13} className="text-amber-600" />
                        <span>Daily Dispatch Time (IST)</span>
                      </label>
                      <input
                        type="time"
                        value={editingFlow.sendTime}
                        onChange={(e) => setEditingFlow({ ...editingFlow, sendTime: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-mono text-xs font-bold text-slate-900 shadow-2xs focus:outline-none focus:border-emerald-600"
                      />
                      <p className="text-[10.5px] text-slate-400">
                        Local Indian Standard Time for scheduled dispatch.
                      </p>
                    </div>
                  </div>

                  {/* Schedule Days */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Active Execution Days
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => {
                        const isSelected = editingFlow.scheduleDays?.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const current = editingFlow.scheduleDays || [];
                              const next = current.includes(day)
                                ? current.filter((d) => d !== day)
                                : [...current, day];
                              setEditingFlow({ ...editingFlow, scheduleDays: next });
                            }}
                            className={`h-8 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() =>
                          setEditingFlow({
                            ...editingFlow,
                            scheduleDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
                          })
                        }
                        className="text-[11px] text-indigo-600 font-bold hover:underline ml-2"
                      >
                        Select All
                      </button>
                    </div>
                  </div>

                  {/* Message Body & Variables */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Custom WhatsApp Message Body <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10.5px] text-slate-400 font-mono">
                        {editingFlow.messageBody?.length || 0} / 1000
                      </span>
                    </div>

                    <textarea
                      rows={4}
                      value={editingFlow.messageBody}
                      onChange={(e) => setEditingFlow({ ...editingFlow, messageBody: e.target.value })}
                      placeholder="Type your automated WhatsApp message. Insert tags below to auto-fill member details..."
                      className="w-full p-3 rounded-2xl border border-slate-200/90 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 shadow-2xs leading-relaxed"
                    />

                    {/* Quick Variable Tag Pills with Friendly Human Labels */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Insert Smart Field (Auto-fills for each member):
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {VARIABLE_CONFIGS.map((v) => (
                          <button
                            key={v.token}
                            type="button"
                            onClick={() =>
                              setEditingFlow({
                                ...editingFlow,
                                messageBody: `${editingFlow.messageBody || ''} ${v.token}`.trim(),
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 hover:brightness-95 ${v.color}`}
                            title={`Inserts ${v.label} (e.g. ${v.example})`}
                          >
                            <span>+ {v.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Visual Live Preview Box in Modal */}
                    {editingFlow.messageBody?.trim() && (
                      <div className="mt-2.5 p-3.5 rounded-2xl border border-emerald-200/90 bg-emerald-50/40 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-bold text-emerald-800 flex items-center gap-1">
                            <Sparkles size={12} className="text-emerald-600" />
                            Visual Message Preview (What members will receive):
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                            Live Member View
                          </span>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-emerald-100 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap shadow-2xs">
                          {renderVisualMessageText(editingFlow.messageBody)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    className="h-10 px-4 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveFlowModal(editingFlow)}
                      style={{ backgroundColor: '#128C7E', color: '#ffffff' }}
                      className="h-10 px-5 rounded-xl text-white text-xs font-bold transition-all shadow-md hover:brightness-105 cursor-pointer active:scale-95"
                    >
                      Save Automation
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {/* ─── MODAL 2: TEST SEND TO MEMBER PREVIEW ─── */}
      {testingFlow && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
                onClick={() => setTestingFlow(null)}
              />

              <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 z-10 animate-in fade-in zoom-in-95 my-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Play size={14} />
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900">Test Message Dispatch</h3>
                      <p className="text-[11px] text-slate-400">"{testingFlow.name}"</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setTestingFlow(null)} className="text-slate-400 hover:text-slate-700">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Select Test Member Recipient
                    </label>
                    <select
                      id="test-member-select"
                      value={testingMemberId}
                      onChange={(e) => setTestingMemberId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:border-emerald-600 shadow-2xs"
                    >
                      <option value="">Select a member...</option>
                      {Array.isArray(window.cachedMembers) &&
                        window.cachedMembers.slice(0, 30).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name || m.full_name} ({m.phone})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Visual Rendered Message for the selected test recipient */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Personalized Message (Recipient View):
                    </span>
                    <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-xs font-normal text-slate-800 leading-relaxed shadow-2xs whitespace-pre-wrap">
                      {(() => {
                        const testMember = Array.isArray(window.cachedMembers)
                          ? window.cachedMembers.find((m) => m.id === testingMemberId)
                          : null;
                        return renderVisualMessageText(testingFlow.messageBody, testMember);
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setTestingFlow(null);
                      setTestingMemberId('');
                    }}
                    className="h-9 px-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={testSendBusy}
                    onClick={() => {
                      const sel = document.getElementById('test-member-select');
                      const memId = testingMemberId || sel?.value;
                      if (!memId) {
                        alert('Please select a member to test dispatch.');
                        return;
                      }
                      handleExecuteTestSend(memId);
                    }}
                    style={{ backgroundColor: '#128C7E', color: '#ffffff' }}
                    className="h-9 px-4 rounded-xl text-white text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {testSendBusy ? 'Sending...' : 'Send Test WhatsApp'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   5. SETTINGS & CONSENT TAB (MEMBER OPT-IN AUDIT REGISTRY)
════════════════════════════════════════════════════════════ */
function SettingsTab({ templates, usage, onRefresh }) {
  const [consents, setConsents] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'granted' | 'withdrawn'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch backend audience & consent registry
      let backendMembers = [];
      try {
        const result = await whatsappApi.getConsents(search);
        backendMembers = result?.members || [];
      } catch (err) {
        console.warn('Backend consent query note (will merge with local SQLite records):', err.message);
      }

      // 2. Fetch local members from Tauri SQLite / cachedMembers
      let localMembers = [];
      if (typeof window !== 'undefined' && Array.isArray(window.cachedMembers) && window.cachedMembers.length > 0) {
        localMembers = window.cachedMembers;
      } else if (typeof window !== 'undefined' && window.__TAURI__?.core?.invoke) {
        try {
          localMembers = await window.__TAURI__.core.invoke('get_members_command', { limit: 5000, offset: 0 });
          if (Array.isArray(localMembers)) {
            window.cachedMembers = localMembers;
          }
        } catch (e) {
          console.warn('Could not load local members via get_members_command:', e);
        }
      }

      // 3. Unify / merge local records with backend records
      const backendMap = new Map();
      backendMembers.forEach((bm) => {
        if (bm.id) backendMap.set(bm.id, bm);
        if (bm.memberCode) backendMap.set(bm.memberCode, bm);
      });

      const unified = [];
      const seenIds = new Set();

      // Process local members first to reflect newly created members immediately
      (localMembers || []).forEach((m) => {
        if (!m || !m.id || seenIds.has(m.id)) return;
        seenIds.add(m.id);

        const backendMatch = backendMap.get(m.id) || (m.member_code ? backendMap.get(m.member_code) : null);

        // Derive consent status:
        // Priority 1: Backend explicit consent status
        // Priority 2: Member object's whatsapp_opt_in / whatsappOptIn (from Add Member checkbox)
        // Priority 3: Notes inspection ("WhatsApp Consent: Opted-Out" vs "Opted-In")
        // Default: GRANTED (since the Add Member modal checkbox is checked by default)
        let status = 'GRANTED';
        let source = 'Registration Modal Checkbox';
        let timestamp = m.whatsappConsentTimestamp || m.created_at || m.joined_at || new Date().toISOString();

        if (backendMatch && backendMatch.consentStatus) {
          status = backendMatch.consentStatus;
          if (backendMatch.consentSource) {
            source =
              backendMatch.consentSource === 'REGISTRATION_CHECKBOX'
                ? 'Registration Modal Checkbox'
                : backendMatch.consentSource === 'OWNER_CONSOLE'
                ? 'Owner Console Override'
                : backendMatch.consentSource;
          }
          if (backendMatch.consentTimestamp) {
            timestamp = backendMatch.consentTimestamp;
          }
        } else if (m.whatsapp_opt_in === false || m.whatsappOptIn === false) {
          status = 'WITHDRAWN';
          source = 'Registration Modal (Opted-Out)';
        } else if (m.notes && m.notes.includes('WhatsApp Consent: Opted-Out')) {
          status = 'WITHDRAWN';
          source = 'Registration Modal (Opted-Out)';
        } else if (m.notes && m.notes.includes('WhatsApp Consent: Opted-In')) {
          status = 'GRANTED';
          source = 'Registration Modal Checkbox';
        }

        const phoneVal = m.phone || m.contactNumber || backendMatch?.phoneMasked || '';
        const phoneClean = typeof phoneVal === 'string' ? phoneVal.trim() : '';

        unified.push({
          id: m.id,
          fullName: m.full_name || m.name || backendMatch?.fullName || 'Gym Member',
          memberCode: m.member_code || m.code || backendMatch?.memberCode || 'GD-MEMBER',
          phone: phoneClean,
          phoneMasked: backendMatch?.phoneMasked || (phoneClean ? `•••••• ${phoneClean.slice(-4)}` : 'No phone registered'),
          membershipStatus: m.membership_status || backendMatch?.membershipStatus || 'ACTIVE',
          planName: m.planName || backendMatch?.planName || 'Standard Membership',
          profilePhotoUrl: m.profile_photo_path || m.photoUrl || backendMatch?.profilePhotoUrl || null,
          consentStatus: status,
          consentSource: source,
          consentTimestamp: timestamp,
          notes: m.notes || '',
          eligibleForWhatsApp: status === 'GRANTED' && Boolean(phoneClean),
        });
      });

      // Append backend members that were not in local SQLite cache
      backendMembers.forEach((bm) => {
        if (!bm || !bm.id || seenIds.has(bm.id)) return;
        seenIds.add(bm.id);
        unified.push({
          id: bm.id,
          fullName: bm.fullName || 'Gym Member',
          memberCode: bm.memberCode || 'GD-MEMBER',
          phone: bm.phoneMasked || '',
          phoneMasked: bm.phoneMasked || 'No phone registered',
          membershipStatus: bm.membershipStatus || 'ACTIVE',
          planName: bm.planName || 'Standard Membership',
          profilePhotoUrl: bm.profilePhotoUrl || null,
          consentStatus: bm.consentStatus || 'GRANTED',
          consentSource:
            bm.consentSource === 'REGISTRATION_CHECKBOX'
              ? 'Registration Modal Checkbox'
              : bm.consentSource || 'Registration Modal Checkbox',
          consentTimestamp: bm.consentTimestamp || new Date().toISOString(),
          notes: '',
          eligibleForWhatsApp: bm.eligibleForWhatsApp ?? (bm.consentStatus === 'GRANTED'),
        });
      });

      setConsents(unified);
    } catch (err) {
      setError(err.message || 'Could not load consent list.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
    const handleMemberUpdate = () => load();
    window.addEventListener('gymdeck:member-added', handleMemberUpdate);
    window.addEventListener('gymdeck:member-consent-changed', handleMemberUpdate);
    window.addEventListener('gymdeck:member-transferred', handleMemberUpdate);
    window.addEventListener('gymdeck:member-deleted', handleMemberUpdate);
    return () => {
      window.removeEventListener('gymdeck:member-added', handleMemberUpdate);
      window.removeEventListener('gymdeck:member-consent-changed', handleMemberUpdate);
      window.removeEventListener('gymdeck:member-transferred', handleMemberUpdate);
      window.removeEventListener('gymdeck:member-deleted', handleMemberUpdate);
    };
  }, [load]);

  const toggleConsent = async (memberId, currentStatus) => {
    setBusyId(memberId);
    setError('');
    setNotice('');
    const nextStatus = currentStatus === 'GRANTED' ? 'WITHDRAWN' : 'GRANTED';

    // 1. Optimistic instant UI update
    setConsents((curr) =>
      curr.map((m) =>
        m.id === memberId
          ? {
              ...m,
              consentStatus: nextStatus,
              consentSource: 'Owner Console Override',
              consentTimestamp: new Date().toISOString(),
              eligibleForWhatsApp: nextStatus === 'GRANTED' && Boolean(m.phone && m.phone !== 'No phone registered'),
            }
          : m
      )
    );

    // 2. Sync to cloud backend API
    try {
      await whatsappApi.setConsent(memberId, nextStatus, 'OWNER_CONSOLE');
    } catch (err) {
      console.warn('WhatsApp cloud backend consent sync notice:', err.message);
    }

    // 3. Sync to in-memory cachedMembers
    if (typeof window !== 'undefined' && Array.isArray(window.cachedMembers)) {
      window.cachedMembers = window.cachedMembers.map((m) => {
        if (m.id === memberId) {
          const isGranted = nextStatus === 'GRANTED';
          let updatedNotes = m.notes || '';
          if (updatedNotes.includes('WhatsApp Consent:')) {
            updatedNotes = updatedNotes.replace(/WhatsApp Consent:\s*[^|]+/, `WhatsApp Consent: ${isGranted ? 'Opted-In (Owner Override)' : 'Opted-Out (Owner Override)'}`);
          } else {
            updatedNotes = updatedNotes ? `${updatedNotes} | WhatsApp Consent: ${isGranted ? 'Opted-In (Owner Override)' : 'Opted-Out (Owner Override)'}` : `WhatsApp Consent: ${isGranted ? 'Opted-In (Owner Override)' : 'Opted-Out (Owner Override)'}`;
          }
          return {
            ...m,
            whatsapp_opt_in: isGranted,
            whatsappOptIn: isGranted,
            whatsappConsentSource: 'OWNER_CONSOLE',
            whatsappConsentTimestamp: new Date().toISOString(),
            notes: updatedNotes,
          };
        }
        return m;
      });

      // 4. If Tauri desktop environment, persist updated notes & status to SQLite
      if (typeof window !== 'undefined' && window.__TAURI__?.core?.invoke) {
        try {
          const updatedM = window.cachedMembers.find((m) => m.id === memberId);
          if (updatedM) {
            await window.__TAURI__.core.invoke('update_member_command', { member: updatedM });
          }
        } catch (e) {
          console.warn('Could not persist updated consent in SQLite:', e);
        }
      }
    }

    // 5. Broadcast global event so Composer and Audience recalculate
    window.dispatchEvent(
      new CustomEvent('gymdeck:member-consent-changed', {
        detail: { memberId, status: nextStatus },
      })
    );

    setNotice(`Member consent updated to ${nextStatus === 'GRANTED' ? 'Opted-In (Active)' : 'Opted-Out (Restricted)'}.`);
    setBusyId('');
    if (onRefresh) onRefresh();
  };

  // Filtered members list
  const filteredConsents = useMemo(() => {
    let list = consents;
    if (statusFilter === 'granted') {
      list = list.filter((c) => c.consentStatus === 'GRANTED');
    } else if (statusFilter === 'withdrawn') {
      list = list.filter((c) => c.consentStatus !== 'GRANTED');
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.memberCode.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.phoneMasked.includes(q)
      );
    }
    return list;
  }, [consents, statusFilter, search]);

  const grantedCount = consents.filter((c) => c.consentStatus === 'GRANTED').length;
  const withdrawnCount = consents.filter((c) => c.consentStatus !== 'GRANTED').length;
  const registrationCount = consents.filter(
    (c) => c.consentSource && c.consentSource.toLowerCase().includes('registration')
  ).length;
  const optInRate = consents.length > 0 ? Math.round((grantedCount / consents.length) * 100) : 100;

  return (
    <div className="space-y-4">
      {/* ─── COMPLIANCE POLICY & REGISTRATION CHECKBOX BANNER (DOTTED CARD) ─── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs"
        style={{
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1.1px, transparent 1.1px)',
          backgroundSize: '16px 16px',
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
                  WhatsApp Opt-In & Compliance Consent Directory
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-300">
                  <CheckSquare size={11} strokeWidth={2.2} />
                  Add Member Modal Integrated
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                  TRAI / Meta Compliant
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-1 max-w-3xl leading-relaxed">
                During member onboarding, the <strong>"WhatsApp notifications & updates"</strong> checkbox records explicit opt-in consent (<code className="text-[11px] font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-700">#member-whatsapp-consent</code>). Members with active consent are verified to receive automated attendance alerts, renewal reminders, digital fee receipts, and payment links.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="h-8.5 px-3 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:bg-zinc-50 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Refresh Records</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── SUMMARY KPI TILES (PREMIUM CLEAN STYLING) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
              Opted-In Members
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700 font-mono tabular-nums">
                {grantedCount}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {optInRate}% Rate
              </span>
            </div>
            <span className="text-[10.5px] font-medium text-zinc-500">Allowed automated notifications</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/80 shadow-2xs">
            <UserCheck size={18} strokeWidth={2.2} />
          </div>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
              Opted-Out / Revoked
            </span>
            <div className="text-2xl font-black text-rose-700 font-mono tabular-nums">
              {withdrawnCount}
            </div>
            <span className="text-[10.5px] font-medium text-zinc-500">Excluded from automated sends</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200/80 shadow-2xs">
            <UserX size={18} strokeWidth={2.2} />
          </div>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
              Registration Consents
            </span>
            <div className="text-2xl font-black text-indigo-700 font-mono tabular-nums">
              {registrationCount}
            </div>
            <span className="text-[10.5px] font-medium text-zinc-500">Captured via Add Member modal</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200/80 shadow-2xs">
            <CheckSquare size={18} strokeWidth={2.2} />
          </div>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">
              Total Mapped Members
            </span>
            <div className="text-2xl font-black text-zinc-900 font-mono tabular-nums">
              {consents.length}
            </div>
            <span className="text-[10.5px] font-medium text-zinc-500">Registered member profiles</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0 border border-zinc-200/80 shadow-2xs">
            <Users size={18} strokeWidth={2.2} />
          </div>
        </div>
      </div>

      {/* ─── CONSENT DIRECTORY REGISTRY TABLE ─── */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
        {/* Search, Filter & Tabs bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-3.5 border-b border-zinc-100">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100/80 rounded-xl border border-zinc-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`h-7.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
              }`}
            >
              All Records ({consents.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('granted')}
              className={`h-7.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'granted'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50/70'
              }`}
            >
              <CheckCircle2 size={12} />
              Opted In ({grantedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('withdrawn')}
              className={`h-7.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'withdrawn'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-800 hover:text-rose-950 hover:bg-rose-50/70'
              }`}
            >
              <XCircle size={12} />
              Opted Out ({withdrawnCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-72 flex items-center">
            <span className="absolute left-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search size={14} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by member name, phone or code…"
              className="h-9 pl-9.5 pr-8 rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-zinc-50 focus:bg-white text-xs w-full font-medium focus:outline-none focus:border-emerald-600 transition-all shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 p-1 rounded-md text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <ErrorNote message={error} onRetry={load} />
        {notice && (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {loading ? (
          <Spinner label="Loading WhatsApp consent registry…" />
        ) : filteredConsents.length === 0 ? (
          <EmptyState
            title="No matching members found"
            description={
              search
                ? `No members found matching "${search}". Try clearing search.`
                : 'No members found in this filter category.'
            }
            icon={Users}
          />
        ) : (
          <div className="divide-y divide-zinc-100 max-h-[580px] overflow-y-auto custom-scrollbar pr-1">
            {filteredConsents.map((m) => {
              const isGranted = m.consentStatus === 'GRANTED';
              const photoSrc = resolveMemberPhoto(m.profilePhotoUrl);
              const avatar = getAvatarStyle(m.fullName);
              const isBusy = busyId === m.id;

              // Format consent date
              let dateStr = 'At Registration';
              try {
                if (m.consentTimestamp) {
                  const d = new Date(m.consentTimestamp);
                  if (!isNaN(d.getTime())) {
                    dateStr = d.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });
                  }
                }
              } catch (_) {}

              return (
                <div
                  key={m.id}
                  className="py-3 px-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-zinc-50/80 rounded-xl transition-colors"
                >
                  {/* Left: Member Identity & Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    {photoSrc ? (
                      <img
                        src={photoSrc}
                        alt={m.fullName || 'Member'}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-zinc-200/90 shadow-2xs"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${avatar.bg} ${photoSrc ? 'hidden' : ''}`}
                    >
                      {(m.fullName || 'M').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-zinc-900 truncate leading-snug">
                          {m.fullName}
                        </p>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                          {m.memberCode}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {m.membershipStatus}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                        <span className="font-mono text-zinc-600">{m.phoneMasked || m.phone}</span>
                        <span>•</span>
                        <span className="truncate">{m.planName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Consent Status Badge, Source, Timestamp & Toggle Button */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0 self-end sm:self-center">
                    {/* Source & Timestamp Tag */}
                    <div className="hidden lg:flex flex-col items-end text-right">
                      <div className="flex items-center gap-1 text-[10.5px] font-semibold text-zinc-600">
                        <CheckSquare size={11} className="text-indigo-600" />
                        <span>{m.consentSource || 'Registration Modal Checkbox'}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        Logged: {dateStr}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold uppercase tracking-wider font-mono border ${
                        isGranted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200/90'
                          : 'bg-rose-50 text-rose-800 border-rose-200/90'
                      }`}
                    >
                      {isGranted ? (
                        <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle size={12} className="text-rose-600 shrink-0" />
                      )}
                      <span>{isGranted ? 'OPTED IN' : 'OPTED OUT'}</span>
                    </span>

                    {/* Quick Toggle Button */}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => toggleConsent(m.id, m.consentStatus)}
                      title={isGranted ? 'Click to revoke consent' : 'Click to grant consent'}
                      className={`h-8 px-3 rounded-xl border text-[11px] font-bold cursor-pointer shadow-2xs transition-all disabled:opacity-50 flex items-center gap-1.5 ${
                        isGranted
                          ? 'bg-white hover:bg-rose-50 border-zinc-200 text-zinc-700 hover:text-rose-700 hover:border-rose-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 shadow-emerald-600/20'
                      }`}
                    >
                      {isBusy ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Updating…</span>
                        </>
                      ) : isGranted ? (
                        <>
                          <UserX size={12} className="text-zinc-500 group-hover:text-rose-600" />
                          <span>Revoke Consent</span>
                        </>
                      ) : (
                        <>
                          <UserCheck size={12} className="text-white" />
                          <span>Grant Opt-In</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN WRAPPER WITH TOP NAVIGATION HEADER
════════════════════════════════════════════════════════════ */
export function CommunicationHub() {
  const [tab, setTab] = useState('compose');
  const [overview, setOverview] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const [overviewData, templateData, usageData] = await Promise.all([
        whatsappApi.getOverview(),
        whatsappApi.getTemplates(),
        whatsappApi.getUsage(30),
      ]);
      setOverview(overviewData);
      setTemplates(templateData?.templates || []);
      setUsage(usageData);
    } catch (err) {
      setError(err.message || 'Could not load WhatsApp data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 20000);
    const handleMemberChange = () => {
      refresh();
    };
    window.addEventListener('gymdeck:member-added', handleMemberChange);
    window.addEventListener('gymdeck:member-transferred', handleMemberChange);
    window.addEventListener('gymdeck:member-deleted', handleMemberChange);
    window.addEventListener('gymdeck:member-reactivated', handleMemberChange);
    return () => {
      clearInterval(timer);
      window.removeEventListener('gymdeck:member-added', handleMemberChange);
      window.removeEventListener('gymdeck:member-transferred', handleMemberChange);
      window.removeEventListener('gymdeck:member-deleted', handleMemberChange);
      window.removeEventListener('gymdeck:member-reactivated', handleMemberChange);
    };
  }, [refresh]);

  return (
    <div className="notify-members-shell min-h-full bg-[#f8fafc] font-sans text-slate-900 selection:bg-indigo-100 antialiased flex flex-col">
      {/* ─── TOP UTILITY & NAVIGATION HEADER (STICKY HEADER) ─── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-[1600px] w-full mx-auto px-6 sm:px-8 h-14 flex items-center justify-between gap-4">
          {/* Left: Professional Brand & Hierarchy */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shadow-xs shrink-0"
              style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px' }}
            >
              <img 
                src="/whatsapp-logo.png" 
                alt="WhatsApp" 
                className="w-5.5 h-5.5 object-contain"
              />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h1 
                className="text-base sm:text-[17px] font-extrabold tracking-tight leading-none whitespace-nowrap flex items-center gap-1.5"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                  letterSpacing: '-0.025em',
                }}
              >
                <span style={{ color: '#128C7E', fontWeight: 800 }}>WhatsApp</span>
                <span className="text-slate-800 font-bold text-sm sm:text-base">Line</span>
              </h1>
            </div>
          </div>

          {/* Right: Segmented Navigation Tabs */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    tab === id
                      ? 'bg-white text-emerald-700 shadow-2xs font-black border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Icon size={12} strokeWidth={tab === id ? 2.5 : 2} className={tab === id ? 'text-emerald-600' : 'text-slate-400'} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ─── SCROLLABLE PAGE BODY ─── */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto px-6 sm:px-8 py-5 flex flex-col gap-5">
        <div className="notify-members-workspace !p-0 !border-0 !bg-transparent !shadow-none">
          {tab === 'compose' && (
            <ComposeTab
              templates={templates}
              onSent={refresh}
              connection={overview?.connection}
              onNavigateTab={(targetTab) => setTab(targetTab)}
            />
          )}
          {tab === 'overview' && (
            <OverviewTab overview={overview} loading={loading} error={error} onRefresh={refresh} />
          )}
          {tab === 'history' && <HistoryTab onChanged={refresh} />}
          {tab === 'automation' && <AutomationTab templates={templates} />}
          {tab === 'settings' && <SettingsTab templates={templates} usage={usage} onRefresh={refresh} />}
        </div>
      </div>
      <BrandFooter />
    </div>
  );
}

export const mountWhatsAppHub = () => {
  const container = document.querySelector('[data-stage="whatsapp-hub"]');
  if (!container) return null;

  container.innerHTML = '';
  try {
    const root = createRoot(container);
    root.render(<CommunicationHub />);
    return root;
  } catch (err) {
    container.innerHTML = `<div style="color:#dc2626;padding:20px">Could not load Communication Hub: ${err.message}</div>`;
    return null;
  }
};
