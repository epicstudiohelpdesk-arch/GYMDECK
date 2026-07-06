import React, { useState, useMemo, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Users,
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
  MessageSquare,
  Calendar,
  BarChart3,
  Download,
  ExternalLink,
  Shield,
  Star,
  MapPin,
  Mail,
  Phone,
  ArrowUpRight,
  Zap,
  Briefcase,
  Award,
  BookOpen,
  PieChart,
  UserPlus,
  UserCheck,
  X,
  FileText,
  Target,
  Flame,
  Dumbbell,
  Heart,
  TrendingDown,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Bell,
  Settings,
  MoreHorizontal,
  PlusCircle,
  Clock3,
  Weight,
  Ruler,
  BrainCircuit,
  Crown,
  Share2,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────
// CONSTANTS & MOCK DATA
// ─────────────────────────────────────────

const PT_CLIENT_GROUPS = [
  { id: "active", label: "Active Clients", count: 42, color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
  { id: "expiring", label: "Expiring Packages", count: 7, color: "text-amber-600", bg: "bg-amber-50", icon: Clock3 },
  { id: "inactive", label: "Inactive Clients", count: 12, color: "text-slate-400", bg: "bg-slate-50", icon: X },
  { id: "high-attendance", label: "High Attendance", count: 28, color: "text-indigo-600", bg: "bg-indigo-50", icon: Zap },
  { id: "pending", label: "Pending Sessions", count: 5, color: "text-rose-600", bg: "bg-rose-50", icon: Calendar }
];

const FITNESS_GOALS = ["Weight Loss", "Muscle Gain", "Rehabilitation", "Athletes", "Senior Fitness", "Cardio Transformation"];


const MOCK_PT_CLIENTS = [
  {
    id: "PTC-1001",
    name: "Rohan Verma",
    email: "rohan.v@example.com",
    phone: "+91 98765 43210",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan",
    status: "active",
    trainer: "Ankit Kumar",
    package: "Premium Elite (24 Sessions)",
    sessionsCompleted: 18,
    totalSessions: 24,
    attendanceRate: 92,
    goal: "Muscle Gain",
    expiryDate: "2026-06-15",
    revenue: 45000,
    lastSession: "Yesterday",
    progress: 75,
    metrics: {
      weight: "78.5 kg",
      targetWeight: "82.0 kg",
      bodyFat: "18.2%",
      bmi: "24.5",
      muscleGain: "+2.4 kg"
    },
    engagementScore: 94
  },
  {
    id: "PTC-1002",
    name: "Aisha Khan",
    email: "aisha.k@example.com",
    phone: "+91 98111 22233",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aisha",
    status: "expiring",
    trainer: "Sneha Patel",
    package: "Monthly Starter (12 Sessions)",
    sessionsCompleted: 10,
    totalSessions: 12,
    attendanceRate: 85,
    goal: "Weight Loss",
    expiryDate: "2026-05-25",
    revenue: 12000,
    lastSession: "2 days ago",
    progress: 83,
    metrics: {
      weight: "64.2 kg",
      targetWeight: "58.0 kg",
      bodyFat: "24.5%",
      bmi: "22.1",
      muscleGain: "-0.5 kg"
    },
    engagementScore: 78
  },
  {
    id: "PTC-1003",
    name: "Vikram Malhotra",
    email: "vikram.m@example.com",
    phone: "+91 99000 12345",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram",
    status: "active",
    trainer: "Manav Rao",
    package: "Transformation Pro (36 Sessions)",
    sessionsCompleted: 12,
    totalSessions: 36,
    attendanceRate: 98,
    goal: "Athletes",
    expiryDate: "2026-08-10",
    revenue: 85000,
    lastSession: "Today",
    progress: 33,
    metrics: {
      weight: "82.0 kg",
      targetWeight: "80.0 kg",
      bodyFat: "12.5%",
      bmi: "23.8",
      muscleGain: "+1.2 kg"
    },
    engagementScore: 99
  },
  {
    id: "PTC-1004",
    name: "Meera Nair",
    email: "meera.n@example.com",
    phone: "+91 98222 33344",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Meera",
    status: "inactive",
    trainer: "Priya Sharma",
    package: "Senior Vitality (20 Sessions)",
    sessionsCompleted: 15,
    totalSessions: 20,
    attendanceRate: 65,
    goal: "Senior Fitness",
    expiryDate: "2026-04-30",
    revenue: 18000,
    lastSession: "12 days ago",
    progress: 75,
    metrics: {
      weight: "58.5 kg",
      targetWeight: "60.0 kg",
      bodyFat: "22.1%",
      bmi: "21.5",
      muscleGain: "+0.2 kg"
    },
    engagementScore: 42
  }
];

const PT_ANALYTICS = [
  { id: 1, label: "Active PT Clients", value: "142", trend: "+12.5%", isUp: true, subtext: "Peak attendance", icon: Users },
  { id: 2, label: "Sessions Today", value: "24", trend: "+2", isUp: true, subtext: "84% capacity", icon: Clock },
  { id: 3, label: "PT Revenue (MTD)", value: "₹8.4L", trend: "+18.2%", isUp: true, subtext: "Target: ₹10L", icon: BarChart3 },
  { id: 4, label: "Upcoming Renewals", value: "18", trend: "-5", isUp: true, subtext: "Next 7 days", icon: RefreshCw },
  { id: 5, label: "Avg Attendance %", value: "88.4%", trend: "+2.1%", isUp: true, subtext: "System healthy", icon: Activity },
  { id: 6, label: "Active Plans", value: "96", trend: "+8", isUp: true, subtext: "Across 4 goals", icon: Target },
  { id: 7, label: "Package Expiry", value: "12", trend: "Critical", isUp: false, subtext: "Action required", icon: AlertCircle },
  { id: 8, label: "Trainer Utilization", value: "76%", trend: "-2.1%", isUp: false, subtext: "Healthy balance", icon: Award }
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
      
      <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "70%" }}
          className={`h-full ${item.isUp ? 'bg-indigo-500' : 'bg-rose-500'}`}
        />
      </div>
    </motion.div>
  );
}

