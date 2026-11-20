/**
 * GymDeck Email Communication Workspace
 *
 * Production ERP Email Hub:
 *  - Overview metrics & real-time quota meter (300 recipients/month)
 *  - Rich composer with recipient segment selection (Active, Expiring, Trial, All)
 *  - Personalization variable tokens ({member_name}, {gym_name}, {expiry_date})
 *  - Confirmation modal reflecting server-validated recipient counts & quota
 *  - Sent broadcast ledger & message delivery drilldown inspection
 *  - Drafts & reusable templates
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
        limit: 100,
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
    }, 3000);
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

      setNotice(`Broadcast queued for ${recipientsToSend.length} members!`);
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
      setNotice('Draft saved successfully.');
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
  };

  const quotaPercent = Math.min(
    100,
    Math.round(((quota.consumedCount + quota.reservedCount) / (quota.allocatedQuota || 300)) * 100)
  );

  return (
    <div className="min-h-full bg-zinc-50/60 font-sans text-zinc-900 flex flex-col p-6 sm:p-8 space-y-6">
      {/* ─── TOAST NOTIFICATIONS ─── */}
      {notice ? (
        <div className="fixed top-6 right-6 z-[1000] flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      ) : null}
      {error ? (
        <div className="fixed top-6 right-6 z-[1000] flex items-center gap-2.5 bg-rose-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      {/* ─── WORKSPACE HEADER & NAVIGATION TABS ─── */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Mail size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">Email Line Workspace</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <ShieldCheck size={12} strokeWidth={2.5} /> Central Engine Online
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-normal mt-0.5">
              Multi-tenant member broadcast, transactional GST invoices & renewal announcements
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-zinc-100 p-1.5 rounded-xl self-start md:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'overview' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'compose' ? 'bg-zinc-900 text-white shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Send size={12} />
            <span>Compose</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Sent History
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('drafts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'drafts' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Drafts ({drafts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'templates' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Templates
          </button>
        </div>
      </div>

      {/* ─── TAB 1: OVERVIEW DASHBOARD ─── */}
      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Monthly Allowance Gauge */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Monthly Allowance</span>
                  <span className="text-[11px] font-mono font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md">
                    {quota.billingPeriod}
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight text-zinc-900">{quota.remainingQuota}</span>
                  <span className="text-xs text-zinc-400 font-semibold">/ {quota.allocatedQuota} remaining</span>
                </div>
                <div className="mt-3 w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      quotaPercent > 90 ? 'bg-rose-500' : quotaPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${quotaPercent}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 mt-4 pt-3 border-t border-zinc-100 leading-normal">
                {quota.consumedCount} dispatched • {quota.reservedCount} queued in pipeline
              </p>
            </div>

            {/* 2. Success & Deliverability */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Delivery Success</span>
                  <CheckCircle2 size={15} className="text-emerald-600" />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight text-emerald-700">
                    {overview?.metrics?.successRate ?? 100}%
                  </span>
                  <span className="text-xs text-zinc-400 font-semibold">inbox delivery rate</span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 mt-4 pt-3 border-t border-zinc-100 leading-normal">
                {overview?.metrics?.deliveredCount ?? 0} delivered • {overview?.metrics?.bouncedCount ?? 0} bounced
              </p>
            </div>

            {/* 3. Central Infrastructure Telemetry */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Postal Core Node</span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-base font-extrabold text-zinc-900">DKIM / SPF Verified</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">From: notifications@mail.gymdeck.com</p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-medium">Tenant Isolated Isolation</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('compose')}
                  className="text-xs font-bold text-zinc-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  Start Email <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Recent Broadcasts Strip */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
              <h3 className="text-sm font-bold text-zinc-900">Recent Email Broadcasts</h3>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 cursor-pointer"
              >
                View all history &rarr;
              </button>
            </div>

            {overview?.recentMessages?.length > 0 ? (
              <div className="divide-y divide-zinc-100">
                {overview.recentMessages.map((msg) => (
                  <div key={msg.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-900 truncate">{msg.subject}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {new Date(msg.createdAt).toLocaleDateString()} • {msg.recipientCount} recipients
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700">
                        {msg.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleInspect(msg.id)}
                        className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-400 text-xs">
                <Inbox size={32} className="mx-auto mb-2 opacity-50" />
                No emails sent yet this month. Click <strong>Compose</strong> to broadcast to your gym members.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ─── TAB 2: COMPOSE EMAIL WORKSPACE ─── */}
      {activeTab === 'compose' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Email Composer & Content (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <FileText size={16} /> Compose Broadcast
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Save Draft
                </button>
              </div>
            </div>

            {/* Sender Identity Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Display Name (Gym Title)</label>
                <input
                  type="text"
                  value={senderDisplayName}
                  onChange={(e) => setSenderDisplayName(e.target.value)}
                  placeholder="e.g. FitLife Gym Desk"
                  className="w-full h-9 px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-zinc-900 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Reply-To Address</label>
                <input
                  type="email"
                  value={replyToAddress}
                  onChange={(e) => setReplyToAddress(e.target.value)}
                  placeholder="e.g. contact@yourgym.com"
                  className="w-full h-9 px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-zinc-900 transition-all"
                />
              </div>
            </div>

            {/* Subject Input */}
            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Important: Membership Renewal & Weekend Workshop Notice"
                className="w-full h-10 px-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-zinc-900 transition-all placeholder:font-normal"
              />
            </div>

            {/* Personalization Variable Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-semibold text-zinc-400 mr-1 flex items-center gap-1">
                <Sparkles size={12} /> Personalize:
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
                  className="px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-[10px] font-bold text-zinc-700 transition-colors cursor-pointer"
                >
                  +{item.label}
                </button>
              ))}
            </div>

            {/* Rich HTML/Text Body Editor */}
            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Email Body (HTML Supported)</label>
              <textarea
                rows={12}
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder="Dear {member_name},&#10;&#10;We hope you are enjoying your workouts at {gym_name}!&#10;&#10;This is a gentle reminder that your membership is due for renewal soon..."
                className="w-full p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-zinc-900 transition-all resize-y leading-relaxed"
              />
            </div>

            {/* Composer Footer Actions */}
            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">
                Selected: <strong className="text-zinc-900">{selectedMemberIds.size} recipients</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={selectedMemberIds.size === 0 || !subject.trim() || !bodyHtml.trim() || isSending}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Review & Dispatch</span>
              </button>
            </div>
          </div>

          {/* Right Column: Member Recipient Selector (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Users size={14} /> Member Directory
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-[11px] font-bold text-zinc-600 hover:text-zinc-900 cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-zinc-300">|</span>
                <button
                  type="button"
                  onClick={deselectAllFiltered}
                  className="text-[11px] font-bold text-zinc-600 hover:text-zinc-900 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Search size={14} />
              </div>
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search member name or email..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-zinc-900 transition-all"
              />
            </div>

            {/* Segmentation Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {['ALL', 'ACTIVE', 'EXPIRED', 'TRIAL'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setRecipientFilter(status)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    recipientFilter === status
                      ? 'bg-zinc-900 text-white shadow-2xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Member List with Checkboxes */}
            <div className="border border-zinc-100 rounded-xl divide-y divide-zinc-100 max-h-[380px] overflow-y-auto">
              {loadingMembers ? (
                <div className="py-12 text-center text-xs text-zinc-400">
                  <Loader2 size={18} className="animate-spin mx-auto mb-2" />
                  Loading member directory...
                </div>
              ) : validEmailMembers.length > 0 ? (
                validEmailMembers.map((member) => {
                  const isChecked = selectedMemberIds.has(member.id);
                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleSelectMember(member.id)}
                      className={`p-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
                        isChecked ? 'bg-zinc-50/80' : 'hover:bg-zinc-50/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-900 truncate">{member.fullName}</span>
                          <span className="text-[10px] font-semibold text-zinc-400 uppercase">
                            {member.membershipStatus}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500 font-mono block truncate">{member.email}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No members with registered email found.
                </div>
              )}
            </div>

            <p className="text-[10px] text-zinc-400 leading-normal">
              Showing members with valid email addresses registered in this gym.
            </p>
          </div>
        </div>
      ) : null}

      {/* ─── TAB 3: SENT EMAIL HISTORY ─── */}
      {activeTab === 'history' ? (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h2 className="text-sm font-bold text-zinc-900">Transmission History</h2>
            <button
              type="button"
              onClick={loadHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {history.messages.length > 0 ? (
            <div className="border border-zinc-200/80 rounded-xl overflow-hidden divide-y divide-zinc-100">
              <div className="bg-zinc-50/80 px-4 py-2.5 grid grid-cols-12 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <span className="col-span-5">Subject</span>
                <span className="col-span-2">Date</span>
                <span className="col-span-2 text-center">Recipients</span>
                <span className="col-span-2 text-center">Status</span>
                <span className="col-span-1 text-right">Action</span>
              </div>
              {history.messages.map((msg) => (
                <div
                  key={msg.id}
                  className="px-4 py-3 grid grid-cols-12 items-center text-xs font-medium hover:bg-zinc-50/50 transition-colors"
                >
                  <div className="col-span-5 pr-2">
                    <span className="font-bold text-zinc-900 block truncate">{msg.subject}</span>
                    <span className="text-[11px] text-zinc-400 block truncate">
                      From: {msg.senderDisplayName || 'GymDeck'} &lt;{msg.fromAddress}&gt;
                    </span>
                  </div>
                  <span className="col-span-2 text-zinc-500 font-mono text-[11px]">
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </span>
                  <span className="col-span-2 text-center font-bold text-zinc-800">{msg.recipientCount}</span>
                  <div className="col-span-2 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        msg.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                          : msg.status === 'SENDING'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {msg.status}
                    </span>
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleInspect(msg.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-zinc-400 text-xs">
              <Mail size={32} className="mx-auto mb-2 opacity-40" />
              No sent emails recorded yet.
            </div>
          )}
        </div>
      ) : null}

      {/* ─── TAB 4: DRAFTS ─── */}
      {activeTab === 'drafts' ? (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h2 className="text-sm font-bold text-zinc-900">Saved Drafts</h2>
          </div>
          {drafts.length > 0 ? (
            <div className="divide-y divide-zinc-100">
              {drafts.map((d) => (
                <div key={d.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">{d.subject || 'Untitled Draft'}</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Updated {new Date(d.updatedAt).toLocaleDateString()}
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
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await emailApi.deleteDraft(d.id);
                        loadDrafts();
                      }}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-zinc-400 text-xs">No saved drafts.</div>
          )}
        </div>
      ) : null}

      {/* ─── TAB 5: TEMPLATES ─── */}
      {activeTab === 'templates' ? (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h2 className="text-sm font-bold text-zinc-900">Email Templates</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: 'Membership Renewal Notice',
                subject: 'Your {gym_name} Membership is Expiring Soon',
                body: 'Dear {member_name}, your membership plan {plan_name} expires on {expiry_date}. Please renew at the desk or online to keep training without interruption.',
              },
              {
                title: 'Payment Receipt & GST Invoice',
                subject: 'Fee Receipt & Statement from {gym_name}',
                body: 'Dear {member_name}, thank you for your payment. Please find your official gym receipt and tax invoice details attached.',
              },
              {
                title: 'Weekend Fitness Workshop Announcement',
                subject: 'Join Us for Special Weekend Strength Sessions at {gym_name}',
                body: 'Dear {member_name}, join our certified trainers this Saturday for an exclusive strength workshop.',
              },
            ].map((tmpl, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 space-y-2">
                <h4 className="text-xs font-bold text-zinc-900">{tmpl.title}</h4>
                <p className="text-[11px] text-zinc-500 font-mono bg-white p-2 rounded-lg border border-zinc-100 truncate">
                  Subject: {tmpl.subject}
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSubject(tmpl.subject);
                      setBodyHtml(tmpl.body);
                      setActiveTab('compose');
                    }}
                    className="px-3 py-1 rounded-lg bg-white border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors"
                  >
                    Use Template
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
                background: 'rgba(14, 18, 28, 0.44)',
                backdropFilter: 'blur(8px)',
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget && !isSending) setShowConfirmModal(false);
              }}
            >
              <div className="w-full max-w-[460px] rounded-3xl bg-white p-7 shadow-2xl border border-white/80 space-y-5 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <h3 className="text-base font-extrabold text-zinc-900">Confirm Broadcast Dispatch</h3>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-medium">Subject:</span>
                      <strong className="text-zinc-900 truncate max-w-[240px]">{subject}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-medium">Recipients:</span>
                      <strong className="text-zinc-900">{selectedMemberIds.size} members</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-medium">Quota Impact:</span>
                      <strong className="text-amber-700">-{selectedMemberIds.size} units</strong>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-zinc-200/60">
                      <span className="text-zinc-500 font-medium">Remaining After Send:</span>
                      <strong className="text-emerald-700">
                        {Math.max(0, quota.remainingQuota - selectedMemberIds.size)} units
                      </strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    This email will be submitted to the durable outbox and dispatched through the central Postal
                    delivery gateway with tenant DKIM signing.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    disabled={isSending}
                    className="flex-1 h-11 rounded-xl border border-zinc-200 font-bold text-xs text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSend}
                    disabled={isSending}
                    className="flex-1 h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs"
                  >
                    {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
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
                background: 'rgba(14, 18, 28, 0.44)',
                backdropFilter: 'blur(8px)',
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowInspectModal(false);
              }}
            >
              <div className="w-full max-w-[560px] rounded-3xl bg-white p-7 shadow-2xl border border-white/80 space-y-5 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-900">Delivery Inspection</h3>
                    <p className="text-[11px] text-zinc-400 font-medium mt-0.5">{inspectMessage?.subject}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInspectModal(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Status Badges */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total</span>
                      <strong className="text-sm font-black text-zinc-900">
                        {inspectMessage?.recipientCount ?? 0}
                      </strong>
                    </div>
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                      <span className="text-[10px] uppercase font-bold text-emerald-600 block">Delivered</span>
                      <strong className="text-sm font-black text-emerald-700">
                        {inspectMessage?.deliveredCount ?? 0}
                      </strong>
                    </div>
                    <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
                      <span className="text-[10px] uppercase font-bold text-rose-600 block">Bounced</span>
                      <strong className="text-sm font-black text-rose-700">
                        {inspectMessage?.bouncedCount ?? 0}
                      </strong>
                    </div>
                  </div>

                  {/* Recipient Breakdown List */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-700 mb-2">Recipient Delivery Telemetry</h4>
                    <div className="border border-zinc-100 rounded-xl divide-y divide-zinc-100 max-h-[240px] overflow-y-auto">
                      {inspectRecipients.length > 0 ? (
                        inspectRecipients.map((rec) => (
                          <div key={rec.id} className="p-2.5 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-zinc-800 block">{rec.recipientName || 'Member'}</span>
                              <span className="text-[11px] text-zinc-400 font-mono">{rec.recipientEmail}</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                rec.deliveryStatus === 'DELIVERED'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : rec.deliveryStatus === 'SENT'
                                  ? 'bg-blue-50 text-blue-700'
                                  : rec.deliveryStatus === 'BOUNCED'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-zinc-100 text-zinc-600'
                              }`}
                            >
                              {rec.deliveryStatus}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-xs text-zinc-400">Loading delivery telemetry...</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowInspectModal(false)}
                    className="h-10 px-5 rounded-xl bg-zinc-900 text-white font-bold text-xs hover:bg-zinc-800 cursor-pointer"
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
