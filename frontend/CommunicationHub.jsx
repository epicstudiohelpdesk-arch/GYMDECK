import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  Info,
  LayoutDashboard,
  Loader2,
  Megaphone,
  MessageCircle,
  RefreshCcw,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
  Type,
  Users,
  X,
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
function ComposeTab({ templates, onSent, connection }) {
  const [selectedType, setSelectedType] = useState('attendance');
  const [templateId, setTemplateId] = useState('');
  const [intent, setIntent] = useState('ATTENDANCE');
  const [messageTitle, setMessageTitle] = useState('');
  const [body, setBody] = useState('');

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

  const textareaRef = useRef(null);

  const approvedTemplates = useMemo(
    () => (templates || []).filter((template) => template.isUsable),
    [templates]
  );

  // Sync selected campaign intent to template
  useEffect(() => {
    const matched = NOTIFICATION_TYPES.find((t) => t.id === selectedType);
    if (matched) {
      setIntent(matched.intent);
      const tmpl = approvedTemplates.find((t) => t.intent === matched.intent);
      if (tmpl) {
        setTemplateId(tmpl.id);
        if (!body) setBody(tmpl.body || '');
      } else {
        setTemplateId('');
      }
    }
  }, [selectedType, approvedTemplates]);

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
    return {
      audience: {
        mode: selectedIds.length > 0 ? 'SELECTED' : 'ALL',
        memberIds: selectedIds.length > 0 ? selectedIds : undefined,
      },
      body: body.trim() || undefined,
      intent: intent || undefined,
      templateId: templateId || undefined,
    };
  };

  const handlePreview = async () => {
    setPreviewing(true);
    setError('');
    setSendResult(null);
    try {
      const res = await whatsappApi.preview(buildPayload());
      setPreview(res);
    } catch (err) {
      setError(err.message || 'Could not prepare preview.');
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
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
                setBody(tmpl.body || '');
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

          {/* Message Body */}
          <div className="border border-slate-200/90 rounded-xl bg-white overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
            <textarea
              ref={textareaRef}
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 2000))}
              placeholder="Type notification message here or choose an active template above..."
              className="w-full p-3.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
            />
            {body && (
              <div className="px-3 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setBody('')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <Trash2 size={12} strokeWidth={2.4} />
                  <span>Clear Message</span>
                </button>
              </div>
            )}
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
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Smartphone size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 leading-tight">
                  {connection?.displayName || 'Registered Business Line'}
                </h4>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  {connection?.businessPhoneNumber ? `+${connection.businessPhoneNumber}` : '+91 6291773811'} · OpenWA Linked Device
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
              <span className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono transition-all ${
                selectedIds.length > 0 ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-500'
              }`}>
                {selectedIds.length} Selected
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
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span>Selected Recipients:</span>
              <strong className="text-slate-900 font-bold font-mono">
                {selectedIds.length > 0 ? `${selectedIds.length} members` : 'All members'}
              </strong>
            </div>
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
              disabled={sending}
              className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer ${
                sending
                  ? 'bg-slate-200 text-slate-400 cursor-wait shadow-none'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-98'
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
                  <span>Send WhatsApp ({selectedIds.length || 'All'})</span>
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
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   2. GATEWAY COCKPIT (OVERVIEW)
════════════════════════════════════════════════════════════ */
function OverviewTab({ overview, loading, error, onRefresh }) {
  if (loading && !overview) return <Spinner label="Reading WhatsApp activity…" />;

  const today = overview?.today || {};
  const stats = [
    { label: 'Queued', value: today.queued || 0, icon: Clock },
    { label: 'Accepted', value: today.accepted || 0, icon: Send },
    { label: 'Delivered', value: today.delivered || 0, icon: CheckCheck },
    { label: 'Read', value: today.read || 0, icon: CheckCheck },
    { label: 'Failed', value: (today.failed || 0) + (today.rejected || 0), icon: AlertCircle },
  ];

  return (
    <div className="space-y-4">
      <ErrorNote message={error} onRetry={onRefresh} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Icon size={14} />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1.5 tabular-nums">{value}</p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">today</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <WhatsAppConnectionCard />

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Approved Utility Templates
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              {overview?.templates?.total || 8} Active
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Local templates render immediately with live variable substitution and skip Meta per-message fees.
          </p>
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Usable Templates:</span>
              <strong className="text-slate-900 font-mono">{overview?.templates?.usable || 8}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Categories:</span>
              <strong className="text-slate-900">Utility, Receipts, Alerts</strong>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Member Opt-in Consent
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-400">Compliance</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Only members with recorded consent are dispatched outside the 24h customer window.
          </p>
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Opted In:</span>
              <strong className="text-emerald-700 font-mono">{overview?.consent?.optedIn || 0}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Total Members:</span>
              <strong className="text-slate-900 font-mono">{overview?.consent?.totalMembers || 0}</strong>
            </div>
          </div>
        </Card>
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

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await whatsappApi.getMessages({ status, search, limit: 100 });
      setMessages(result?.messages || []);
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

  const cancel = async (id) => {
    try {
      await whatsappApi.cancelMessage(id);
      await load();
      if (onChanged) onChanged();
    } catch (err) {
      setError(err.message || 'Could not cancel the message.');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CustomDropdown
            value={status}
            onChange={(val) => setStatus(val)}
            options={[
              { value: 'ALL', label: 'All statuses' },
              { value: 'QUEUED', label: 'Queued' },
              { value: 'PROCESSING', label: 'Processing' },
              { value: 'ACCEPTED', label: 'Accepted' },
              { value: 'SENT', label: 'Sent' },
              { value: 'DELIVERED', label: 'Delivered' },
              { value: 'READ', label: 'Read' },
              { value: 'FAILED', label: 'Failed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
            className="w-44"
            buttonClassName="h-9 rounded-xl border border-slate-200 text-xs font-bold"
          />
          <div className="relative flex-1 min-w-44 flex items-center">
            <Search size={13} className="absolute left-3 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search recipient name or phone..."
              className="h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs w-full focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw size={13} /> Refresh Logs
          </button>
        </div>
        <ErrorNote message={error} onRetry={load} />
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner label="Loading messages…" />
        ) : messages.length === 0 ? (
          <EmptyState
            title="No broadcast messages yet"
            description="Messages you send from the Composer Studio will appear here with live OpenWA delivery receipts."
            icon={History}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-black">Recipient</th>
                  <th className="px-4 py-3 font-black">Template / Type</th>
                  <th className="px-4 py-3 font-black">Timestamp</th>
                  <th className="px-4 py-3 font-black">Status</th>
                  <th className="px-4 py-3 font-black">Message Preview / Error</th>
                  <th className="px-4 py-3 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{m.recipientName || 'Member'}</p>
                      <p className="text-[10px] font-mono text-slate-400">{m.recipientMasked || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {m.messageType === 'TEMPLATE' ? m.templateName || 'Utility Template' : 'Text Message'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={m.deliveryStatus} />
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 max-w-72 truncate">
                      {m.failureReason || m.preview || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.deliveryStatus === 'QUEUED' && (
                        <button
                          type="button"
                          onClick={() => cancel(m.id)}
                          className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   4. AUTOMATION TAB
════════════════════════════════════════════════════════════ */
function AutomationTab({ templates }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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

  const update = (id, patch) => {
    setRules((current) => current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
    setNotice('');
  };

  const save = async () => {
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
      setNotice('Automation schedules saved successfully. Reminders dispatch automatically via background worker.');
    } catch (err) {
      setError(err.message || 'Could not save automation rules.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner label="Loading automation rules…" />;

  return (
    <div className="space-y-4">
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Automated WhatsApp Utility Alerts
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5 max-w-xl">
            Configure automated event reminders for attendance, expiring memberships, and payment dues.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-600 transition-all cursor-pointer shadow-md disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
          <span>Save Automation</span>
        </button>
      </Card>

      <ErrorNote message={error} onRetry={load} />
      {notice && (
        <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          {notice}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <Card key={rule.id} className="p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900">{rule.label || rule.ruleType}</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(rule.isEnabled)}
                  onChange={(e) => update(rule.id, { isEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
                />
                <span className="text-xs font-bold text-slate-700">{rule.isEnabled ? 'Active' : 'Inactive'}</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Time</span>
                <input
                  type="time"
                  value={rule.sendTime}
                  onChange={(e) => update(rule.id, { sendTime: e.target.value })}
                  className="h-8 px-2 rounded-lg border border-slate-200 bg-white font-mono text-xs w-full"
                />
              </div>
              <div>
                <CustomDropdown
                  label="Template"
                  value={rule.templateId || ''}
                  onChange={(val) => update(rule.id, { templateId: val || null })}
                  placeholder="Auto-select template"
                  options={[
                    { value: '', label: 'Auto-select template' },
                    ...approvedTemplates.map((t) => ({
                      value: t.id,
                      label: t.label,
                    })),
                  ]}
                  buttonClassName="h-8 px-2 rounded-lg border border-slate-200 text-xs font-bold"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   5. SETTINGS & CONSENT TAB
════════════════════════════════════════════════════════════ */
function SettingsTab({ templates, usage, onRefresh }) {
  const [consents, setConsents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await whatsappApi.getConsents(search);
      setConsents(result?.members || []);
    } catch (err) {
      setError(err.message || 'Could not load consent list.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleConsent = async (memberId, currentStatus) => {
    setBusyId(memberId);
    setError('');
    setNotice('');
    const nextStatus = currentStatus === 'GRANTED' ? 'WITHDRAWN' : 'GRANTED';
    try {
      await whatsappApi.setConsent(memberId, nextStatus, 'OWNER_CONSOLE');
      setConsents((curr) =>
        curr.map((m) => (m.id === memberId ? { ...m, consentStatus: nextStatus } : m))
      );
      setNotice('Member consent status updated.');
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message || 'Could not update consent.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
              WhatsApp Consent Registry
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Review and manage member opt-in consent states required for background template dispatches.
            </p>
          </div>
          <div className="relative min-w-56">
            <Search size={13} className="absolute left-3 top-3 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member name or phone..."
              className="h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs w-full font-medium"
            />
          </div>
        </div>

        <ErrorNote message={error} onRetry={load} />
        {notice && (
          <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 mb-3">
            {notice}
          </p>
        )}

        {loading ? (
          <Spinner label="Loading consent directory…" />
        ) : consents.length === 0 ? (
          <EmptyState title="No members found" description="Add members to see their WhatsApp consent status." icon={Users} />
        ) : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {consents.map((m) => (
              <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{m.fullName}</p>
                  <p className="text-[10px] font-mono text-slate-400">{m.phoneMasked || 'No phone'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono border ${
                      m.consentStatus === 'GRANTED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {m.consentStatus}
                  </span>
                  <button
                    type="button"
                    disabled={busyId === m.id}
                    onClick={() => toggleConsent(m.id, m.consentStatus)}
                    className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {busyId === m.id ? 'Updating…' : m.consentStatus === 'GRANTED' ? 'Revoke' : 'Grant'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
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
              className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0"
              style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px' }}
            >
              <Smartphone size={18} strokeWidth={2.2} className="text-white" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-none whitespace-nowrap">
                Communication Hub
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

            <button
              type="button"
              onClick={refresh}
              className="h-8 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw size={12} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── SCROLLABLE PAGE BODY ─── */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto px-6 sm:px-8 py-5 flex flex-col gap-5">
        <div className="notify-members-workspace !p-0 !border-0 !bg-transparent !shadow-none">
          {tab === 'compose' && (
            <ComposeTab templates={templates} onSent={refresh} connection={overview?.connection} />
          )}
          {tab === 'overview' && (
            <OverviewTab overview={overview} loading={loading} error={error} onRefresh={refresh} />
          )}
          {tab === 'history' && <HistoryTab onChanged={refresh} />}
          {tab === 'automation' && <AutomationTab templates={templates} />}
          {tab === 'settings' && <SettingsTab templates={templates} usage={usage} onRefresh={refresh} />}
        </div>
      </div>
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