function ClientCard({ client, onClick }) {
  const statusColors = {
    active: "bg-emerald-500",
    expiring: "bg-amber-500",
    inactive: "bg-slate-300"
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
      onClick={() => onClick(client)}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />
      
      <div className="flex justify-between items-start relative z-10">
        <div className="relative">
          <img 
            src={client.image} 
            alt={client.name} 
            className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm"
          />
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${statusColors[client.status]} border-4 border-white rounded-full`} />
        </div>
        <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
          <MoreVertical size={20} />
        </button>
      </div>

      <div className="mt-5 relative z-10">
        <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1 group-hover:text-indigo-600 transition-colors">
          {client.name}
        </h3>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{client.goal}</p>
      </div>

      <div className="mt-6 space-y-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
            <Shield size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Assigned Trainer</p>
            <p className="text-sm font-bold text-slate-700 truncate">{client.trainer}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
            <Award size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">PT Package</p>
            <p className="text-sm font-bold text-slate-700 truncate">{client.package}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100 relative z-10">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session Progress</span>
          <span className="text-xs font-black text-slate-900">{client.sessionsCompleted} / {client.totalSessions}</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(client.sessionsCompleted / client.totalSessions) * 100}%` }}
            className={`h-full ${client.status === 'expiring' ? 'bg-amber-500' : 'bg-indigo-500'}`}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 relative z-10">
        <div className="bg-slate-50 p-3 rounded-2xl">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Weight</p>
          <p className="text-sm font-black text-slate-900">{client.metrics.weight}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-2xl">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendance</p>
          <p className="text-sm font-black text-slate-900">{client.attendanceRate}%</p>
        </div>
      </div>

      <div className="mt-6 flex gap-2 relative z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors">
          View Profile
        </button>
        <button className="w-12 h-12 flex items-center justify-center border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-500">
          <Calendar size={18} />
        </button>
      </div>
    </motion.div>
  );
}

