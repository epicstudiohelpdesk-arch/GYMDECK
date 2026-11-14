import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Search,
  Download,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Check,
  FileText,
  FileDown,
  Activity,
  ShieldCheck,
  Layers,
  Wallet,
  X,
  Plus,
  Target,
  Tag,
  CreditCard,
  Smartphone,
  History,
  MoreVertical,
  Printer,
  RefreshCw,
  Eye,
  Copy,
  Building,
  RotateCcw,
  Receipt,
  Sparkles,
  Banknote,
  Send,
  ArrowUpDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "./ErrorHandlers.jsx";
import { paymentsV2Api } from "./paymentsV2Api.js";

// ─────────────────────────────────────────
// FORMATTERS & UTILITIES
// ─────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const getInitialsAvatar = (name, gender = "male") => {
  const initials = (name || "Member")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
  const bgColor = "%234f46e5";
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="${bgColor}"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="%23ffffff" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="34" font-weight="900">${initials || "GD"}</text></svg>`;
};

const resolveMemberPhoto = (member) => {
  if (!member) return getInitialsAvatar("Member");
  const photo = member.photo || member.profile_photo_path || member.image || member.photoUrl;
  if (photo && typeof photo === "string" && !photo.includes("dicebear.com") && photo.length > 5) {
    if (photo.startsWith("data:") || photo.startsWith("http://") || photo.startsWith("https://") || photo.startsWith("blob:")) {
      return photo;
    }
    if (typeof window !== "undefined" && window.__TAURI__?.core?.convertFileSrc) {
      try {
        return window.__TAURI__.core.convertFileSrc(photo);
      } catch (e) {
        return photo;
      }
    }
    return photo;
  }
  return getInitialsAvatar(member.name || "Member", member.gender);
};

// ─────────────────────────────────────────
// DYNAMIC TIMELINE & FILTER OPTIONS
// ─────────────────────────────────────────

const getDynamicTimelineOptions = () => {
  const now = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  return [
    { id: "all", label: "All Dates History", icon: Calendar, description: "Complete ledger records" },
    { id: "today", label: "Today Only", icon: Clock, badge: now.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), description: "Current day collections" },
    { id: "yesterday", label: "Yesterday", icon: History, badge: yesterday.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), description: "Previous day transactions" },
    { id: "week", label: "Current Week", icon: Calendar, description: "Rolling 7-day intake" },
    { id: "month", label: now.toLocaleDateString("en-IN", { month: "long", year: "numeric" }), icon: Calendar, description: "Current month fiscal period" },
    { id: "lastMonth", label: prevMonthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" }), icon: Calendar, description: "Prior month fiscal period" }
  ];
};

const PAYMENT_MODE_OPTIONS = [
  { id: "All", label: "All Payment Modes", icon: Layers, description: "All digital, card, and cash channels" },
  { id: "UPI", label: "UPI (PhonePe, GPay, Paytm)", icon: Smartphone, description: "Instant QR & mobile app transfers" },
  { id: "Card", label: "Credit / Debit Card (POS)", icon: CreditCard, description: "Terminal swipe & chip verification" },
  { id: "Cash", label: "Cash Desk Register", icon: Banknote, description: "Front desk cash vault & register" },
  { id: "Bank Transfer", label: "Bank IMPS / NEFT", icon: Building, description: "Direct bank settlement transfers" }
];

const CATEGORY_OPTIONS = [
  { id: "All", label: "All Categories", icon: Layers, description: "All fee classifications" },
  { id: "Membership Renewal", label: "Membership Renewal", icon: RotateCcw, description: "Active member plan renewals" },
  { id: "New Membership", label: "New Membership Plan", icon: Sparkles, description: "First-time member admissions" },
  { id: "Personal Training", label: "Personal Training (PT)", icon: Target, description: "1-on-1 trainer coaching packs" },
  { id: "Day Pass", label: "Day Pass / Walk-in", icon: Clock, description: "Guest drop-in entries" },
  { id: "Locker", label: "Locker & Add-ons", icon: ShieldCheck, description: "Facility & store retail" }
];

const SORT_OPTIONS = [
  { id: "newest", label: "Newest First", icon: ArrowUpDown, description: "Latest transactions on top" },
  { id: "oldest", label: "Oldest First", icon: ArrowUpDown, description: "Chronological order" },
  { id: "amount_desc", label: "Amount: High to Low", icon: TrendingUp, description: "Largest payments first" },
  { id: "amount_asc", label: "Amount: Low to High", icon: TrendingDown, description: "Smallest payments first" }
];

const PAGE_SIZE_OPTIONS = [
  { id: 10, label: "10 per page" },
  { id: 25, label: "25 per page" },
  { id: 50, label: "50 per page" }
];

// ─────────────────────────────────────────
// CUSTOM DROPDOWN COMPONENT
// ─────────────────────────────────────────

const CustomDropdown = ({
  id,
  label,
  value,
  options = [],
  onChange,
  icon: FallbackIcon,
  align = "left",
  direction = "down",
  className = "",
  menuWidth = "w-64"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.id === value) || options[0] || { label: value };
  }, [options, value]);

  const ActiveIcon = selectedOption?.icon || FallbackIcon;

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={`h-9 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer select-none group ${
          isOpen
            ? "bg-indigo-50/70 border-indigo-400 text-indigo-950 shadow-xs ring-2 ring-indigo-500/15"
            : "bg-white hover:bg-slate-50/90 border-slate-200/90 hover:border-slate-300 text-slate-700 shadow-2xs"
        }`}
      >
        {label && (
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {label}:
          </span>
        )}

        <div className="flex items-center gap-1.5 min-w-0">
          {ActiveIcon && (
            <ActiveIcon size={13} className={isOpen ? "text-indigo-600" : "text-slate-500 group-hover:text-slate-700"} />
          )}

          <span className="font-bold text-slate-800 group-hover:text-slate-950 truncate max-w-[130px]">
            {selectedOption?.label || value}
          </span>
        </div>

        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform duration-200 ml-0.5 shrink-0 ${
            isOpen ? "rotate-180 text-indigo-600" : "group-hover:text-slate-600"
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: direction === "up" ? 4 : -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: direction === "up" ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={`absolute z-[100] ${
              direction === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"
            } ${
              align === "right" ? "right-0" : "left-0"
            } ${menuWidth} bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-1.5 space-y-0.5`}
          >
            {label && (
              <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between mb-1">
                <span>Select {label}</span>
                <span className="text-[9px] font-mono text-slate-400 lowercase">{options.length} options</span>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5">
              {options.map((opt) => {
                const isSelected = opt.id === value;
                const OptIcon = opt.icon;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50/80 text-indigo-950 font-bold border border-indigo-100/80"
                        : "hover:bg-slate-100/80 text-slate-700 hover:text-slate-900 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {OptIcon && (
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800"
                          }`}
                        >
                          <OptIcon size={13} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className={`text-xs truncate ${isSelected ? "font-extrabold text-indigo-950" : "font-medium text-slate-800 group-hover:text-slate-950"}`}>
                          {opt.label}
                        </div>
                        {opt.description && (
                          <div className="text-[10px] text-slate-400 truncate font-normal leading-tight mt-0.5">
                            {opt.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {opt.badge && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected ? (
                        <Check size={14} className="text-indigo-600 shrink-0" strokeWidth={2.6} />
                      ) : (
                        <div className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────
// TABLE ROW ACTIONS DROPDOWN COMPONENT
// ─────────────────────────────────────────

const RowActionsDropdown = ({ txn, onOpenAudit, onPrintReceipt, onOpenRefund, onCopyText, copiedKey }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          isOpen ? "bg-slate-200 text-slate-900" : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"
        }`}
        title="More Actions"
      >
        <MoreVertical size={15} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-1 w-52 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 space-y-0.5 text-xs font-semibold"
          >
            <button
              type="button"
              onClick={() => {
                onOpenAudit(txn);
                setIsOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-950 flex items-center gap-2 cursor-pointer"
            >
              <Eye size={13} className="text-indigo-600" />
              <span>View Audit Details</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onPrintReceipt(txn);
                setIsOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-950 flex items-center gap-2 cursor-pointer"
            >
              <Printer size={13} className="text-slate-600" />
              <span>Print Thermal Slip</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onCopyText(txn.id, `txn-${txn.id}`);
                setIsOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-950 flex items-center gap-2 cursor-pointer"
            >
              <Copy size={13} className="text-slate-500" />
              <span>Copy Transaction ID</span>
            </button>

            {txn.utr && (
              <button
                type="button"
                onClick={() => {
                  onCopyText(txn.utr, `utr-${txn.id}`);
                  setIsOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-950 flex items-center gap-2 cursor-pointer"
              >
                <Copy size={13} className="text-slate-500" />
                <span>Copy UTR Number</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                const message = encodeURIComponent(`Hello ${txn.member?.name || "Member"}, your GymDeck payment of ${currencyFormatter.format(txn.amount)} (Invoice: ${txn.invoiceId || txn.id}) has been confirmed. Thank you!`);
                window.open(`https://wa.me/${(txn.member?.phone || "").replace(/[^0-9]/g, "")}?text=${message}`, "_blank");
                setIsOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-700 flex items-center gap-2 cursor-pointer"
            >
              <Send size={13} />
              <span>WhatsApp Receipt</span>
            </button>

            {txn.status === "Successful" && (
              <button
                type="button"
                onClick={() => {
                  onOpenRefund(txn);
                  setIsOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-700 flex items-center gap-2 cursor-pointer border-t border-slate-100 mt-1 pt-1.5"
              >
                <RotateCcw size={13} />
                <span>Issue Refund / Adjustment</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────
// PRINT TEMPLATE HELPERS
// ─────────────────────────────────────────

const printThermalReceipt = (txn) => {
  if (!txn) return;
  const printWindow = window.open("", "_blank", "width=440,height=720");
  if (!printWindow) return;

  const itemsHtml = (txn.items || [
    { name: txn.planName || txn.type || "Gym Fee Payment", qty: 1, price: txn.subtotal || txn.amount - txn.tax, discount: 0 }
  ]).map((it) => `
    <tr>
      <td style="padding: 6px 0; border-bottom: 1px dashed #cbd5e1; font-weight: 600;">${it.name}</td>
      <td style="padding: 6px 0; border-bottom: 1px dashed #cbd5e1; text-align: center; font-family: monospace;">${it.qty}</td>
      <td style="padding: 6px 0; border-bottom: 1px dashed #cbd5e1; text-align: right; font-weight: 700; font-family: monospace;">₹${(it.qty * it.price - (it.discount || 0)).toLocaleString("en-IN")}</td>
    </tr>
  `).join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${txn.invoiceId || txn.id}</title>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; padding: 20px; margin: 0; color: #0f172a; font-size: 11px; background: #ffffff; }
          .ticket { max-width: 360px; margin: 0 auto; border: 1px solid #0f172a; padding: 20px; border-radius: 8px; }
          .center { text-align: center; }
          .bold { font-weight: 800; }
          .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
          .divider { border-top: 1px dashed #94a3b8; margin: 12px 0; }
          .divider-double { border-top: 2px solid #0f172a; margin: 14px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11px; }
          .label { color: #64748b; font-weight: 600; }
          .val { font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
          th { text-align: left; padding: 6px 0; border-bottom: 1px solid #0f172a; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
          .total-box { display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 900; margin-top: 10px; padding: 10px 0; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; }
          .barcode { margin: 16px auto 8px; text-align: center; letter-spacing: 4px; font-size: 14px; font-family: monospace; font-weight: 900; background: #f1f5f9; padding: 8px; border-radius: 4px; }
          @media print { body { padding: 0; } .ticket { border: none; max-width: 100%; } }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="center">
            <div style="font-size: 18px; font-weight: 900; letter-spacing: 1px;">GYMDECK FITNESS</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">PREMIUM HEALTH & ATHLETIC CLUB</div>
            <div style="font-size: 9px; color: #64748b;">${txn.branch || "Main Branch"}</div>
          </div>
          <div class="divider-double"></div>
          <div class="row"><span class="label">TAX INVOICE NO:</span><span class="val mono">${txn.invoiceId || "INV-RECEIPT"}</span></div>
          <div class="row"><span class="label">TRANSACTION ID:</span><span class="val mono">${txn.id}</span></div>
          <div class="row"><span class="label">DATE & TIME:</span><span class="val mono">${txn.date}</span></div>
          <div class="row"><span class="label">CASHIER / STAFF:</span><span class="val">${txn.staff || "Counter Desk"}</span></div>
          <div class="divider"></div>
          <div class="row"><span class="label">MEMBER NAME:</span><span class="val bold">${txn.member?.name || "Member"}</span></div>
          <div class="row"><span class="label">MEMBER ID:</span><span class="val mono">${txn.member?.id || "GD-MEM"}</span></div>
          <div class="row"><span class="label">CONTACT:</span><span class="val">${txn.member?.phone || "—"}</span></div>
          <div class="divider"></div>
          <table>
            <thead><tr><th>Item / Plan</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Total (₹)</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="row"><span class="label">Taxable Base Amount:</span><span class="val mono">₹${(txn.subtotal || txn.amount - txn.tax).toLocaleString("en-IN")}</span></div>
          <div class="row"><span class="label">Integrated GST (18%):</span><span class="val mono">₹${(txn.tax || 0).toLocaleString("en-IN")}</span></div>
          <div class="total-box"><span>TOTAL PAID:</span><span class="mono">₹${Number(txn.amount).toLocaleString("en-IN")}</span></div>
          <div style="margin-top: 12px;" class="row"><span class="label">PAYMENT MODE:</span><span class="val bold">${txn.method}</span></div>
          <div class="row"><span class="label">UTR / AUTH REF:</span><span class="val mono">${txn.utr || "DESK-VERIFIED"}</span></div>
          <div class="row"><span class="label">SETTLED TO:</span><span class="val">${txn.account || "GymDeck Settlement"}</span></div>
          <div class="barcode">*${txn.id}*</div>
          <div class="center" style="font-size: 9px; color: #94a3b8; margin-top: 14px;">Thank you for training with GymDeck!<br />Electronically generated and digitally verified receipt.</div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

const printSummaryStatement = (transactions, activeFiltersSummary) => {
  const printWindow = window.open("", "_blank", "width=850,height=800");
  if (!printWindow) return;

  const totalAmount = transactions.reduce((acc, t) => t.status === "Successful" ? acc + t.amount : acc, 0);
  const totalTax = transactions.reduce((acc, t) => t.status === "Successful" ? acc + t.tax : acc, 0);

  const rowsHtml = transactions.map((t, idx) => `
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${idx + 1}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${t.date}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: 700;">${t.id}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${t.member?.name || "Member"} <span style="font-size: 10px; color: #64748b;">(${t.member?.id || ""})</span></td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${t.planName || t.type}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${t.method}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: 800;">₹${Number(t.amount || 0).toLocaleString("en-IN")}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">
        <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; background: ${
          t.status === "Successful" ? "#dcfce7; color: #15803d" : t.status === "Refunded" ? "#f3e8ff; color: #7e22ce" : "#ffe4e6; color: #be123c"
        };">
          ${t.status}
        </span>
      </td>
    </tr>
  `).join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>GymDeck Financial Ledger Statement</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; margin: 0; color: #0f172a; font-size: 12px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
          .sub { color: #64748b; font-size: 11px; margin-top: 4px; }
          .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { text-align: left; padding: 8px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; font-size: 10px; text-transform: uppercase; font-weight: 800; }
          .total-box { margin-top: 20px; text-align: right; font-size: 14px; font-weight: 900; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">GYMDECK FINANCIAL LEDGER STATEMENT</div>
            <div class="sub">Official Payment Audit & Settlement Summary • Filter: ${activeFiltersSummary}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700;">Generated: ${new Date().toLocaleString("en-IN")}</div>
            <div class="sub">Records Count: ${transactions.length} Transactions</div>
          </div>
        </div>
        <div class="summary-card">
          <div><div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 800;">Realized Collection</div><div style="font-size: 18px; font-weight: 900; color: #15803d;">₹${totalAmount.toLocaleString("en-IN")}</div></div>
          <div><div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 800;">Integrated GST (18%)</div><div style="font-size: 18px; font-weight: 900; color: #0284c7;">₹${totalTax.toLocaleString("en-IN")}</div></div>
          <div><div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 800;">Successful Intakes</div><div style="font-size: 18px; font-weight: 900;">${transactions.filter((t) => t.status === "Successful").length} of ${transactions.length}</div></div>
        </div>
        <table>
          <thead><tr><th style="width: 30px;">#</th><th>Date & Time</th><th>Transaction ID</th><th>Member Name & ID</th><th>Category / Plan</th><th>Method</th><th style="text-align: right;">Amount (₹)</th><th style="text-align: center;">Status</th></tr></thead>
          <tbody>${rowsHtml || `<tr><td colspan="8" style="padding: 24px; text-align: center; color: #94a3b8;">No records to print.</td></tr>`}</tbody>
        </table>
        <div class="total-box">NET REALIZED SETTLEMENT: ₹${totalAmount.toLocaleString("en-IN")}</div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

const exportLedgerToCSV = (transactions) => {
  if (!transactions || !transactions.length) return;
  const headers = [
    "Transaction ID",
    "Invoice ID",
    "Date & Time",
    "Member Name",
    "Member ID",
    "Phone",
    "Email",
    "Category / Plan",
    "Base Amount (INR)",
    "GST Tax (INR)",
    "Total Amount (INR)",
    "Payment Mode",
    "Payment Rail",
    "UTR / Ref No",
    "Status",
    "Branch",
    "Staff / Cashier",
    "Settlement Account"
  ];

  const rows = transactions.map((t) => [
    `"${t.id}"`,
    `"${t.invoiceId || ""}"`,
    `"${t.date}"`,
    `"${t.member?.name || ""}"`,
    `"${t.member?.id || ""}"`,
    `"${t.member?.phone || ""}"`,
    `"${t.member?.email || ""}"`,
    `"${t.planName || t.type || ""}"`,
    t.subtotal || t.amount - t.tax,
    t.tax || 0,
    t.amount,
    `"${t.method || ""}"`,
    `"${t.paymentRail || ""}"`,
    `"${t.utr || ""}"`,
    `"${t.status || ""}"`,
    `"${t.branch || ""}"`,
    `"${t.staff || ""}"`,
    `"${t.account || ""}"`
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute("href", url);
  link.setAttribute("download", `GymDeck_Payment_History_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ─────────────────────────────────────────
// SLIDE-OVER AUDIT DRAWER
// ─────────────────────────────────────────

const TransactionAuditDrawer = ({ isOpen, onClose, txn, onPrintReceipt, onOpenRefund }) => {
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  if (!isOpen || !txn) return null;

  const isSuccess = txn.status === "Successful";
  const isRefunded = txn.status === "Refunded";
  const isPending = txn.status === "Pending";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        />

        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="relative z-10 w-full max-w-xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 overflow-hidden"
        >
          <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
                isSuccess ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                isRefunded ? "bg-purple-50 text-purple-600 border-purple-200" :
                isPending ? "bg-amber-50 text-amber-600 border-amber-200" :
                "bg-rose-50 text-rose-600 border-rose-200"
              }`}>
                {isSuccess ? <CheckCircle2 size={20} /> :
                 isRefunded ? <RotateCcw size={18} /> :
                 isPending ? <Clock size={18} /> :
                 <AlertCircle size={20} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                    Transaction Audit
                  </h2>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                    isSuccess ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    isRefunded ? "bg-purple-50 text-purple-700 border-purple-200" :
                    isPending ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-rose-50 text-rose-700 border-rose-200"
                  }`}>
                    {txn.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                  <span>{txn.id}</span>
                  <span>•</span>
                  <span>{txn.invoiceId || "INV-GEN"}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
              title="Close drawer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md relative overflow-hidden">
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                    Total Amount Paid
                  </span>
                  <div className="text-3xl font-black font-mono tracking-tight text-white flex items-baseline gap-2">
                    {currencyFormatter.format(txn.amount)}
                    <span className="text-xs font-semibold text-slate-400 tracking-normal font-sans">
                      (Incl. 18% GST)
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-2 flex items-center gap-2">
                    <Clock size={13} className="text-slate-400" />
                    <span>Recorded: {txn.date}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 text-white border border-white/10 backdrop-blur-xs flex items-center gap-1.5">
                    <Building size={12} />
                    {txn.branch || "Main Branch"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    By {txn.staff || "Counter Desk"}
                  </span>
                </div>
              </div>
              <Wallet className="absolute -bottom-6 -right-6 w-28 h-28 text-white/5 pointer-events-none" />
            </div>

            {isRefunded && (
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <RotateCcw size={14} className="text-purple-600" />
                  <span>Refund Dispatched & Account Adjusted</span>
                </div>
                <p className="text-xs text-purple-700 leading-relaxed">
                  Reason: {txn.refundReason || "Reversal issued on request."}
                </p>
                {txn.refundDate && (
                  <div className="text-[10px] text-purple-600 font-medium">
                    Processed on {txn.refundDate} by {txn.refundStaff || "Authorized Staff"}
                  </div>
                )}
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Payer / Member Profile
                </span>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {txn.member?.id || "GD-WALKIN"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                  <img
                    src={resolveMemberPhoto(txn.member)}
                    alt={txn.member?.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getInitialsAvatar(txn.member?.name, txn.member?.gender);
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold text-slate-900 truncate">
                    {txn.member?.name || "Walk-in Guest"}
                  </div>
                  <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {txn.member?.phone || "No phone linked"} • {txn.member?.email || "No email on record"}
                  </div>
                  <div className="text-[11px] font-semibold text-indigo-600 mt-1">
                    Plan: {txn.planName || txn.type}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Line Items & Tax Breakdown
                </span>
                <span className="text-[10px] font-bold text-slate-500">Official GST Invoice</span>
              </div>

              <div className="divide-y divide-slate-100">
                {(txn.items || [{ name: txn.planName || txn.type, qty: 1, price: txn.subtotal || txn.amount - txn.tax, discount: 0 }]).map((it, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{it.name}</div>
                      <div className="text-[10px] text-slate-400">Quantity: {it.qty}</div>
                    </div>
                    <div className="text-right font-mono font-bold text-slate-900">
                      {currencyFormatter.format((it.qty * it.price) - (it.discount || 0))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Base Taxable Amount</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {currencyFormatter.format(txn.subtotal || txn.amount - txn.tax)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>CGST (9.0%)</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {currencyFormatter.format(Math.round((txn.tax || 0) / 2))}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>SGST (9.0%)</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {currencyFormatter.format(Math.round((txn.tax || 0) / 2))}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-sm text-slate-900">
                  <span>Total Settled</span>
                  <span className="font-mono text-indigo-600 text-base">
                    {currencyFormatter.format(txn.amount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block pb-2 border-b border-slate-200">
                Payment Rail & Settlement Verification
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Mode</span>
                  <span className="font-bold text-slate-800">{txn.method}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Payment Rail</span>
                  <span className="font-bold text-slate-800">{txn.paymentRail || "Digital"}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">UTR / Bank Ref Number</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">{txn.utr || "DESK-RECORD"}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(txn.utr, "utr")}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                    title="Copy UTR"
                  >
                    {copiedKey === "utr" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 col-span-2">
                  <span className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Receiving Account</span>
                  <span className="font-medium text-slate-800">{txn.account || "GymDeck Primary Settlement"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50/90 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => onPrintReceipt(txn)}
              className="py-2.5 px-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer size={14} />
              <span>Receipt</span>
            </button>

            <button
              onClick={() => printSummaryStatement([txn], `Invoice ${txn.invoiceId || txn.id}`)}
              className="py-2.5 px-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileDown size={14} />
              <span>Tax PDF</span>
            </button>

            <button
              onClick={() => {
                const message = encodeURIComponent(`Hello ${txn.member?.name || "Member"}, your GymDeck payment of ${currencyFormatter.format(txn.amount)} (Invoice: ${txn.invoiceId || txn.id}) has been confirmed. Thank you!`);
                window.open(`https://wa.me/${(txn.member?.phone || "").replace(/[^0-9]/g, "")}?text=${message}`, "_blank");
              }}
              className="py-2.5 px-3 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send size={14} />
              <span>WhatsApp</span>
            </button>

            {isSuccess ? (
              <button
                onClick={() => onOpenRefund(txn)}
                className="py-2.5 px-3 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Refund</span>
              </button>
            ) : (
              <button
                disabled
                className="py-2.5 px-3 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl text-xs font-bold transition-all opacity-60 cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <span>Settled</span>
              </button>
            )}
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────
// REFUND / ADJUSTMENT MODAL
// ─────────────────────────────────────────

const IssueRefundModal = ({ isOpen, onClose, txn, onConfirmRefund }) => {
  const [refundReason, setRefundReason] = useState("Duplicate payment reversal");
  const [customReason, setCustomReason] = useState("");
  const [refundType, setRefundType] = useState("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !txn) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const reasonText = refundReason === "Other" ? customReason : refundReason;
      onConfirmRefund(txn.id, reasonText, refundType === "full" ? txn.amount : Number(partialAmount));
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
              <RotateCcw size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">
                Issue Payment Refund
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Audit adjustment for {txn.id} ({txn.member?.name})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Original Fee</span>
              <span className="text-base font-black text-slate-900 font-mono">{currencyFormatter.format(txn.amount)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Mode</span>
              <span className="font-bold text-slate-800">{txn.method}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
              Refund Amount Option
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRefundType("full")}
                className={`p-2.5 rounded-xl border text-left font-bold cursor-pointer transition-all ${
                  refundType === "full"
                    ? "bg-rose-50 border-rose-300 text-rose-900 shadow-2xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div>Full Reversal</div>
                <div className="text-[11px] font-mono mt-0.5 text-rose-700">{currencyFormatter.format(txn.amount)}</div>
              </button>

              <button
                type="button"
                onClick={() => setRefundType("partial")}
                className={`p-2.5 rounded-xl border text-left font-bold cursor-pointer transition-all ${
                  refundType === "partial"
                    ? "bg-rose-50 border-rose-300 text-rose-900 shadow-2xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div>Partial Adjustment</div>
                <div className="text-[11px] font-normal text-slate-400 mt-0.5">Specify amount</div>
              </button>
            </div>
          </div>

          {refundType === "partial" && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Custom Refund Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                max={txn.amount}
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                placeholder="Enter rupee amount (e.g. 1500)"
                required
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Audit Reason
            </label>
            <CustomDropdown
              id="refund-reason-custom-select"
              label=""
              value={refundReason}
              options={[
                { id: "Duplicate payment reversal", label: "Duplicate payment on UPI/Card", description: "Accidental double deduction reversal" },
                { id: "Cancellation within 48h policy", label: "Cancellation within 48h policy", description: "Gym membership policy refund window" },
                { id: "Medical freeze / doctor relocation", label: "Medical relocation with note", description: "Physician certified relocation / injury" },
                { id: "Client dissatisfaction settlement", label: "Client dissatisfaction settlement", description: "Manager authorized service concession" },
                { id: "Other", label: "Other Custom Reason", description: "Specify manual explanation note below" }
              ]}
              onChange={(val) => setRefundReason(val)}
              className="w-full"
              menuWidth="w-full"
            />
          </div>

          {refundReason === "Other" && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Note Explanation
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={2}
                placeholder="Explain the reason for this refund..."
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                required
              />
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 text-amber-600 mt-0.5" />
            <span>
              This will mark the ledger record as <strong>Refunded</strong> and adjust total revenue calculations.
            </span>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              <span>Confirm Refund</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// MAIN PAYMENT HISTORY WORKSPACE
// ─────────────────────────────────────────

export const PaymentHistoryPage = () => {
  // Load purely from real persistent storage
  const [transactions, setTransactions] = useState(() => {
    try {
      const stored = localStorage.getItem("gymdeck_transaction_ledger");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean);
        }
      }
    } catch (e) {
      console.warn("GymDeck: Failed to load local ledger", e);
    }
    return [];
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Interaction States
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [refundTargetTxn, setRefundTargetTxn] = useState(null);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const exportMenuRef = useRef(null);

  // Ingest any cloud / backend reconciliation attempts if available
  useEffect(() => {
    let isMounted = true;
    if (typeof paymentsV2Api?.listAll === "function") {
      paymentsV2Api.listAll()
        .then((res) => {
          if (!isMounted || !res?.items || !Array.isArray(res.items)) return;
          const mappedRemote = res.items.map((r) => ({
            id: r.transactionReference || r.attemptId,
            invoiceId: r.invoice?.number || `INV-${r.invoice?.id || "REC"}`,
            member: {
              name: r.member?.name || "Member",
              id: r.member?.code || r.member?.id || "GD-MEM",
              phone: r.member?.phone || "—",
              email: "",
              gender: "male"
            },
            type: r.invoice?.status ? `Invoice ${r.invoice.status}` : "Fee Settlement",
            planName: r.invoice?.number ? `Invoice #${r.invoice.number}` : "Membership Fee",
            amount: r.amount || (r.amountMinor ? r.amountMinor / 100 : 0),
            tax: Math.round(((r.amount || 0) * 0.18) / 1.18),
            subtotal: (r.amount || 0) - Math.round(((r.amount || 0) * 0.18) / 1.18),
            discount: 0,
            method: r.submission?.utr ? "UPI (Bank Webhook)" : "Digital Settlement",
            paymentRail: r.submission?.utr ? "UPI" : "Card",
            utr: r.submission?.utr || r.transactionReference || "SETTLED",
            date: r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : new Date().toLocaleString("en-IN"),
            branch: "Main Branch",
            status: r.status === "VERIFIED" || r.status === "SUCCESSFUL" ? "Successful" : r.status === "REFUNDED" ? "Refunded" : r.status === "REJECTED" ? "Failed" : "Pending",
            staff: "System Automated",
            account: "Merchant Settlement"
          }));

          setTransactions((prev) => {
            const idMap = new Map();
            prev.forEach((p) => { if (p?.id) idMap.set(p.id, p); });
            mappedRemote.forEach((m) => { if (m?.id && !idMap.has(m.id)) idMap.set(m.id, m); });
            return Array.from(idMap.values());
          });
        })
        .catch(() => {
          // Quietly fallback to local storage ledger
        });
    }

    return () => { isMounted = false; };
  }, []);

  // Listen for real live payments recorded in other parts of the app (such as CollectFees)
  useEffect(() => {
    const handleLedgerUpdated = () => {
      try {
        const stored = localStorage.getItem("gymdeck_transaction_ledger");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setTransactions(parsed.filter(Boolean));
          }
        }
      } catch (e) {}
    };

    window.addEventListener("gymdeck:ledger-updated", handleLedgerUpdated);
    window.addEventListener("storage", handleLedgerUpdated);
    return () => {
      window.removeEventListener("gymdeck:ledger-updated", handleLedgerUpdated);
      window.removeEventListener("storage", handleLedgerUpdated);
    };
  }, []);

  // Handle outside click for export menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isExportMenuOpen]);

  // Refresh animation & state reload from real storage
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      try {
        const stored = localStorage.getItem("gymdeck_transaction_ledger");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setTransactions(parsed.filter(Boolean));
          }
        } else {
          setTransactions([]);
        }
      } catch (e) {}
      setIsRefreshing(false);
    }, 400);
  };

  // Navigate to Collect Fees Desk
  const handleGoToCollectFees = () => {
    const button = document.querySelector('[data-view="payments"]');
    if (button) {
      button.click();
    } else if (typeof window.switchView === "function") {
      window.switchView("payments");
    }
  };

  const openAuditDrawer = (txn) => {
    setSelectedTxn(txn);
    setIsDrawerOpen(true);
  };

  const handleOpenRefund = (txn) => {
    setRefundTargetTxn(txn);
    setIsRefundModalOpen(true);
  };

  const handleConfirmRefund = (txnId, reason, refundAmount) => {
    const updated = transactions.map((t) => {
      if (t.id === txnId) {
        return {
          ...t,
          status: "Refunded",
          refundReason: reason,
          refundAmount: refundAmount,
          refundDate: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
          refundStaff: "Manager On Duty"
        };
      }
      return t;
    });
    setTransactions(updated);
    try {
      localStorage.setItem("gymdeck_transaction_ledger", JSON.stringify(updated));
    } catch (e) {}
    if (selectedTxn && selectedTxn.id === txnId) {
      setSelectedTxn((prev) => ({
        ...prev,
        status: "Refunded",
        refundReason: reason,
        refundAmount: refundAmount,
        refundDate: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
      }));
    }
  };

  const handleCopyText = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // ─────────────────────────────────────────
  // COMPUTED REAL FINANCIAL KPIS (ZERO MOCK FALLBACKS)
  // ─────────────────────────────────────────
  const financialStats = useMemo(() => {
    let totalRevenue = 0;
    let successfulCount = 0;
    let upiRevenue = 0;
    let cardRevenue = 0;
    let cashRevenue = 0;
    let todayRevenue = 0;
    let todayCount = 0;
    let refundCount = 0;
    let refundAmount = 0;

    const todayIso = new Date().toISOString().slice(0, 10);
    const todayLocale = new Date().toLocaleDateString("en-IN");

    transactions.forEach((t) => {
      const isSuccess = t.status === "Successful" || t.status === "VERIFIED" || t.status === "PAID";
      const isRefund = t.status === "Refunded" || t.status === "REFUNDED";

      if (isSuccess) {
        totalRevenue += Number(t.amount || 0);
        successfulCount++;

        const rail = (t.paymentRail || t.method || "").toLowerCase();
        if (rail.includes("upi")) upiRevenue += Number(t.amount || 0);
        else if (rail.includes("card")) cardRevenue += Number(t.amount || 0);
        else if (rail.includes("cash")) cashRevenue += Number(t.amount || 0);

        const txDate = t.date || t.createdAt || "";
        if (txDate.includes(todayIso) || txDate.includes(todayLocale)) {
          todayRevenue += Number(t.amount || 0);
          todayCount++;
        }
      } else if (isRefund) {
        refundCount++;
        refundAmount += Number(t.amount || 0);
      }
    });

    const upiPercent = totalRevenue > 0 ? Math.round((upiRevenue / totalRevenue) * 100) : 0;
    const cardPercent = totalRevenue > 0 ? Math.round((cardRevenue / totalRevenue) * 100) : 0;
    const cashPercent = totalRevenue > 0 ? Math.round((cashRevenue / totalRevenue) * 100) : 0;

    return {
      totalRevenue,
      successfulCount,
      todayRevenue,
      todayCount,
      upiRevenue,
      upiPercent,
      cardRevenue,
      cardPercent,
      cashRevenue,
      cashPercent,
      refundCount,
      refundAmount
    };
  }, [transactions]);

  // ─────────────────────────────────────────
  // FILTERING & SORTING LOGIC
  // ─────────────────────────────────────────
  const timelineOptions = useMemo(() => getDynamicTimelineOptions(), []);

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((t) => {
        return (
          t.id.toLowerCase().includes(q) ||
          (t.invoiceId && t.invoiceId.toLowerCase().includes(q)) ||
          (t.member?.name && t.member.name.toLowerCase().includes(q)) ||
          (t.member?.id && t.member.id.toLowerCase().includes(q)) ||
          (t.member?.phone && t.member.phone.includes(q)) ||
          (t.utr && t.utr.toLowerCase().includes(q)) ||
          (t.planName && t.planName.toLowerCase().includes(q)) ||
          (t.type && t.type.toLowerCase().includes(q)) ||
          (t.staff && t.staff.toLowerCase().includes(q))
        );
      });
    }

    if (statusFilter !== "All") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (methodFilter !== "All") {
      result = result.filter((t) => {
        const rail = (t.paymentRail || t.method || "").toLowerCase();
        if (methodFilter === "UPI") return rail.includes("upi");
        if (methodFilter === "Card") return rail.includes("card");
        if (methodFilter === "Cash") return rail.includes("cash");
        if (methodFilter === "Bank Transfer") return rail.includes("bank") || rail.includes("imps");
        return true;
      });
    }

    if (categoryFilter !== "All") {
      result = result.filter((t) => {
        return (t.type || "").toLowerCase().includes(categoryFilter.toLowerCase()) ||
               (t.planName || "").toLowerCase().includes(categoryFilter.toLowerCase());
      });
    }

    if (dateFilter !== "all") {
      const now = new Date();
      const todayIso = now.toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000);
      const yesterdayIso = yesterday.toISOString().slice(0, 10);
      const currentMonthIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthIso = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

      result = result.filter((t) => {
        const rawDate = t.date || t.createdAt || "";
        if (!rawDate) return false;

        if (dateFilter === "today") {
          return rawDate.includes(todayIso) || rawDate.includes(now.toLocaleDateString("en-IN"));
        }
        if (dateFilter === "yesterday") {
          return rawDate.includes(yesterdayIso) || rawDate.includes(yesterday.toLocaleDateString("en-IN"));
        }
        if (dateFilter === "week") {
          const parsed = Date.parse(rawDate);
          if (!isNaN(parsed)) {
            return (Date.now() - parsed) <= (7 * 86400000);
          }
          return true;
        }
        if (dateFilter === "month") {
          return rawDate.includes(currentMonthIso) || rawDate.includes(now.toLocaleDateString("en-IN", { month: "short" }));
        }
        if (dateFilter === "lastMonth") {
          return rawDate.includes(lastMonthIso) || rawDate.includes(prevMonth.toLocaleDateString("en-IN", { month: "short" }));
        }
        return true;
      });
    }

    result.sort((a, b) => {
      if (sortBy === "newest") {
        return (b.id || "").localeCompare(a.id || "");
      }
      if (sortBy === "oldest") {
        return (a.id || "").localeCompare(b.id || "");
      }
      if (sortBy === "amount_desc") {
        return (b.amount || 0) - (a.amount || 0);
      }
      if (sortBy === "amount_asc") {
        return (a.amount || 0) - (b.amount || 0);
      }
      return 0;
    });

    return result;
  }, [transactions, searchQuery, statusFilter, methodFilter, categoryFilter, dateFilter, sortBy]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, methodFilter, categoryFilter, dateFilter, sortBy, pageSize]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (statusFilter !== "All") count++;
    if (methodFilter !== "All") count++;
    if (categoryFilter !== "All") count++;
    if (dateFilter !== "all") count++;
    return count;
  }, [searchQuery, statusFilter, methodFilter, categoryFilter, dateFilter]);

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("All");
    setMethodFilter("All");
    setCategoryFilter("All");
    setDateFilter("all");
    setSortBy("newest");
  };

  return (
    <div className="payment-history-shell font-sans text-slate-900 selection:bg-indigo-100">
      <div className="payment-history-workspace">
        
        {/* ════════════════════════════════════════════════════════════
            1. EXECUTIVE TOP HEADER & ACTION CONTROLS
        ════════════════════════════════════════════════════════════ */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              <span>Payments & Billing</span>
              <span>/</span>
              <span className="text-indigo-600 font-black">Payment History</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Payment History & Ledger
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live audit trail of gym fee settlements, membership renewals, digital UPI transfers, and refund records.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              className="h-10 px-3.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
              title="Refresh transaction data"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin text-indigo-600" : ""} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => printSummaryStatement(filteredTransactions, `${statusFilter} • ${dateFilter}`)}
              disabled={filteredTransactions.length === 0}
              className="h-10 px-3.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Ledger</span>
            </button>

            <div className="relative inline-block" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                disabled={filteredTransactions.length === 0}
                aria-expanded={isExportMenuOpen}
                className={`h-10 px-3.5 rounded-xl border text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer select-none group disabled:opacity-40 disabled:cursor-not-allowed ${
                  isExportMenuOpen
                    ? "bg-indigo-50/70 border-indigo-400 text-indigo-950 ring-2 ring-indigo-500/15"
                    : "bg-white hover:bg-slate-50/90 border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <Download size={14} className={isExportMenuOpen ? "text-indigo-600" : "text-slate-500 group-hover:text-slate-700"} />
                <span>Export</span>
                <ChevronDown
                  size={13}
                  className={`text-slate-400 transition-transform duration-200 ${
                    isExportMenuOpen ? "rotate-180 text-indigo-600" : "group-hover:text-slate-600"
                  }`}
                />
              </button>

              <AnimatePresence>
                {isExportMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 mt-1.5 w-64 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl z-50 p-1.5 space-y-1"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                      <span>Export Dataset</span>
                      <span className="text-[9px] font-mono lowercase">{filteredTransactions.length} items</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        exportLedgerToCSV(filteredTransactions);
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-950 flex items-start gap-2.5 transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors border border-emerald-100 shadow-2xs">
                        <FileDown size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-950">Export as CSV (.csv)</div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">Spreadsheet format for Excel & Sheets</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        printSummaryStatement(filteredTransactions, `${statusFilter} • ${dateFilter}`);
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-950 flex items-start gap-2.5 transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors border border-indigo-100 shadow-2xs">
                        <FileText size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-950">Print Statement (PDF)</div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">A4 official ledger statement format</div>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={handleGoToCollectFees}
              className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Collect Fees</span>
            </button>
          </div>
        </header>

        {/* ════════════════════════════════════════════════════════════
            2. REAL FINANCIAL KPIS (ZERO HARDCODED MOCKS)
        ════════════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Total Realized Volume
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80">
                <Wallet size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {currencyFormatter.format(financialStats.totalRevenue)}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 mt-1">
                <TrendingUp size={13} />
                <span>{financialStats.successfulCount} Successful Txns</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Today's Collection
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/80">
                <Activity size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {currencyFormatter.format(financialStats.todayRevenue)}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 mt-1">
                <Clock size={13} />
                <span>{financialStats.todayCount} settlements today</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                UPI & Dynamic QR
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100/80">
                <Smartphone size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {currencyFormatter.format(financialStats.upiRevenue)}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-600 mt-1">
                <span>{financialStats.upiPercent}% of total volume</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Card / POS Swipes
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100/80">
                <CreditCard size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {currencyFormatter.format(financialStats.cardRevenue)}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-600 mt-1">
                <span>{financialStats.cardPercent}% terminal share</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Cash Desk & Vault
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/80">
                <Banknote size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {currencyFormatter.format(financialStats.cashRevenue)}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mt-1">
                <span>{financialStats.refundCount} refunds ({currencyFormatter.format(financialStats.refundAmount)})</span>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            3. COMMAND CENTER & CUSTOM DESIGNED FILTER TOOLBAR
        ════════════════════════════════════════════════════════════ */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3.5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            
            {/* Perfectly Aligned Search Bar */}
            <div className="lg:col-span-5">
              <div className="group relative flex items-center w-full">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center justify-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Search size={15} strokeWidth={2.4} />
                </div>

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search member name, ID, phone, TXN ID, UTR, invoice..."
                  className="w-full h-10 pl-10 pr-10 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs leading-normal"
                />

                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Clear search"
                  >
                    <span className="w-5 h-5 rounded-md hover:bg-slate-200/80 flex items-center justify-center transition-colors">
                      <X size={12} strokeWidth={2.5} />
                    </span>
                  </button>
                ) : (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-slate-400 border border-slate-200 bg-white shadow-2xs">
                      ⌘K
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Pills */}
            <div className="lg:col-span-7 flex items-center overflow-x-auto gap-1.5 pb-1 lg:pb-0 custom-scrollbar">
              {[
                { id: "All", label: "All Records", count: transactions.length },
                { id: "Successful", label: "Successful", count: transactions.filter((t) => t.status === "Successful").length },
                { id: "Refunded", label: "Refunded", count: transactions.filter((t) => t.status === "Refunded").length },
                { id: "Pending", label: "Pending", count: transactions.filter((t) => t.status === "Pending").length },
                { id: "Failed", label: "Failed", count: transactions.filter((t) => t.status === "Failed").length }
              ].map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`h-9 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isActive
                        ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                        : "bg-slate-50/80 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                      isActive ? "bg-white/20 text-white" : "bg-white text-slate-500 border border-slate-200/60"
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Custom Designed Drop Down Menus */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <CustomDropdown
                id="mode-filter-dropdown"
                label="Mode"
                value={methodFilter}
                options={PAYMENT_MODE_OPTIONS}
                onChange={(val) => setMethodFilter(val)}
                icon={CreditCard}
                menuWidth="w-72"
              />

              <CustomDropdown
                id="timeline-filter-dropdown"
                label="Timeline"
                value={dateFilter}
                options={timelineOptions}
                onChange={(val) => setDateFilter(val)}
                icon={Calendar}
                menuWidth="w-64"
              />

              <CustomDropdown
                id="category-filter-dropdown"
                label="Category"
                value={categoryFilter}
                options={CATEGORY_OPTIONS}
                onChange={(val) => setCategoryFilter(val)}
                icon={Tag}
                menuWidth="w-64"
              />
            </div>

            <div className="flex items-center gap-2">
              <CustomDropdown
                id="sort-filter-dropdown"
                label="Sort"
                value={sortBy}
                options={SORT_OPTIONS}
                onChange={(val) => setSortBy(val)}
                icon={ArrowUpDown}
                align="right"
                menuWidth="w-60"
              />
            </div>
          </div>

          {/* Active Filters Ribbon & Reset */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center flex-wrap gap-2 pt-2.5 border-t border-slate-100 text-xs">
              <span className="text-[10px] font-black text-slate-400 uppercase">Active Filters ({activeFiltersCount}):</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery("")} className="hover:text-indigo-900 cursor-pointer"><X size={12} /></button>
                </span>
              )}
              {statusFilter !== "All" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter("All")} className="hover:text-slate-900 cursor-pointer"><X size={12} /></button>
                </span>
              )}
              {methodFilter !== "All" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                  Mode: {methodFilter}
                  <button onClick={() => setMethodFilter("All")} className="hover:text-slate-900 cursor-pointer"><X size={12} /></button>
                </span>
              )}
              {categoryFilter !== "All" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                  Type: {categoryFilter}
                  <button onClick={() => setCategoryFilter("All")} className="hover:text-slate-900 cursor-pointer"><X size={12} /></button>
                </span>
              )}
              {dateFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                  Date: {dateFilter}
                  <button onClick={() => setDateFilter("all")} className="hover:text-slate-900 cursor-pointer"><X size={12} /></button>
                </span>
              )}

              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 ml-auto cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════════════════════════
            4. MASTER TRANSACTION LEDGER TABLE (FULL WIDTH & WELL SPACED)
        ════════════════════════════════════════════════════════════ */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-slate-200/90 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-700 font-mono">
                Transaction Ledger
              </span>
              <span className="text-slate-300 font-light">•</span>
              <span className="text-xs font-bold text-slate-600">
                {filteredTransactions.length} {filteredTransactions.length === 1 ? "record" : "records"} matched
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Reconciled
              </span>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.14em] border-b border-slate-200/80">
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Transaction / Invoice</th>
                  <th className="py-3.5 px-4">Member / Payer</th>
                  <th className="py-3.5 px-4">Category & Plan</th>
                  <th className="py-3.5 px-4">Payment Rail</th>
                  <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-4">Staff</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center text-slate-400">
                      {transactions.length === 0 ? (
                        <>
                          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3.5 text-slate-400 border border-slate-200 shadow-2xs">
                            <Receipt size={26} strokeWidth={1.8} />
                          </div>
                          <div className="font-extrabold text-sm text-slate-800">No Payment Records Yet</div>
                          <div className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                            Transactions collected at the fee desk or settled via UPI/Card will appear here in your live accounting ledger.
                          </div>
                          <button
                            type="button"
                            onClick={handleGoToCollectFees}
                            className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Plus size={14} strokeWidth={2.5} />
                            <span>Collect First Fee</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400 border border-slate-200">
                            <Search size={22} />
                          </div>
                          <div className="font-bold text-sm text-slate-700">No transactions match your search</div>
                          <div className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            Try refining your keywords or clearing the active filters to see all payments.
                          </div>
                          <button
                            type="button"
                            onClick={handleClearAllFilters}
                            className="mt-3.5 px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                          >
                            Reset All Filters
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((t) => {
                    const isSuccess = t.status === "Successful";
                    const isRefunded = t.status === "Refunded";
                    const isPending = t.status === "Pending";

                    return (
                      <tr
                        key={t.id}
                        onClick={() => openAuditDrawer(t)}
                        className="group hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">
                            {t.date ? t.date.split(" ")[0] : "—"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {t.date ? t.date.split(" ").slice(1).join(" ") : ""}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {t.id}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(t.id, t.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition-opacity"
                              title="Copy Transaction ID"
                            >
                              {copiedKey === t.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {t.invoiceId || "INV-GEN"}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5 min-w-[160px]">
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200/90 shrink-0 bg-slate-100">
                              <img
                                src={resolveMemberPhoto(t.member)}
                                alt={t.member?.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = getInitialsAvatar(t.member?.name, t.member?.gender);
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-slate-900 truncate">
                                {t.member?.name || "Member"}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                                {t.member?.id || "GD-WALKIN"} • {t.member?.phone || "—"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 line-clamp-1 max-w-[190px]" title={t.planName || t.type}>
                            {t.planName || t.type}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200/60 font-mono text-[9px]">
                              {t.type || "Desk Fee"}
                            </span>
                            <span>•</span>
                            <span>{t.branch || "Main"}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            {t.paymentRail === "UPI" || (t.method || "").includes("UPI") ? (
                              <Smartphone size={13} className="text-sky-600 shrink-0" />
                            ) : t.paymentRail === "Card" || (t.method || "").includes("Card") ? (
                              <CreditCard size={13} className="text-purple-600 shrink-0" />
                            ) : (
                              <Banknote size={13} className="text-amber-600 shrink-0" />
                            )}
                            <span className="truncate max-w-[120px]">{t.method}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[130px] mt-0.5" title={t.utr}>
                            UTR: {t.utr || "DESK-RECORD"}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="font-black text-slate-900 font-mono text-sm tracking-tight">
                            {currencyFormatter.format(t.amount)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            GST: ₹{t.tax?.toLocaleString("en-IN") || 0}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                          {t.staff || "Counter Desk"}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isSuccess ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            isRefunded ? "bg-purple-50 text-purple-700 border-purple-200" :
                            isPending ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isSuccess ? "bg-emerald-500" :
                              isRefunded ? "bg-purple-500" :
                              isPending ? "bg-amber-500" :
                              "bg-rose-500"
                            }`} />
                            {t.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openAuditDrawer(t)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="View Audit Details"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => printThermalReceipt(t)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Print Thermal Receipt"
                            >
                              <Printer size={15} />
                            </button>

                            <RowActionsDropdown
                              txn={t}
                              onOpenAudit={openAuditDrawer}
                              onPrintReceipt={printThermalReceipt}
                              onOpenRefund={handleOpenRefund}
                              onCopyText={handleCopyText}
                              copiedKey={copiedKey}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ════════════════════════════════════════════════════════════
              5. DESKTOP PAGINATION BAR
          ════════════════════════════════════════════════════════════ */}
          <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-slate-500 font-medium">
              <span>
                Showing <strong className="text-slate-900 font-mono">{filteredTransactions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to <strong className="text-slate-900 font-mono">{Math.min(currentPage * pageSize, filteredTransactions.length)}</strong> of <strong className="text-slate-900 font-mono">{filteredTransactions.length}</strong> transactions
              </span>

              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                <CustomDropdown
                  id="page-size-select-dropdown"
                  label="Rows"
                  value={pageSize}
                  options={PAGE_SIZE_OPTIONS}
                  onChange={(val) => setPageSize(Number(val))}
                  direction="up"
                  align="left"
                  menuWidth="w-36"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => {
                  if (totalPages > 5 && Math.abs(num - currentPage) > 2 && num !== 1 && num !== totalPages) {
                    if (num === 2 || num === totalPages - 1) {
                      return <span key={num} className="px-1 text-slate-400">...</span>;
                    }
                    return null;
                  }
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCurrentPage(num)}
                      className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        currentPage === num
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>

      </div>

      <TransactionAuditDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        txn={selectedTxn}
        onPrintReceipt={printThermalReceipt}
        onOpenRefund={handleOpenRefund}
      />

      <IssueRefundModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        txn={refundTargetTxn}
        onConfirmRefund={handleConfirmRefund}
      />
    </div>
  );
};

// ─────────────────────────────────────────
// MOUNT FUNCTION FOR GYMDECK RUNTIME
// ─────────────────────────────────────────

export const mountPaymentHistory = () => {
  console.log("GymDeck: Mounting Payment History module...");
  const stage = document.querySelector('[data-stage="payment-history"]');
  if (!stage) {
    console.error("GymDeck: Payment History stage element not found!");
    return null;
  }

  const rootElement = document.createElement("div");
  rootElement.dataset.paymentHistoryReactRoot = "";
  rootElement.className = "min-h-full";
  stage.replaceChildren(rootElement);

  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <>
          <PaymentHistoryPage />
          <BrandFooter />
        </>
      </ErrorBoundary>
    );
    console.log("GymDeck: Payment History module mounted successfully.");
    return root;
  } catch (err) {
    console.error("Failed to render Payment History UI:", err);
    return null;
  }
};

export default PaymentHistoryPage;
