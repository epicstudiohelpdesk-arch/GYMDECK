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
  UserPlus
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
  { id: 1, label: "Active Trainers Today", value: "24", trend: "+2", isUp: true, subtext: "Peak attendance" },
  { id: 2, label: "PT Sessions Scheduled", value: "142", trend: "+12.5%", isUp: true, subtext: "84% capacity" },
  { id: 3, label: "Trainers Available", value: "6", trend: "-2", isUp: false, subtext: "On floor now" },
  { id: 4, label: "Schedule Conflicts", value: "0", trend: "Clean", isUp: true, subtext: "Conflict-free week" },
  { id: 5, label: "Shift Coverage %", value: "98.2%", trend: "+1.4%", isUp: true, subtext: "Optimal staffing" },
  { id: 6, label: "Avg Trainer Utilization", value: "76%", trend: "-2.1%", isUp: false, subtext: "Healthy balance" },
  { id: 7, label: "Upcoming Sessions", value: "18", trend: "Next 2h", isUp: true, subtext: "Fully prepared" },
  { id: 8, label: "Trainers On Leave", value: "3", trend: "Approved", isUp: true, subtext: "Replacements active" }
];

const MOCK_TRAINERS = [
  { id: "TR-101", name: "Ankit Kumar", specialization: "Strength", status: "available", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ankit" },
  { id: "TR-102", name: "Sneha Patel", specialization: "Yoga", status: "busy", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha" },
  { id: "TR-103", name: "Manav Rao", specialization: "CrossFit", status: "booked", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Manav" },
  { id: "TR-104", name: "Priya Sharma", specialization: "Nutritionist", status: "off", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya" }
];

const MOCK_SESSIONS = [
  { 
    id: 1, 
    trainer: "Ankit Kumar", 
    member: "Rohan Verma", 
    type: "Personal Training", 
    day: "Mon", 
    start: 7, 
    duration: 1.5, 
    color: "bg-indigo-50 border-indigo-200 text-indigo-700",
    status: "upcoming"
  },
  { 
    id: 2, 
    trainer: "Sneha Patel", 
    member: "Meera Nair", 
    type: "Yoga Flow", 
    day: "Wed", 
    start: 8, 
    duration: 1, 
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    status: "active"
  },
  { 
    id: 3, 
    trainer: "Manav Rao", 
    member: "Aarav Sharma", 
    type: "HIIT Session", 
    day: "Mon", 
    start: 17, 
    duration: 1, 
    color: "bg-amber-50 border-amber-200 text-amber-700",
    status: "upcoming"
  }
];

// ─────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────

const StatCard = ({ kpi }) => (
  <article className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{kpi.label}</span>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${kpi.isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
        {kpi.trend}
      </span>
    </div>
    <div className="flex items-baseline gap-2">
      <strong className="text-2xl font-black text-slate-900">{kpi.value}</strong>
    </div>
    <p className="text-[11px] font-medium text-slate-500 mt-1">{kpi.subtext}</p>
  </article>
);

const TrainerSchedule = () => {
  const [viewMode, setViewMode] = useState("week"); // day | week | month | timeline
  const [selectedSession, setSelectedSession] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSessionClick = (session) => {
    setSelectedSession(session);
    setIsDrawerOpen(true);
  };

  return (
    <div className="min-h-full bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100">
      {/* 5. TOP UTILITY HEADER */}
      <header className="sticky top-0 z-50 h-16 bg-white backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span className="hover:text-slate-900 cursor-pointer">Trainers & Staff</span>
          <ChevronRight size={14} className="opacity-40" />
          <span className="text-slate-900 font-bold">Trainer Schedule</span>
        </div>

        <div className="flex-1 max-w-2xl px-12">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search trainer, PT session, shift, branch..."
              className="w-full h-11 pl-12 pr-4 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm font-medium transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Layers size={16} />
            Shift Planner
          </button>
          <button className="h-10 px-6 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2">
            <Plus size={16} />
            Create Schedule
          </button>
        </div>
      </header>

      <main className="p-8 max-w-[1600px] mx-auto">
        {/* 6. PAGE TITLE SECTION */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Trainer Schedule</h1>
            <p className="text-slate-500 font-medium mt-1 max-w-[720px]">
              Manage trainer shifts, PT schedules, recurring sessions, and workforce allocation across your fitness ecosystem.
            </p>
          </div>
          <div className="flex gap-2">
            {['Shift Management', 'PT Sessions', 'Availability Engine', 'Workload Insights'].map(pill => (
              <span key={pill} className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {pill}
              </span>
            ))}
          </div>
        </div>

        {/* 7. KPI ANALYTICS STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
          {KPIS.map(kpi => <StatCard key={kpi.id} kpi={kpi} />)}
        </div>

        {/* 8. MAIN WORKSPACE */}
        <div className="grid grid-cols-12 gap-6 items-start">
          
          {/* 9. LEFT PANEL → STAFF LIST */}
          <aside className="col-span-2 space-y-6 sticky top-24">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Staff List</h4>
              <div className="space-y-4">
                {MOCK_TRAINERS.map(trainer => (
                  <div key={trainer.id} className="flex items-center gap-3 group cursor-pointer">
                    <div className="relative">
                      <img src={trainer.image} alt="" className="w-10 h-10 rounded-xl bg-slate-50 grayscale group-hover:grayscale-0 transition-all" />
                      <span className={`absolute -right-1 -bottom-1 w-3 h-3 rounded-full border-2 border-white ${
                        trainer.status === 'available' ? 'bg-emerald-500' : 
                        trainer.status === 'busy' ? 'bg-amber-500' :
                        trainer.status === 'booked' ? 'bg-rose-500' : 'bg-slate-300'
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">{trainer.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 truncate tracking-tight">{trainer.specialization}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Quick Filters</h4>
              <div className="space-y-2">
                {['Available Now', 'PT Running', 'On Leave', 'Senior Trainers'].map(filter => (
                  <label key={filter} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group">
                    <div className="w-4 h-4 rounded border-2 border-slate-200 group-hover:border-indigo-500 transition-colors" />
                    <span className="text-[11px] font-bold text-slate-600">{filter}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* 10. CENTER WORKSPACE → MAIN SCHEDULER */}
          <section className="col-span-7 space-y-6">
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

            {/* 20. BOTTOM ANALYTICS SECTION */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Trainer Utilization</h4>
                  <ArrowUpRight size={16} className="text-slate-400" />
                </div>
                <div className="space-y-4">
                  {MOCK_TRAINERS.map(trainer => (
                    <div key={trainer.id} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <span>{trainer.name}</span>
                        <span>{trainer.status === 'available' ? '78%' : trainer.status === 'busy' ? '94%' : '42%'}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${trainer.status === 'busy' ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                          style={{ width: trainer.status === 'available' ? '78%' : trainer.status === 'busy' ? '94%' : '42%' }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Session Breakdown</h4>
                  <TrendingUp size={16} className="text-emerald-500" />
                </div>
                <div className="flex items-center gap-8 h-full pb-8">
                  <div className="relative w-32 h-32">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-50" strokeWidth="4" />
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-indigo-500" strokeWidth="4" strokeDasharray="65, 100" />
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-emerald-500" strokeWidth="4" strokeDasharray="25, 100" strokeDashoffset="-65" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <strong className="text-lg font-black text-slate-900">142</strong>
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Strength (65%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Yoga (25%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-300" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Others (10%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 13. RIGHT PANEL → AI & AVAILABILITY INTELLIGENCE */}
          <aside className="col-span-3 space-y-6 sticky top-24">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Brain size={120} className="text-indigo-900" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                    <Zap size={16} fill="white" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">AI Schedule Insights</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity size={14} className="text-indigo-600" />
                      <strong className="text-[10px] font-black text-slate-900 uppercase">Demand Spike Alert</strong>
                    </div>
                    <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                      Peak PT demand expected between <span className="font-black">6 PM – 8 PM</span>. Consider opening 2 more slots.
                    </p>
                  </div>

                  <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={14} className="text-rose-500" />
                      <strong className="text-[10px] font-black text-slate-900 uppercase">Utilization Risk</strong>
                    </div>
                    <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                      <span className="font-black">Rahul Sharma</span> is nearing overbooking threshold (94%). 
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Coverage</h4>
                <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Real-time
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Floor Trainers", value: "8", color: "text-indigo-600", bg: "bg-indigo-50" },
                  { label: "Ongoing PTs", value: "14", color: "text-amber-600", bg: "bg-amber-50" },
                  { label: "Uncovered Shifts", value: "0", color: "text-emerald-600", bg: "bg-emerald-50" }
                ].map(stat => (
                  <div key={stat.label} className="flex items-center justify-between p-3 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-colors">
                    <span className="text-[11px] font-bold text-slate-500">{stat.label}</span>
                    <strong className={`text-xs font-black ${stat.color} ${stat.bg} px-2 py-0.5 rounded-lg`}>{stat.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-700" />
              <div className="relative z-10">
                <h4 className="text-xs font-black uppercase tracking-widest mb-4">Conflict Resolution</h4>
                <p className="text-[11px] font-medium text-slate-400 leading-relaxed">
                  System automatically scans for overlaps during drag-and-drop operations.
                </p>
                <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Status</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-emerald-400" />
                    <span className="text-xs font-black text-white">Smart Shield™ Enabled</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

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
    root.render(<TrainerSchedule />);
    console.log("GymDeck: TrainerSchedule rendered successfully.");
    return root;
  } catch (err) {
    console.error("GymDeck: Critical mount failure in TrainerSchedule:", err);
    return null;
  }
};

export default TrainerSchedule;
