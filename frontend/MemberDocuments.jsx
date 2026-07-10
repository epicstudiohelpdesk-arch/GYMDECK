import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Search,
  Plus,
  Filter,
  MoreVertical,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronRight,
  Grid,
  List,
  Upload,
  Calendar,
  User,
  Shield,
  FileCheck,
  History,
  Info,
  ArrowUpRight,
  ShieldCheck,
  FileWarning,
  HardDrive,
  BarChart3,
  MoreHorizontal,
  ChevronDown,
  LayoutGrid,
  Maximize2,
  FilePlus,
  Database,
  SearchCode,
  Zap,
  Clock3,
  CheckSquare
} from "lucide-react";

// ─────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────

const DOCUMENTS_DATA = [
  {
    id: "DOC-001",
    memberId: "GYM-MBR-0428",
    memberName: "Rohan Verma",
    type: "Aadhaar Card",
    fileName: "rohan_aadhaar_front.jpg",
    fileSize: "1.2 MB",
    uploadDate: "2026-05-01",
    expiryDate: "2030-12-31",
    status: "verified",
    uploadedBy: "Admin Ankit",
    category: "ID Proofs",
    preview: "https://api.dicebear.com/7.x/shapes/svg?seed=doc1"
  },
  {
    id: "DOC-002",
    memberId: "GYM-MBR-0417",
    memberName: "Aisha Khan",
    type: "Medical Certificate",
    fileName: "aisha_medical_clearance.pdf",
    fileSize: "2.4 MB",
    uploadDate: "2026-05-10",
    expiryDate: "2026-05-25",
    status: "expiring",
    uploadedBy: "Admin Sneha",
    category: "Medical Records",
    preview: "https://api.dicebear.com/7.x/shapes/svg?seed=doc2"
  },
  {
    id: "DOC-003",
    memberId: "GYM-MBR-0403",
    memberName: "Aarav Sharma",
    type: "Membership Agreement",
    fileName: "aarav_agreement_signed.pdf",
    fileSize: "3.1 MB",
    uploadDate: "2026-05-15",
    expiryDate: "2027-05-15",
    status: "pending",
    uploadedBy: "Admin Ankit",
    category: "Agreements",
    preview: "https://api.dicebear.com/7.x/shapes/svg?seed=doc3"
  },
  {
    id: "DOC-004",
    memberId: "GYM-MBR-0441",
    memberName: "Siya Mehta",
    type: "PAN Card",
    fileName: "siya_pan.png",
    fileSize: "0.8 MB",
    uploadDate: "2026-04-20",
    expiryDate: null,
    status: "verified",
    uploadedBy: "Admin Sneha",
    category: "ID Proofs",
    preview: "https://api.dicebear.com/7.x/shapes/svg?seed=doc4"
  },
  {
    id: "DOC-005",
    memberId: "GYM-MBR-0428",
    memberName: "Rohan Verma",
    type: "PT Liability Waiver",
    fileName: "rohan_waiver.pdf",
    fileSize: "1.5 MB",
    uploadDate: "2026-05-18",
    expiryDate: "2027-05-18",
    status: "rejected",
    uploadedBy: "Admin Ankit",
    category: "PT Waivers",
    preview: "https://api.dicebear.com/7.x/shapes/svg?seed=doc5"
  }
];

const CATEGORIES = [
  "All Documents",
  "ID Proofs",
  "Medical Records",
  "Membership Agreements",
  "PT Waivers",
  "Payment Documents",
  "Transformation Photos"
];

const STATUS_FILTERS = [
  { label: "All", value: "all", color: "slate" },
  { label: "Verified", value: "verified", color: "emerald" },
  { label: "Pending", value: "pending", color: "amber" },
  { label: "Expiring", value: "expiring", color: "orange" },
  { label: "Rejected", value: "rejected", color: "rose" }
];

// ─────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────
const cn = (...classes) => classes.filter(Boolean).join(" ");

