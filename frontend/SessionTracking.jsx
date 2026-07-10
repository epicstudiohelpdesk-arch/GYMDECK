import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  LayoutGrid,
  List,
  ChevronRight,
  TrendingUp,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Download,
  Shield,
  Zap,
  Award,
  TrendingDown,
  RefreshCw,
  MoreHorizontal,
  Clock3,
  BrainCircuit,
  Crown,
  Share2,
  X,
  CreditCard,
  Percent,
  Tag,
  Users,
  Calendar,
  Play,
  CheckCircle,
  XCircle,
  Pause,
  Timer,
  Flame,
  Dumbbell,
  Heart,
  User,
  ArrowRight,
  FileText,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────
// CONSTANTS & MOCK DATA
// ─────────────────────────────────────────

const SESSION_TYPES = [
  "Weight Loss", "Strength Training", "Cardio", "Rehabilitation", "Athlete Coaching", "Yoga Sessions"
];

const SESSION_STATUSES = [
  { id: "ongoing", label: "Ongoing", color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-100", icon: Play },
  { id: "upcoming", label: "Upcoming", color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-100", icon: Clock },
  { id: "missed", label: "Missed", color: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-100", icon: XCircle },
  { id: "completed", label: "Completed", color: "bg-indigo-500", text: "text-indigo-700", bg: "bg-indigo-100", icon: CheckCircle },
  { id: "cancelled", label: "Cancelled", color: "bg-slate-400", text: "text-slate-700", bg: "bg-slate-100", icon: Pause }
];

const MOCK_SESSIONS = [
  {
    id: "SES-5001",
    client: { name: "Rohan Verma", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan" },
    trainer: { name: "Ankit Kumar", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ankit" },
    type: "Strength Training",
    package: "Premium Elite",
    duration: "60 min",
    time: "08:30 AM",
    date: "Today",
    status: "ongoing",
    progress: 75,
    exercises: 8,
    completedExercises: 6,
    calories: 420,
    intensity: "High"
  },
  {
    id: "SES-5002",
    client: { name: "Aisha Khan", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aisha" },
    trainer: { name: "Sneha Patel", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha" },
    type: "Weight Loss",
    package: "Monthly Starter",
    duration: "45 min",
    time: "10:00 AM",
    date: "Today",
    status: "upcoming",
    progress: 0,
    exercises: 12,
    completedExercises: 0,
    calories: 0,
    intensity: "Medium"
  },
  {
    id: "SES-5003",
    client: { name: "Vikram Malhotra", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram" },
    trainer: { name: "Manav Rao", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Manav" },
    type: "Athlete Coaching",
    package: "Transformation Pro",
    duration: "90 min",
    time: "07:00 AM",
    date: "Today",
    status: "completed",
    progress: 100,
    exercises: 15,
    completedExercises: 15,
    calories: 850,
    intensity: "Extreme"
  },
  {
    id: "SES-5004",
    client: { name: "Meera Nair", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Meera" },
    trainer: { name: "Priya Sharma", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya" },
    type: "Yoga Sessions",
    package: "Senior Vitality",
    duration: "60 min",
    time: "06:30 AM",
    date: "Today",
    status: "missed",
    progress: 0,
    exercises: 0,
    completedExercises: 0,
    calories: 0,
    intensity: "Low"
  },
  {
    id: "SES-5005",
    client: { name: "Kabir Singh", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kabir" },
    trainer: { name: "Ankit Kumar", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ankit" },
    type: "Cardio",
    package: "Premium Elite",
    duration: "45 min",
    time: "04:30 PM",
    date: "Today",
    status: "upcoming",
    progress: 0,
    exercises: 5,
    completedExercises: 0,
    calories: 0,
    intensity: "High"
  }
];

const SESSION_ANALYTICS = [
  { id: 1, label: "Sessions Today", value: "24", trend: "+4", isUp: true, subtext: "Peak Tuesday", icon: Calendar },
  { id: 2, label: "Active Sessions", value: "6", trend: "Live", isUp: true, subtext: "Across 4 branches", icon: Activity },
  { id: 3, label: "Completed", value: "18", trend: "84%", isUp: true, subtext: "Goal: 22", icon: CheckCircle2 },
  { id: 4, label: "Missed Sessions", value: "2", trend: "-1", isUp: false, subtext: "Action required", icon: XCircle },
  { id: 5, label: "Avg Duration", value: "58m", trend: "+2m", isUp: true, subtext: "Efficiency high", icon: Clock },
  { id: 6, label: "Trainer Utilization", value: "92%", trend: "Optimal", isUp: true, subtext: "Peak performance", icon: Shield },
  { id: 7, label: "Attendance %", value: "94.2%", trend: "+2.1%", isUp: true, subtext: "System healthy", icon: Users },
  { id: 8, label: "PT Revenue", value: "₹42.5k", trend: "+₹5k", isUp: true, subtext: "Daily target met", icon: BarChart3 }
];

// ─────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────

function KPICard({ item }) {
  const Icon = item.icon;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${item.isUp ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'} transition-colors group-hover:scale-110 duration-300`}>
          <Icon size={20} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${item.isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
          {item.isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {item.trend}
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-slate-500 text-[11px] font-black uppercase tracking-wider">{item.label}</h3>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{item.value}</p>
        <p className="text-slate-400 text-[10px] font-medium">{item.subtext}</p>
      </div>
    </motion.div>
  );
}

function SessionCard({ session, onClick }) {
  const status = SESSION_STATUSES.find(s => s.id === session.status);
  const StatusIcon = status?.icon || HelpCircle;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden flex flex-col"
      onClick={() => onClick(session)}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />
      
      <div className="flex justify-between items-start relative z-10 mb-6">
        <div className="flex -space-x-3">
          <img src={session.client.image} className="w-12 h-12 rounded-2xl border-4 border-white shadow-md object-cover" />
          <img src={session.trainer.image} className="w-12 h-12 rounded-2xl border-4 border-white shadow-md object-cover" />
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${status?.bg} ${status?.text}`}>
          <StatusIcon size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">{status?.label}</span>
        </div>
      </div>

      <div className="relative z-10 mb-6">
        <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight mb-1 group-hover:text-indigo-600 transition-colors">
          {session.client.name}
        </h3>
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{session.type}</p>
          <span className="w-1 h-1 bg-slate-200 rounded-full" />
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{session.trainer.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 relative z-10 mb-6 bg-slate-50 p-4 rounded-2xl">
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Scheduled</p>
          <div className="flex items-center gap-1.5 text-sm font-black text-slate-900">
            <Timer size={14} className="text-slate-400" />
            {session.time}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Duration</p>
          <p className="text-sm font-black text-slate-900">{session.duration}</p>
        </div>
      </div>

      {session.status === 'ongoing' || session.status === 'completed' ? (
        <div className="relative z-10 mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workout Progress</p>
            <span className="text-[10px] font-black text-indigo-600">{session.progress}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${session.progress}%` }}
              className="h-full bg-indigo-500 rounded-full"
            />
          </div>
          <div className="flex justify-between mt-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Dumbbell size={14} />
              {session.completedExercises}/{session.exercises} Ex.
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Flame size={14} />
              {session.calories} kcal
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center text-center p-6 border-2 border-dashed border-slate-100 rounded-2xl mb-6">
          <Activity size={24} className="text-slate-200 mb-2" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            {session.status === 'missed' ? 'Attendance Validation Required' : 'Ready to start workout'}
          </p>
        </div>
      )}

      <div className="mt-auto flex gap-2 relative z-10">
        {session.status === 'ongoing' ? (
          <button className="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
            Complete Session
          </button>
        ) : session.status === 'upcoming' ? (
          <button className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors">
            Start Session
          </button>
        ) : (
          <button className="flex-1 bg-slate-50 text-slate-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors">
            View Details
          </button>
        )}
        <button className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500">
          <MoreHorizontal size={18} />
        </button>
      </div>
    </motion.div>
  );
}

function SessionDrawer({ session, isOpen, onClose }) {
  const status = useMemo(() => session ? SESSION_STATUSES.find(s => s.id === session.status) : null, [session]);
  const StatusIcon = status?.icon || HelpCircle;

  return (
    <AnimatePresence>
      {isOpen && session && status && (
        <>
          <motion.div
            key="session-drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            key="session-drawer-content"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[560px] bg-white shadow-2xl z-[70] overflow-y-auto"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-10">
                <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all">
                  <X size={24} />
                </button>
                <div className="flex gap-3">
                  <button className="px-5 py-3 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                    Reschedule
                  </button>
                  <button className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                    <Share2 size={20} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-6 mb-10">
                <div className="relative">
                  <img 
                    src={session.client.image} 
                    className="w-20 h-20 rounded-[28px] object-cover border-4 border-white shadow-xl shadow-indigo-100"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-2xl shadow-lg flex items-center justify-center text-white border-4 border-white ${status.color}`}>
                    <StatusIcon size={14} />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{session.client.name}</h2>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">ID: {session.id}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Assigned Trainer</p>
                  <div className="flex items-center gap-3">
                    <img src={session.trainer.image} className="w-10 h-10 rounded-xl" />
                    <div>
                      <p className="text-sm font-black text-slate-900">{session.trainer.name}</p>
                      <p className="text-[10px] font-bold text-slate-400">Elite Coach</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">PT Package</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Shield size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{session.package}</p>
                      <p className="text-[10px] font-bold text-slate-400">Active Subscription</p>
                    </div>
                  </div>
                </div>
              </div>

              <section className="mb-10">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Dumbbell size={16} />
                  Workout Execution
                </h3>
                <div className="space-y-4">
                  {[1, 2, 3].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl group hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center font-black text-xs">
                          0{i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">Compound Bench Press</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">4 Sets • 12 Reps • 65kg</p>
                        </div>
                      </div>
                      <div className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center group-hover:border-indigo-500 transition-colors">
                        <CheckCircle size={14} className="text-transparent group-hover:text-indigo-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mb-10">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Activity size={16} />
                  Performance Metrics
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Heart Rate</p>
                    <p className="text-lg font-black text-slate-900">142 bpm</p>
                    <div className="flex items-center gap-1 text-[10px] text-rose-500 font-bold mt-2">
                      <Activity size={12} />
                      Peak Zone
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Calories</p>
                    <p className="text-lg font-black text-slate-900">{session.calories}</p>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-2">
                      <Flame size={12} />
                      Burn Goal
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Intensity</p>
                    <p className="text-lg font-black text-slate-900">{session.intensity}</p>
                    <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold mt-2">
                      <Zap size={12} />
                      Optimal
                    </div>
                  </div>
                </div>
              </section>

              <div className="p-8 bg-slate-900 rounded-[40px] text-white relative overflow-hidden shadow-2xl shadow-slate-200 mb-8">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 blur-3xl -mr-20 -mt-20" />
                <h4 className="text-xl font-black tracking-tight mb-2">Trainer's Insight</h4>
                <p className="text-slate-300 text-xs font-medium leading-relaxed mb-6 italic">"Improved squat posture significantly today. Focused on depth and hip mobility. Ready for higher loads next session."</p>
                <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/20">
                  <FileText size={16} />
                  Add/Edit Notes
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────

export default function SessionTracking() {
  const [viewMode, setViewMode] = useState("timeline");
  const [selectedSession, setSelectedSession] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredSessions = useMemo(() => {
    return MOCK_SESSIONS.filter(session => {
      const matchesSearch = session.client.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          session.trainer.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === "all" || session.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  const handleSessionClick = (session) => {
    setSelectedSession(session);
    setIsDrawerOpen(true);
  };

  return (
    <div className="session-tracking-shell font-sans text-slate-900 selection:bg-indigo-100">
      {/* 5. TOP UTILITY HEADER */}
      <header className="relative z-50 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span className="opacity-60">Personal Training</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold font-sans">Session Tracking</span>
        </div>

        <div className="flex-1 max-w-2xl px-12 relative">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search session, client, trainer, PT package..."
              className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center gap-2">
            <Plus size={16} />
            Create Session
          </button>
          <div className="h-8 w-px bg-slate-200 mx-1" />
          <button className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500">
            <BarChart3 size={18} />
          </button>
          <button className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500">
            <Download size={18} />
          </button>
        </div>
      </header>

      {/* 6. PAGE TITLE SECTION */}
      <section className="flex justify-between items-end mb-2 relative z-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Session Tracking</h1>
          <p className="text-slate-500 text-xs font-semibold max-w-2xl">
            Track personal training sessions, monitor trainer activity, manage PT attendance, and optimize coaching operations.
          </p>
        </div>
        <div className="flex gap-2">
          {["Live Sessions", "PT Attendance", "Trainer Activity"].map((tag) => (
            <span key={tag} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100">
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* 7. KPI ANALYTICS STRIP */}
      <section className="grid grid-cols-8 gap-4 mb-2 relative z-10">
        {SESSION_ANALYTICS.map((item) => (
          <KPICard key={item.id} item={item} />
        ))}
      </section>

      <div className="session-tracking-workspace">

        {/* 8. MAIN WORKSPACE STRUCTURE */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* 9. LEFT PANEL → SESSION TYPES & QUICK FILTERS */}
          <aside className="col-span-2 space-y-8 sticky top-24 h-fit">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Quick Filters</h3>
              <div className="space-y-1">
                {SESSION_STATUSES.map((status) => {
                  const Icon = status.icon;
                  return (
                    <button 
                      key={status.id}
                      onClick={() => setActiveFilter(status.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${activeFilter === status.id ? 'bg-white shadow-md border-indigo-100 ring-1 ring-indigo-50' : 'hover:bg-slate-100'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${status.bg} ${status.text}`}>
                          {Icon && <Icon size={14} />}
                        </div>
                        <span className={`text-[11px] font-bold ${activeFilter === status.id ? 'text-slate-900' : 'text-slate-500'}`}>{status.label}</span>
                      </div>
                    </button>
                  );
                })}
                <button 
                  onClick={() => setActiveFilter("all")}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${activeFilter === 'all' ? 'bg-white shadow-md border-indigo-100 ring-1 ring-indigo-50' : 'hover:bg-slate-100'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                      <LayoutGrid size={14} />
                    </div>
                    <span className={`text-[11px] font-bold ${activeFilter === 'all' ? 'text-slate-900' : 'text-slate-500'}`}>All Sessions</span>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Session Types</h3>
              <div className="space-y-2">
                {SESSION_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-bold text-slate-500 group-hover:text-slate-900 transition-colors">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 blur-2xl -mr-12 -mt-12 transition-all group-hover:bg-indigo-500/40" />
              <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">AI Alert</p>
              <p className="text-xs font-bold leading-relaxed mb-4">3 clients missed sessions consecutively this week. Review retention.</p>
              <button className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2 hover:text-indigo-300 transition-colors">
                View Report <ChevronRight size={12} />
              </button>
            </div>
          </aside>

          {/* 10. CENTER WORKSPACE → SESSION TRACKING ENGINE */}
          <section className="col-span-7 space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex gap-1">
                <button 
                  onClick={() => setViewMode("timeline")}
                  className={`p-2 px-4 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'timeline' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <Timer size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Timeline</span>
                </button>
                <button 
                  onClick={() => setViewMode("table")}
                  className={`p-2 px-4 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <List size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Table</span>
                </button>
                <button 
                  onClick={() => setViewMode("calendar")}
                  className={`p-2 px-4 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <Calendar size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Calendar</span>
                </button>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-xs font-bold text-slate-400">{filteredSessions.length} active monitors</p>
                <div className="h-4 w-px bg-slate-200" />
                <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">
                  <RefreshCw size={16} />
                  Sync Live
                </button>
              </div>
            </div>

            {viewMode === "timeline" ? (
              <div className="space-y-8 relative">
                {/* Timeline vertical line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200 z-0" />
                
                {["Today", "Yesterday"].map(day => {
                  const daySessions = filteredSessions.filter(s => s.date === day);
                  if (daySessions.length === 0 && day === "Yesterday") return null;
                  
                  return (
                    <div key={day} className="space-y-6">
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center text-indigo-500 shadow-sm">
                          <Calendar size={20} />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{day}</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6 ml-12">
                        {daySessions.map((session) => (
                          <SessionCard 
                            key={`${day}-${session.id}`} 
                            session={session} 
                            onClick={handleSessionClick} 
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : viewMode === "table" ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trainer</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Scheduled</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSessions.map((session) => {
                      const status = SESSION_STATUSES.find(s => s.id === session.status);
                      return (
                        <tr key={session.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => handleSessionClick(session)}>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <img src={session.client.image} className="w-10 h-10 rounded-xl" />
                              <p className="text-sm font-black text-slate-900 leading-tight">{session.client.name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <img src={session.trainer.image} className="w-10 h-10 rounded-xl" />
                              <p className="text-sm font-bold text-slate-700">{session.trainer.name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-sm font-bold text-slate-500">{session.type}</p>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-sm font-black text-slate-700">{session.time}</p>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${status?.bg} ${status?.text}`}>
                              {status?.label}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                              <MoreHorizontal size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-[40px] border border-slate-200 border-dashed p-24 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-300 mb-8">
                  <Calendar size={48} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Calendar View Coming Soon</h3>
                <p className="text-slate-500 font-medium max-w-sm">
                  We're building a drag-and-drop calendar for seamless PT session rescheduling.
                </p>
              </div>
            )}
          </section>

          {/* 15. RIGHT PANEL → AI & LIVE SESSION INTELLIGENCE */}
          <aside className="col-span-3 space-y-8 sticky top-24 h-fit">
            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <BrainCircuit size={20} />
                </div>
              </div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">AI Session Insights</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-1 h-10 bg-emerald-400 rounded-full" />
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-snug">Peak PT activity detected between 6 PM – 8 PM today.</p>
                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2 hover:underline">Adjust Staffing</button>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 h-10 bg-amber-400 rounded-full" />
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-snug">Trainer "Ankit Kumar" has 15m buffer before next session.</p>
                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2 hover:underline">View Buffer</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Live Trainer Activity</h3>
              <div className="space-y-5">
                {[
                  { name: "Ankit Kumar", status: "In Session", color: "bg-emerald-500" },
                  { name: "Sneha Patel", status: "Buffer", color: "bg-amber-500" },
                  { name: "Manav Rao", status: "Idle", color: "bg-slate-300" }
                ].map((trainer, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${trainer.name}`} className="w-10 h-10 rounded-xl" />
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${trainer.color} border-2 border-white rounded-full`} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 leading-none mb-1">{trainer.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{trainer.status}</p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                      <ArrowRight size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-4 bg-slate-50 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-colors">
                Full Activity Monitor
              </button>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[40px] text-white relative overflow-hidden shadow-2xl shadow-slate-200">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16" />
              <Crown className="w-10 h-10 text-white/20 mb-6" />
              <h4 className="text-xl font-black tracking-tight mb-2">Trainer Performance</h4>
              <p className="text-slate-400 text-[11px] font-medium leading-relaxed mb-6">Top performing coaches this week based on session completion & client ratings.</p>
              <button className="w-full bg-white text-slate-900 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-xl">
                View Rankings
              </button>
            </div>
          </aside>
        </div>

        {/* 22. BOTTOM ANALYTICS SECTION */}
        <section className="mt-16 grid grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8">Completion Trends</h3>
            <div className="h-48 flex items-end gap-3 px-2">
              {[80, 65, 90, 75, 100, 85].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    className="w-full bg-slate-100 rounded-t-xl group-hover:bg-indigo-500 transition-colors relative"
                  />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {['M', 'T', 'W', 'T', 'F', 'S'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8">Peak Session Hours</h3>
            <div className="space-y-4">
              {[
                { range: "06:00 - 09:00", value: 85, color: "bg-indigo-500" },
                { range: "10:00 - 13:00", value: 45, color: "bg-amber-500" },
                { range: "17:00 - 21:00", value: 100, color: "bg-emerald-500" }
              ].map((slot, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-500">{slot.range}</span>
                    <span className="text-slate-900">{slot.value}% load</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${slot.value}%` }} className={`h-full ${slot.color}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-indigo-900 p-8 rounded-[40px] text-white flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-300">Accountability Score</h3>
                <Shield className="text-indigo-300 opacity-40" />
              </div>
              <p className="text-4xl font-black tracking-tight mb-2">98.2%</p>
              <p className="text-indigo-200 text-xs font-medium leading-relaxed">System-wide session validation success rate across all active trainers.</p>
            </div>
            <button className="w-full mt-8 py-4 border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors">
              Review Audits
            </button>
          </div>
        </section>
      </div>

      <SessionDrawer 
        session={selectedSession} 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />
    </div>
  );
}

// ─────────────────────────────────────────
// MOUNTING FUNCTION
// ─────────────────────────────────────────
export const mountSessionTracking = () => {
  const container = document.querySelector('[data-stage="session-tracking"]');
  if (!container) return null;
  
  const root = createRoot(container);
  root.render(<><SessionTracking /><BrandFooter /></>);
  return root;
};
