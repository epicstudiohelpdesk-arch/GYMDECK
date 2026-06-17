import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Filter,
  Globe,
  HelpCircle,
  History,
  Info,
  Layers,
  LayoutGrid,
  List,
  Lock,
  MessageSquare,
  MoreVertical,
  Phone,
  PieChart,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Share2,
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
const cn = (...classes) => classes.filter(Boolean).join(" ");

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// ─────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────
const KPI_STATS = [
  { label: "Total Attendance", value: "842", tone: "indigo", icon: Users, change: "+14%", changeType: "positive" },
  { label: "Avg. Duration", value: "72m", tone: "blue", icon: Timer, change: "-3%", changeType: "neutral" },
  { label: "Peak Occupancy", value: "92", tone: "rose", icon: Activity, change: "+8%", changeType: "negative" },
  { label: "Growth Rate", value: "12.4%", tone: "emerald", icon: TrendingUp, change: "+2.1%", changeType: "positive" },
];

const MEMBER_ENGAGEMENT = [
  { name: "Highly Active", count: 428, color: "#10b981", percent: 65 },
  { name: "Moderate", count: 182, color: "#3b82f6", percent: 25 },
  { name: "At Risk", count: 42, color: "#f59e0b", percent: 7 },
  { name: "Inactive", count: 18, color: "#ef4444", percent: 3 },
];

const ATTENDANCE_LOGS = [
  { id: "REP-01", name: "Rohan Verma", mId: "MBR-0428", plan: "Annual Elite", visits: 24, avgWeek: 5.2, lastVisit: "Today", streak: 12, risk: "Low", probability: 94 },
  { id: "REP-02", name: "Aisha Khan", mId: "MBR-0417", plan: "Monthly Fitness", visits: 8, avgWeek: 2.1, lastVisit: "2 days ago", streak: 0, risk: "Medium", probability: 62 },
  { id: "REP-03", name: "Vikram Malhotra", mId: "MBR-0842", plan: "PT + Strength", visits: 42, avgWeek: 6.0, lastVisit: "Today", streak: 28, risk: "Low", probability: 98 },
  { id: "REP-04", name: "Priya Desai", mId: "MBR-0899", plan: "Corporate", visits: 4, avgWeek: 0.8, lastVisit: "8 days ago", streak: 0, risk: "High", probability: 34 },
];

// ─────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────
function StatTile({ label, value, tone = "slate", icon: Icon, change, changeType }) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-950 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    indigo: "bg-indigo-50 text-indigo-800 border-indigo-200",
  }[tone];

  const changeClass = changeType === "positive" ? "text-emerald-600 bg-emerald-50" : changeType === "negative" ? "text-rose-600 bg-rose-50" : "text-slate-600 bg-slate-50";

  return (
    <div className={cn("min-w-0 rounded-2xl border p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md", toneClass)}>
      {Icon && <Icon className="absolute -right-2 -bottom-2 w-20 h-20 opacity-5 text-current" />}
      <div className="flex justify-between items-start relative z-10">
        <span className="block text-[10px] font-black uppercase tracking-[0.15em] opacity-70">{label}</span>
        {change && (
          <span className={cn("flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ring-1 ring-inset ring-current/10", changeClass)}>
            {changeType === "positive" ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {change}
          </span>
        )}
      </div>
      <strong className="mt-4 block truncate text-3xl font-black leading-none tracking-tight relative z-10">{value}</strong>
    </div>
  );
}

