import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Filter,
  LayoutGrid,
  List,
  MoreVertical,
  QrCode,
  Search,
  ShieldAlert,
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
const cn = (...classes) => classes.filter(Boolean).join(" ");

// ─────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────
const LIVE_FEED = [
  { id: "LOG-01", type: "success", member: "Aarav Sharma", idCode: "MBR-0142", time: "Just now", plan: "Annual Elite", avatar: "1" },
  { id: "LOG-02", type: "warning", member: "Priya Desai", idCode: "MBR-0899", time: "2 min ago", message: "Expires in 3 days", avatar: "2" },
  { id: "LOG-03", type: "trainer", member: "Ankit Kumar", idCode: "TRN-005", time: "5 min ago", message: "Started PT Session", avatar: "3" },
  { id: "LOG-04", type: "error", member: "Kabir Singh", idCode: "MBR-0319", time: "12 min ago", message: "Access Denied: Frozen", avatar: "4" },
  { id: "LOG-05", type: "success", member: "Sneha Patel", idCode: "MBR-0721", time: "15 min ago", plan: "Monthly Starter", avatar: "5" },
];

const ATTENDANCE_TABLE = [
  { id: "ATT-104", time: "09:42 AM", name: "Rahul Verma", mId: "MBR-0211", plan: "Student Basic", status: "success", duration: "1h 15m", trainer: "-", branch: "Main" },
  { id: "ATT-103", time: "09:30 AM", name: "Meera Nair", mId: "MBR-0521", plan: "Quarterly Transformation", status: "warning", duration: "Active", trainer: "Sneha Patel", branch: "Main" },
  { id: "ATT-102", time: "09:15 AM", name: "Siddharth Rao", mId: "MBR-0912", plan: "Corporate Wellness", status: "success", duration: "Active", trainer: "-", branch: "Main" },
  { id: "ATT-101", time: "08:50 AM", name: "Ananya Iyer", mId: "MBR-0721", plan: "Monthly Starter", status: "error", message: "Unpaid Dues", duration: "-", trainer: "-", branch: "Main" },
  { id: "ATT-100", time: "08:15 AM", name: "Vikram Malhotra", mId: "MBR-0842", plan: "Premium Elite", status: "success", duration: "2h 10m", trainer: "Ankit Kumar", branch: "Main" },
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
      {Icon && <Icon className="absolute -right-2 -bottom-2 w-16 h-16 opacity-5" />}
      <div className="flex justify-between items-start">
        <span className="block text-[10px] font-black uppercase tracking-[0.14em] opacity-80">{label}</span>
        {change && (
          <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
            <ArrowUpRight size={10} />
            {change}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <strong className="block truncate text-2xl font-black leading-none tracking-tight">{value}</strong>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// CHECK-IN GATEWAY
// ─────────────────────────────────────────
function InstantCheckIn({ onCheckIn }) {
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState("idle");

  const handleScan = (e) => {
    e.preventDefault();
    if (!inputValue) return;
    if (inputValue.toLowerCase().includes("fail")) {
      setStatus("error");
    } else {
      setStatus("success");
      onCheckIn(inputValue);
    }
    setTimeout(() => {
      setStatus("idle");
      setInputValue("");
    }, 2500);
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between h-full border border-slate-800">
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-12 -mt-12" />
      
      <div>
        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-1">
          <Zap size={16} className="text-indigo-400" /> Instant Access Gateway
        </h2>
        <p className="text-[10px] font-bold text-slate-400">Scan QR, RFID, or enter Member ID for live validation</p>
      </div>

      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.form 
            key="idle" 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            onSubmit={handleScan} className="mt-6"
          >
            <div className="relative flex items-center">
              <div className="absolute left-4 w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-slate-400">
                <QrCode size={14} />
              </div>
              <input 
                autoFocus
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Awaiting scan input..." 
                className="w-full h-16 rounded-xl bg-slate-950 border border-slate-700 pl-14 pr-24 text-base font-bold text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600 shadow-inner"
              />
              <button type="submit" className="absolute right-2 h-12 px-6 rounded-lg bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-500 transition-colors shadow-lg">
                Verify
              </button>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="button" className="flex-1 h-10 rounded-xl border border-slate-700 bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                <Smartphone size={14} /> Manual Entry
              </button>
              <button type="button" className="flex-1 h-10 rounded-xl border border-slate-700 bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                <Users size={14} /> Batch Entry
              </button>
            </div>
          </motion.form>
        )}

        {status === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mt-6 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <Check size={28} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-emerald-400 uppercase tracking-tight leading-none">Access Granted</h3>
              <p className="text-xs font-bold text-slate-300 mt-1">Rahul Verma · MBR-0211 · Student Basic</p>
            </div>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mt-6 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
                <X size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-400 uppercase tracking-tight leading-none">Access Denied</h3>
                <p className="text-[10px] font-bold text-rose-300 mt-1">Unpaid Dues Conflict (₹2,499)</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 h-10 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition-all">Settle Fees</button>
              <button className="px-5 h-10 rounded-xl border border-rose-500/30 text-rose-300 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all">Staff Override</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────
// ACTIVITY FEED
// ─────────────────────────────────────────
function LiveFeed() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-enterprise border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <Activity size={14} className="text-emerald-500" /> Real-Time Activity Feed
        </h3>
        <div className="flex gap-1.5 items-center">
           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Live</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-hide">
        {LIVE_FEED.map((log) => (
          <div key={log.id} className="flex gap-3 items-start group relative transition-all hover:translate-x-1">
            <div className="w-10 h-10 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-200 shadow-sm">
              <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${log.avatar}`} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-900 truncate">{log.member}</span>
                <span className="text-[9px] font-bold text-slate-400 shrink-0">{log.time}</span>
              </div>
              
              {log.type === "success" && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 size={10} className="text-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Access Granted • {log.plan}</span>
                </div>
              )}
              {log.type === "warning" && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock size={10} className="text-amber-500" />
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">{log.message}</span>
                </div>
              )}
              {log.type === "error" && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <XCircle size={10} className="text-rose-500" />
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">{log.message}</span>
                </div>
              )}
              {log.type === "trainer" && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <UserCheck size={10} className="text-indigo-500" />
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight">{log.message}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────
const DailyCheckinPage = () => {
  const handleCheckIn = useCallback((val) => {
    // Gate Validation logic here
  }, []);

  return (
    <div className="min-h-full font-sans text-slate-950 bg-slate-50/30 flex flex-col">
      {/* Utility Header - No Logo */}
      <header className="sticky top-0 z-40 h-[64px] bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            Attendance <ChevronRight size={12} className="text-slate-300" /> <span className="text-slate-950">Daily Check-In</span>
          </div>
        </div>
        <div className="flex-1 max-w-lg mx-8">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
            <input type="text" placeholder="Scan QR, RFID, or search ID, phone..." className="w-full h-10 bg-slate-100 border border-transparent rounded-xl pl-10 pr-4 text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all shadow-inner" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"><QrCode size={16} /> Scan QR</button>
          <button className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"><Smartphone size={16} /> Manual</button>
          <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all shadow-sm"><Bell size={18} /></button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-[1600px] mx-auto w-full space-y-8">
        
        {/* KPI Strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatTile label="Today Total" value="142" tone="indigo" icon={Users} change="12%" />
          <StatTile label="Inside Now" value="48" tone="emerald" icon={Activity} />
          <StatTile label="Peak Traffic" value="78" tone="blue" icon={TrendingUp} />
          <StatTile label="Invalid Denials" value="4" tone="rose" icon={ShieldAlert} />
          <StatTile label="PT Active" value="12" tone="blue" icon={UserCheck} />
          <StatTile label="Avg Duration" value="1h 20m" tone="amber" icon={Timer} />
        </section>

        {/* Operational Workspace */}
        <section className="grid lg:grid-cols-[1.6fr_1fr] gap-8 min-h-[300px]">
          <InstantCheckIn onCheckIn={handleCheckIn} />
          <LiveFeed />
        </section>

        {/* Enterprise Log Table */}
        <section className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-enterprise flex flex-col min-h-[450px]">
          <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
             <div className="flex gap-4">
                <button className="h-9 px-5 rounded-xl bg-slate-950 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-900/20">Check-in Logs</button>
                <button className="h-9 px-5 rounded-xl bg-transparent text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-950 hover:bg-slate-50 transition-all">Trainer Entry</button>
                <button className="h-9 px-5 rounded-xl bg-transparent text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all">Denied (4)</button>
             </div>
             <button className="h-10 px-5 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-all">
               <Download size={14} /> Export Dataset
             </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Entry Time</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Member Entity</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Product & Trainer</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Floor Status</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Validation</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ATTENDANCE_TABLE.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-4 text-xs font-black text-slate-900 whitespace-nowrap">{row.time}</td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 shadow-sm">
                           <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${row.mId}`} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-sm font-black text-slate-950 truncate">{row.name}</span>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{row.mId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                       <span className="block text-xs font-black text-slate-900">{row.plan}</span>
                       <span className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-1">{row.trainer !== "-" ? `Personal: ${row.trainer}` : "Standard Access"}</span>
                    </td>
                    <td className="px-8 py-4">
                       {row.duration === "Active" ? (
                         <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-[10px] font-black text-emerald-600 border border-emerald-100/50 shadow-inner">
                           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-glow shadow-emerald-500/40" /> ACTIVE
                         </span>
                       ) : (
                         <span className="text-xs font-bold text-slate-600">{row.duration} Session</span>
                       )}
                    </td>
                    <td className="px-8 py-4">
                      {row.status === "success" && <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 shadow-sm">Granted</span>}
                      {row.status === "warning" && <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100 shadow-sm">Flagged</span>}
                      {row.status === "error" && <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100 shadow-sm" title={row.message}>Blocked</span>}
                    </td>
                    <td className="px-8 py-4 text-right">
                       <button className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all group-hover:shadow-sm">
                          <MoreVertical size={16} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
};

import { ErrorBoundary } from "./ErrorHandlers.jsx";

// ─────────────────────────────────────────
// MOUNT
// ─────────────────────────────────────────
export function mountDailyCheckin() {
  const stage = document.querySelector('[data-stage="daily-checkin"]');
  if (!stage) return null;

  const rootElement = document.createElement("div");
  rootElement.dataset.dailyCheckinReactRoot = "";
  rootElement.className = "min-h-full h-full";
  stage.replaceChildren(rootElement);

  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <DailyCheckinPage />
      </ErrorBoundary>
    );
    return root;
  } catch (err) {
    console.error("Failed to render Daily Check-in:", err);
    return null;
  }
}

export default DailyCheckinPage;
