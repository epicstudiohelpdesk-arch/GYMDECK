import React, { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
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
  User,
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
  CheckSquare,
  AlertCircle,
  FileCheck,
  History,
  Info,
  ArrowUpRight,
  Fingerprint,
  FileText,
  ScanLine,
  ShieldAlert,
  RotateCw,
  X,
  CreditCard,
  MessageSquare,
  Flame,
  Users
} from "lucide-react";

// ─────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────

const ID_PROOFS_DATA = [
  {
    id: "ID-8842",
    memberId: "GYM-MBR-0428",
    memberName: "Rohan Verma",
    type: "Aadhaar Card",
    idNumber: "XXXX XXXX 4831",
    rawIdNumber: "5421 8890 4831",
    uploadDate: "2026-05-18",
    expiryDate: null,
    status: "pending",
    ocrStatus: "success",
    ocrData: {
      name: "Rohan Verma",
      dob: "28/11/1993",
      idNumber: "5421 8890 4831",
      address: "9 Cedar Park, Indiranagar, Bengaluru"
    },
    uploadedBy: "Self (Mobile App)",
    category: "Aadhaar Verification",
    preview: "https://api.dicebear.com/7.x/shapes/svg?seed=id1"
  },
  {
    id: "ID-8839",
    memberId: "GYM-MBR-0417",
    memberName: "Aisha Khan",
    type: "PAN Card",
    idNumber: "XXXXX 4210 X",
    rawIdNumber: "ABCDE 4210 K",
    uploadDate: "2026-05-15",
    expiryDate: null,
    status: "verified",
    ocrStatus: "success",
    ocrData: {
      name: "Aisha Khan",
      dob: "12/04/1995",
      idNumber: "ABCDE 4210 K",
      address: null
    },
    uploadedBy: "Admin Sneha",
    category: "PAN Verification",
    preview: "https://api.dicebear.com/7.x/shapes/svg?seed=id2"
  },
  {
    id: "ID-8835",
    memberId: "GYM-MBR-0403",
    memberName: "Aarav Sharma",
    type: "Passport",
    idNumber: "ZXXXXX42",
    rawIdNumber: "Z1234542",
    uploadDate: "2026-05-10",
    expiryDate: "2030-10-15",
    status: "expiring",
    ocrStatus: "success",
    ocrData: {
      name: "Aarav Sharma",
      dob: "15/03/1996",
      idNumber: "Z1234542",
      address: "14 Lakeview Avenue, Andheri West, Mumbai"
    },
    uploadedBy: "Admin Ankit",
    category: "Passport Verification",
    preview: "https://api.dicebear.com/7.x/shapes/svg?seed=id3"
  },
  {
    id: "ID-8830",
    memberId: "GYM-MBR-0441",
    memberName: "Siya Mehta",
    type: "Student ID",
    idNumber: "STU/2024/991",
    rawIdNumber: "STU/2024/991",
    uploadDate: "2026-04-20",
    expiryDate: "2026-06-30",
    status: "rejected",
    ocrStatus: "failed",
    ocrData: null,
    uploadedBy: "Admin Sneha",
    category: "Student Membership IDs",
    preview: "https://api.dicebear.com/7.x/shapes/svg?seed=id4"
  }
];

const CATEGORIES = [
  "All KYC",
  "Aadhaar Verification",
  "PAN Verification",
  "Passport Verification",
  "Student Membership IDs",
  "Corporate Employee IDs"
];

