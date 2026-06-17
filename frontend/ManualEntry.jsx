import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  Globe,
  History,
  Info,
  Layers,
  LayoutGrid,
  List,
  Lock,
  MessageSquare,
  MoreVertical,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Timer,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────
// CONSTANTS & FORMATTERS
// ─────────────────────────────────────────
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const cn = (...classes) => classes.filter(Boolean).join(" ");

// ─────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────
const RECENT_ENTRIES = [
  { id: "ME-102", type: "success", member: "Rohan Verma", mId: "MBR-0428", time: "Just now", status: "Access Granted", method: "Manual Entry" },
  { id: "ME-101", type: "override", member: "Aisha Khan", mId: "MBR-0417", time: "5 min ago", status: "Override Granted", method: "Staff Override" },
  { id: "ME-100", type: "visitor", member: "Rahul Sharma", mId: "Visitor", time: "12 min ago", status: "Visitor Pass", method: "Walk-In" },
  { id: "ME-099", type: "error", member: "Karthik Rao", mId: "MBR-0398", time: "25 min ago", status: "Access Denied", method: "Expired" },
];

const SEARCH_RESULTS = [
  { id: "MBR-0428", name: "Rohan Verma", plan: "PT + Strength Plan", status: "Active", expiry: "30 May 2026", dues: 0, avatar: "RV" },
  { id: "MBR-0417", name: "Aisha Khan", plan: "Monthly Fitness", status: "Due", expiry: "17 May 2026", dues: 2499, avatar: "AK" },
];

// ─────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────
function StatTile({ label, value, tone = "slate", icon: Icon, change }) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-950 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    indigo: "bg-indigo-50 text-indigo-800 border-indigo-200",
  }[tone];

  return (
    <div className={cn("min-w-0 rounded-xl border p-4 shadow-sm relative overflow-hidden", toneClass)}>
      {Icon && <Icon className="absolute -right-2 -bottom-2 w-16 h-16 opacity-5 text-current" />}
      <div className="flex justify-between items-start">
        <span className="block text-[10px] font-black uppercase tracking-[0.14em] opacity-80">{label}</span>
        {change && (
          <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
            {change}
          </span>
        )}
      </div>
      <strong className="mt-3 block truncate text-2xl font-black leading-none tracking-tight">{value}</strong>
    </div>
  );
}

function StatusBadge({ className, label }) {
  return (
    <mark className={cn("inline-flex min-h-7 items-center gap-2 rounded-md border px-2.5 text-[11px] font-black not-italic", className)}>
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
      {label}
    </mark>
  );
}