const getStatusBadge = (status) => {
  switch (status) {
    case "verified":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
          <CheckCircle2 size={12} /> Verified
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
          <Clock size={12} /> Pending
        </span>
      );
    case "expiring":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-100 animate-pulse">
          <AlertCircle size={12} /> Expiring
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
  <article className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
    <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-5 group-hover:opacity-10 transition-opacity", `bg-${color}-500`)} />
    <div className="flex justify-between items-start mb-4">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", `bg-${color}-50 text-${color}-600`)}>
        <Icon size={24} />
      </div>
      {trend && (
        <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg", trend.isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
          {trend.isPositive ? "+" : "-"}{trend.value}%
        </span>
      )}
    </div>
    <div>
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 leading-none mb-1 tracking-tight">{value}</h3>
      <p className="text-[11px] text-slate-500 font-medium">{subtext}</p>
    </div>
  </article>
);

// ─────────────────────────────────────────
// LUXURY PROFILE CARD COMPONENTS
// ─────────────────────────────────────────

const ModernProfileCard = ({ doc, onClose }) => {
  return (
    <div className="relative w-full max-w-md aspect-[0.7] rounded-[48px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border border-white/10 group">
      {/* Background Portrait Photograph */}
      <div className="absolute inset-0">
        <img 
          src={`https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=1000`} // Another high-quality placeholder
          alt={doc.memberName}
          className="w-full h-full object-cover grayscale-[0.2] contrast-[1.1] scale-105 group-hover:scale-100 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
      </div>

      {/* Top Controls */}
      <div className="absolute top-8 left-8 right-8 flex justify-between items-center z-20">
        <div className="flex gap-2">
          <div className="px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
            <FileCheck size={12} className="text-emerald-400" />
            Verified Profile
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-300"
        >
          <X size={20} />
        </button>
      </div>

      {/* Frosted Glass Overlay */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-white/5 backdrop-blur-3xl border-t border-white/10 flex flex-col p-8 sm:p-10 justify-end">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="relative z-10 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter leading-none">
                {doc.memberName}
              </h2>
              <div className="mt-1 flex items-center justify-center w-5 h-5 rounded-full bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                <ShieldCheck size={12} fill="currentColor" />
              </div>
            </div>
            <p className="text-sm sm:text-base text-white/60 font-medium leading-relaxed max-w-[90%] tracking-tight">
              Premium member with active infrastructure access. Validated identity for enterprise gym operations.
            </p>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-8 py-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-white/40" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-white leading-none">{doc.fileSize}</span>
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Data Load</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <History size={14} className="text-white/40" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-white leading-none">12d</span>
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Lifecycle</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-white/40" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-white leading-none">High</span>
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Tier</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button className="flex-1 h-14 rounded-full bg-white text-black font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all shadow-[0_8px_24px_-8px_rgba(255,255,255,0.3)]">
              Follow Member <Plus size={16} />
            </button>
            <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all">
              <MessageSquare size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DocumentDrawer = ({ doc, isOpen, onClose }) => {
  if (!doc) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100]"
          />
          
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 overflow-y-auto pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="pointer-events-auto flex flex-col items-center gap-8 max-w-5xl w-full"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start w-full">
                
                <div className="flex justify-center">
                  <ModernProfileCard doc={doc} onClose={onClose} />
                </div>

                <div className="flex-1 space-y-6 self-center h-full flex flex-col justify-center">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Document Engine</p>
                    <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                      {doc.type} <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/10 border border-white/10 text-white/60">{doc.id}</span>
                    </h3>
                  </div>

                  <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black/40 group">
                    <img src={doc.preview} alt="Document" className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <ScanLine size={32} className="text-white/20 animate-pulse" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-3xl bg-white/5 border border-white/10">
                      <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-2">File Info</p>
                      <p className="text-xs font-bold text-white/80 truncate">{doc.fileName}</p>
                      <p className="text-[10px] font-medium text-white/40 mt-1">{doc.fileSize}</p>
                    </div>
                    <div className="p-5 rounded-3xl bg-white/5 border border-white/10">
                      <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-2">Expiry Date</p>
                      <p className="text-xs font-black text-white">{doc.expiryDate || "Lifetime"}</p>
                      <p className="text-[10px] font-medium text-white/40 mt-1">Verified Protocol</p>
                    </div>
                  </div>

                  <div className="pt-4 grid grid-cols-2 gap-4">
                    <button className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                      <Download size={18} /> Download
                    </button>
                    <button 
                      onClick={onClose}
                      className="h-14 rounded-2xl bg-indigo-500 text-white font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:bg-indigo-400 transition-all flex items-center justify-center gap-2"
                    >
                      <FileCheck size={18} /> Verify Document
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

const MemberDocuments = () => {
  const [viewMode, setViewMode] = useState("grid"); // grid | table
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Documents");
  const [activeStatus, setActiveStatus] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState(null);

  const filteredDocs = useMemo(() => {
    return DOCUMENTS_DATA.filter(doc => {
      const matchesSearch = doc.memberName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           doc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           doc.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "All Documents" || doc.category === activeCategory;
      const matchesStatus = activeStatus === "all" || doc.status === activeStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [searchQuery, activeCategory, activeStatus]);

  return (
    <div className="member-documents-shell font-sans text-slate-900 selection:bg-indigo-100">
      {/* ─────────────────────────────────────────
          TOP UTILITY HEADER
      ───────────────────────────────────────── */}
      <header className="relative z-50 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-6 flex-1 w-full max-w-2xl">
          <div className="flex flex-col shrink-0">
             <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                <span>Docs</span>
                <ChevronRight size={10} className="opacity-50" />
                <span className="text-slate-900 font-bold font-sans">Member Documents</span>
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Infrastructure</h1>
          </div>
          
          <div className="h-8 sm:h-10 w-[1px] bg-slate-200 mx-1 sm:mx-2 hidden xs:block" />

          <div className="relative flex-1 group">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search documents..."
              className="w-full h-10 sm:h-12 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl pl-10 sm:pl-12 pr-4 text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none h-10 sm:h-12 px-4 sm:px-6 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
             <Upload size={16} /> <span className="hidden xs:inline">Bulk</span>
          </button>
          <button className="flex-1 sm:flex-none h-10 sm:h-12 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-slate-900 text-white font-bold text-xs sm:text-sm shadow-xl shadow-slate-200 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2">
             <Plus size={16} /> <span className="hidden xs:inline">Upload</span>
             <span className="xs:hidden">Add</span>
          </button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto w-full">
        {/* ─────────────────────────────────────────
            KPI STRIP
        ───────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <KPICard 
            title="Stored" 
            value="2.4k" 
            subtext="Encrypted records" 
            icon={HardDrive} 
            color="slate"
          />
          <KPICard 
            title="Queue" 
            value="42" 
            subtext="Pending review" 
            icon={Clock3} 
            trend={{ value: 12, isPositive: false }}
            color="amber"
          />
          <KPICard 
            title="Expiring" 
            value="18" 
            subtext="Alerts active" 
            icon={FileWarning} 
            color="orange"
          />
          <KPICard 
            title="Accuracy" 
            value="98%" 
            subtext="AI verification" 
            icon={Zap} 
            trend={{ value: 0.8, isPositive: true }}
            color="indigo"
          />
        </section>

        <div className="member-documents-workspace">
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">
          {/* ─────────────────────────────────────────
              LEFT PANEL → CATEGORIES
          ───────────────────────────────────────── */}
          <aside className="w-full lg:w-48 xl:w-64 space-y-6 sm:space-y-8 lg:sticky lg:top-28 shrink-0">
            <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 sm:mb-4 px-2">Compliance Categories</h3>
              <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "whitespace-nowrap lg:whitespace-normal lg:w-full text-left px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-between group shrink-0",
                      activeCategory === cat ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {cat}
                    <ChevronRight size={14} className={cn("hidden lg:block transition-all", activeCategory === cat ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0")} />
                  </button>
                ))}
              </nav>
            </section>

            <section className="hidden lg:block p-6 rounded-[32px] bg-indigo-900 text-white overflow-hidden relative group">
              <Database className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 group-hover:scale-110 transition-transform duration-500" />
              <div className="relative z-10">
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">Storage Usage</p>
                <h4 className="text-xl font-black mb-1">84.2 GB</h4>
                <p className="text-[10px] text-indigo-200 mb-4 font-bold opacity-80 uppercase tracking-tight">of 500 GB Secured Cloud</p>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2">
                   <div className="h-full bg-white rounded-full" style={{ width: '16.8%' }} />
                </div>
                <button className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                  Manage Storage <ArrowUpRight size={12} />
                </button>
              </div>
            </section>
          </aside>

          {/* ─────────────────────────────────────────
              CENTER WORKSPACE → DOCUMENT ENGINE
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
                      className={cn("p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all", viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                    >
                      <LayoutGrid size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                    <button 
                      onClick={() => setViewMode("table")}
                      className={cn("p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-all", viewMode === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredDocs.map((doc) => (
                    <motion.article
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={doc.id}
                      className="bg-white rounded-[24px] sm:rounded-[32px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all group cursor-pointer"
                      onClick={() => setSelectedDoc(doc)}
                    >
                      {/* Card Preview */}
                      <div className="aspect-[16/10] bg-slate-50 relative overflow-hidden">
                        <img 
                          src={doc.preview} 
                          alt={doc.fileName} 
                          className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" 
                        />
                        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
                          {getStatusBadge(doc.status)}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 sm:p-6">
                           <button className="w-full h-10 sm:h-11 bg-white rounded-lg sm:rounded-xl text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10 active:scale-95 transition-transform">
                              <Eye size={16} /> View Details
                           </button>
                        </div>
                      </div>

                      {/* Card Info */}
                      <div className="p-4 sm:p-6">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                              <FileText size={18} className="sm:w-5 sm:h-5" />
                           </div>
                           <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">{doc.type}</h4>
                              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{doc.memberName}</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4 pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-slate-50">
                           <div>
                              <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Upload</p>
                              <p className="text-[10px] sm:text-[11px] font-bold text-slate-700">{doc.uploadDate}</p>
                           </div>
                           <div>
                              <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Expiry</p>
                              <p className={cn("text-[10px] sm:text-[11px] font-bold", doc.status === 'expiring' ? "text-rose-600" : "text-slate-700")}>
                                {doc.expiryDate || "N/A"}
                              </p>
                           </div>
                        </div>

                        <div className="flex items-center justify-between">
                           <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tight truncate mr-2">{doc.fileSize} • {doc.category}</span>
                           <button className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0">
                             <MoreVertical size={16} className="sm:w-[18px] sm:h-[18px]" />
                           </button>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-slate-100 overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Member</th>
                      <th className="px-6 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Document Type</th>
                      <th className="px-6 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Upload Date</th>
                      <th className="px-6 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Expiry</th>
                      <th className="px-6 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                      <th className="px-6 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((doc) => (
                      <tr 
                        key={doc.id} 
                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        onClick={() => setSelectedDoc(doc)}
                      >
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 text-[10px] font-black shrink-0">
                               {doc.memberName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="min-w-0">
                               <p className="text-xs font-black text-slate-900 truncate">{doc.memberName}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{doc.memberId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50">
                           <p className="text-xs font-black text-slate-900">{doc.type}</p>
                           <p className="text-[10px] font-bold text-slate-400 tracking-tight truncate max-w-[150px]">{doc.fileName}</p>
                        </td>
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50">
                           <p className="text-xs font-bold text-slate-700">{doc.uploadDate}</p>
                        </td>
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50">
                           <p className={cn("text-xs font-bold", doc.status === 'expiring' ? "text-rose-600" : "text-slate-700")}>
                             {doc.expiryDate || "—"}
                           </p>
                        </td>
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50">
                           {getStatusBadge(doc.status)}
                        </td>
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50 text-right">
                           <div className="flex items-center justify-end gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-1.5 sm:p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-indigo-600 transition-all">
                                <Eye size={16} />
                              </button>
                              <button className="p-1.5 sm:p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-indigo-600 transition-all">
                                <Download size={16} />
                              </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty State */}
            {filteredDocs.length === 0 && (
              <div className="bg-white rounded-[32px] sm:rounded-[48px] border-2 border-dashed border-slate-100 p-10 sm:p-20 flex flex-col items-center text-center">
                 <div className="w-16 h-16 sm:w-24 sm:h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                    <SearchCode size={32} className="sm:w-12 sm:h-12" />
                 </div>
                 <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2 tracking-tight">No document records found</h3>
                 <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-sm mb-6 sm:mb-8">
                    Try adjusting your filters or search terms. Member records, IDs, and compliance documents will appear here once uploaded.
                 </p>
                 <button className="h-10 sm:h-12 px-6 sm:px-8 rounded-xl sm:rounded-2xl bg-indigo-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">
                    Reset All Filters
                 </button>
              </div>
            )}
          </section>

          {/* ─────────────────────────────────────────
              RIGHT PANEL → AI INSIGHTS
          ───────────────────────────────────────── */}
          <aside className="w-full lg:w-64 xl:w-80 space-y-6 lg:sticky lg:top-28 shrink-0">
             <section className="p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] bg-white border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 -mr-12 -mt-12 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                      <ShieldCheck size={20} />
                   </div>
                   <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Compliance AI</h3>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                   <div className="p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-colors">
                      <p className="text-[9px] sm:text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Active Alert</p>
                      <p className="text-xs font-bold text-slate-900 leading-snug">12 medical certificates expiring within 15 days.</p>
                   </div>
                   <div className="p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-colors">
                      <p className="text-[9px] sm:text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Queue Priority</p>
                      <p className="text-xs font-bold text-slate-900 leading-snug">Aadhaar verification pending for 7 new members.</p>
                   </div>
                </div>

                <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-slate-50">
                   <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Live Verification Status</p>
                   <div className="space-y-3">
                      {[
                        { label: "Approved Today", value: 124, color: "bg-emerald-500" },
                        { label: "Pending Review", value: 42, color: "bg-amber-500" },
                        { label: "Rejected Docs", value: 8, color: "bg-rose-500" }
                      ].map((stat, i) => (
                        <div key={i} className="flex items-center justify-between group cursor-default">
                           <div className="flex items-center gap-2">
                              <div className={cn("w-1.5 h-1.5 rounded-full", stat.color)} />
                              <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-tight group-hover:text-slate-900 transition-colors">{stat.label}</span>
                           </div>
                           <span className="text-xs font-black text-slate-900">{stat.value}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </section>

             <section className="p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] bg-slate-900 text-white shadow-xl shadow-slate-200 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6 relative z-10">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
                      <BarChart3 size={20} />
                   </div>
                   <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest leading-none">Growth Trends</h3>
                </div>
                
                <div className="flex items-end gap-1 sm:gap-2 h-20 sm:h-24 mb-6 relative z-10">
                   {[40, 65, 45, 90, 55, 75, 85].map((h, i) => (
                     <div key={i} className="flex-1 bg-white/10 rounded-t-md sm:rounded-t-lg hover:bg-indigo-500 transition-all" style={{ height: `${h}%` }} />
                   ))}
                </div>
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center relative z-10">Upload Activity • May</p>
             </section>
          </aside>
        </div>
      </div>
    </div>

      {/* Audit Log Overlay (Bottom) */}
      <footer className="mt-auto bg-white border-t border-slate-200 p-4 px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
         <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-6">
            <span className="flex items-center gap-2 shrink-0"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> System Online</span>
            <span className="flex items-center gap-2 shrink-0">OCR Engine v2.4 Active</span>
            <span className="flex items-center gap-2 shrink-0">AES-256 Encryption Enabled</span>
         </div>
         <div className="flex items-center gap-4">
            <button className="hover:text-slate-900 transition-colors whitespace-nowrap">Documentation</button>
            <button className="hover:text-slate-900 transition-colors whitespace-nowrap">Audit Logs</button>
            <button className="hover:text-slate-900 transition-colors whitespace-nowrap">Privacy</button>
         </div>
      </footer>

      {/* Document Detail Drawer */}
      <DocumentDrawer 
        doc={selectedDoc} 
        isOpen={!!selectedDoc} 
        onClose={() => setSelectedDoc(null)} 
      />
    </div>
  );
};

export default MemberDocuments;

// ─────────────────────────────────────────
// MOUNT FUNCTION
// ─────────────────────────────────────────
export function mountMemberDocuments() {
  const stage = document.querySelector('[data-stage="member-documents"]');
  if (!stage) return null;

  const rootElement = document.createElement("div");
  rootElement.className = "min-h-full";
  stage.replaceChildren(rootElement);

  try {
    const root = createRoot(rootElement);
    root.render(<><MemberDocuments /><BrandFooter /></>);
    return root;
  } catch (err) {
    console.error("Failed to render Member Documents UI:", err);
    return null;
  }
}