// ─────────────────────────────────────────
// DASHBOARD VIEW
// ─────────────────────────────────────────
function DashboardView() {
  return (
    <div className="grid gap-6">
       <div className="grid lg:grid-cols-[1.8fr_1fr] gap-6">
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-enterprise relative overflow-hidden">
             <div className="flex justify-between items-center mb-8">
                <div>
                   <h3 className="text-lg font-black text-slate-950 uppercase tracking-tight">Attendance Velocity</h3>
                   <p className="text-xs font-bold text-slate-500">Real-time check-in volume across the last 24 hours.</p>
                </div>
                <div className="flex rounded-xl bg-slate-100 p-1">
                   <button className="px-4 py-2 rounded-lg bg-white shadow-sm text-[10px] font-black uppercase tracking-wider text-slate-950">Hourly</button>
                   <button className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900">Heatmap</button>
                </div>
             </div>
             <div className="h-[300px] flex items-end gap-3 px-2">
                {[42, 28, 15, 64, 82, 95, 48, 36, 72, 88, 54, 40].map((v, i) => (
                   <div key={i} className="flex-1 group relative">
                      <motion.div initial={{ height: 0 }} animate={{ height: `${v}%` }} transition={{ delay: i * 0.05 }} className={cn("w-full rounded-t-xl transition-all group-hover:brightness-90", i === 5 ? "bg-indigo-500" : "bg-slate-200")} />
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">{v}%</div>
                      <span className="block text-[8px] font-bold text-slate-400 text-center mt-2">{6 + i}:00</span>
                   </div>
                ))}
             </div>
          </div>
          <div className="space-y-6">
             <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl relative overflow-hidden border border-slate-800 h-full">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-6"><Zap size={14} /> AI Attendance Insights</h3>
                <div className="space-y-6">
                   {[
                     { label: "Morning Decline", msg: "Footfall in 6 AM - 8 AM slot dropped 14% this week.", tone: "rose" },
                     { label: "Peak Congestion", msg: "7 PM overcrowding predicted for tomorrow. Suggest session caps.", tone: "amber" },
                     { label: "Inactive Cluster", msg: "24 members haven't visited in 12 days. Churn risk high.", tone: "indigo" },
                   ].map((insight, i) => (
                     <div key={i} className="space-y-2">
                        <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded border", insight.tone === 'rose' ? 'text-rose-400 border-rose-900/50 bg-rose-950/30' : insight.tone === 'amber' ? 'text-amber-400 border-amber-900/50 bg-amber-950/30' : 'text-indigo-400 border-indigo-900/50 bg-indigo-950/30')}>{insight.label}</span>
                        <p className="text-xs font-bold text-slate-300 leading-relaxed">{insight.msg}</p>
                     </div>
                   ))}
                </div>
                <button className="mt-8 w-full h-11 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all">Generate Strategy</button>
             </div>
          </div>
       </div>
       <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-enterprise">
             <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2"><PieChart size={14} className="text-indigo-500" /> Engagement Mix</h3>
             <div className="space-y-4">
                {MEMBER_ENGAGEMENT.map(e => (
                   <div key={e.name} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tight"><span className="text-slate-500">{e.name}</span><span className="text-slate-950">{e.count} Members</span></div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${e.percent}%` }} className="h-full rounded-full" style={{ backgroundColor: e.color }} /></div>
                   </div>
                ))}
             </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-enterprise">
             <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2"><UserCheck size={14} className="text-emerald-500" /> Trainer Pull</h3>
             <div className="space-y-4">
                {[{ name: "Ankit Kumar", sessions: 42, growth: "+12%" }, { name: "Sneha Patel", sessions: 38, growth: "+5%" }, { name: "Manav Rao", sessions: 24, growth: "-2%" }].map((t, i) => (
                   <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600">{t.name[0]}</div><span className="text-xs font-black text-slate-900">{t.name}</span></div>
                      <div className="text-right"><span className="block text-sm font-black text-slate-950">{t.sessions}</span><span className={cn("text-[9px] font-bold uppercase", t.growth.startsWith('+') ? 'text-emerald-600' : 'text-rose-600')}>{t.growth}</span></div>
                   </div>
                ))}
             </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-enterprise">
             <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2"><Globe size={14} className="text-blue-500" /> Regional Footfall</h3>
             <div className="space-y-4">
                {[{ name: "Main Branch", load: "High", color: "text-rose-600 bg-rose-50" }, { name: "Koramangala", load: "Stable", color: "text-emerald-600 bg-emerald-50" }, { name: "Indiranagar", load: "Low", color: "text-blue-600 bg-blue-50" }].map((b, i) => (
                   <div key={i} className="flex items-center justify-between group cursor-pointer hover:translate-x-1 transition-all"><span className="text-xs font-black text-slate-700">{b.name}</span><span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md", b.color)}>{b.load}</span></div>
                ))}
                <button className="w-full mt-4 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">Compare All <ChevronRight size={12} /></button>
             </div>
          </div>
       </div>
    </div>
  );
}

