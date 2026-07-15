import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSignature,
  Search,
  Plus,
  Filter,
  MoreVertical,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  LayoutGrid,
  List,
  Upload,
  ShieldCheck,
  FileWarning,
  HardDrive,
  BarChart3,
  MoreHorizontal,
  Maximize2,
  Database,
  SearchCode,
  Zap,
  Clock3,
  AlertCircle,
  FileCheck,
  History,
  Info,
  ArrowUpRight,
  FileText,
  ScanLine,
  ShieldAlert,
  RotateCw,
  X,
  PenTool,
  Send,
  Archive,
  RefreshCw,
  Mail
} from "lucide-react";

// ─────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────

const AGREEMENTS_DATA = [
  {
    id: "AGR-9042",
    memberId: "GYM-MBR-0428",
    memberName: "Rohan Verma",
    title: "Annual Elite Membership Contract",
    type: "Membership Agreement",
    createdDate: "2026-05-18",
    expiryDate: "2027-05-17",
    status: "signed",
    signedBy: "Rohan Verma (via Email OTP)",
    signedDate: "2026-05-18 14:30",
    lastModified: "2026-05-18",
    uploadedBy: "System Auto-Gen",
    category: "General Membership Contracts",
    preview: "https://api.dicebear.com/7.x/shapes/svg?seed=agr1"
  },
  {
    id: "AGR-9039",
    memberId: "GYM-MBR-0417",
    memberName: "Aisha Khan",
    title: "Injury Liability & Risk Waiver",
    type: "Liability Waiver",
    createdDate: "2026-05-15",
    expiryDate: null,
    status: "pending",
    signedBy: null,
    signedDate: null,
    lastModified: "2026-05-15",
    uploadedBy: "Admin Sneha",
    category: "Injury Liability Waivers",
    preview: "https://api.dicebear.com/7.x/shapes/svg?seed=agr2"
  },
  {
    id: "AGR-9035",
    memberId: "GYM-MBR-0403",
    memberName: "Aarav Sharma",
    title: "12-Week Transformation PT Contract",
    type: "PT Coaching Agreement",
    createdDate: "2026-02-10",
    expiryDate: "2026-05-10",
    status: "expired",
    signedBy: "Aarav Sharma (In-Person Tablet)",
    signedDate: "2026-02-10 09:15",
    lastModified: "2026-05-10",
    uploadedBy: "Trainer Mike",
    category: "PT Coaching Agreements",
    preview: "https://api.dicebear.com/7.x/shapes/svg?seed=agr3"
  },
  {
    id: "AGR-9030",
    memberId: "GYM-MBR-0441",
    memberName: "Siya Mehta",
    title: "Corporate Wellness Enrollment Form",
    type: "Corporate Agreement",
    createdDate: "2026-04-20",
    expiryDate: "2027-04-19",
    status: "signed",
    signedBy: "Siya Mehta (via WhatsApp Link)",
    signedDate: "2026-04-21 11:45",
    lastModified: "2026-04-21",
    uploadedBy: "Admin Ankit",
    category: "Corporate Agreements",
    preview: "https://api.dicebear.com/7.x/shapes/svg?seed=agr4"
  }
];

const CATEGORIES = [
  "All Agreements",
  "General Membership Contracts",
  "PT Coaching Agreements",
  "Injury Liability Waivers",
  "Medical Consent Forms",
  "Corporate Agreements"
];

const STATUS_FILTERS = [
  { label: "Signed", value: "signed", color: "emerald" },
  { label: "Pending", value: "pending", color: "amber" },
  { label: "Expired", value: "expired", color: "rose" },
  { label: "Draft", value: "draft", color: "slate" },
  { label: "All", value: "all", color: "slate" }
];

// ─────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────
const cn = (...classes) => classes.filter(Boolean).join(" ");

const getStatusBadge = (status) => {
  switch (status) {
    case "signed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
          <CheckCircle2 size={12} /> Signed
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100 animate-pulse">
          <Clock size={12} /> Awaiting Sig.
        </span>
      );
    case "expired":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100">
          <AlertCircle size={12} /> Expired
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100">
          <XCircle size={12} /> Rejected
        </span>
      );
    default:
      return null;
  }
};

// ─────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────

