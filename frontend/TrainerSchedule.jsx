import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Calendar,
  Clock,
  Users,
  Search,
  Plus,
  Filter,
  MoreVertical,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  CalendarDays,
  Smartphone,
  ExternalLink,
  MessageSquare,
  Zap,
  Briefcase,
  Award,
  MoreHorizontal,
  X,
  FileText,
  MapPin,
  Info,
  History,
  Download,
  Shield,
  Layers,
  ArrowUpRight,
  ChevronDown,
  Brain,
  Trash2,
  Check,
  UserCheck,
  UserPlus,
  Dumbbell,
  ShieldCheck,
  Percent,
  CalendarClock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────
// CONSTANTS & MOCK DATA
// ─────────────────────────────────────────

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6 AM to 8 PM

const DAYS = [
  { short: "Mon", full: "Monday" },
  { short: "Tue", full: "Tuesday" },
  { short: "Wed", full: "Wednesday" },
  { short: "Thu", full: "Thursday" },
  { short: "Fri", full: "Friday" },
  { short: "Sat", full: "Saturday" },
  { short: "Sun", full: "Sunday" }
];

const KPIS = [
  { id: 1, label: "Active Trainers Today", value: "0", trend: "0", isUp: true, subtext: "On duty", icon: UserCheck, tone: "indigo" },
  { id: 2, label: "PT Sessions Scheduled", value: "0", trend: "0%", isUp: true, subtext: "0% capacity", icon: Dumbbell, tone: "emerald" },
  { id: 3, label: "Trainers Available", value: "0", trend: "0", isUp: false, subtext: "Available", icon: Users, tone: "blue" },
  { id: 4, label: "Schedule Conflicts", value: "0", trend: "Clean", isUp: true, subtext: "Conflict-free", icon: ShieldCheck, tone: "amber" },
  { id: 5, label: "Shift Coverage %", value: "0%", trend: "0%", isUp: true, subtext: "Shift coverage", icon: Percent, tone: "rose" },
  { id: 6, label: "Avg Trainer Utilization", value: "0%", trend: "0%", isUp: false, subtext: "Utilization rate", icon: Activity, tone: "indigo" },
  { id: 7, label: "Upcoming Sessions", value: "0", trend: "Next 2h", isUp: true, subtext: "Sessions", icon: Clock, tone: "emerald" },
  { id: 8, label: "Trainers On Leave", value: "0", trend: "0", isUp: true, subtext: "On leave", icon: CalendarClock, tone: "blue" }
];

const MOCK_TRAINERS = [];

const MOCK_SESSIONS = [];

// ─────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────

const KPI_TONES = {
  indigo: { icon: "text-indigo-600 bg-indigo-50 border-indigo-100", trend: "text-emerald-700 bg-emerald-50 border-emerald-100/80" },
  emerald: { icon: "text-emerald-600 bg-emerald-50 border-emerald-100", trend: "text-emerald-700 bg-emerald-50 border-emerald-100/80" },
  blue: { icon: "text-blue-600 bg-blue-50 border-blue-100", trend: "text-blue-700 bg-blue-50 border-blue-100/80" },
  amber: { icon: "text-amber-600 bg-amber-50 border-amber-100", trend: "text-amber-700 bg-amber-50 border-amber-100/80" },
  rose: { icon: "text-rose-600 bg-rose-50 border-rose-100", trend: "text-rose-700 bg-rose-50 border-rose-100/80" }
};

