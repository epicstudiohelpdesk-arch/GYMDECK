import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  ShieldCheck, XCircle, HelpCircle, RefreshCw, Landmark, AlertTriangle,
  CheckCircle2, Clock, Search, Plus, Star,
} from "lucide-react";
import { ErrorBoundary } from "./ErrorHandlers.jsx";
import BrandFooter from "./BrandFooter.jsx";
import paymentsV2Api from "./paymentsV2Api.js";

const inr = (minor) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format((minor || 0) / 100);

function StatusPill({ status }) {
  const map = {
    SUBMITTED: "bg-amber-50 text-amber-700 border-amber-200",
    PENDING_VERIFICATION: "bg-indigo-50 text-indigo-700 border-indigo-200",
    VERIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
    INITIATED: "bg-slate-50 text-slate-600 border-slate-200",
    UNVERIFIED: "bg-amber-50 text-amber-700 border-amber-200",
    DISABLED: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${map[status] || map.INITIATED}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function PaymentReconciliationPage() {
  const [pending, setPending] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountDraft, setAccountDraft] = useState({ method: "UPI", beneficiaryName: "", upiVpa: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pendingRes, accountsRes, settingsRes] = await Promise.all([
        paymentsV2Api.listPending(),
        paymentsV2Api.listAccounts(),
        paymentsV2Api.getSettings(),
      ]);
      setPending(pendingRes?.data?.items || []);
      setAccounts(accountsRes?.data?.accounts || []);
      setSettings(settingsRes?.data?.settings || null);
    } catch (err) {
      setError(err?.message || "Unable to load reconciliation data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (item, action) => {
    setBusyId(item.attemptId);
    setError("");
    try {
      if (action === "verify") {
        await paymentsV2Api.verify(item.attemptId, note ? { note } : {});
      } else if (action === "reject") {
        await paymentsV2Api.reject(item.attemptId, note || "Does not match bank statement");
      } else {
        await paymentsV2Api.clarify(item.attemptId, note || "Please share a clearer transaction reference");
      }
      setNote("");
      setSelected(null);
      await load();
    } catch (err) {
      setError(err?.message || "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const addAccount = async () => {
    setError("");
    try {
      await paymentsV2Api.createAccount(accountDraft);
      setShowAccountForm(false);
      setAccountDraft({ method: "UPI", beneficiaryName: "", upiVpa: "" });
      await load();
    } catch (err) {
      setError(err?.message || "Unable to add receiving account.");
    }
  };

  const togglePartial = async () => {
    if (!settings) return;
    try {
      await paymentsV2Api.updateSettings({
        allowPartialPayments: !settings.allow_partial_payments,
        allowOverpayment: Boolean(settings.allow_overpayment),
        activateMembershipOnPartial: Boolean(settings.activate_membership_on_partial),
        invoicePrefix: settings.invoice_prefix,
        receiptPrefix: settings.receipt_prefix,
        gstEnabled: Boolean(settings.gst_enabled),
        gstin: settings.gstin,
        legalBusinessName: settings.legal_business_name,
        placeOfSupply: settings.place_of_supply,
        defaultTaxRateBps: settings.default_tax_rate_bps,
        receiptFooter: settings.receipt_footer,
      });
      await load();
    } catch (err) {
      setError(err?.message || "Unable to update settings.");
    }
  };

  return (
    <div className="min-h-full bg-[#F0F2F6] p-6 font-sans text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Payments V2</p>
            <h1 className="text-2xl font-black tracking-tight">Payment Reconciliation</h1>
            <p className="text-sm text-slate-500">
              A member submission is evidence only. Only an authorized operator can verify a direct transfer.
            </p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </header>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pending verification</p>
            <p className="mt-1 text-2xl font-black">{pending.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Receiving accounts</p>
            <p className="mt-1 text-2xl font-black">{accounts.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Partial payments</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-sm font-bold">{settings?.allow_partial_payments ? "Enabled" : "Disabled"}</span>
              <button onClick={togglePartial} className="rounded-lg border border-slate-300 px-3 py-1 text-[11px] font-bold">
                Toggle
              </button>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black"><Landmark size={16} /> Receiving accounts</h2>
            <button onClick={() => setShowAccountForm((v) => !v)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white">
              <Plus size={13} /> Add UPI account
            </button>
          </div>
          {showAccountForm && (
            <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-3">
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Beneficiary name"
                value={accountDraft.beneficiaryName}
                onChange={(e) => setAccountDraft({ ...accountDraft, beneficiaryName: e.target.value })} />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="gym@bank"
                value={accountDraft.upiVpa}
                onChange={(e) => setAccountDraft({ ...accountDraft, upiVpa: e.target.value })} />
              <button onClick={addAccount} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                Save as UNVERIFIED
              </button>
            </div>
          )}
          <ul className="mt-3 divide-y divide-slate-100">
            {accounts.map((acc) => (
              <li key={acc.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="text-sm">
                  <p className="font-bold">
                    {acc.isPrimary && <Star size={12} className="mr-1 inline text-amber-500" />}
                    {acc.method === "UPI" ? acc.upiVpa : acc.accountNumberMasked}
                  </p>
                  <p className="text-xs text-slate-500">{acc.beneficiaryName}{acc.bankName ? ` · ${acc.bankName}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={acc.status} />
                  {!acc.isPrimary && acc.isActive && (
                    <button onClick={async () => { await paymentsV2Api.setPrimary(acc.id); load(); }}
                      className="text-[11px] font-bold text-indigo-600">Make primary</button>
                  )}
                </div>
              </li>
            ))}
            {accounts.length === 0 && <li className="py-3 text-xs text-slate-500">No receiving account configured yet.</li>}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-sm font-black"><Clock size={16} /> Awaiting verification</h2>
          {loading && <p className="py-3 text-xs text-slate-500">Loading…</p>}
          {!loading && pending.length === 0 && <p className="py-3 text-xs text-slate-500">No member submissions are waiting.</p>}
          <ul className="mt-2 divide-y divide-slate-100">
            {pending.map((item) => (
              <li key={item.attemptId} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">
                      {item.member.name} <span className="text-xs font-medium text-slate-400">({item.member.code})</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.invoice.number} · claimed {inr(item.submission?.claimedAmountMinor || item.amountMinor)} · UTR {item.submission?.utr || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={item.status} />
                    <button onClick={() => setSelected(item)} className="rounded-lg border border-slate-300 px-3 py-1 text-[11px] font-bold">
                      Review
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">Review payment</h3>
                  <p className="text-xs text-slate-500">
                    {selected.member.name} · {selected.invoice.number} · UTR {selected.submission?.utr || "—"}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400">✕</button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                <p>Total<br /><b>{inr(selected.invoice.totalMinor)}</b></p>
                <p>Verified<br /><b>{inr(selected.invoice.paidMinor)}</b></p>
                <p>Remaining<br /><b>{inr(selected.invoice.outstandingMinor)}</b></p>
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-600">
                Claimed amount: {inr(selected.submission?.claimedAmountMinor || selected.amountMinor)}
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Verification note or rejection reason (required to reject)"
                className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-sm"
                rows={3}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button disabled={busyId === selected.attemptId} onClick={() => act(selected, "verify")}
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                  <CheckCircle2 size={14} /> Verify payment
                </button>
                <button disabled={busyId === selected.attemptId} onClick={() => act(selected, "reject")}
                  className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                  <XCircle size={14} /> Reject
                </button>
                <button disabled={busyId === selected.attemptId} onClick={() => act(selected, "clarify")}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold disabled:opacity-50">
                  <HelpCircle size={14} /> Request clarification
                </button>
              </div>
              <p className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                <ShieldCheck size={12} /> Verification creates an immutable ledger entry and receipt.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const mountPaymentReconciliation = () => {
  const stage = document.querySelector('[data-stage="payment-reconciliation"]');
  if (!stage) return null;
  const rootElement = document.createElement("div");
  rootElement.className = "min-h-full";
  stage.replaceChildren(rootElement);
  createRoot(rootElement).render(
    <ErrorBoundary>
      <><PaymentReconciliationPage /><BrandFooter /></>
    </ErrorBoundary>
  );
  return true;
};

export default PaymentReconciliationPage;