// ─────────────────────────────────────────
// MAIN FALLBACK CONSOLE
// ─────────────────────────────────────────
function ManualEntryConsole({ onMemberSelect }) {
  const [query, setQuery] = useState("");
  const [resultsVisible, setResultsVisible] = useState(false);

  const handleSearch = (e) => {
    setQuery(e.target.value);
    setResultsVisible(e.target.value.length > 2);
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-enterprise border border-slate-200 flex flex-col h-full relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32" />
      
      <div className="relative z-10">
        <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight flex items-center gap-3 mb-1">
           Manual Entry Console
        </h2>
        <p className="text-xs font-bold text-slate-500">Fast-track access fallback for verified members and guests.</p>
      </div>

      <div className="mt-8 relative z-20">
        <label className="block mb-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Member Identification</span>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
              autoFocus
              type="text" 
              value={query}
              onChange={handleSearch}
              placeholder="Enter phone, member ID or full name..." 
              className="w-full h-16 rounded-2xl bg-slate-50 border border-slate-200 pl-12 pr-6 text-base font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-400"
            />
          </div>
        </label>

        <AnimatePresence>
          {resultsVisible && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden py-2 z-30"
            >
              <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Matching Members</span>
                 <span className="text-[9px] font-bold text-slate-500">Search results (2)</span>
              </div>
              {SEARCH_RESULTS.map((res) => (
                <button 
                  key={res.id} 
                  onClick={() => { onMemberSelect(res); setResultsVisible(false); setQuery(""); }}
                  className="w-full px-4 py-4 flex items-center gap-4 hover:bg-indigo-50 transition-colors group text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs border border-slate-200 group-hover:border-indigo-200 group-hover:bg-white transition-all shadow-sm">
                    {res.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-slate-900 truncate">{res.name}</span>
                      <StatusBadge label={res.status} className={res.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"} />
                    </div>
                    <div className="flex gap-3 mt-1">
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{res.id} · {res.plan}</span>
                       <span className="text-[10px] font-bold text-slate-400">Expires: {res.expiry}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-auto pt-8 border-t border-slate-100 flex gap-4">
         <button className="flex-1 h-12 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            <UserPlus size={16} /> Visitor Entry
         </button>
         <button className="flex-1 h-12 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            <ShieldAlert size={16} /> Override Access
         </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// VALIDATION PREVIEW
// ─────────────────────────────────────────
function ValidationPreview({ member, onCheckIn, onReset }) {
  if (!member) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center h-full border-dashed">
         <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 mb-6">
            <Smartphone size={32} />
         </div>
         <h3 className="text-lg font-black text-slate-400 uppercase tracking-tight">Identification Awaiting</h3>
         <p className="text-sm font-semibold text-slate-400 mt-2 max-w-xs leading-relaxed">
            Search and select a member to initiate the manual validation and access flow.
         </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-slate-200 rounded-3xl p-8 shadow-enterprise h-full flex flex-col"
    >
      <div className="flex justify-between items-start mb-8">
         <div className="flex gap-5 items-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xl shadow-sm">
               {member.avatar}
            </div>
            <div>
               <h2 className="text-2xl font-black text-slate-950 tracking-tight leading-none">{member.name}</h2>
               <p className="text-sm font-bold text-slate-500 mt-2">{member.id} · {member.plan}</p>
            </div>
         </div>
         <button onClick={onReset} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
            <X size={24} />
         </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
         <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Membership Valid Through</span>
            <strong className="text-sm font-black text-slate-900">{member.expiry}</strong>
         </div>
         <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Balance</span>
            <strong className={cn("text-sm font-black", member.dues > 0 ? "text-rose-600" : "text-emerald-600")}>
               {member.dues > 0 ? currencyFormatter.format(member.dues) : "No Dues"}
            </strong>
         </div>
      </div>

      <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 mb-auto">
         <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-indigo-600" />
            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Entry Intelligence</span>
         </div>
         <p className="text-xs font-bold text-indigo-900/70 leading-relaxed">
            Member normally checks in at 06:15 PM. Frequency is stable at 4.2 workouts per week. Renewal probability remains high.
         </p>
      </div>

      <div className="mt-8 flex gap-4">
         <button 
           onClick={() => onCheckIn(member)}
           className="flex-1 h-14 rounded-2xl bg-slate-950 text-white text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
         >
           Check-In Member
         </button>
         <button className="h-14 px-6 rounded-2xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all">
            History
         </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────
const ManualEntryPage = () => {
  const [selectedMember, setSelectedMember] = useState(null);

  const handleMemberSelect = useCallback((member) => setSelectedMember(member), []);
  const handleCheckIn = useCallback((m) => {
    console.log("Checked in:", m.id);
    setSelectedMember(null);
  }, []);
  const handleReset = useCallback(() => setSelectedMember(null), []);

  return (
    <div className="min-h-full font-sans text-slate-950 bg-slate-50/30 flex flex-col">
      {/* Utility Header - Professional Fallback Design */}
      <header className="sticky top-0 z-40 h-[64px] bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            Attendance <ChevronRight size={12} className="text-slate-300" /> <span className="text-slate-950">Manual Entry Console</span>
          </div>
        </div>
        <div className="flex-1 max-w-lg mx-8">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
            <input type="text" placeholder="Quick find member to entry..." className="w-full h-10 bg-slate-100 border border-transparent rounded-xl pl-10 pr-4 text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all shadow-inner" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"><History size={16} /> Logs</button>
          <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all shadow-sm"><Bell size={18} /></button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-[1600px] mx-auto w-full space-y-8">
        
        {/* Live Metrics Strip */}
        <section className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-5 gap-4">
          <StatTile label="Manual Entries" value="28" tone="slate" icon={Smartphone} change="+4" />
          <StatTile label="Walk-In Visitors" value="12" tone="blue" icon={UserPlus} />
          <StatTile label="Access Overrides" value="3" tone="rose" icon={ShieldAlert} />
          <StatTile label="Avg Processing" value="42s" tone="amber" icon={Timer} />
          <StatTile label="Staff handling" value="2 Active" tone="indigo" icon={UserCheck} />
        </section>

        {/* Operational Workspace */}
        <section className="grid lg:grid-cols-[1fr_1.1fr] gap-8 min-h-[500px]">
          <ManualEntryConsole onMemberSelect={handleMemberSelect} />
          <ValidationPreview member={selectedMember} onCheckIn={handleCheckIn} onReset={handleReset} />
        </section>

        {/* Feed & Logs Section */}
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
           <section className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-enterprise flex flex-col">
              <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                   <Activity size={14} className="text-emerald-500" /> Live Manual Activity Feed
                </h3>
                <button className="h-8 px-4 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-all">
                  <Download size={12} /> Export Feed
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y divide-slate-50">
                    {RECENT_ENTRIES.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-4">
                           <div className="flex items-center gap-4">
                              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm", 
                                log.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
                                log.type === 'override' ? 'bg-indigo-100 text-indigo-600' :
                                log.type === 'visitor' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600')}>
                                 {log.member.split(' ').map(n=>n[0]).join('')}
                              </div>
                              <div>
                                 <span className="block text-sm font-black text-slate-950">{log.member}</span>
                                 <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">{log.mId}</span>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-4">
                           <span className="block text-xs font-black text-slate-900 uppercase tracking-tight">{log.method}</span>
                           <span className="block text-[10px] font-bold text-slate-400">{log.time}</span>
                        </td>
                        <td className="px-8 py-4 text-right">
                           <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border", 
                              log.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 
                              log.type === 'override' ? 'border-indigo-100 bg-indigo-50 text-indigo-600' :
                              log.type === 'visitor' ? 'border-blue-100 bg-blue-50 text-blue-600' : 'border-rose-100 bg-rose-50 text-rose-600')}>
                              {log.status}
                           </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </section>

           <section className="bg-slate-900 rounded-[32px] p-8 shadow-2xl relative overflow-hidden border border-slate-800">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-12 -mt-12" />
              <div className="flex justify-between items-center mb-6 relative z-10">
                 <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                   <Users size={14} className="text-indigo-400" /> Floor Capacity
                 </h3>
                 <span className="text-[10px] font-black text-indigo-400 uppercase">82 / 120</span>
              </div>
              
              <div className="space-y-6 relative z-10">
                 {[
                   { label: "Weights Area", val: 84, color: "bg-emerald-500" },
                   { label: "Cardio Zone", val: 42, color: "bg-indigo-500" },
                   { label: "Yoga Studio", val: 15, color: "bg-blue-400" },
                   { label: "PT Room", val: 68, color: "bg-amber-500" },
                 ].map(zone => (
                   <div key={zone.label} className="space-y-2">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                         <span>{zone.label}</span>
                         <span>{zone.val}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                         <div className={cn("h-full rounded-full transition-all duration-1000", zone.color)} style={{ width: `${zone.val}%` }} />
                      </div>
                   </div>
                 ))}
              </div>

              <div className="mt-8 p-5 rounded-2xl bg-white/5 border border-white/10 relative z-10">
                 <div className="flex items-center gap-3">
                    <Timer size={20} className="text-indigo-400" />
                    <div>
                       <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Peak Entry Hours</span>
                       <span className="text-sm font-black text-white">05:30 PM — 07:15 PM</span>
                    </div>
                 </div>
              </div>
           </section>
        </div>

      </main>
    </div>
  );
};

import { ErrorBoundary } from "./ErrorHandlers.jsx";

// ─────────────────────────────────────────
// MOUNT
// ─────────────────────────────────────────
export function mountManualEntry() {
  const stage = document.querySelector('[data-stage="manual-entry"]');
  if (!stage) return null;

  const rootElement = document.createElement("div");
  rootElement.dataset.manualEntryReactRoot = "";
  rootElement.className = "min-h-full h-full";
  stage.replaceChildren(rootElement);

  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <ManualEntryPage />
      </ErrorBoundary>
    );
    return root;
  } catch (err) {
    console.error("Failed to render Manual Entry UI:", err);
    return null;
  }
}

export default ManualEntryPage;