// ─────────────────────────────────────────
// TABLE VIEW
// ─────────────────────────────────────────
function TableView() {
  return (
    <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-enterprise">
       <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex gap-4">
             <button className="h-9 px-5 rounded-xl bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest">Active Members</button>
             <button className="h-9 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-950 transition-all">Churn Risk</button>
          </div>
          <div className="flex gap-2">
             <button className="h-10 px-5 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Download size={14} /> Export</button>
          </div>
       </div>
       <table className="w-full text-left border-collapse">
          <thead>
             <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Member Intelligence</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Plan & Status</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Analytics</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
             {ATTENDANCE_LOGS.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                   <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-xs text-slate-600">{log.name[0]}</div>
                         <div><span className="block text-sm font-black text-slate-950">{log.name}</span><span className="block text-[10px] font-bold text-slate-400 uppercase">{log.mId}</span></div>
                      </div>
                   </td>
                   <td className="px-6 py-4"><span className="block text-xs font-black text-slate-900">{log.plan}</span><span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-block mt-1", log.risk === 'Low' ? 'bg-emerald-50 text-emerald-600' : log.risk === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600')}>Risk: {log.risk}</span></td>
                   <td className="px-6 py-4"><div className="flex items-center gap-4"><div className="flex flex-col min-w-[70px]"><span className="text-xs font-black text-slate-900">{log.visits} Visits</span><span className="text-[9px] font-bold text-slate-400 uppercase">This Month</span></div><div className="flex flex-col min-w-[70px]"><span className="text-xs font-black text-slate-900">{log.probability}%</span><span className="text-[9px] font-bold text-slate-400 uppercase">Renewal Prob.</span></div></div></td>
                   <td className="px-6 py-4 text-right"><button className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-950 transition-all"><MoreVertical size={16} /></button></td>
                </tr>
             ))}
          </tbody>
       </table>
    </div>
  );
}

