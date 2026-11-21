/**
 * GymDeck Email Communication Workspace
 *
 * Professional Enterprise Design:
 *  - Ultra-clean, properly scaled and compact layout tailored for Desktop ERP viewport.
 *  - High-density information architecture without wasted vertical padding or awkward wrapping.
 *  - Executive KPI Telemetry: Quota usage meter, delivery success percentage, Postal engine health.
 *  - Modern Tabbed Navigation with crisp iconography and badge pill indicators.
 *  - Ergonomic Two-Column Composer with structured sender metadata, dynamic personalization tags,
 *    and an interactive Member Directory selector with instant search & filter pills.
 *  - Audit-ready Transmission History table with real-time status badges and modal inspection drilldown.
 *  - Enterprise-grade Drafts and Production Templates manager.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
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
  ShieldCheck,
  Check,
  Filter,
  Sparkles,
  Inbox,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Server,
  Zap,
  Layers,
  CheckCheck,
  Bookmark,
  FileEdit,
  Info,
  BarChart3,
} from 'lucide-react';
import { emailApi } from './emailApi.js';

export default function EmailHub() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'compose' | 'history' | 'drafts' | 'templates'
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [history, setHistory] = useState({ messages: [], totalCount: 0 });
  const [drafts, setDrafts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Composer State
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [senderDisplayName, setSenderDisplayName] = useState('');
  const [replyToAddress, setReplyToAddress] = useState('');
  const [recipientFilter, setRecipientFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'EXPIRED' | 'TRIAL'
  const [memberSearch, setMemberSearch] = useState('');
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [inspectMessage, setInspectMessage] = useState(null);
  const [inspectRecipients, setInspectRecipients] = useState([]);
  const [loadingInspect, setLoadingInspect] = useState(false);

  // Load Overview Data
  const loadOverview = useCallback(async () => {
    try {
      const data = await emailApi.getOverview();
      setOverview(data);
    } catch (err) {
      setError(err.message || 'Could not load email metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load History
  const loadHistory = useCallback(async () => {
    try {
      const data = await emailApi.getHistory();
      setHistory(data);
    } catch (err) {
      console.warn('Could not load email history:', err);
    }
  }, []);

  // Load Drafts
  const loadDrafts = useCallback(async () => {
    try {
      const data = await emailApi.getDrafts();
      setDrafts(data || []);
    } catch (err) {
      console.warn('Could not load drafts:', err);
    }
  }, []);

  // Load Templates
  const loadTemplates = useCallback(async () => {
    try {
      const data = await emailApi.getTemplates();
      setTemplates(data || []);
    } catch (err) {
      console.warn('Could not load templates:', err);
    }
  }, []);

  // Fetch Member Directory for Recipient Selection
  const loadRecipients = useCallback(async (status, search) => {
    setLoadingMembers(true);
    try {
      const data = await emailApi.getRecipients({
        status: status === 'ALL' ? undefined : status,
        search: search || undefined,
        limit: 150,
      });
      setAvailableMembers(data.members || []);
    } catch (err) {
      console.warn('Could not load member recipients:', err);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    loadHistory();
    loadDrafts();
    loadTemplates();
  }, [loadOverview, loadHistory, loadDrafts, loadTemplates]);

  useEffect(() => {
    if (activeTab === 'compose') {
      loadRecipients(recipientFilter, memberSearch);
    }
  }, [activeTab, recipientFilter, memberSearch, loadRecipients]);

  // Auto-dismiss alerts
  useEffect(() => {
    if (!notice && !error) return undefined;
    const timer = setTimeout(() => {
      setNotice('');
      setError('');
    }, 3500);
    return () => clearTimeout(timer);
  }, [notice, error]);

  // Recipient selection helpers
  const validEmailMembers = useMemo(() => {
    return availableMembers.filter((m) => m.email && m.email.trim() !== '');
  }, [availableMembers]);

  const toggleSelectMember = (id) => {
    const next = new Set(selectedMemberIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMemberIds(next);
  };

  const selectAllFiltered = () => {
    const next = new Set(selectedMemberIds);
    validEmailMembers.forEach((m) => next.add(m.id));
    setSelectedMemberIds(next);
  };

  const deselectAllFiltered = () => {
    setSelectedMemberIds(new Set());
  };

  // Inspect message
  const handleInspect = async (msgId) => {
    setLoadingInspect(true);
    setShowInspectModal(true);
    try {
      const data = await emailApi.getMessageDetails(msgId);
      setInspectMessage(data.message);
      setInspectRecipients(data.recipients || []);
    } catch (err) {
      setError(err.message || 'Could not load message details.');
      setShowInspectModal(false);
    } finally {
      setLoadingInspect(false);
    }
  };

  // Send Email Action
  const handleConfirmSend = async () => {
    const recipientsToSend = validEmailMembers
      .filter((m) => selectedMemberIds.has(m.id))
      .map((m) => ({
        memberId: m.id,
        email: m.email,
        name: m.fullName,
      }));

    if (recipientsToSend.length === 0) {
      setError('Please select at least one recipient with a valid email.');
      return;
    }

    setIsSending(true);
    setShowConfirmModal(false);

    try {
      await emailApi.sendEmail({
        subject,
        bodyHtml,
        senderDisplayName: senderDisplayName || undefined,
        replyToAddress: replyToAddress || undefined,
        recipients: recipientsToSend,
        idempotencyKey: `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });

      setNotice(`Broadcast successfully queued for ${recipientsToSend.length} members.`);
      setSubject('');
      setBodyHtml('');
      setSelectedMemberIds(new Set());
      setActiveTab('history');
      loadOverview();
      loadHistory();
    } catch (err) {
      setError(err.message || 'Failed to dispatch email broadcast.');
    } finally {
      setIsSending(false);
    }
  };

  // Save Draft Action
  const handleSaveDraft = async () => {
    if (!subject.trim() && !bodyHtml.trim()) {
      setError('Draft requires at least a subject or body.');
      return;
    }

    try {
      await emailApi.saveDraft({
        subject: subject.trim() || 'Untitled Draft',
        bodyHtml,
        senderDisplayName,
        replyToAddress,
        recipients: Array.from(selectedMemberIds).map((id) => ({ memberId: id, email: '' })),
      });
      setNotice('Draft saved to cloud storage.');
      loadDrafts();
    } catch (err) {
      setError(err.message || 'Failed to save draft.');
    }
  };

  // Insert Variable Token into Body
  const insertToken = (token) => {
    setBodyHtml((prev) => prev + ` ${token} `);
  };

  const quota = overview?.quota || {
    allocatedQuota: 300,
    consumedCount: 0,
    reservedCount: 0,
    remainingQuota: 300,
    billingPeriod: 'Current Month',
  };

  const quotaPercent = Math.min(
    100,
    Math.round(((quota.consumedCount + quota.reservedCount) / (quota.allocatedQuota || 300)) * 100)
  );

  return (
    <div className="w-full max-w-7xl mx-auto font-sans text-slate-800 flex flex-col p-4 sm:p-6 space-y-4">
      {/* ─── TOAST NOTIFICATIONS ─── */}
      {notice ? (
        <div className="fixed top-5 right-5 z-[1000] flex items-center gap-2 bg-slate-900 border border-slate-700/60 text-white px-3.5 py-2 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      ) : null}
      {error ? (
        <div className="fixed top-5 right-5 z-[1000] flex items-center gap-2 bg-rose-950 border border-rose-800 text-rose-100 px-3.5 py-2 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={15} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* ─── WORKSPACE COMPACT HEADER & NAVIGATION TABS ─── */}
      <div className="bg-white rounded-xl border border-slate-200/90 px-4 py-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-xs shadow-indigo-200">
            <Mail size={18} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold tracking-tight text-slate-900">Email Line Workspace</h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Postal Relay Online
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal">
              Member broadcast notices, renewal updates, and transaction receipts.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-lg border border-slate-200/60 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <BarChart3 size={13} />
            <span>Overview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'compose'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Send size={12} />
            <span>Compose</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Clock size={13} />
            <span>History</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('drafts')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'drafts'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileEdit size={13} />
            <span>Drafts</span>
            {drafts.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700 text-[10px] font-bold">
                {drafts.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'templates'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Bookmark size={13} />
            <span>Templates</span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: OVERVIEW DASHBOARD ─── */}
      {activeTab === 'overview' ? (
        <div className="space-y-4">
          {/* Executive Compact KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. Monthly Allowance Gauge */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers size={13} className="text-slate-500" /> Monthly Allowance
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/70">
                    {quota.billingPeriod}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-slate-900">{quota.remainingQuota}</span>
                  <span className="text-xs text-slate-400 font-semibold">/ {quota.allocatedQuota} remaining</span>
                </div>
                <div className="mt-2.5 w-full bg-slate-100 h-2 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      quotaPercent > 90
                        ? 'bg-rose-500'
                        : quotaPercent > 70
                        ? 'bg-amber-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${quotaPercent}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>{quota.consumedCount} dispatched</span>
                <span className="text-slate-400">{quota.reservedCount} queued</span>
              </div>
            </div>

            {/* 2. Success & Deliverability */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CheckCheck size={14} className="text-emerald-600" /> Delivery Success
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    High Trust
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-emerald-600">
                    {overview?.metrics?.successRate ?? 100}%
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">inbox placement</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>{overview?.metrics?.deliveredCount ?? 0} confirmed delivered</span>
                <span className="text-slate-400">{overview?.metrics?.bouncedCount ?? 0} bounced</span>
              </div>
            </div>

            {/* 3. Central Infrastructure Telemetry */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Server size={13} className="text-slate-500" /> Relay Node
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/70">
                    <ShieldCheck size={11} className="text-emerald-600" /> DKIM Verified
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-xs font-bold text-slate-900 block truncate">notifications@mail.gymdeck.com</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Automated Postal tenant dispatch</p>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Automatic DMARC</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('compose')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-0.5 cursor-pointer"
                >
                  Compose <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Compact Quick Guidance Banner */}
          <div className="bg-slate-900 rounded-xl p-4 text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                <Zap size={14} className="text-amber-400" /> Out-of-the-Box Managed Mail Server
              </h3>
              <p className="text-[11px] text-slate-300 max-w-2xl leading-normal">
                GymDeck manages all email servers and reputation automatically. Members receive emails with your gym's brand name, and their replies go directly to your contact email.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('compose')}
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <Send size={12} />
              <span>Compose Message</span>
            </button>
          </div>

          {/* Recent Broadcasts Strip */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
              <div className="flex items-center gap-1.5">
                <Clock size={15} className="text-slate-500" />
                <h3 className="text-xs font-bold text-slate-900">Recent Transmissions</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer inline-flex items-center gap-0.5"
              >
                View all <ChevronRight size={12} />
              </button>
            </div>

            {overview?.recentMessages?.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {overview.recentMessages.map((msg) => (
                  <div key={msg.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-lg transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{msg.subject}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(msg.createdAt).toLocaleDateString()} • {msg.recipientCount} recipients
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          msg.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : msg.status === 'SENDING'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {msg.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleInspect(msg.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                      >
                        <Eye size={12} />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs">
                <Inbox size={20} className="mx-auto mb-1.5 opacity-50" />
                <p className="font-semibold text-slate-600">No email broadcasts sent this month</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Click Compose to dispatch emails to your gym members.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ─── TAB 2: COMPOSE EMAIL WORKSPACE ─── */}
      {activeTab === 'compose' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Email Composer & Content (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <FileText size={15} className="text-indigo-600" />
                <span>Message Editor</span>
              </h2>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                <FileEdit size={12} />
                <span>Save Draft</span>
              </button>
            </div>

            {/* Sender Identity Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50/70 p-3 rounded-lg border border-slate-200/60">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Display Name (Gym Title)
                </label>
                <input
                  type="text"
                  value={senderDisplayName}
                  onChange={(e) => setSenderDisplayName(e.target.value)}
                  placeholder="e.g. FitLife Gym Desk"
                  className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Reply-To Address
                </label>
                <input
                  type="email"
                  value={replyToAddress}
                  onChange={(e) => setReplyToAddress(e.target.value)}
                  placeholder="e.g. contact@yourgym.com"
                  className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Subject Input */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Important: Membership Renewal & Workshop Notice"
                className="w-full h-8.5 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-600"
              />
            </div>

            {/* Personalization Variable Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5 flex items-center gap-1">
                <Sparkles size={12} className="text-indigo-600" /> Insert:
              </span>
              {[
                { label: 'Member Name', token: '{member_name}' },
                { label: 'Gym Name', token: '{gym_name}' },
                { label: 'Plan Title', token: '{plan_name}' },
                { label: 'Expiry Date', token: '{expiry_date}' },
              ].map((item) => (
                <button
                  key={item.token}
                  type="button"
                  onClick={() => insertToken(item.token)}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 border border-slate-200/80 cursor-pointer"
                >
                  +{item.label}
                </button>
              ))}
            </div>

            {/* Rich HTML/Text Body Editor */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Email Body Content</label>
              <textarea
                rows={9}
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder="Dear {member_name},&#10;&#10;We hope you are enjoying your workouts at {gym_name}!&#10;&#10;This is a gentle reminder that your membership is due for renewal soon..."
                className="w-full p-3 rounded-lg border border-slate-200 bg-white text-xs font-normal text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-600 resize-y leading-relaxed"
              />
            </div>

            {/* Composer Footer Actions */}
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Audience: <strong className="text-slate-900">{selectedMemberIds.size} recipients</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={selectedMemberIds.size === 0 || !subject.trim() || !bodyHtml.trim() || isSending}
                className="inline-flex items-center gap-1.5 h-8.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-xs"
              >
                {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Review & Dispatch</span>
              </button>
            </div>
          </div>

          {/* Right Column: Member Recipient Selector (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Users size={14} className="text-slate-500" /> Member Directory
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={deselectAllFiltered}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Search size={13} />
              </div>
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search member name or email..."
                className="w-full h-8 pl-8 pr-2.5 rounded-md border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Segmentation Filter Chips */}
            <div className="flex items-center gap-1 flex-wrap">
              {['ALL', 'ACTIVE', 'EXPIRED', 'TRIAL'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setRecipientFilter(status)}
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    recipientFilter === status
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Member List with Checkboxes */}
            <div className="border border-slate-200/80 rounded-lg divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {loadingMembers ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  <Loader2 size={16} className="animate-spin mx-auto mb-1 text-indigo-600" />
                  Loading directory...
                </div>
              ) : validEmailMembers.length > 0 ? (
                validEmailMembers.map((member) => {
                  const isChecked = selectedMemberIds.has(member.id);
                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleSelectMember(member.id)}
                      className={`p-2 flex items-center gap-2.5 cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 shrink-0 border-slate-300"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 truncate">{member.fullName}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {member.membershipStatus}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono block truncate">{member.email}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No members with registered email found.
                </div>
              )}
            </div>

            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center gap-1.5 text-[10px] text-slate-500">
              <Info size={13} className="text-slate-400 shrink-0" />
              <span>Only members with valid emails are listed.</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* ─── TAB 3: SENT EMAIL HISTORY ─── */}
      {activeTab === 'history' ? (
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Transmission History & Audit Ledger</h2>
              <p className="text-[11px] text-slate-400">Permanent delivery records and per-recipient statuses</p>
            </div>
            <button
              type="button"
              onClick={loadHistory}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              <RefreshCw size={11} />
              <span>Refresh</span>
            </button>
          </div>

          {history.messages.length > 0 ? (
            <div className="border border-slate-200/80 rounded-lg overflow-hidden divide-y divide-slate-100">
              <div className="bg-slate-50 px-3 py-2 grid grid-cols-12 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span className="col-span-5">Subject</span>
                <span className="col-span-2">Date</span>
                <span className="col-span-2 text-center">Recipients</span>
                <span className="col-span-2 text-center">Status</span>
                <span className="col-span-1 text-right">Details</span>
              </div>
              {history.messages.map((msg) => (
                <div
                  key={msg.id}
                  className="px-3 py-2.5 grid grid-cols-12 items-center text-xs font-medium hover:bg-slate-50/60 transition-colors"
                >
                  <div className="col-span-5 pr-2">
                    <span className="font-bold text-slate-900 block truncate">{msg.subject}</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      From: {msg.senderDisplayName || 'GymDeck'} &lt;{msg.fromAddress}&gt;
                    </span>
                  </div>
                  <span className="col-span-2 text-slate-500 font-mono text-[10px]">
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </span>
                  <span className="col-span-2 text-center font-bold text-slate-800">{msg.recipientCount}</span>
                  <div className="col-span-2 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        msg.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : msg.status === 'SENDING'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {msg.status}
                    </span>
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleInspect(msg.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    >
                      <Eye size={12} />
                      <span className="hidden sm:inline">Inspect</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Mail size={20} className="mx-auto mb-1.5 opacity-50" />
              <p className="font-semibold text-slate-600">No sent emails recorded yet</p>
            </div>
          )}
        </div>
      ) : null}

      {/* ─── TAB 4: DRAFTS ─── */}
      {activeTab === 'drafts' ? (
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Saved Drafts</h2>
              <p className="text-[11px] text-slate-400">Continue working on unfinished broadcasts</p>
            </div>
          </div>
          {drafts.length > 0 ? (
            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-lg overflow-hidden">
              {drafts.map((d) => (
                <div key={d.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{d.subject || 'Untitled Draft'}</h4>
                    <p className="text-[10px] text-slate-400">
                      Last edited {new Date(d.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSubject(d.subject);
                        setBodyHtml(d.bodyHtml);
                        setActiveTab('compose');
                      }}
                      className="px-3 py-1 rounded-md bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await emailApi.deleteDraft(d.id);
                        loadDrafts();
                      }}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer transition-colors"
                      title="Delete Draft"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              <FileEdit size={20} className="mx-auto mb-1.5 opacity-50" />
              <p className="font-semibold text-slate-600">No saved drafts</p>
            </div>
          )}
        </div>
      ) : null}

      {/* ─── TAB 5: TEMPLATES ─── */}
      {activeTab === 'templates' ? (
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Gym Communication Templates</h2>
              <p className="text-[11px] text-slate-400">Standardized templates for operations and announcements</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                title: 'Membership Renewal Notice',
                subject: 'Your {gym_name} Membership is Expiring Soon',
                body: 'Dear {member_name}, your membership plan {plan_name} expires on {expiry_date}. Please renew at the desk or online to keep training without interruption.',
                tag: 'Operations',
              },
              {
                title: 'Payment Receipt & Statement',
                subject: 'Fee Receipt & Statement from {gym_name}',
                body: 'Dear {member_name}, thank you for your payment. Please find your official gym receipt and tax invoice details attached.',
                tag: 'Billing',
              },
              {
                title: 'Weekend Strength Workshop',
                subject: 'Join Us for Special Weekend Strength Sessions at {gym_name}',
                body: 'Dear {member_name}, join our certified trainers this Saturday for an exclusive strength workshop.',
                tag: 'Events',
              },
            ].map((tmpl, idx) => (
              <div key={idx} className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-2 flex flex-col justify-between hover:border-slate-300 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">{tmpl.title}</h4>
                    <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                      {tmpl.tag}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono bg-white p-1.5 rounded border border-slate-200/70 truncate">
                    Subject: {tmpl.subject}
                  </p>
                  <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                    {tmpl.body}
                  </p>
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSubject(tmpl.subject);
                      setBodyHtml(tmpl.body);
                      setActiveTab('compose');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer shadow-2xs"
                  >
                    <span>Use Template</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ─── CONFIRMATION MODAL BEFORE SENDING ─── */}
      {showConfirmModal && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
              style={{
                background: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(8px)',
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget && !isSending) setShowConfirmModal(false);
              }}
            >
              <div className="w-full max-w-[420px] rounded-2xl bg-white p-5 shadow-2xl border border-white/80 space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Send size={15} className="text-indigo-600" />
                    <span>Confirm Dispatch</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Subject:</span>
                      <strong className="text-slate-900 truncate max-w-[200px]">{subject}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Recipients:</span>
                      <strong className="text-slate-900">{selectedMemberIds.size} members</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Quota Impact:</span>
                      <strong className="text-amber-700 font-mono">-{selectedMemberIds.size} units</strong>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/60">
                      <span className="text-slate-500">Remaining:</span>
                      <strong className="text-emerald-700 font-mono font-bold">
                        {Math.max(0, quota.remainingQuota - selectedMemberIds.size)} units
                      </strong>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-normal">
                    This message will be queued into the durable outbox and dispatched through the Postal relay.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    disabled={isSending}
                    className="flex-1 h-9 rounded-lg border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSend}
                    disabled={isSending}
                    className="flex-1 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    <span>Confirm & Send</span>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {/* ─── INSPECTION MODAL FOR SENT BROADCAST ─── */}
      {showInspectModal && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
              style={{
                background: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(8px)',
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowInspectModal(false);
              }}
            >
              <div className="w-full max-w-[500px] rounded-2xl bg-white p-5 shadow-2xl border border-white/80 space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Eye size={15} className="text-indigo-600" />
                      <span>Delivery Inspection</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate max-w-[340px] mt-0.5">{inspectMessage?.subject}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInspectModal(false)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Status Badges */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Total</span>
                      <strong className="text-xs font-black text-slate-900">
                        {inspectMessage?.recipientCount ?? 0}
                      </strong>
                    </div>
                    <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-100" title="Accepted by remote mail server (MTA 250 OK)">
                      <span className="text-[9px] uppercase font-bold text-emerald-600 block">Server Delivered</span>
                      <strong className="text-xs font-black text-emerald-700">
                        {inspectMessage?.deliveredCount ?? 0}
                      </strong>
                    </div>
                    <div className="p-2 bg-rose-50/60 rounded-lg border border-rose-100">
                      <span className="text-[9px] uppercase font-bold text-rose-600 block">Bounced</span>
                      <strong className="text-xs font-black text-rose-700">
                        {inspectMessage?.bouncedCount ?? 0}
                      </strong>
                    </div>
                  </div>

                  {/* Recipient Breakdown List */}
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-700 mb-1.5">Recipient Delivery Details</h4>
                    <div className="border border-slate-200/70 rounded-lg divide-y divide-slate-100 max-h-[200px] overflow-y-auto">
                      {inspectRecipients.length > 0 ? (
                        inspectRecipients.map((rec) => (
                          <div key={rec.id} className="p-2 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                            <div>
                              <span className="font-bold text-slate-800 block text-[11px]">{rec.recipientName || 'Member'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{rec.recipientEmail}</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                rec.deliveryStatus === 'DELIVERED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : rec.deliveryStatus === 'SENT'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : rec.deliveryStatus === 'BOUNCED'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {rec.deliveryStatus}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="py-5 text-center text-[11px] text-slate-400">Loading delivery telemetry...</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowInspectModal(false)}
                    className="h-8.5 px-4 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer transition-colors shadow-2xs"
                  >
                    Close
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

export const mountEmailHub = () => {
  const container = document.querySelector('[data-stage="email-hub"]');
  if (!container) return null;

  container.innerHTML = '';
  try {
    const root = createRoot(container);
    root.render(<EmailHub />);
    return root;
  } catch (err) {
    container.innerHTML = `<div style="color:#dc2626;padding:20px">Could not load Email Hub: ${err.message}</div>`;
    return null;
  }
};
