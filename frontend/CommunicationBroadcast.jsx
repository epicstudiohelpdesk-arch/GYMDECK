import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MessageSquare, Mail, Send, Loader2, CheckCircle2, AlertTriangle,
  ExternalLink, Users, RefreshCw, XCircle, ShieldCheck,
} from "lucide-react";
import { communicationsApi } from "./communicationsApi.js";

const CHANNELS = [
  { id: "WHATSAPP", label: "WhatsApp", icon: MessageSquare },
  { id: "EMAIL", label: "Email", icon: Mail },
];

const KINDS = [
  { id: "ANNOUNCEMENT", label: "Announcement" },
  { id: "TRANSACTIONAL", label: "Transactional" },
  { id: "PROMOTIONAL", label: "Promotional" },
];

const STATUS_OPTIONS = ["ACTIVE", "ALL", "EXPIRED", "FROZEN", "INACTIVE"];

export default function CommunicationBroadcast({ showToast }) {
  const [channel, setChannel] = useState("WHATSAPP");
  const [kind, setKind] = useState("ANNOUNCEMENT");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [audience, setAudience] = useState({ members: [], total: 0 });
  const [connected, setConnected] = useState(null);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [queue, setQueue] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [error, setError] = useState("");
  const [enrollment, setEnrollment] = useState(null);
  const [showConnect, setShowConnect] = useState(false);
  const [connectEmail, setConnectEmail] = useState("");
  const [connectPassword, setConnectPassword] = useState("");
  const [connecting, setConnecting] = useState(false);

  const refreshEnrollment = useCallback(async () => {
    if (!communicationsApi.isTauri()) {
      setEnrollment({ supported: false });
      return;
    }
    try {
      const res = await communicationsApi.getEnrollmentStatus();
      setEnrollment({ supported: true, ...res });
    } catch (err) {
      setEnrollment({ supported: true, error: err.message });
    }
  }, []);

  const loadAudience = useCallback(async () => {
    setLoadingAudience(true);
    setError("");
    try {
      const res = await communicationsApi.getAudience({ status: statusFilter, limit: 200 });
      setAudience(res.data || { members: [], total: 0 });
      setConnected(true);
    } catch (err) {
      setConnected(false);
      setError(err.message || "Could not load the member audience.");
      refreshEnrollment();
    } finally {
      setLoadingAudience(false);
    }
  }, [statusFilter, refreshEnrollment]);

  useEffect(() => {
    (async () => {
      try {
        await communicationsApi.getSettings();
        setConnected(true);
      } catch (err) {
        setConnected(false);
        setError(err.message || "Cloud session unavailable.");
        refreshEnrollment();
      }
    })();
  }, [refreshEnrollment]);

  useEffect(() => { loadAudience(); }, [loadAudience]);

  const retryConnection = async () => {
    setError("");
    await refreshEnrollment();
    await loadAudience();
  };

  const handleConnect = async (event) => {
    event.preventDefault();
    if (!connectEmail.trim() || !connectPassword) {
      setError("Enter your cloud email and password.");
      return;
    }
    setConnecting(true);
    setError("");
    try {
      await communicationsApi.enrollCloud({
        email: connectEmail.trim(),
        password: connectPassword,
      });
      const status = await communicationsApi.getEnrollmentStatus();
      setEnrollment({ supported: true, ...status });
      if (!status?.isEnrolled) {
        setError("Cloud gateway unreachable or enrollment was not linked. Confirm the backend URL and owner account, then retry.");
        return;
      }
      setShowConnect(false);
      await loadAudience();
      showToast?.("Cloud connected. Communication settings can now be saved.");
    } catch (err) {
      setError(err.message || "Cloud enrollment failed.");
    } finally {
      setConnecting(false);
      setConnectPassword("");
    }
  };


  const eligible = useMemo(() => audience.members.filter((m) => {
    const optedIn = channel === "WHATSAPP"
      ? Boolean(m.hasWhatsapp && m.whatsappOptIn)
      : Boolean(m.hasEmail && m.emailOptIn);
    return optedIn && (kind !== "PROMOTIONAL" || m.marketingOptIn);
  }), [audience.members, channel, kind]);

  const remaining = queue ? queue.recipients.filter((r) => r.status === "QUEUED").length : 0;

  const handlePrepare = async () => {
    setError("");
    if (!body.trim()) { setError("Write a message before preparing the queue."); return; }
    if (channel === "EMAIL" && !subject.trim()) { setError("Add an email subject."); return; }
    setPreparing(true);
    try {
      const res = await communicationsApi.previewBroadcast({
        channel,
        messageKind: kind,
        subject: subject.trim() || undefined,
        body: body.trim(),
        audience: { status: statusFilter, limit: 60 },
      });
      setQueue(res.data);
      showToast?.(`${res.data.queuedCount} send links prepared.`);
    } catch (err) {
      setError(err.message || "Could not prepare the send queue.");
    } finally {
      setPreparing(false);
    }
  };

  const openRecipient = async (recipient) => {
    if (!queue || !recipient.actionLink) return;
    setSendingId(recipient.recipientId);
    window.open(recipient.actionLink, "_blank", "noopener,noreferrer");
    try {
      await communicationsApi.updateProgress(queue.broadcastId, [
        { recipientId: recipient.recipientId, status: "SENT" },
      ]);
      setQueue((prev) => prev ? {
        ...prev,
        recipients: prev.recipients.map((r) =>
          r.recipientId === recipient.recipientId ? { ...r, status: "SENT" } : r
        ),
      } : prev);
    } catch (err) {
      setError(err.message || "Could not record delivery.");
    } finally {
      setSendingId(null);
    }
  };

  const markRecipient = async (recipient, status) => {
    if (!queue) return;
    try {
      await communicationsApi.updateProgress(queue.broadcastId, [
        { recipientId: recipient.recipientId, status },
      ]);
      setQueue((prev) => prev ? {
        ...prev,
        recipients: prev.recipients.map((r) =>
          r.recipientId === recipient.recipientId ? { ...r, status } : r
        ),
      } : prev);
    } catch (err) {
      setError(err.message || "Could not update the recipient.");
    }
  };

  const cancelQueue = async () => {
    if (!queue) return;
    try {
      await communicationsApi.cancelBroadcast(queue.broadcastId);
      setQueue(null);
      showToast?.("Broadcast queue cancelled.");
    } catch (err) {
      setError(err.message || "Could not cancel the queue.");
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6">
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center">
            <Send size={18} strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Send to Members · Assisted Mode</h3>
            <p className="text-[11px] text-zinc-500">Opens your own WhatsApp or mail app per member, so messages come from your official number or mailbox. No provider fees, no message retention.</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${connected ? "bg-emerald-50 text-emerald-700 border-emerald-200/70" : "bg-amber-50 text-amber-700 border-amber-200/70"}`}>
          <ShieldCheck size={12} strokeWidth={1.75} />
          {connected ? "Cloud connected" : "Cloud offline"}
        </span>
      </div>

      {connected === false && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-[11px] text-amber-800 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={15} strokeWidth={1.75} className="mt-0.5 flex-shrink-0" />
            <span>
              {!communicationsApi.isTauri()
                ? "Browser mode detected. Cloud sync requires the GymDeck desktop app, or a development token in localStorage."
                : enrollment?.isEnrolled
                  ? `Cloud is enrolled but the request failed: ${enrollment?.error || error || "unknown error"}.`
                  : "This device is not connected to your cloud tenant. Connect with the same owner account you use in GymDeck."}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={retryConnection} className="h-8 px-3 rounded-lg bg-white border border-amber-300 text-[11px] font-semibold text-amber-800 hover:bg-amber-100">
              Retry connection
            </button>
            {communicationsApi.isTauri() && !enrollment?.isEnrolled && (
              <button type="button" onClick={() => setShowConnect((v) => !v)} className="h-8 px-3 rounded-lg bg-amber-800 text-white text-[11px] font-semibold hover:bg-amber-900">
                {showConnect ? "Hide connect form" : "Connect cloud"}
              </button>
            )}
          </div>
          {/* __CONNECT_FORM__ */}
          {showConnect && (
            <form onSubmit={handleConnect} className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <input type="email" value={connectEmail} onChange={(e) => setConnectEmail(e.target.value)}
                placeholder="Owner email" autoComplete="username"
                className="h-9 px-3 rounded-lg border border-amber-300 bg-white text-xs font-medium text-zinc-900" />
              <input type="password" value={connectPassword} onChange={(e) => setConnectPassword(e.target.value)}
                placeholder="Password" autoComplete="current-password"
                className="h-9 px-3 rounded-lg border border-amber-300 bg-white text-xs font-medium text-zinc-900" />
              <button type="submit" disabled={connecting}
                className="h-9 px-4 rounded-lg bg-zinc-900 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 sm:col-span-2">
                {connecting ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} strokeWidth={1.75} />}
                {connecting ? "Connecting…" : "Connect and save settings"}
              </button>
            </form>
          )}

        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-[11px] text-rose-700 flex items-start gap-2.5">
          <XCircle size={15} strokeWidth={1.75} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-700">Channel</label>
          <div className="grid grid-cols-2 gap-2">
            {CHANNELS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" disabled={Boolean(queue)} onClick={() => setChannel(id)}
                className={`h-10 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${channel === id ? "bg-zinc-900 text-white border-zinc-900" : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-400"} disabled:opacity-50`}>
                <Icon size={14} strokeWidth={1.75} /> {label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-700">Message type</label>
          <select value={kind} disabled={Boolean(queue)} onChange={(e) => setKind(e.target.value)}
            className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold">
            {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-700">Audience</label>
          <select value={statusFilter} disabled={Boolean(queue)} onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === "ALL" ? "All members" : s}</option>)}
          </select>
        </div>
      </div>

      {channel === "EMAIL" && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-700">Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value.slice(0, 200))}
            placeholder="e.g. New batch timings from Monday"
            className="w-full h-10 px-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent" />
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-zinc-700">Message</label>
          <span className="text-[10px] font-mono text-zinc-400">{body.length}/2000</span>
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 2000))} rows={5}
          placeholder="Write the message members will receive…"
          className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium resize-none focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="text-[11px] text-zinc-500 flex items-center gap-2">
          <Users size={14} strokeWidth={1.75} />
          <span><strong className="text-zinc-900">{eligible.length}</strong> eligible · {audience.total} in audience</span>
          <button type="button" onClick={loadAudience} disabled={loadingAudience} className="ml-1 inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-900 font-semibold disabled:opacity-50">
            <RefreshCw size={12} className={loadingAudience ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        <button type="button" onClick={handlePrepare} disabled={preparing || Boolean(queue) || !connected || !eligible.length}
          className="h-9 px-4 rounded-lg bg-zinc-900 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-zinc-800 disabled:opacity-40">
          {preparing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={1.75} />}
          {preparing ? "Preparing…" : "Prepare send queue"}
        </button>
      </div>

      {queue && (
        <div className="pt-6 border-t border-zinc-100 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-zinc-900">Send queue · {queue.channel === "EMAIL" ? "Email" : "WhatsApp"}</h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">{remaining} remaining · {queue.queuedCount} prepared · {queue.skippedCount} skipped</p>
            </div>
            <button type="button" onClick={cancelQueue} className="h-8 px-3 rounded-lg border border-zinc-200 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900">
              Cancel queue
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">Tap Open for each member. Sending happens inside your own WhatsApp or mail app; GymDeck only records the outcome and never stores the message body.</p>

          <div className="max-h-80 overflow-auto rounded-xl border border-zinc-200 divide-y divide-zinc-100">
            {[...queue.recipients].sort((a, b) => (a.status === "QUEUED" ? -1 : 1) - (b.status === "QUEUED" ? -1 : 1)).map((r) => (
              <div key={r.recipientId} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-900 truncate">{r.fullName || "Member"}</div>
                  <div className="text-[10px] font-mono text-zinc-400">{r.contactMasked || "No contact"}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {r.status === "QUEUED" && r.actionLink ? (
                    <>
                      <button type="button" onClick={() => openRecipient(r)} disabled={sendingId === r.recipientId}
                        className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1 hover:bg-emerald-700 disabled:opacity-50">
                        {sendingId === r.recipientId ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} strokeWidth={2} />}
                        Open
                      </button>
                      <button type="button" onClick={() => markRecipient(r, "FAILED")} title="Mark as failed"
                        className="h-8 w-8 rounded-lg border border-zinc-200 text-zinc-500 flex items-center justify-center hover:text-rose-600">
                        <XCircle size={13} strokeWidth={1.75} />
                      </button>
                    </>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      r.status === "SENT" ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                        : r.status === "FAILED" ? "bg-rose-50 text-rose-700 border-rose-200/70"
                        : "bg-zinc-100 text-zinc-500 border-zinc-200"
                    }`}>
                      {r.status}{r.skipReason ? ` · ${r.skipReason}` : ""}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}