const KPICard = ({ title, value, subtext, icon: Icon, trend, color }) => (
  <article className="bg-white p-5 sm:p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
    <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-5 group-hover:opacity-10 transition-opacity", `bg-${color}-500`)} />
    <div className="flex justify-between items-start mb-4">
      <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center", `bg-${color}-50 text-${color}-600`)}>
        <Icon size={20} className="sm:w-6 sm:h-6" />
      </div>
      {trend && (
        <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg", trend.isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
          {trend.isPositive ? "+" : "-"}{trend.value}%
        </span>
      )}
    </div>
    <div>
      <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
      <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-none mb-1 tracking-tight">{value}</h3>
      <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">{subtext}</p>
    </div>
  </article>
);

const AgreementDrawer = ({ agreement, isOpen, onClose }) => {
  if (!agreement) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:max-w-[560px] bg-white shadow-2xl z-[101] overflow-y-auto flex flex-col"
          >
            {/* Drawer Header */}
            <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white backdrop-blur-md z-10">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
                  <FileSignature size={24} />
                </div>
                <div className="min-w-0 pr-4">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">{agreement.title}</h2>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest truncate">{agreement.id}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors shrink-0">
                <X size={24} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 p-6 sm:p-8 space-y-8">
              {/* Document Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileText size={14} className="text-indigo-500" /> Contract Preview
                  </h3>
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><Maximize2 size={14} /></button>
                  </div>
                </div>
                <div className="aspect-[4/3] w-full bg-slate-50 rounded-[24px] sm:rounded-[32px] overflow-hidden relative group border border-slate-100">
                  <img src={agreement.preview} alt={agreement.title} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="h-10 px-4 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-xl flex items-center gap-2 hover:scale-105 transition-transform">
                      <Eye size={14} /> Open Full PDF
                    </button>
                  </div>
                  {agreement.status === 'signed' && (
                     <div className="absolute bottom-4 right-4 bg-emerald-500 text-white p-2 rounded-lg shadow-lg">
                        <PenTool size={16} />
                     </div>
                  )}
                </div>
              </div>

              {/* Status & Member Split */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                 {/* Member Details */}
                 <div className="p-5 rounded-[24px] bg-slate-50 border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Counterparty</p>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                          {agreement.memberName.split(' ').map(n => n[0]).join('')}
                       </div>
                       <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 truncate">{agreement.memberName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{agreement.memberId}</p>
                       </div>
                    </div>
                 </div>

                 {/* Digital Signature Info */}
                 <div className={cn("p-5 rounded-[24px] border", agreement.status === 'signed' ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/50 border-amber-100")}>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Digital Consent</p>
                    {agreement.status === 'signed' ? (
                      <div className="space-y-1.5">
                         <div className="flex items-center gap-1.5 text-emerald-600">
                            <ShieldCheck size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Verified Signature</span>
                         </div>
                         <p className="text-[10px] font-bold text-slate-700 truncate">{agreement.signedBy}</p>
                         <p className="text-[9px] font-bold text-slate-400">{agreement.signedDate}</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                         <div className="flex items-center gap-1.5 text-amber-600">
                            <Clock size={14} className="animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Signature</span>
                         </div>
                         <p className="text-[10px] font-bold text-slate-500">Sent on: {agreement.createdDate}</p>
                      </div>
                    )}
                 </div>
              </div>

              {/* Agreement Metadata */}
              <section className="space-y-4">
                 <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Info size={14} className="text-indigo-500" /> Contract Details
                 </h3>
                 <div className="grid grid-cols-2 gap-y-4 gap-x-6 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-slate-100 bg-white">
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Agreement Type</p>
                       <p className="text-[11px] font-bold text-slate-900">{agreement.type}</p>
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Category</p>
                       <p className="text-[11px] font-bold text-slate-900 truncate">{agreement.category}</p>
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Generated On</p>
                       <p className="text-[11px] font-bold text-slate-900">{agreement.createdDate}</p>
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Valid Until</p>
                       <p className={cn("text-[11px] font-bold", agreement.status === 'expired' ? "text-rose-600" : "text-slate-900")}>
                         {agreement.expiryDate || "Indefinite"}
                       </p>
                    </div>
                 </div>
              </section>

              {/* Legal Audit Trail */}
              <section className="space-y-4 pb-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                       <History size={14} className="text-indigo-500" /> Legal Audit Trail
                    </h3>
                    <button className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Export Log</button>
                 </div>
                 <div className="space-y-3 pl-2">
                    {[
                      { action: "Agreement Generated", user: agreement.uploadedBy, time: `${agreement.createdDate} 09:00` },
                      { action: "Signature Request Sent", user: "System Automator", time: `${agreement.createdDate} 09:05` },
                      ...(agreement.status === 'signed' ? [{ action: "Digital Signature Captured", user: agreement.signedBy, time: agreement.signedDate }] : [])
                    ].map((log, i) => (
                      <div key={i} className="flex gap-4 group">
                         <div className="flex flex-col items-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-last:bg-indigo-500" />
                            <div className="flex-1 w-[1px] bg-slate-100 group-last:bg-transparent min-h-[20px]" />
                         </div>
                         <div className="-mt-1.5 pb-2">
                            <p className="text-[11px] font-black text-slate-900 leading-none mb-1">{log.action}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{log.user} • {log.time}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </section>
            </div>

            {/* Action Bar */}
            <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-100 bg-white sticky bottom-0 z-10 grid grid-cols-2 gap-3 sm:gap-4">
              {agreement.status === 'pending' ? (
                <>
                  <button className="h-12 sm:h-14 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-900 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                    <Archive size={16} /> <span className="hidden sm:inline">Archive</span>
                  </button>
                  <button className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-indigo-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    <Send size={16} /> <span className="hidden sm:inline">Resend Request</span>
                    <span className="sm:hidden">Resend</span>
                  </button>
                </>
              ) : agreement.status === 'expired' ? (
                 <>
                  <button className="h-12 sm:h-14 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-900 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                    <Download size={16} /> <span className="hidden sm:inline">Download</span>
                  </button>
                  <button className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-900 text-white font-bold text-xs sm:text-sm shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-2">
                    <RefreshCw size={16} /> <span className="hidden sm:inline">Renew Contract</span>
                    <span className="sm:hidden">Renew</span>
                  </button>
                 </>
              ) : (
                 <>
                  <button className="h-12 sm:h-14 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-900 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 col-span-2">
                    <Download size={16} /> Download Signed PDF
                  </button>
                 </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

const Agreements = () => {
  const [viewMode, setViewMode] = useState("grid"); // grid | table
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Agreements");
  const [activeStatus, setActiveStatus] = useState("all");
  const [selectedAgreement, setSelectedAgreement] = useState(null);

  const filteredAgreements = useMemo(() => {
    return AGREEMENTS_DATA.filter(agr => {
      const matchesSearch = agr.memberName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           agr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           agr.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (agr.memberId && agr.memberId.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = activeCategory === "All Agreements" || agr.category === activeCategory;
      const matchesStatus = activeStatus === "all" || agr.status === activeStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [searchQuery, activeCategory, activeStatus]);

  return (
    <div className="agreements-shell font-sans text-slate-900 selection:bg-indigo-100">
      {/* ─────────────────────────────────────────
          TOP UTILITY HEADER
      ───────────────────────────────────────── */}
      <header className="relative z-50 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-6 flex-1 w-full max-w-2xl">
          <div className="flex flex-col shrink-0">
             <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                <span>Legal</span>
                <ChevronRight size={10} className="opacity-50" />
                <span className="text-slate-900 font-bold font-sans">Agreements & Consent</span>
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Contracts Hub</h1>
          </div>
          
          <div className="h-8 sm:h-10 w-[1px] bg-slate-200 mx-1 sm:mx-2 hidden xs:block" />

          <div className="relative flex-1 group">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search member, agreement title, ID..."
              className="w-full h-10 sm:h-12 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl pl-10 sm:pl-12 pr-4 text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none h-10 sm:h-12 px-4 sm:px-6 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
             <Mail size={16} /> <span className="hidden sm:inline">Sign Requests</span>
          </button>
          <button className="flex-1 sm:flex-none h-10 sm:h-12 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-indigo-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-200 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2">
             <Plus size={16} /> <span className="hidden sm:inline">Create Agreement</span>
             <span className="sm:hidden">Create</span>
          </button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto w-full">
        {/* ─────────────────────────────────────────
            KPI STRIP
        ───────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <KPICard 
            title="Total Contracts" 
            value="1,492" 
            subtext="Secured digital agreements" 
            icon={FileSignature} 
            color="indigo"
          />
          <KPICard 
            title="Digitally Signed" 
            value="91%" 
            subtext="Compliance completion rate" 
            icon={ShieldCheck} 
            trend={{ value: 3.4, isPositive: true }}
            color="emerald"
          />
          <KPICard 
            title="Pending Signatures" 
            value="64" 
            subtext="Awaiting member action" 
            icon={PenTool} 
            color="amber"
          />
          <KPICard 
            title="Expired / Expiring" 
            value="12" 
            subtext="Requires immediate renewal" 
            icon={FileWarning} 
            trend={{ value: 2, isPositive: false }}
            color="rose"
          />
        </section>

        <div className="agreements-workspace">
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">
          {/* ─────────────────────────────────────────
              LEFT PANEL → CATEGORIES
          ───────────────────────────────────────── */}
          <aside className="w-full lg:w-48 xl:w-64 space-y-6 sm:space-y-8 lg:sticky lg:top-28 shrink-0">
            <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 sm:mb-4 px-2">Contract Categories</h3>
              <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "whitespace-nowrap lg:whitespace-normal lg:w-full text-left px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-between group shrink-0",
                      activeCategory === cat ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <span className="truncate pr-2">{cat}</span>
                    <ChevronRight size={14} className={cn("hidden lg:block transition-all shrink-0", activeCategory === cat ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0")} />
                  </button>
                ))}
              </nav>
            </section>

            <section className="hidden lg:block p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-white border border-slate-100 shadow-sm overflow-hidden relative group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
              <div className="relative z-10">
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2">Automated Compliance</p>
                <h4 className="text-base sm:text-lg font-black text-slate-900 mb-1 leading-tight">Signature Requests</h4>
                <p className="text-[9px] sm:text-[10px] text-slate-500 mb-4 font-bold uppercase tracking-tight">Auto-sent on Registration</p>
                <div className="flex items-center gap-2 mb-4">
                   <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 size={16} />
                   </div>
                   <span className="text-[10px] font-black text-slate-700">Active</span>
                </div>
                <button className="w-full h-9 sm:h-10 rounded-xl bg-slate-50 text-[9px] sm:text-[10px] font-black text-slate-900 uppercase tracking-widest border border-slate-100 hover:bg-slate-100 transition-colors">
                  Configure Settings
                </button>
              </div>
            </section>
          </aside>

          {/* ─────────────────────────────────────────
              CENTER WORKSPACE → AGREEMENT ENGINE
          ───────────────────────────────────────── */}
          <section className="flex-1 w-full min-w-0 space-y-6">
            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-3 sm:p-4 bg-white rounded-[20px] sm:rounded-[24px] border border-slate-100 shadow-sm sticky top-[120px] sm:top-[104px] z-30">
               <div className="flex items-center gap-1 sm:gap-2 p-1 bg-slate-50 rounded-lg sm:rounded-xl overflow-x-auto w-full md:w-auto no-scrollbar">
                 {STATUS_FILTERS.map(status => (
                   <button
                    key={status.value}
                    onClick={() => setActiveStatus(status.value)}
                    className={cn(
                      "whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all",
                      activeStatus === status.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                   >
                     {status.label}
                   </button>
                 ))}
               </div>

               <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                 <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-lg sm:rounded-xl">
                    <button 
                      onClick={() => setViewMode("grid")}
                      className={cn("p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all", viewMode === "grid" ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-600")}
                    >
                      <LayoutGrid size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                    <button 
                      onClick={() => setViewMode("table")}
                      className={cn("p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all", viewMode === "table" ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-600")}
                    >
                      <List size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                 </div>
                 <button className="h-9 sm:h-10 px-3 sm:px-4 rounded-lg sm:rounded-xl border border-slate-200 text-slate-600 font-bold text-[10px] sm:text-xs hover:bg-slate-50 transition-colors flex items-center gap-2">
                    <Filter size={14} className="sm:w-4 sm:h-4" /> Filters
                 </button>
               </div>
            </div>

            {/* RESULTS */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredAgreements.map((agr) => (
                    <motion.article
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={agr.id}
                      className="bg-white rounded-[24px] sm:rounded-[32px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group cursor-pointer flex flex-col"
                      onClick={() => setSelectedAgreement(agr)}
                    >
                      {/* Card Header */}
                      <div className="p-4 sm:p-6 border-b border-slate-50 relative">
                         <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[8px] sm:text-[9px] font-black uppercase tracking-widest max-w-[60%] truncate">
                               <FileText size={10} className="shrink-0" /> <span className="truncate">{agr.type}</span>
                            </div>
                            <div className="flex items-center gap-2">
                               {getStatusBadge(agr.status)}
                               <button className="p-1 -mr-1 text-slate-400 hover:text-slate-600 transition-colors">
                                 <MoreVertical size={14} />
                               </button>
                            </div>
                         </div>

                         <div>
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-snug mb-1 line-clamp-2" title={agr.title}>{agr.title}</h4>
                            <div className="flex items-center gap-2">
                               <div className="w-5 h-5 rounded-full bg-slate-100 text-[8px] font-black flex items-center justify-center shrink-0">
                                  {agr.memberName.split(' ').map(n=>n[0]).join('')}
                               </div>
                               <p className="text-[10px] font-bold text-slate-500 truncate">{agr.memberName}</p>
                            </div>
                         </div>
                      </div>

                      {/* Card Details */}
                      <div className="p-4 sm:p-6 bg-slate-50/30 flex-1 flex flex-col justify-end space-y-4">
                         <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div>
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Generated</p>
                               <p className="text-[10px] font-bold text-slate-700">{agr.createdDate}</p>
                            </div>
                            <div>
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Valid Until</p>
                               <p className={cn("text-[10px] font-bold", agr.status === 'expired' ? "text-rose-600" : "text-slate-700")}>
                                 {agr.expiryDate || "Indefinite"}
                               </p>
                            </div>
                         </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="p-3 sm:p-4 px-4 sm:px-5 flex items-center justify-between border-t border-slate-50 group-hover:bg-indigo-600 transition-colors">
                         <span className="text-[8px] sm:text-[9px] font-black text-slate-400 group-hover:text-indigo-200 uppercase tracking-widest truncate max-w-[100px]">{agr.id}</span>
                         <div className="flex items-center gap-1 sm:gap-2">
                            {agr.status === 'pending' && (
                               <button className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-white group-hover:text-indigo-600 text-[10px] font-black uppercase tracking-widest transition-colors hidden sm:block">
                                  Remind
                               </button>
                            )}
                            <button className="p-1.5 sm:p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-white/20 group-hover:text-white transition-colors">
                               <Eye size={14} />
                            </button>
                         </div>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-slate-100 overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 sm:py-5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Agreement Name</th>
                      <th className="px-6 py-4 sm:py-5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Member</th>
                      <th className="px-6 py-4 sm:py-5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Dates</th>
                      <th className="px-6 py-4 sm:py-5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Signature Status</th>
                      <th className="px-6 py-4 sm:py-5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgreements.map((agr) => (
                      <tr 
                        key={agr.id} 
                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        onClick={() => setSelectedAgreement(agr)}
                      >
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50">
                           <p className="text-[11px] sm:text-xs font-black text-slate-900 max-w-[200px] sm:max-w-[250px] truncate">{agr.title}</p>
                           <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 tracking-tight mt-0.5">{agr.type} • {agr.id}</p>
                        </td>
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black shrink-0">
                               {agr.memberName.split(' ').map(n=>n[0]).join('')}
                            </div>
                            <div className="min-w-0">
                               <p className="text-[11px] sm:text-xs font-black text-slate-900 truncate">{agr.memberName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50">
                           <p className="text-[10px] sm:text-[11px] font-bold text-slate-700">Gen: {agr.createdDate}</p>
                           <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-0.5">Exp: {agr.expiryDate || "N/A"}</p>
                        </td>
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50">
                           {getStatusBadge(agr.status)}
                        </td>
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50 text-right">
                           <button className="h-7 sm:h-8 px-3 sm:px-4 rounded-lg bg-slate-900 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                              Review
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Empty State */}
            {filteredAgreements.length === 0 && (
              <div className="bg-white rounded-[32px] sm:rounded-[48px] border-2 border-dashed border-slate-100 p-10 sm:p-20 flex flex-col items-center text-center">
                 <div className="w-16 h-16 sm:w-24 sm:h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                    <FileSignature size={32} className="sm:w-12 sm:h-12" />
                 </div>
                 <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2 tracking-tight">No contracts found</h3>
                 <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-sm mb-6 sm:mb-8">
                    Try adjusting your filters. Legal agreements, waivers, and digital signatures will appear here once created.
                 </p>
                 <button className="h-10 sm:h-12 px-6 sm:px-8 rounded-xl sm:rounded-2xl bg-indigo-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">
                    Reset All Filters
                 </button>
              </div>
            )}
          </section>

          {/* ─────────────────────────────────────────
              RIGHT PANEL → AI & COMPLIANCE
          ───────────────────────────────────────── */}
          <aside className="w-full lg:w-64 xl:w-80 space-y-6 lg:sticky lg:top-28 shrink-0">
             <section className="p-5 sm:p-6 lg:p-8 rounded-[32px] sm:rounded-[40px] bg-slate-900 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 -mr-12 -mt-12 rounded-full blur-3xl" />
                <div className="flex items-center gap-3 mb-5 sm:mb-6">
                   <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center shadow-inner shrink-0">
                      <ShieldCheck size={18} className="text-indigo-400 sm:w-5 sm:h-5" />
                   </div>
                   <h3 className="text-[10px] sm:text-xs lg:text-sm font-black uppercase tracking-widest leading-none">Compliance Alerts</h3>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                   <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <p className="text-[8px] sm:text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Contract Expiry</p>
                      <p className="text-[10px] sm:text-xs font-bold leading-snug">14 PT contracts expiring within the next 10 days.</p>
                   </div>
                   <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <p className="text-[8px] sm:text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">Missing Consent</p>
                      <p className="text-[10px] sm:text-xs font-bold leading-snug">7 new members lack signed injury liability waivers.</p>
                   </div>
                </div>

                <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/10">
                   <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 sm:mb-4">Live Signature Queue</p>
                   <div className="space-y-2 sm:space-y-3">
                      {[
                        { label: "Signed Today", value: 45, color: "bg-emerald-500" },
                        { label: "Awaiting Signature", value: 64, color: "bg-amber-500" },
                        { label: "Expired Pending Renewal", value: 12, color: "bg-rose-500" }
                      ].map((stat, i) => (
                        <div key={i} className="flex items-center justify-between group cursor-default">
                           <div className="flex items-center gap-1.5 sm:gap-2">
                              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", stat.color)} />
                              <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-tight group-hover:text-white transition-colors truncate">{stat.label}</span>
                           </div>
                           <span className="text-[10px] sm:text-xs font-black text-white shrink-0 ml-2">{stat.value}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </section>

             <section className="p-5 sm:p-6 lg:p-8 rounded-[32px] sm:rounded-[40px] bg-white border border-slate-100 shadow-sm overflow-hidden relative group">
                <div className="flex items-center gap-3 mb-5 sm:mb-6 relative z-10">
                   <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 shrink-0">
                      <BarChart3 size={18} className="sm:w-5 sm:h-5" />
                   </div>
                   <h3 className="text-[10px] sm:text-xs lg:text-sm font-black uppercase tracking-widest leading-none">Completion Trends</h3>
                </div>
                
                <div className="flex items-end gap-1.5 h-16 sm:h-20 mb-5 sm:mb-6 relative z-10">
                   {[30, 55, 40, 85, 60, 75, 95].map((h, i) => (
                     <div key={i} className="flex-1 bg-slate-100 rounded-t-md sm:rounded-t-lg hover:bg-indigo-600 transition-all duration-300" style={{ height: `${h}%` }} />
                   ))}
                </div>
                <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center relative z-10">Signatures Collected • 7D</p>
             </section>
          </aside>
        </div>
      </div>
    </div>

      {/* Audit Log Overlay (Bottom) */}
      <footer className="mt-auto bg-white border-t border-slate-200 p-4 px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[8px] sm:text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
         <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-6">
            <span className="flex items-center gap-1.5 sm:gap-2 shrink-0"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Digital Signatures Active</span>
            <span className="flex items-center gap-1.5 sm:gap-2 shrink-0">Contract Vault Encrypted</span>
            <span className="flex items-center gap-1.5 sm:gap-2 shrink-0">eSign Compliant</span>
         </div>
         <div className="flex items-center gap-3 sm:gap-4">
            <button className="hover:text-slate-900 transition-colors">Legal Terms</button>
            <button className="hover:text-slate-900 transition-colors">Audit Logs</button>
            <button className="hover:text-slate-900 transition-colors">Compliance Settings</button>
         </div>
      </footer>

      {/* Agreement Detail Drawer */}
      <AgreementDrawer 
        agreement={selectedAgreement} 
        isOpen={!!selectedAgreement} 
        onClose={() => setSelectedAgreement(null)} 
      />
    </div>
  );
};

export default Agreements;

// ─────────────────────────────────────────
// MOUNT FUNCTION
// ─────────────────────────────────────────
export function mountAgreements() {
  const stage = document.querySelector('[data-stage="agreements"]');
  if (!stage) return null;

  const rootElement = document.createElement("div");
  rootElement.className = "min-h-full";
  stage.replaceChildren(rootElement);

  try {
    const root = createRoot(rootElement);
    root.render(<><Agreements /><BrandFooter /></>);
    return root;
  } catch (err) {
    console.error("Failed to render Agreements UI:", err);
    return null;
  }
}