// ─────────────────────────────────────────
// PDF GENERATION MODAL (COMPACT BOTTOM SHEET)
// ─────────────────────────────────────────
const PDFGeneratorModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState("idle"); // idle, processing, success
  const [loadingText, setLoadingText] = useState("");
  const [activeTab, setActiveTab] = useState("type");

  if (!isOpen) return null;

  const handleGenerate = () => {
    setStep("processing");
    const sequences = ["Collecting data...", "Analyzing patterns...", "Generating charts...", "Building PDF...", "Optimizing..."];
    sequences.forEach((text, i) => { setTimeout(() => setLoadingText(text), i * 700); });
    setTimeout(() => { setStep("success"); }, sequences.length * 700 + 400);
  };

  return (
    <div className="fixed inset-0 z-[11000] flex items-end justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 35, stiffness: 350, mass: 0.8 }}
        className="relative w-full max-w-[960px] h-[80vh] bg-white rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col border-t border-white/20"
      >
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 rounded-full z-10" />
        <header className="px-8 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
           <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-[18px] bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner"><FileText size={22} /></div>
              <div><h2 className="text-lg font-black text-slate-950 uppercase tracking-tight leading-none">Export Intelligence</h2><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest opacity-80">Distribution Engine</p></div>
           </div>
           <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-950 flex items-center justify-center transition-all"><X size={18} /></button>
        </header>

        <div className="flex-1 flex overflow-hidden">
           <aside className="w-[360px] border-r border-slate-100 flex flex-col bg-slate-50/40 shrink-0">
              <nav className="flex border-b border-slate-100 bg-white">
                 {["type", "filters", "style", "branding"].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={cn("flex-1 py-3.5 text-[9px] font-black uppercase tracking-[0.15em] transition-all relative", activeTab === t ? "text-indigo-600" : "text-slate-400 hover:text-slate-600")}>
                       {t}{activeTab === t && <motion.div layoutId="activeReportTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
                    </button>
                 ))}
              </nav>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                 <AnimatePresence mode="wait">
                    {activeTab === "type" && (
                       <motion.div key="type" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
                          <label className="block"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Category</span>
                             <div className="grid gap-2">
                                {["Attendance Summary", "Churn Risk", "Executive", "Branch"].map(r => (
                                   <label key={r} className="flex items-center justify-between p-3.5 rounded-[18px] border border-slate-200 bg-white hover:border-indigo-400 transition-all cursor-pointer group">
                                      <div className="flex items-center gap-3"><input type="radio" name="report_type" className="text-indigo-600 w-4 h-4" defaultChecked={r.includes("Attendance")} /><span className="text-xs font-black text-slate-700">{r}</span></div>
                                      <ChevronRight size={14} className="text-slate-300" />
                                   </label>
                                ))}
                             </div>
                          </label>
                          <label className="block"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Timeline</span><div className="grid grid-cols-2 gap-2.5">{["Today", "7 Days", "30 Days", "Custom"].map(p => (<button key={p} className="h-9 rounded-[14px] border border-slate-200 bg-white text-[9px] font-black uppercase tracking-widest text-slate-600 hover:border-indigo-400 transition-all">{p}</button>))}</div></label>
                       </motion.div>
                    )}
                    {activeTab === "filters" && (
                       <motion.div key="filters" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
                          <div className="p-5 rounded-[24px] bg-white border border-slate-200 space-y-3.5 shadow-sm"><h4 className="text-[9px] font-black text-slate-950 uppercase mb-2">Include Segments</h4>{["Attendance", "Occupancy", "Trainers", "Heatmaps", "Churn Risk", "Revenue"].map(f => (<label key={f} className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" className="w-4.5 h-4.5 rounded-lg border-slate-300 text-indigo-600" defaultChecked /><span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-950 transition-colors">{f}</span></label>))}</div>
                       </motion.div>
                    )}
                    {activeTab === "style" && (
                       <motion.div key="style" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">{["Executive", "Operational", "Visual", "Investor"].map(s => (<button key={s} className="w-full p-4 rounded-[22px] border border-slate-200 bg-white text-left hover:border-indigo-400 transition-all group relative overflow-hidden shadow-sm"><span className="block text-xs font-black text-slate-900">{s} Style</span><span className="text-[9px] font-bold text-slate-400 uppercase mt-1">Preset</span>{s === "Executive" && <CheckCircle2 className="absolute top-4 right-4 text-indigo-500" size={18} />}</button>))}</motion.div>
                    )}
                    {activeTab === "branding" && (
                       <motion.div key="branding" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
                          <label className="block"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Entity Name</span><input type="text" placeholder="Main Branch Corporate" className="w-full h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold outline-none focus:border-indigo-400 transition-all" /></label>
                          <div className="p-5 rounded-[28px] bg-indigo-50 border border-indigo-100 shadow-sm relative overflow-hidden">
                             <div className="flex items-center justify-between relative z-10"><div className="flex items-center gap-3"><Zap size={16} className="text-indigo-600" /><span className="text-[10px] font-black text-indigo-950 uppercase tracking-tight">AI Narrative</span></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" defaultChecked /><div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div></label></div>
                             <p className="text-[9px] font-bold text-indigo-700/80 mt-2.5 leading-relaxed">Inject intelligent summaries and churn forecasting.</p>
                          </div>
                          <div className="pt-2"><button className="w-full flex items-center justify-between py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">Advanced <ChevronDown size={14} /></button><div className="mt-4 space-y-3.5">{["Anonymize data", "Password protect", "Watermark"].map(opt => (<label key={opt} className="flex items-center gap-4 cursor-pointer group"><input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600" /><span className="text-[10px] font-black text-slate-500 group-hover:text-slate-950 transition-colors uppercase tracking-tight">{opt}</span></label>))}</div></div>
                       </motion.div>
                    )}
                 </AnimatePresence>
              </div>
              <div className="p-6 bg-white border-t border-slate-100 mt-auto shrink-0"><button onClick={handleGenerate} className="w-full h-13 rounded-[18px] bg-slate-950 text-white text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3">Compile Intelligence</button></div>
           </aside>
           <main className="flex-1 bg-slate-50 p-10 flex items-center justify-center relative border-l border-slate-100 shadow-inner">
              <div className="w-[340px] aspect-[1/1.41] bg-white shadow-2xl rounded-sm p-8 flex flex-col border border-slate-200 origin-top transform hover:scale-[1.02] transition-all cursor-zoom-in group">
                 <div className="w-10 h-0.5 bg-slate-100 rounded-full mb-8 mx-auto" />
                 <div className="flex justify-between items-start mb-8"><div><div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white mb-4 shadow-md"><Zap size={16} /></div><h4 className="text-[11px] font-black text-slate-950 uppercase leading-none tracking-tight">Intelligence</h4><p className="text-[7px] font-bold text-slate-400 uppercase mt-1.5 tracking-widest">Confidential</p></div><div className="text-right"><p className="text-[9px] font-black text-slate-950 uppercase">May 2026</p></div></div>
                 <div className="grid grid-cols-2 gap-4 mb-8">{[1, 2, 3, 4].map(i => (<div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100"><div className="w-8 h-1 bg-slate-200 rounded-full mb-2" /><div className="w-12 h-3 bg-slate-300 rounded-sm" /></div>))}</div>
                 <div className="flex-1 bg-slate-50 rounded-xl p-6 space-y-4 shadow-inner"><div className="w-20 h-2 bg-slate-200 rounded-full" /><div className="space-y-2 pt-2"><div className="w-full h-1.5 bg-slate-100 rounded-full" /><div className="w-[90%] h-1.5 bg-slate-100 rounded-full" /></div><div className="pt-6 grid grid-cols-6 items-end gap-1 h-20">{[40, 60, 80, 30, 95, 70].map((h, i) => (<div key={i} className="bg-indigo-200/50 rounded-t-sm" style={{ height: `${h}%` }} />))}</div></div>
                 <footer className="mt-8 pt-5 border-t border-slate-100 flex justify-between items-center opacity-20"><span className="text-[7px] font-bold text-slate-400 uppercase">GymDeck Engine</span><span className="text-[7px] font-bold text-slate-400 uppercase">Page 01</span></footer>
              </div>
              <AnimatePresence>
                 {step === "processing" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center p-10 text-center"><div className="relative mb-8"><motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-20 h-20 rounded-full border-[4px] border-slate-100 border-t-indigo-600 shadow-inner" /><Zap className="absolute inset-0 m-auto text-indigo-600 animate-pulse" size={32} /></div><h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">{loadingText}</h3><div className="mt-10 w-56 h-1 bg-slate-100 rounded-full overflow-hidden shadow-inner"><motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 4 }} className="h-full bg-indigo-600" /></div></motion.div>
                 )}
                 {step === "success" && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-white/98 backdrop-blur-3xl flex flex-col items-center justify-center p-10 text-center"><div className="w-18 h-18 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-8 shadow-2xl relative"><Check size={38} strokeWidth={4} /></div><h3 className="text-2xl font-black text-slate-950 uppercase tracking-tighter leading-none">Intelligence Compiled</h3><p className="text-xs font-bold text-slate-500 mt-4 max-w-xs leading-relaxed opacity-70">Report ready for distribution.</p><div className="mt-10 flex flex-col w-full max-w-xs gap-3"><button className="h-13 rounded-2xl bg-slate-950 text-white text-[11px] font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3">Download PDF</button><div className="grid grid-cols-2 gap-3"><button className="h-12 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center justify-center gap-2 shadow-sm">Share</button><button className="h-12 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center justify-center gap-2 shadow-sm">Email</button></div><button onClick={() => { setStep("idle"); onClose(); }} className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-600 transition-colors">Return to Dashboard</button></div></motion.div>
                 )}
              </AnimatePresence>
           </main>
        </div>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────
const AttendanceReportsPage = () => {
  const [viewMode, setViewMode] = useState("dashboard");
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  const openGenerator = useCallback(() => setIsGeneratorOpen(true), []);
  const closeGenerator = useCallback(() => setIsGeneratorOpen(false), []);
  const setDashboardView = useCallback(() => setViewMode("dashboard"), []);
  const setTableViewMode = useCallback(() => setViewMode("table"), []);

  return (
    <div className="min-h-full font-sans text-slate-950 bg-slate-50/30 flex flex-col">
      <header className="sticky top-0 z-40 h-[64px] bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            Attendance <ChevronRight size={12} className="text-slate-300" /> <span className="text-slate-950">Intelligence Reports</span>
          </div>
        </div>
        <div className="flex-1 max-w-lg mx-8">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
            <input type="text" placeholder="Search reports, segments, trainer metrics..." className="w-full h-10 bg-slate-100 border border-transparent rounded-xl pl-10 pr-4 text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all shadow-inner" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={openGenerator}
            className="h-10 px-5 rounded-xl bg-slate-950 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2"
          >
             <FileText size={16} /> Generate PDF
          </button>
          <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all shadow-sm"><Settings size={18} /></button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-[1600px] mx-auto w-full space-y-8">
        <section className="flex justify-between items-end">
           <div>
              <h1 className="text-4xl font-black text-slate-950 tracking-tight uppercase">Attendance Reports</h1>
              <p className="text-sm font-semibold text-slate-500 mt-2 max-w-2xl leading-relaxed uppercase tracking-tight opacity-70">Analyze patterns, occupancy trends, member engagement, and operational performance across the ecosystem.</p>
           </div>
           <div className="flex gap-2">
              <button className="h-10 px-5 rounded-xl bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100">Revenue Analysis</button>
              <button className="h-10 px-5 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200">Schedule Automation</button>
           </div>
        </section>
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
           {KPI_STATS.map(stat => <StatTile key={stat.label} {...stat} />)}
        </section>
        <section className="bg-white border border-slate-200 rounded-[32px] p-3 shadow-sm space-y-3">
           <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex rounded-2xl bg-slate-100 p-1.5">
                 <button onClick={setDashboardView} className={cn("px-6 h-10 flex items-center justify-center rounded-xl transition-all text-[10px] font-black uppercase tracking-widest", viewMode === "dashboard" ? "bg-white shadow-xl text-slate-950" : "text-slate-500 hover:text-slate-700")}>Dashboard</button>
                 <button onClick={setTableViewMode} className={cn("px-6 h-10 flex items-center justify-center rounded-xl transition-all text-[10px] font-black uppercase tracking-widest", viewMode === "table" ? "bg-white shadow-xl text-slate-950" : "text-slate-500 hover:text-slate-700")}>Member Logs</button>
              </div>
              <div className="flex gap-3">
                 <button className="h-11 px-6 rounded-2xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-3 hover:bg-white transition-all shadow-sm"><Calendar size={16} /> Last 30 Days <ChevronDown size={14} /></button>
                 <button className="h-11 px-6 rounded-2xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-3 hover:bg-white transition-all shadow-sm"><Filter size={16} /> Advanced Filters</button>
              </div>
           </div>
        </section>
        <section className="pb-12">{viewMode === "dashboard" ? <DashboardView /> : <TableView />}</section>
      </main>
      <AnimatePresence>{isGeneratorOpen && <PDFGeneratorModal isOpen={isGeneratorOpen} onClose={closeGenerator} />}</AnimatePresence>
    </div>
  );
};

import { ErrorBoundary } from "./ErrorHandlers.jsx";

export function mountAttendanceReports() {
  const stage = document.querySelector('[data-stage="attendance-reports"]');
  if (!stage) return null;
  const rootElement = document.createElement("div");
  rootElement.dataset.attendanceReportsReactRoot = "";
  rootElement.className = "min-h-full h-full";
  stage.replaceChildren(rootElement);
  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <AttendanceReportsPage />
      </ErrorBoundary>
    );
    return root;
  } catch (err) {
    console.error("Failed to render Attendance Reports UI:", err);
    return null;
  }
}

export default AttendanceReportsPage;
