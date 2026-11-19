import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  Bell,
  CheckCheck,
  ChevronRight,
  Clock,
  History,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';
import { whatsappApi } from './whatsappApi.js';
import WhatsAppConnectionCard from './WhatsAppConnectionCard.jsx';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'compose', label: 'Compose', icon: MessageCircle },
  { id: 'history', label: 'Message History', icon: History },
  { id: 'automation', label: 'Automation', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

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

function Badge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold tracking-wide ${
        STATUS_STYLES[status] || STATUS_STYLES.DRAFT
      }`}
    >
      {String(status || '').replace(/_/g, ' ')}
    </span>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-zinc-200 shadow-xs ${className}`}>{children}</div>
  );
}

function EmptyState({ title, description, icon: Icon = MessageCircle }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400 mb-3">
        <Icon size={20} />
      </div>
      <p className="text-sm font-semibold text-zinc-800">{title}</p>
      <p className="text-xs text-zinc-500 mt-1 max-w-sm leading-relaxed">{description}</p>
    </div>
  );
}

function Spinner({ label }) {
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500 py-6 justify-center">
      <Loader2 size={15} className="animate-spin" />
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
        <button type="button" onClick={onRetry} className="font-semibold underline shrink-0">
          Retry
        </button>
      ) : null}
    </div>
  );
}