const STATUS_FILTERS = [
  { label: "Queue", value: "pending", color: "amber" },
  { label: "Verified", value: "verified", color: "emerald" },
  { label: "Rejected", value: "rejected", color: "rose" },
  { label: "Expiring", value: "expiring", color: "orange" },
  { label: "All", value: "all", color: "slate" }
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

// ─────────────────────────────────────────
// LUXURY PROFILE CARD COMPONENTS
// ─────────────────────────────────────────

const ModernProfileCard = ({ idProof, onClose }) => {
  return (
    <div className="relative w-full max-w-md aspect-[0.7] rounded-[48px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border border-white/10 group">
      {/* Background Portrait Photograph */}
      <div className="absolute inset-0">
        <img 
          src={`https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=1000`} // High-quality editorial portrait placeholder
          alt={idProof.memberName}
          className="w-full h-full object-cover grayscale-[0.2] contrast-[1.1] scale-105 group-hover:scale-100 transition-transform duration-1000"
        />
        {/* Cinematic Atmospheric Haze & Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
      </div>

      {/* Top Controls */}
      <div className="absolute top-8 left-8 right-8 flex justify-between items-center z-20">
        <div className="flex gap-2">
          <div className="px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-emerald-400" />
            Verified Member
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-300"
        >
          <X size={20} />
        </button>
      </div>

      {/* Frosted Glass Overlay (Lower Half) */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-white/5 backdrop-blur-3xl border-t border-white/10 flex flex-col p-8 sm:p-10 justify-end">
        {/* Soft Edge Glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="relative z-10 space-y-6">
          {/* Identity Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter leading-none">
                {idProof.memberName}
              </h2>
              <div className="mt-1 flex items-center justify-center w-5 h-5 rounded-full bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                <CheckCircle2 size={12} fill="currentColor" />
              </div>
            </div>
            <p className="text-sm sm:text-base text-white/60 font-medium leading-relaxed max-w-[90%] tracking-tight">
              Elite athlete and fitness enthusiast focusing on holistic performance and strength conditioning. Part of the Platinum tier membership.
            </p>
          </div>

          {/* Minimal Social Stats Row */}
          <div className="flex items-center gap-8 py-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-white/40" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-white leading-none">1.2k</span>
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Activity</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-white/40" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-white leading-none">184</span>
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Streak</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-white/40" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-white leading-none">A+</span>
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Trust</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-4 pt-2">
            <button className="flex-1 h-14 rounded-full bg-white text-black font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all shadow-[0_8px_24px_-8px_rgba(255,255,255,0.3)]">
              Follow <Plus size={16} />
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

const IDDetailsDrawer = ({ idProof, isOpen, onClose }) => {
  if (!idProof) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dark Blurred Background Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100]"
          />
          
          {/* Centered Modal Container */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 overflow-y-auto pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="pointer-events-auto flex flex-col items-center gap-8 max-w-5xl w-full"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start w-full">
                
                {/* Left: The Luxury Profile Card */}
                <div className="flex justify-center">
                  <ModernProfileCard idProof={idProof} onClose={onClose} />
                </div>

                {/* Right: Technical Verification Details (Integrated with new aesthetic) */}
                <div className="flex-1 space-y-6 self-center h-full flex flex-col justify-center">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Identity Engine</p>
                    <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                      {idProof.type} <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/10 border border-white/10 text-white/60">{idProof.id}</span>
                    </h3>
                  </div>

                  {/* Document Preview (Refined) */}
                  <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black/40 group">
                    <img src={idProof.preview} alt="ID Document" className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <ScanLine size={32} className="text-white/20 animate-pulse" />
                    </div>
                  </div>

                  {/* OCR & Risk Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-3xl bg-white/5 border border-white/10">
                      <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-2">OCR Success</p>
                      <p className="text-xs font-bold text-white/80">{idProof.ocrData?.name || "Detection Failed"}</p>
                      <p className="text-[10px] font-medium text-white/40 mt-1">{idProof.idNumber}</p>
                    </div>
                    <div className="p-5 rounded-3xl bg-white/5 border border-white/10">
                      <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-2">Authenticity</p>
                      <p className="text-xs font-black text-white">99.2%</p>
                      <p className="text-[10px] font-medium text-white/40 mt-1">Verified Format</p>
                    </div>
                  </div>

                  {/* Enhanced Action Bar */}
                  <div className="pt-4 grid grid-cols-2 gap-4">
                    <button className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                      <XCircle size={18} className="text-rose-500" /> Reject
                    </button>
                    <button 
                      onClick={onClose}
                      className="h-14 rounded-2xl bg-emerald-500 text-black font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                    >
                      <ShieldCheck size={18} /> Approve Identity
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

const IDProofs = () => {
  const [viewMode, setViewMode] = useState("grid"); // grid | table | queue
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All KYC");
  const [activeStatus, setActiveStatus] = useState("pending");
  const [selectedID, setSelectedID] = useState(null);

  const filteredIDs = useMemo(() => {
    return ID_PROOFS_DATA.filter(id => {
      const matchesSearch = id.memberName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           id.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           id.memberId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "All KYC" || id.category === activeCategory;
      const matchesStatus = activeStatus === "all" || id.status === activeStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [searchQuery, activeCategory, activeStatus]);

  return (
    <div className="min-h-full bg-[#f8fafc] flex flex-col font-sans selection:bg-indigo-100">
      {/* ─────────────────────────────────────────
          TOP UTILITY HEADER
      ───────────────────────────────────────── */}
      <header className="h-auto sm:h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-4 sm:py-0 flex flex-col sm:flex-row items-center justify-between sticky top-0 z-40 gap-4">
        <div className="flex items-center gap-4 sm:gap-6 flex-1 w-full max-w-2xl">
          <div className="flex flex-col shrink-0">
             <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                <span>Identity</span>
                <ChevronRight size={10} className="opacity-50" />
                <span className="text-slate-900">KYC Verification</span>
             </div>
             <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-none uppercase tracking-[0.1em]">Verification</h1>
          </div>
          
          <div className="h-8 sm:h-10 w-[1px] bg-slate-200 mx-1 sm:mx-2 hidden xs:block" />

          <div className="relative flex-1 group">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search member, ID number, Aadhaar..."
              className="w-full h-10 sm:h-12 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl pl-10 sm:pl-12 pr-4 text-xs sm:text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none h-10 sm:h-12 px-4 sm:px-6 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
             <List size={16} /> <span className="hidden xs:inline">Audit Log</span>
          </button>
          <button className="flex-1 sm:flex-none h-10 sm:h-12 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-indigo-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-200 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2">
             <Upload size={16} /> <span className="hidden xs:inline">Upload ID Proof</span>
             <span className="xs:hidden">Upload</span>
          </button>
        </div>
      </header>

      <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-[1600px] mx-auto w-full">
        {/* ─────────────────────────────────────────
            KPI STRIP
        ───────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <KPICard 
            title="Total Proofs" 
            value="1,842" 
            subtext="Encrypted KYC records" 
            icon={Fingerprint} 
            color="indigo"
          />
          <KPICard 
            title="Verified" 
            value="94.2%" 
            subtext="Compliance completed" 
            icon={ShieldCheck} 
            trend={{ value: 2.1, isPositive: true }}
            color="emerald"
          />
          <KPICard 
            title="Pending" 
            value="42" 
            subtext="Verification queue" 
            icon={Clock3} 
            color="amber"
          />
          <KPICard 
            title="Flagged" 
            value="08" 
            subtext="Requires intervention" 
            icon={ShieldAlert} 
            trend={{ value: 12, isPositive: false }}
            color="rose"
          />
        </section>

        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">
          {/* ─────────────────────────────────────────
              LEFT PANEL → CATEGORIES
          ───────────────────────────────────────── */}
          <aside className="w-full lg:w-48 xl:w-64 space-y-6 sm:space-y-8 lg:sticky lg:top-28 shrink-0">
            <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 sm:mb-4 px-2">KYC Categories</h3>
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
                    {cat}
                    <ChevronRight size={14} className={cn("hidden lg:block transition-all", activeCategory === cat ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0")} />
                  </button>
                ))}
              </nav>
            </section>

            <section className="hidden lg:block p-6 rounded-[32px] bg-white border border-slate-100 shadow-sm overflow-hidden relative group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
              <div className="relative z-10">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Verification AI</p>
                <h4 className="text-lg font-black text-slate-900 mb-1 leading-tight">Smart Extraction Engine</h4>
                <p className="text-[10px] text-slate-400 mb-4 font-bold uppercase tracking-tight">V2.4 Active & Secure</p>
                <div className="flex items-center gap-1.5 mb-4">
                   <div className="flex -space-x-2">
                      {[1,2,3].map(i => <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-slate-200" />)}
                   </div>
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">+ OCR Processing</span>
                </div>
                <button className="w-full h-10 rounded-xl bg-slate-50 text-[10px] font-black text-slate-900 uppercase tracking-widest border border-slate-100 hover:bg-slate-100 transition-colors">
                  System Health
                </button>
              </div>
            </section>
          </aside>

          {/* ─────────────────────────────────────────
              CENTER WORKSPACE → VERIFICATION ENGINE
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
                  {filteredIDs.map((idProof) => (
                    <motion.article
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={idProof.id}
                      className="relative aspect-[0.75] rounded-[32px] sm:rounded-[40px] overflow-hidden bg-slate-900 shadow-2xl group cursor-pointer border border-white/5 hover:border-white/20 transition-all duration-500"
                      onClick={() => setSelectedID(idProof)}
                    >
                      {/* Portrait Background */}
                      <div className="absolute inset-0">
                        <img 
                          src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${idProof.memberName.replace(' ', '')}`} 
                          alt={idProof.memberName} 
                          className="w-full h-full object-cover grayscale-[0.4] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                      </div>

                      {/* Floating Badge */}
                      <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10">
                        <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[8px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                           <div className={cn("w-1.5 h-1.5 rounded-full", idProof.status === 'verified' ? "bg-emerald-400" : "bg-amber-400")} />
                           {idProof.type}
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20">
                             <ArrowUpRight size={14} />
                          </button>
                          <button className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20">
                             <MoreVertical size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Info Overlay (Lower) */}
                      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 bg-black/20 backdrop-blur-md border-t border-white/5 flex flex-col justify-end">
                         <div className="space-y-1 mb-4">
                            <h4 className="text-xl font-black text-white tracking-tighter leading-none">{idProof.memberName}</h4>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">{idProof.memberId}</p>
                         </div>

                         <div className="flex items-center gap-4 py-3 border-t border-white/5">
                            <div className="flex flex-col">
                               <span className="text-[10px] font-black text-white leading-none">{idProof.idNumber}</span>
                               <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest mt-1">ID Ref</span>
                            </div>
                            <div className="flex flex-col">
                               <span className="text-[10px] font-black text-white leading-none">{idProof.ocrStatus}</span>
                               <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest mt-1">OCR Engine</span>
                            </div>
                         </div>

                         <div className="mt-2 flex items-center justify-between">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">
                               {idProof.status === 'verified' ? 'System Validated' : 'Awaiting Review'}
                            </span>
                            <div className="flex -space-x-1.5">
                               {[1,2].map(i => <div key={i} className="w-4 h-4 rounded-full border border-black bg-white/10 backdrop-blur-md" />)}
                            </div>
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
                      <th className="px-6 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Member Identity</th>
                      <th className="px-6 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ID Type</th>
                      <th className="px-6 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ID Number</th>
                      <th className="px-6 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">OCR Status</th>
                      <th className="px-6 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Verification</th>
                      <th className="px-6 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIDs.map((idProof) => (
                      <tr 
                        key={idProof.id} 
                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        onClick={() => setSelectedID(idProof)}
                      >
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                               <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${idProof.memberName.replace(' ', '')}`} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                               <p className="text-xs font-black text-slate-900 truncate">{idProof.memberName}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{idProof.memberId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50">
                           <p className="text-xs font-black text-slate-900">{idProof.type}</p>
                        </td>
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50">
                           <p className="text-[11px] font-black text-slate-700 tracking-widest">{idProof.idNumber}</p>
                        </td>
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50">
                           <div className="flex items-center gap-2">
                              <div className={cn("w-1.5 h-1.5 rounded-full", idProof.ocrStatus === 'success' ? "bg-emerald-500" : "bg-rose-500")} />
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{idProof.ocrStatus}</p>
                           </div>
                        </td>
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50">
                           {getStatusBadge(idProof.status)}
                        </td>
                        <td className="px-6 py-3 sm:py-4 border-b border-slate-50 text-right">
                           <button className="h-8 px-4 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                              Review
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ─────────────────────────────────────────
              RIGHT PANEL → AI & COMPLIANCE
          ───────────────────────────────────────── */}
          <aside className="w-full lg:w-64 xl:w-80 space-y-6 lg:sticky lg:top-28 shrink-0">
             <section className="p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] bg-slate-900 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 -mr-12 -mt-12 rounded-full blur-3xl" />
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center shadow-inner">
                      <ShieldCheck size={20} className="text-indigo-400" />
                   </div>
                   <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest leading-none">Security AI</h3>
                </div>
                
                <div className="space-y-4">
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Queue Health</p>
                      <p className="text-xs font-bold leading-snug">8 Aadhaar uploads failed OCR verification due to low image quality.</p>
                   </div>
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">Missing KYC</p>
                      <p className="text-xs font-bold leading-snug">5 new members still missing valid identity documentation.</p>
                   </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/10">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Live Identity Pulse</p>
                   <div className="space-y-3">
                      {[
                        { label: "Verified Today", value: 12, color: "bg-emerald-500" },
                        { label: "Pending Scan", value: 42, color: "bg-amber-500" },
                        { label: "Fraud Flagged", value: 0, color: "bg-rose-500" }
                      ].map((stat, i) => (
                        <div key={i} className="flex items-center justify-between group cursor-default">
                           <div className="flex items-center gap-2">
                              <div className={cn("w-1.5 h-1.5 rounded-full", stat.color)} />
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight group-hover:text-white transition-colors">{stat.label}</span>
                           </div>
                           <span className="text-xs font-black text-white">{stat.value}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </section>

             <section className="p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] bg-white border border-slate-100 shadow-sm overflow-hidden relative group">
                <div className="flex items-center gap-3 mb-6 relative z-10">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 shrink-0">
                      <BarChart3 size={20} />
                   </div>
                   <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest leading-none">KYC Trends</h3>
                </div>
                
                <div className="flex items-end gap-1.5 h-20 mb-6 relative z-10">
                   {[60, 45, 80, 55, 90, 65, 85].map((h, i) => (
                     <div key={i} className="flex-1 bg-slate-100 rounded-t-lg hover:bg-indigo-600 transition-all duration-300" style={{ height: `${h}%` }} />
                   ))}
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center relative z-10">Verification Traffic • 7D</p>
             </section>
          </aside>
        </div>
      </main>

      {/* Audit Log Overlay (Bottom) */}
      <footer className="mt-auto bg-white border-t border-slate-200 p-4 px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
         <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-6">
            <span className="flex items-center gap-2 shrink-0"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Identity Secure</span>
            <span className="flex items-center gap-2 shrink-0">End-to-End Encrypted</span>
            <span className="flex items-center gap-2 shrink-0">Audit-Ready Protocol Active</span>
         </div>
         <div className="flex items-center gap-4">
            <button className="hover:text-slate-900 transition-colors">Compliance Policy</button>
            <button className="hover:text-slate-900 transition-colors">System Logs</button>
            <button className="hover:text-slate-900 transition-colors">Secure Export</button>
         </div>
      </footer>

      {/* ID Detail Drawer */}
      <IDDetailsDrawer 
        idProof={selectedID} 
        isOpen={!!selectedID} 
        onClose={() => setSelectedID(null)} 
      />
    </div>
  );
};

export default IDProofs;

// ─────────────────────────────────────────
// MOUNT FUNCTION
// ─────────────────────────────────────────
export function mountIDProofs() {
  const stage = document.querySelector('[data-stage="id-proofs"]');
  if (!stage) return null;

  const rootElement = document.createElement("div");
  rootElement.className = "min-h-full";
  stage.replaceChildren(rootElement);

  try {
    const root = createRoot(rootElement);
    root.render(<IDProofs />);
    return root;
  } catch (err) {
    console.error("Failed to render ID Proofs UI:", err);
    return null;
  }
}