function ProfileDrawer({ client, isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && client && (
        <>
          <motion.div
            key="profile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            key="profile-content"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-2xl z-[70] overflow-y-auto"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-10">
                <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all">
                  <X size={24} />
                </button>
                <div className="flex gap-3">
                  <button className="px-5 py-3 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                    Edit Client
                  </button>
                  <button className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                    <Share2 size={20} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-6 mb-12">
                <div className="relative">
                  <img 
                    src={client.image} 
                    alt={client.name} 
                    className="w-24 h-24 rounded-[32px] object-cover border-4 border-indigo-50 shadow-xl shadow-indigo-100"
                  />
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-lg flex items-center justify-center text-indigo-600 border border-indigo-50">
                    <Zap size={20} fill="currentColor" className="opacity-20" />
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{client.name}</h2>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {client.status}
                    </span>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">ID: {client.id}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-12">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Current Package</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <p className="text-sm font-black text-slate-900">{client.package}</p>
                      <p className="text-xs font-bold text-indigo-600">Ends Jun 15</p>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 w-3/4 rounded-full" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500">18 of 24 sessions completed</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Assigned Trainer</p>
                  <div className="flex items-center gap-4">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${client.trainer}`} 
                      className="w-12 h-12 rounded-2xl" 
                    />
                    <div>
                      <p className="text-sm font-black text-slate-900">{client.trainer}</p>
                      <p className="text-[10px] font-bold text-slate-400">Senior Coach • Morning Shift</p>
                    </div>
                  </div>
                </div>
              </div>

              <section className="mb-12">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Activity size={16} />
                  Body Metric Snapshots
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Weight</p>
                    <p className="text-lg font-black text-slate-900">{client.metrics.weight}</p>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-2">
                      <TrendingUp size={12} />
                      -1.2 kg
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Body Fat</p>
                    <p className="text-lg font-black text-slate-900">{client.metrics.bodyFat}</p>
                    <div className="flex items-center gap-1 text-[10px] text-rose-600 font-bold mt-2">
                      <TrendingUp size={12} />
                      +0.4%
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">BMI</p>
                    <p className="text-lg font-black text-slate-900">{client.metrics.bmi}</p>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-2">
                      <TrendingDown size={12} />
                      Optimal
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-12">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Calendar size={16} />
                  Session History
                </h3>
                <div className="space-y-4">
                  {[1, 2, 3].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                          {20 - i}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">Functional Strength Training</p>
                          <p className="text-[10px] font-bold text-slate-400">May {18-i}, 2026 • 08:30 AM</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Completed</span>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-6 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-black text-slate-400 uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-500 transition-all">
                  View Full History
                </button>
              </section>

              <div className="p-8 bg-indigo-900 rounded-[40px] text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 blur-3xl -mr-20 -mt-20" />
                <h4 className="text-xl font-black tracking-tight mb-2">Schedule Next Session</h4>
                <p className="text-indigo-200 text-xs font-medium leading-relaxed mb-6">Book the next transformation session for {client.name}. Ensure trainer availability.</p>
                <button className="w-full bg-white text-indigo-900 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/20">
                  <Calendar size={16} />
                  Open Planner
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

export default function PTClients() {
  const [viewMode, setViewMode] = useState("grid");
  const [selectedClient, setSelectedClient] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("active");

  const filteredClients = useMemo(() => {
    return MOCK_PT_CLIENTS.filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          client.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === "all" || client.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  const handleClientClick = (client) => {
    setSelectedClient(client);
    setIsDrawerOpen(true);
  };

  return (
    <div className="min-h-full bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100">
      {/* 5. TOP UTILITY HEADER */}
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span className="opacity-60">Personal Training</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold">PT Clients</span>
        </div>

        <div className="flex-1 max-w-2xl px-12">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search client, trainer, PT package, fitness goal..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center gap-2">
            <Plus size={16} />
            Add PT Client
          </button>
          <div className="h-8 w-px bg-slate-200 mx-1" />
          <button className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500">
            <Calendar size={18} />
          </button>
          <button className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500">
            <Download size={18} />
          </button>
        </div>
      </header>

      <main className="p-8 pb-24">
        {/* 6. PAGE TITLE SECTION */}
        <section className="flex justify-between items-end mb-10">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">PT Clients</h1>
            <p className="text-slate-500 font-medium max-w-2xl">
              Manage personal training clients, transformation journeys, session schedules, progress tracking, and coaching operations.
            </p>
          </div>
          <div className="flex gap-2">
            {["Progress Tracking", "Session Scheduling", "Transformation Insights"].map((tag) => (
              <span key={tag} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* 7. KPI ANALYTICS STRIP */}
        <section className="grid grid-cols-8 gap-4 mb-10">
          {PT_ANALYTICS.map((item) => (
            <KPICard key={item.id} item={item} />
          ))}
        </section>

        {/* 8. MAIN WORKSPACE STRUCTURE */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* 9. LEFT PANEL → CLIENT GROUPS & QUICK FILTERS */}
          <aside className="col-span-2 space-y-8 sticky top-24 h-fit">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Quick Filters</h3>
              <div className="space-y-1">
                {PT_CLIENT_GROUPS.map((group) => {
                  const Icon = group.icon;
                  return (
                    <button 
                      key={group.id}
                      onClick={() => setActiveFilter(group.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${activeFilter === group.id ? 'bg-white shadow-md border-indigo-100 ring-1 ring-indigo-50' : 'hover:bg-slate-100'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${group.bg} ${group.color}`}>
                          <Icon size={14} />
                        </div>
                        <span className={`text-[11px] font-bold ${activeFilter === group.id ? 'text-slate-900' : 'text-slate-500'}`}>{group.label}</span>
                      </div>
                      <span className={`text-[10px] font-black ${activeFilter === group.id ? 'text-indigo-600' : 'text-slate-400'}`}>{group.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Client Groups</h3>
              <div className="space-y-2">
                {FITNESS_GOALS.map((goal) => (
                  <label key={goal} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-bold text-slate-500 group-hover:text-slate-900 transition-colors">{goal}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 blur-2xl -mr-12 -mt-12 transition-all group-hover:bg-indigo-500/40" />
              <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Pro Tip</p>
              <p className="text-xs font-bold leading-relaxed mb-4">Use AI Insights to identify clients at risk of churn.</p>
              <button className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2 hover:text-indigo-300 transition-colors">
                View Reports <ChevronRight size={12} />
              </button>
            </div>
          </aside>

          {/* 10. CENTER WORKSPACE → PT CLIENT GRID / TABLE */}
          <section className="col-span-7 space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex gap-1">
                <button 
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode("table")}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <List size={18} />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-xs font-bold text-slate-400">Showing {filteredClients.length} of {MOCK_PT_CLIENTS.length} clients</p>
                <div className="h-4 w-px bg-slate-200" />
                <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">
                  <Filter size={16} />
                  Filters
                </button>
              </div>
            </div>

            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredClients.map((client) => (
                    <ClientCard 
                      key={client.id} 
                      client={client} 
                      onClick={handleClientClick} 
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trainer</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sessions Left</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => handleClientClick(client)}>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <img src={client.image} className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                            <div>
                              <p className="text-sm font-black text-slate-900 leading-tight">{client.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{client.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-bold text-slate-700">{client.trainer}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">{client.totalSessions - client.sessionsCompleted}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">of {client.totalSessions}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${client.attendanceRate}%` }} />
                            </div>
                            <span className="text-xs font-black text-slate-900">{client.attendanceRate}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            client.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 
                            client.status === 'expiring' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {client.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                            <MoreHorizontal size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 13. RIGHT PANEL → PT INTELLIGENCE SYSTEM */}
          <aside className="col-span-3 space-y-8 sticky top-24 h-fit">
            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <BrainCircuit size={20} />
                </div>
              </div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">AI PT Insights</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-1 h-10 bg-amber-400 rounded-full" />
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-snug">7 PT clients nearing package expiry within 5 days.</p>
                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2 hover:underline">Send Reminders</button>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 h-10 bg-emerald-400 rounded-full" />
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-snug">Weight loss program engagement increased 12% this week.</p>
                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2 hover:underline">View Progress</button>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 h-10 bg-rose-400 rounded-full" />
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-snug">Client "Rohan Verma" missed 2 sessions. Risk of churn.</p>
                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2 hover:underline">Contact Trainer</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Live Session Status</h3>
              <div className="space-y-5">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Trainer${i}`} className="w-10 h-10 rounded-xl" />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 leading-none mb-1">Coach Vikram</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Leg Transformation</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-900">42m / 60m</p>
                      <div className="w-12 h-1 bg-slate-100 rounded-full mt-1">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '70%' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-4 bg-slate-50 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-colors">
                View All Live Sessions
              </button>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 rounded-[40px] text-white relative overflow-hidden shadow-2xl shadow-indigo-100">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16" />
              <Crown className="w-10 h-10 text-white/20 mb-6" />
              <h4 className="text-xl font-black tracking-tight mb-2">Transformation Leaderboard</h4>
              <p className="text-indigo-100 text-[11px] font-medium leading-relaxed mb-6">Top performing clients this month based on engagement & progress.</p>
              <button className="w-full bg-white text-indigo-600 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-xl">
                View Leaderboard
              </button>
            </div>
          </aside>
        </div>

        {/* 20. BOTTOM ANALYTICS SECTION */}
        <section className="mt-16 grid grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Revenue Trends</h3>
              <select className="bg-slate-50 border-none text-[10px] font-black uppercase tracking-widest text-slate-500 rounded-lg focus:ring-0">
                <option>Last 6 Months</option>
                <option>Year to Date</option>
              </select>
            </div>
            <div className="h-48 flex items-end gap-3 px-2">
              {[40, 65, 45, 90, 75, 100].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    className="w-full bg-slate-100 rounded-t-xl group-hover:bg-indigo-500 transition-colors relative"
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      ₹{h}k
                    </div>
                  </motion.div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8">Client Distribution</h3>
            <div className="flex items-center justify-between gap-8">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="64" cy="64" r="54" fill="none" stroke="#f1f5f9" strokeWidth="20" />
                  <circle cx="64" cy="64" r="54" fill="none" stroke="#6366f1" strokeWidth="20" strokeDasharray="339" strokeDashoffset="100" strokeLinecap="round" />
                  <circle cx="64" cy="64" r="54" fill="none" stroke="#10b981" strokeWidth="20" strokeDasharray="339" strokeDashoffset="240" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-900">142</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full" />
                    <span className="text-xs font-bold text-slate-500">Weight Loss</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">45%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                    <span className="text-xs font-bold text-slate-500">Muscle Gain</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">30%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full" />
                    <span className="text-xs font-bold text-slate-500">Other</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">25%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[40px] text-white flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400">Monthly PT Goal</h3>
                <Target className="text-indigo-400 opacity-40" />
              </div>
              <p className="text-4xl font-black tracking-tight mb-2">₹8,42,000</p>
              <p className="text-slate-400 text-xs font-medium">Earned this month vs. ₹10,00,000 target</p>
            </div>
            <div className="space-y-4 mt-8">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Progress to Goal</span>
                <span className="text-sm font-black">84.2%</span>
              </div>
              <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "84.2%" }}
                  className="h-full bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50"
                />
              </div>
              <button className="w-full mt-4 py-4 border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors">
                View Revenue Breakdown
              </button>
            </div>
          </div>
        </section>
      </main>

      <ProfileDrawer 
        client={selectedClient} 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />
    </div>
  );
}

// ─────────────────────────────────────────
// MOUNTING FUNCTION
// ─────────────────────────────────────────
export const mountPTClients = () => {
  const container = document.querySelector('[data-stage="personal-training"]');
  if (!container) return null;
  
  const root = createRoot(container);
  root.render(<PTClients />);
  return root;
};