function OverviewTab({ overview, loading, error, onRefresh }) {
  if (loading && !overview) return <Spinner label="Reading WhatsApp activity…" />;

  const today = overview?.today || {};
  const consent = overview?.consent || {};
  const templates = overview?.templates || {};

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
            <div className="flex items-center gap-2 text-zinc-400">
              <Icon size={13} />
              <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 mt-1.5 tabular-nums">{value}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">today</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900">WhatsApp connection</h3>
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100"
              aria-label="Refresh"
            >
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="mt-3">
            <WhatsAppConnectionCard compact />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-zinc-900">Message templates</h3>
          <p className="text-[11px] text-zinc-500 mt-1">
            Local utility templates render instantly through OpenWA. No Meta review is required.
          </p>
          <dl className="mt-3 space-y-2 text-xs">
            {[
              ['Ready to use', templates.approved || 0],
              ['Inactive', templates.notSubmitted || 0],
              ['Total templates', templates.total || (templates.approved || 0) + (templates.notSubmitted || 0)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <dt className="text-zinc-500">{label}</dt>
                <dd className="font-semibold text-zinc-900 tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-zinc-900">Member consent</h3>
          <p className="text-[11px] text-zinc-500 mt-1">
            A saved phone number is not consent. Only opted-in members are messaged.
          </p>
          <dl className="mt-3 space-y-2 text-xs">
            {[
              ['Opted in', consent.granted || 0],
              ['Withdrawn', consent.withdrawn || 0],
              ['Pending', consent.pending || 0],
              ['Total members', consent.totalMembers || 0],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <dt className="text-zinc-500">{label}</dt>
                <dd className="font-semibold text-zinc-900 tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-start gap-2 text-[11px] text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5">
          <ShieldCheck size={14} className="text-zinc-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            GymDeck sends utility notifications through its bundled OpenWA gateway and the gym's
            linked WhatsApp account. There is no Meta Cloud API bill and no per-message GymDeck
            markup. Delivery and read states come only from OpenWA webhooks. OpenWA is an unofficial
            WhatsApp Web client, so use a dedicated gym number and keep sending within WhatsApp's
            limits.
          </p>
        </div>
      </Card>
    </div>
  );
}

function ComposeTab({ templates, onSent, connection }) {
  const [audienceMode, setAudienceMode] = useState('ALL');
  const [withinDays, setWithinDays] = useState(7);
  const [audienceRows, setAudienceRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceError, setAudienceError] = useState('');
  const [body, setBody] = useState('');
  const [intent, setIntent] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [error, setError] = useState('');
  const textareaRef = React.useRef(null);

  const approvedTemplates = useMemo(
    () => (templates || []).filter((template) => template.isUsable),
    [templates]
  );

  const loadAudience = useCallback(async () => {
    setAudienceLoading(true);
    setAudienceError('');
    try {
      const result = await whatsappApi.getAudience({
        mode: 'ALL',
        limit: 200,
      });
      setAudienceRows(result?.members || []);
    } catch (err) {
      setAudienceError(err.message || 'Could not load members.');
    } finally {
      setAudienceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAudience();
  }, [loadAudience]);

  const selectedMembers = useMemo(
    () => audienceRows.filter((row) => selectedIds.includes(row.id)),
    [audienceRows, selectedIds]
  );

  const eligibleCount = useMemo(() => {
    if (audienceMode === 'SELECTED') {
      return selectedMembers.filter((row) => row.eligibleForWhatsApp).length;
    }
    return audienceRows.filter((row) => row.eligibleForWhatsApp).length;
  }, [audienceMode, selectedMembers, audienceRows]);

  const buildAudience = () => {
    if (audienceMode === 'SELECTED') {
      return { mode: 'SELECTED', memberIds: selectedIds, limit: 200 };
    }
    if (audienceMode === 'EXPIRING') return { mode: 'EXPIRING', withinDays, limit: 200 };
    if (audienceMode === 'PENDING_PAYMENT') return { mode: 'PENDING_PAYMENT', limit: 200 };
    if (audienceMode === 'RECENT_ATTENDANCE') return { mode: 'RECENT_ATTENDANCE', limit: 200 };
    return { mode: 'ALL', limit: 200 };
  };

  const handleInsertVariable = (variable) => {
    const el = textareaRef.current;
    if (!el) {
      setBody((current) => `${current}${variable}`);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${variable}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + variable.length;
    });
  };

  const payload = () => ({
    audience: buildAudience(),
    body: body.trim() || undefined,
    intent: intent || undefined,
    templateId: templateId || undefined,
  });

  const handlePreview = async () => {
    setPreviewing(true);
    setError('');
    setSendResult(null);
    try {
      setPreview(await whatsappApi.preview(payload()));
    } catch (err) {
      setError(err.message || 'Could not prepare the preview.');
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    if (!preview) return;
    if (preview.counts?.eligible > 1) {
      const ok = window.confirm(
        `Send this WhatsApp message to ${preview.counts.eligible} members?\n\n` +
          `${preview.mode === 'TEMPLATE' ? 'A saved utility template will be sent because the 24-hour window is closed.' : 'Free-form text will be used because the customer window is open.'}`
      );
      if (!ok) return;
    }

    setSending(true);
    setError('');
    try {
      const result = await whatsappApi.send({
        ...payload(),
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
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div className="xl:col-span-2 space-y-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Users size={15} className="text-zinc-400" /> Recipients
          </h3>

          <div className="mt-3 space-y-2">
            {[
              ['ALL', 'All members'],
              ['SELECTED', 'Selected members'],
              ['EXPIRING', 'Expiring memberships'],
              ['PENDING_PAYMENT', 'Members with pending payments'],
              ['RECENT_ATTENDANCE', 'Recent attendance'],
            ].map(([value, label]) => (
              <label
                key={value}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border cursor-pointer text-xs ${
                  audienceMode === value
                    ? 'border-zinc-900 bg-zinc-50 font-semibold text-zinc-900'
                    : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="whatsapp-audience"
                    value={value}
                    checked={audienceMode === value}
                    onChange={() => setAudienceMode(value)}
                    className="accent-zinc-900"
                  />
                  {label}
                </span>
                <ChevronRight size={13} className="text-zinc-300" />
              </label>
            ))}
          </div>

          {audienceMode === 'EXPIRING' ? (
            <label className="mt-3 block text-[11px] font-medium text-zinc-600">
              Within the next
              <select
                value={withinDays}
                onChange={(event) => setWithinDays(Number(event.target.value))}
                className="ml-2 h-8 px-2 rounded-lg border border-zinc-200 bg-white text-xs"
              >
                {[1, 3, 7, 15, 30].map((days) => (
                  <option key={days} value={days}>
                    {days} day{days === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="mt-3 rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2 text-[11px] text-zinc-600">
            <span className="font-semibold text-zinc-900">{eligibleCount}</span> eligible recipient
            {eligibleCount === 1 ? '' : 's'}
            {audienceMode === 'SELECTED' ? ` (${selectedIds.length} selected)` : ''}. Members without a
            valid WhatsApp number or consent are skipped.
          </div>

          {audienceMode === 'SELECTED' ? (
            <div className="mt-3 max-h-64 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100">
              {audienceLoading ? (
                <Spinner label="Loading members…" />
              ) : audienceRows.length === 0 ? (
                <p className="text-xs text-zinc-500 p-3">No members found.</p>
              ) : (
                audienceRows.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-start gap-2 px-3 py-2 text-xs hover:bg-zinc-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(member.id)}
                      onChange={(event) => {
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, member.id]
                            : current.filter((id) => id !== member.id)
                        );
                      }}
                      className="mt-0.5 accent-zinc-900"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="font-semibold text-zinc-800 block truncate">{member.fullName}</span>
                      <span className="text-[10px] text-zinc-500 block truncate">
                        {member.phoneMasked || 'No phone'} · {member.membershipStatus}
                      </span>
                    </span>
                    {member.eligibleForWhatsApp ? (
                      <span className="text-[9px] font-semibold text-emerald-700">OK</span>
                    ) : (
                      <span className="text-[9px] font-semibold text-amber-600">SKIP</span>
                    )}
                  </label>
                ))
              )}
            </div>
          ) : null}

          <ErrorNote message={audienceError} onRetry={loadAudience} />
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-zinc-900">Notification template</h3>
          <p className="text-[11px] text-zinc-500 mt-1">
            Required when the member has not messaged the gym in the last 24 hours.
          </p>
          <select
            value={templateId || intent}
            onChange={(event) => {
              const value = event.target.value;
              const template = approvedTemplates.find((row) => row.id === value);
              if (template) {
                setTemplateId(template.id);
                setIntent(template.intent);
              } else {
                setTemplateId('');
                setIntent(value);
              }
            }}
            className="mt-3 w-full h-9 px-2 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-700"
          >
            <option value="">Auto — use free text if the window is open</option>
            {approvedTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.label} · {template.language}
              </option>
            ))}
          </select>
          {approvedTemplates.length === 0 ? (
            <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              No saved utility template yet. Outside the 24-hour window GymDeck will block the send
              and explain what is missing instead of sending a different message.
            </p>
          ) : null}
        </Card>
      </div>

      <div className="xl:col-span-3 space-y-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900">Message</h3>
            <span className="text-[10px] tabular-nums text-zinc-400">{body.length}/2000</span>
          </div>

          <textarea
            ref={textareaRef}
            value={body}
            onChange={(event) => setBody(event.target.value.slice(0, 2000))}
            rows={7}
            placeholder="Your gym membership expires tomorrow. Please renew to continue your workouts."
            className="mt-3 w-full rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white p-3 text-xs text-zinc-800 leading-relaxed outline-none focus:ring-2 focus:ring-zinc-900"
          />

          <div className="mt-2 flex flex-wrap gap-1.5">
            {VARIABLES.map((variable) => (
              <button
                key={variable}
                type="button"
                onClick={() => handleInsertVariable(variable)}
                className="px-2 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-[10px] font-medium text-zinc-600 hover:bg-zinc-200"
              >
                {variable}
              </button>
            ))}
          </div>

          <p className="mt-2 text-[10px] text-zinc-400 leading-relaxed">
            Variables are filled from this gym's records. A missing value blocks that recipient instead
            of sending an incomplete message. Promotional broadcasts are intentionally not supported.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewing || sending}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              {previewing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Preview
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!preview || sending || !preview.canSend}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
            >
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              SEND WHATSAPP
            </button>
          </div>

          <ErrorNote message={error} />
        </Card>

        {preview ? (
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-zinc-900">Preview</h3>
              <div className="flex items-center gap-1.5">
                <Badge status={preview.mode === 'TEXT' ? 'ACCEPTED' : 'DRAFT'} />
                <span className="text-[10px] text-zinc-500">
                  {preview.counts.eligible} eligible · {preview.counts.blocked} skipped
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-600 mt-2 leading-relaxed">{preview.windowRule}</p>
            {preview.template ? (
              <p className="text-[11px] text-zinc-500 mt-1">
                Template: <span className="font-semibold text-zinc-700">{preview.template.label}</span>
              </p>
            ) : null}
            {preview.account?.businessPhoneNumber ? (
              <p className="text-[11px] text-zinc-500 mt-1">
                Sender: <span className="font-semibold text-zinc-700">{preview.account.businessPhoneNumber}</span>
                {' · linked through OpenWA'}
              </p>
            ) : null}
            <p className="text-[11px] text-zinc-600 mt-1">
              No per-message Meta charge applies. The gym's own WhatsApp account sends the message
              through OpenWA.
            </p>

            <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-zinc-100 border border-zinc-200 rounded-xl">
              {preview.recipients.map((recipient) => (
                <div key={recipient.memberId} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-zinc-800 truncate">
                      {recipient.fullName}
                      <span className="text-[10px] font-normal text-zinc-400 ml-1.5">
                        {recipient.phoneMasked || 'no phone'}
                      </span>
                    </p>
                    <Badge status={recipient.eligible ? 'QUEUED' : 'REJECTED'} />
                  </div>
                  {recipient.eligible ? (
                    <p className="text-[11px] text-zinc-600 mt-1.5 whitespace-pre-wrap leading-relaxed">
                      {recipient.preview}
                    </p>
                  ) : (
                    <p className="text-[11px] text-rose-600 mt-1.5">{recipient.ownerMessage}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {sendResult ? (
          <Card className="p-5 border-emerald-200 bg-emerald-50/40">
            <h3 className="text-sm font-bold text-emerald-900">
              {sendResult.duplicate ? 'Already queued — no duplicates created' : 'Message queued'}
            </h3>
            <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed">
              {sendResult.queued} job{sendResult.queued === 1 ? '' : 's'} accepted by the central
              messaging service. Delivery is confirmed only when OpenWA webhooks report it.
            </p>
            {sendResult.skippedReasons?.length ? (
              <ul className="mt-2 space-y-1 text-[11px] text-amber-800">
                {sendResult.skippedReasons.slice(0, 8).map((reason) => (
                  <li key={reason.memberId}>
                    • {reason.fullName}: {reason.ownerMessage}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}

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
    const timer = setInterval(load, 12000);
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
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-9 px-2 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-700"
          >
            {['ALL', 'QUEUED', 'PROCESSING', 'ACCEPTED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED'].map(
              (value) => (
                <option key={value} value={value}>
                  {value === 'ALL' ? 'All statuses' : value}
                </option>
              )
            )}
          </select>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search recipient or number"
            className="h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs flex-1 min-w-40"
          />
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
        <ErrorNote message={error} onRetry={load} />
      </Card>

      <Card>
        {loading ? (
          <Spinner label="Loading messages…" />
        ) : messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Messages you send from the Compose tab appear here with their real OpenWA delivery states."
            icon={History}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Recipient</th>
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 font-semibold">Created</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Detail</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {messages.map((message) => (
                  <tr key={message.id} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-zinc-800">{message.recipientName || 'Member'}</p>
                      <p className="text-[10px] text-zinc-400">{message.recipientMasked || '—'}</p>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600">
                      {message.messageType === 'TEMPLATE'
                        ? message.templateName || 'Template'
                        : 'Text'}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap">
                      {new Date(message.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge status={message.deliveryStatus} />
                    </td>
                    <td className="px-4 py-2.5 text-[10px] text-zinc-500 max-w-56">
                      {message.failureReason || message.preview || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {message.deliveryStatus === 'QUEUED' ? (
                        <button
                          type="button"
                          onClick={() => cancel(message.id)}
                          className="text-[10px] font-semibold text-rose-600 hover:underline"
                        >
                          Cancel
                        </button>
                      ) : null}
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
      setNotice('Automation saved. Reminders run on the GymDeck cloud even when this computer is off.');
    } catch (err) {
      setError(err.message || 'Could not save automation rules.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner label="Loading automation…" />;

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-start justify-between gap-3">
        <div className="text-[11px] text-zinc-600 max-w-2xl leading-relaxed">
          <p className="font-semibold text-zinc-800 text-xs">Automatic utility reminders</p>
          <p className="mt-1">
            Every rule is off until you enable it. Reminders are generated on the central backend and
            sent only when the member has consent and a saved template is available. Duplicate
            reminders for the same day are prevented.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 disabled:opacity-60"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
          Save automation
        </button>
      </Card>

      <ErrorNote message={error} onRetry={load} />
      {notice ? (
        <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          {notice}
        </p>
      ) : null}

      <div className="space-y-3">
        {Object.entries(
          rules.reduce((groups, rule) => {
            groups[rule.ruleType] = groups[rule.ruleType] || [];
            groups[rule.ruleType].push(rule);
            return groups;
          }, {})
        ).map(([ruleType, group]) => (
          <Card key={ruleType} className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-900">{group[0].label}</h3>
              <span className="text-[10px] text-zinc-400">{group.length} schedule(s)</span>
            </div>

            <div className="mt-2 space-y-2">
              {group
                .sort((a, b) => b.offsetDays - a.offsetDays)
                .map((rule) => (
                  <div
                    key={rule.id}
                    className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/60"
                  >
                    <label className="inline-flex items-center gap-2 text-[11px] text-zinc-600">
                      <input
                        type="checkbox"
                        checked={Boolean(rule.isEnabled)}
                        onChange={(event) => update(rule.id, { isEnabled: event.target.checked })}
                        className="accent-zinc-900"
                      />
                      {rule.offsetDays === 0
                        ? 'On the day'
                        : rule.offsetDays > 0
                          ? `${rule.offsetDays} day${rule.offsetDays === 1 ? '' : 's'} before`
                          : `${Math.abs(rule.offsetDays)} day${Math.abs(rule.offsetDays) === 1 ? '' : 's'} after`}
                    </label>

                    <label className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                      at
                      <input
                        type="time"
                        value={rule.sendTime}
                        onChange={(event) => update(rule.id, { sendTime: event.target.value })}
                        className="h-7 px-1.5 rounded-md border border-zinc-200 bg-white text-[11px]"
                      />
                    </label>

                    <select
                      value={rule.templateId || ''}
                      onChange={(event) => update(rule.id, { templateId: event.target.value || null })}
                      className="ml-auto h-7 px-1.5 rounded-md border border-zinc-200 bg-white text-[10px] text-zinc-600 max-w-56"
                    >
                      <option value="">Auto-select saved template</option>
                      {approvedTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.label}
                        </option>
                      ))}
                    </select>

                    {rule.lastRunAt ? (
                      <span className="text-[9px] text-zinc-400 w-full">
                        Last run {new Date(rule.lastRunAt).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                ))}
            </div>
          </Card>
        ))}
      </div>

      {approvedTemplates.length === 0 ? (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Automation cannot send until at least one utility template is saved and active. Nothing is
          substituted or faked in the meantime.
        </p>
      ) : null}
    </div>
  );
}

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
      setError(err.message || 'Could not load consent records.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const setConsent = async (memberId, status) => {
    setBusyId(memberId);
    try {
      await whatsappApi.setConsent(memberId, status, 'OWNER_RECORDED');
      setNotice('Consent updated.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not update consent.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-sm font-bold text-zinc-900">Connected account</h3>
        <div className="mt-2">
          <WhatsAppConnectionCard />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Utility templates</h3>
            <p className="text-[11px] text-zinc-500 mt-1">
              Templates are stored locally and rendered to plain text through OpenWA. No approval
              step is needed.
            </p>
          </div>
        </div>

        {notice ? (
          <p className="mt-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            {notice}
          </p>
        ) : null}
        <ErrorNote message={error} onRetry={load} />

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-zinc-500 bg-zinc-50">
              <tr>
                <th className="px-3 py-2 font-semibold">Template</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Language</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(templates || []).map((template) => (
                <tr key={template.id}>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-zinc-800">{template.label}</p>
                    <p className="text-[10px] text-zinc-400">{template.templateName}</p>
                  </td>
                  <td className="px-3 py-2 text-zinc-600">{template.category}</td>
                  <td className="px-3 py-2 text-zinc-600">{template.language}</td>
                  <td className="px-3 py-2">
                    <Badge status={template.isUsable ? 'DELIVERED' : 'DRAFT'} />
                    <span className="ml-1.5 text-[10px] text-zinc-500">
                      {template.isUsable ? 'Ready' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Member consent</h3>
            <p className="text-[11px] text-zinc-500 mt-1">
              Saving a phone number is not consent. Withdrawn members are never messaged.
            </p>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search members"
            className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-white text-[11px]"
          />
        </div>

        {loading ? (
          <Spinner label="Loading consent records…" />
        ) : consents.length === 0 ? (
          <EmptyState title="No members found" description="Add members to see their WhatsApp consent state." icon={Users} />
        ) : (
          <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-zinc-100 border border-zinc-200 rounded-xl">
            {consents.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-800 truncate">{member.fullName}</p>
                  <p className="text-[10px] text-zinc-400">
                    {member.phoneMasked || 'No phone'} · {member.consentStatus}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConsent(member.id, 'GRANTED')}
                    disabled={busyId === member.id || member.consentStatus === 'GRANTED'}
                    className="h-7 px-2 rounded-md border border-emerald-200 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                  >
                    Opt in
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsent(member.id, 'WITHDRAWN')}
                    disabled={busyId === member.id || member.consentStatus === 'WITHDRAWN'}
                    className="h-7 px-2 rounded-md border border-rose-200 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                  >
                    Opt out
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">            <h3 className="text-sm font-bold text-zinc-900">Usage</h3>
        <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{usage?.billingNote || 'Usage appears after messages are queued.'}</p>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            ['Submitted', usage?.submitted || 0],
            ['Delivered', usage?.delivered || 0],
            ['Failed', (usage?.failed || 0) + (usage?.rejected || 0)],
            ['Period', `${usage?.periodDays || 30} days`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-zinc-50 border border-zinc-200 p-3">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">{label}</p>
              <p className="text-lg font-bold text-zinc-900 mt-0.5 tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function CommunicationHub() {
  const [tab, setTab] = useState('overview');
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
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <div className="p-5 lg:p-7 max-w-[1400px] mx-auto space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Smartphone size={17} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-zinc-900">Communication Hub</h1>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    overview?.connection?.isLive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                  }`}
                >
                  {overview?.connection?.isLive ? 'CONNECTED' : 'NOT CONNECTED'}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Send utility WhatsApp messages through the gym's linked account and GymDeck's
                bundled OpenWA gateway.
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {error && tab !== 'compose' && tab !== 'automation' && tab !== 'settings' ? (
        <ErrorNote message={error} onRetry={refresh} />
      ) : null}

      {tab === 'overview' ? (
        <OverviewTab overview={overview} loading={loading} error={error} onRefresh={refresh} />
      ) : null}
      {tab === 'compose' ? (
        <ComposeTab templates={templates} onSent={refresh} connection={overview?.connection} />
      ) : null}
      {tab === 'history' ? <HistoryTab onChanged={refresh} /> : null}
      {tab === 'automation' ? <AutomationTab templates={templates} /> : null}
      {tab === 'settings' ? (
        <SettingsTab templates={templates} usage={usage} onRefresh={refresh} />
      ) : null}
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
    container.innerHTML = `<div style="color:#dc2626;padding:20px">Could not load the Communication Hub: ${err.message}</div>`;
    return null;
  }
};

export default CommunicationHub;