const StatCard = ({ kpi }) => {
  const tone = KPI_TONES[kpi.tone] || KPI_TONES.indigo;
  const Icon = kpi.icon;
  return (
    <article className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl p-2.5 sm:p-3 xl:p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-sm transition-all duration-200 flex flex-col justify-between gap-2 min-w-0">
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <span className="text-[9px] sm:text-[9.5px] xl:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate min-w-0" title={kpi.label}>
          {kpi.label}
        </span>
        {Icon && (
          <div className={`w-7 h-7 xl:w-8 xl:h-8 rounded-lg border flex items-center justify-center shrink-0 ${tone.icon}`}>
            <Icon size={14} strokeWidth={2.2} />
          </div>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-1.5 pt-0.5 min-w-0">
        <h3 className="text-xl sm:text-[22px] xl:text-2xl font-black text-slate-900 tracking-tight leading-none shrink-0">
          {kpi.value}
        </h3>
        {kpi.trend && (
          <span className={`text-[8.5px] sm:text-[9px] xl:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border shrink-0 whitespace-nowrap ${tone.trend}`}>
            {kpi.trend}
          </span>
        )}
      </div>
      <p className="text-[10px] font-medium text-slate-500 truncate">{kpi.subtext}</p>
    </article>
  );
};

const TrainerSchedule = () => {
  const [viewMode, setViewMode] = useState("week"); // day | week | month | timeline
  const [selectedSession, setSelectedSession] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSessionClick = (session) => {
    setSelectedSession(session);
    setIsDrawerOpen(true);
  };

  return (
    <div className="trainer-schedule-shell font-sans text-slate-900 selection:bg-indigo-100">
      {/* 5. TOP UTILITY HEADER */}
      <header className="relative z-50 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <nav className="flex items-center text-sm font-medium text-slate-500">
            <span>Trainers &amp; Staff</span>
            <ChevronRight size={16} className="text-slate-300 mx-2" />
            <span className="text-slate-900 font-bold">Trainer Schedule</span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center w-80 lg:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
              <Search size={16} strokeWidth={2.2} />
            </div>
            <input
              type="text"
              placeholder="Search trainer, PT session, shift, branch..."
              className="w-full pl-10 pr-14 h-10 bg-slate-100/90 hover:bg-slate-100 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all outline-none leading-normal shadow-2xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none gap-0.5">
              <kbd className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs leading-none">⌘</kbd>
              <kbd className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs leading-none">K</kbd>
            </div>
          </div>
          <button className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-2xs">
            <Layers size={16} />
            Shift Planner
          </button>
          <button className="h-10 px-5 rounded-xl bg-slate-950 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2">
            <Plus size={16} />
            Create Schedule
          </button>
        </div>
      </header>

      {/* 6. PAGE TITLE SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-2 relative z-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Trainer Schedule</h1>
          <p className="text-slate-500 text-xs font-semibold mt-2 max-w-2xl">
            Manage trainer shifts, PT schedules, recurring sessions, and workforce allocation across your fitness ecosystem.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-2">
            <CalendarDays size={13} className="text-indigo-600" />
            Week: <strong className="text-indigo-600 font-bold">20 – 26 May 2026</strong>
          </span>
        </div>
      </div>

      {/* 7. KPI ANALYTICS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-2.5 lg:gap-3 xl:gap-3.5 mb-2 relative z-10 w-full min-w-0">
        {KPIS.map(kpi => <StatCard key={kpi.id} kpi={kpi} />)}
      </div>

      <div className="trainer-schedule-workspace">

        {/* 8. MAIN WORKSPACE → FULL WIDTH SCHEDULER */}
        <section className="w-full space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    {['Day', 'Week', 'Month', 'Timeline'].map(mode => (
                      <button 
                        key={mode}
                        onClick={() => setViewMode(mode.toLowerCase())}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          viewMode === mode.toLowerCase() ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 transition-colors">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-black text-slate-900 tracking-tight">20 May – 26 May, 2026</span>
                    <button className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 transition-colors">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="h-9 px-4 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-2">
                    <Filter size={14} />
                    Filters
                  </button>
                  <button className="h-9 px-4 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-2">
                    <Download size={14} />
                    Export
                  </button>
                </div>
              </div>

              <div className="relative overflow-x-auto overflow-y-auto max-h-[800px]">
                <div className="grid grid-cols-[80px_repeat(7,1fr)] min-w-[900px]">
                  {/* Header Row */}
                  <div className="h-16 border-b border-r border-slate-50 bg-slate-50/50" />
                  {DAYS.map(day => (
                    <div key={day.short} className="h-16 border-b border-r border-slate-50 bg-slate-50/50 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{day.short}</span>
                      <strong className="text-xs font-black text-slate-900">2{DAYS.indexOf(day)} May</strong>
                    </div>
                  ))}

                  {/* Hour Rows */}
                  {HOURS.map(hour => (
                    <React.Fragment key={hour}>
                      <div className="h-24 border-b border-r border-slate-50 flex items-start justify-center pt-4">
                        <span className="text-[10px] font-black text-slate-400">{hour}:00</span>
                      </div>
                      {DAYS.map(day => {
                        const session = MOCK_SESSIONS.find(s => s.day === day.short && s.start === hour);
                        return (
                          <div key={`${day.short}-${hour}`} className="h-24 border-b border-r border-slate-50 p-1 relative group">
                            {session && (
                              <motion.div 
                                layoutId={`session-${session.id}`}
                                onClick={() => handleSessionClick(session)}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`absolute inset-x-1 top-1 rounded-2xl p-3 border shadow-sm cursor-pointer hover:shadow-md transition-all z-10 overflow-hidden ${session.color}`}
                                style={{ height: `${session.duration * 96 - 8}px` }}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <img src={MOCK_TRAINERS.find(t => t.name === session.trainer)?.image} alt="" className="w-6 h-6 rounded-lg bg-white/50" />
                                  {session.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                </div>
                                <p className="text-[10px] font-black truncate leading-tight">{session.member}</p>
                                <p className="text-[9px] font-bold opacity-70 truncate">{session.type}</p>
                                <div className="mt-2 flex items-center gap-1.5 opacity-60">
                                  <Clock3 size={10} />
                                  <span className="text-[8px] font-black uppercase tracking-tighter">
                                    {hour}:00 - {hour + session.duration}:00
                                  </span>
                                </div>
                              </motion.div>
                            )}
                            <button className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Plus className="text-indigo-600 bg-indigo-50 p-1.5 rounded-full" size={28} />
                            </button>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </section>
      </div>

      {/* 11. SESSION DETAILS DRAWER */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div key="schedule-drawer-root">
            <motion.div 
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.aside 
              key="aside"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[520px] bg-white z-[101] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Session Details</h2>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Manage appointment flow</p>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Trainer</span>
                    <div className="flex items-center gap-3">
                      <img src={MOCK_TRAINERS.find(t => t.name === selectedSession?.trainer)?.image} alt="" className="w-8 h-8 rounded-lg bg-white" />
                      <strong className="text-sm font-black text-slate-900">{selectedSession?.trainer}</strong>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Member</span>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-600 font-black text-xs">
                        {selectedSession?.member.charAt(0)}
                      </div>
                      <strong className="text-sm font-black text-slate-900">{selectedSession?.member}</strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-4 border border-slate-100 rounded-3xl">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Timing</h4>
                      <p className="text-sm font-black text-slate-900">{selectedSession?.start}:00 - {selectedSession?.start + selectedSession?.duration}:00</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5">Recurring every {selectedSession?.day}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 border border-slate-100 rounded-3xl">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Location</h4>
                      <p className="text-sm font-black text-slate-900">Main Branch • Zone B</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5">Strength & Conditioning Floor</p>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText size={16} className="text-slate-400" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Member Notes</h4>
                    </div>
                    <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic">
                      "Member prefers high-intensity warm-up. Focus on deadlift form and core stabilization. Has a mild knee sensitivity."
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                <div className="flex gap-3">
                  <button className="flex-1 h-12 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                    Reschedule
                  </button>
                  <button className="flex-1 h-12 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                    Cancel Session
                  </button>
                </div>
                <button className="w-full h-11 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 transition-all">
                  Assign Substitute Trainer
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────
// MOUNTING SYSTEM
// ─────────────────────────────────────────

export const mountTrainerSchedule = () => {
  console.log("GymDeck: Mounting TrainerSchedule component...");
  const container = document.querySelector('[data-stage="trainer-schedule"]');
  if (!container) {
    console.error("GymDeck: TrainerSchedule container not found!");
    return null;
  }
  
  try {
    const root = createRoot(container);
    root.render(<><TrainerSchedule /><BrandFooter /></>);
    console.log("GymDeck: TrainerSchedule rendered successfully.");
    return root;
  } catch (err) {
    console.error("GymDeck: Critical mount failure in TrainerSchedule:", err);
    return null;
  }
};

export default TrainerSchedule;
