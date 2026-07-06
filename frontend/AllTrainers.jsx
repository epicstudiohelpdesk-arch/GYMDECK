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
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────
// CONSTANTS & MOCK DATA
// ─────────────────────────────────────────

const SPECIALIZATIONS = [
  "Strength", "Cardio", "CrossFit", "Yoga", "Rehabilitation", "Nutrition"
];

const TRAINER_TYPES = [
  "Personal Trainer", "Group Instructor", "Nutritionist", "Yoga Coach"
];

const BRANCHES = ["Main Branch", "Downtown", "North Gym", "East Side"];

const MOCK_TRAINERS = [
  {
    id: "TR-101",
    name: "Ankit Kumar",
    specialization: "Strength & Conditioning",
    type: "Personal Trainer",
    branch: "Main Branch",
    experience: "Senior",
    status: "active", // active, busy, off-shift, leave
    availability: "Available Now",
    rating: 4.9,
    activeClients: 12,
    sessionsToday: 5,
    attendanceRate: 98,
    revenue: 85000,
    email: "ankit.k@gymdeck.com",
    phone: "+91 98765 43210",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ankit",
    certifications: ["NSCA-CPT", "Precision Nutrition Level 1"],
    shift: "06:00 - 14:00"
  },
  {
    id: "TR-102",
    name: "Sneha Patel",
    specialization: "Yoga & Mindfulness",
    type: "Yoga Coach",
    branch: "Downtown",
    experience: "Mid-Level",
    status: "busy",
    availability: "In Session",
    rating: 4.8,
    activeClients: 8,
    sessionsToday: 3,
    attendanceRate: 95,
    revenue: 42000,
    email: "sneha.p@gymdeck.com",
    phone: "+91 98111 22233",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha",
    certifications: ["RYT 500", "Holistic Nutrition Specialist"],
    shift: "07:30 - 15:30"
  },
  {
    id: "TR-103",
    name: "Manav Rao",
    specialization: "CrossFit & HIIT",
    type: "Group Instructor",
    branch: "Main Branch",
    experience: "Senior",
    status: "active",
    availability: "Available Now",
    rating: 4.7,
    activeClients: 15,
    sessionsToday: 6,
    attendanceRate: 92,
    revenue: 96000,
    email: "manav.r@gymdeck.com",
    phone: "+91 99000 12345",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Manav",
    certifications: ["CrossFit Level 2", "Olympic Weightlifting"],
    shift: "13:00 - 21:00"
  },
  {
    id: "TR-104",
    name: "Vikram Shah",
    specialization: "Rehabilitation",
    type: "Personal Trainer",
    branch: "North Gym",
    experience: "Senior",
    status: "off-shift",
    availability: "Off Duty",
    rating: 4.9,
    activeClients: 6,
    sessionsToday: 0,
    attendanceRate: 100,
    revenue: 55000,
    email: "vikram.s@gymdeck.com",
    phone: "+91 98450 67890",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram",
    certifications: ["DPT", "NASM-CES"],
    shift: "09:00 - 17:00"
  },
  {
    id: "TR-105",
    name: "Priya Nair",
    specialization: "Nutrition & Fat Loss",
    type: "Nutritionist",
    branch: "East Side",
    experience: "Mid-Level",
    status: "leave",
    availability: "On Leave",
    rating: 4.6,
    activeClients: 22,
    sessionsToday: 0,
    attendanceRate: 88,
    revenue: 38000,
    email: "priya.n@gymdeck.com",
    phone: "+91 91234 56789",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
    certifications: ["Certified Sports Nutritionist", "NASM-CPT"],
    shift: "10:00 - 18:00"
  }
];

// ─────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────

const KPICard = ({ label, value, trend, icon: Icon, tone }) => {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100"
  };

  return (
    <div className={`p-5 rounded-2xl border ${tones[tone]} flex flex-col gap-3 transition-all hover:shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg bg-white/60`}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/60`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-medium opacity-80 uppercase tracking-wider">{label}</p>
        <h3 className="text-2xl font-bold mt-1">{value}</h3>
      </div>
    </div>
  );
};

const TrainerCard = ({ trainer, onClick }) => {
  const statusColors = {
    active: "bg-emerald-500",
    busy: "bg-amber-500",
    "off-shift": "bg-slate-400",
    leave: "bg-rose-500"
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all group cursor-pointer"
      onClick={() => onClick(trainer)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="relative">
          <img src={trainer.image} alt={trainer.name} className="w-16 h-16 rounded-xl bg-slate-100 object-cover" />
          <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${statusColors[trainer.status]}`} />
        </div>
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
          <MoreVertical size={20} />
        </button>
      </div>

      <div className="mb-4">
        <h4 className="text-lg font-bold text-slate-900 leading-tight">{trainer.name}</h4>
        <p className="text-sm text-slate-500 font-medium">{trainer.specialization}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
            {trainer.experience}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin size={12} /> {trainer.branch}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 pt-4 border-t border-slate-50">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">PT Clients</p>
          <p className="text-sm font-bold text-slate-800">{trainer.activeClients}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Sessions Today</p>
          <p className="text-sm font-bold text-slate-800">{trainer.sessionsToday}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Attendance</p>
          <p className="text-sm font-bold text-slate-800">{trainer.attendanceRate}%</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Rating</p>
          <div className="flex items-center gap-1">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold text-slate-800">{trainer.rating}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
          View Profile
        </button>
        <button className="p-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
          <MessageSquare size={16} />
        </button>
      </div>
    </motion.div>
  );
};

const ProfileDrawer = ({ trainer, isOpen, onClose }) => {
  if (!trainer) return null;

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
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-2xl z-[101] overflow-y-auto"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trainer Profile</span>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex items-start gap-6 mb-10">
                <img src={trainer.image} alt={trainer.name} className="w-24 h-24 rounded-2xl bg-slate-100 shadow-sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold text-slate-900">{trainer.name}</h2>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                  <p className="text-slate-500 font-medium mt-1">{trainer.specialization}</p>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Shield size={16} />
                      <span className="text-sm font-semibold">{trainer.id}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <MapPin size={16} />
                      <span className="text-sm font-semibold">{trainer.branch}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Contact Email</p>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Mail size={14} className="text-slate-400" /> {trainer.email}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Phone Number</p>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" /> {trainer.phone}
                  </p>
                </div>
              </div>

              <section className="mb-10">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Award size={16} /> Expertise & Certifications
                </h4>
                <div className="flex flex-wrap gap-2">
                  {trainer.certifications.map((cert, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg border border-slate-100 bg-white text-xs font-bold text-slate-700 flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-emerald-500" /> {cert}
                    </span>
                  ))}
                </div>
              </section>

              <section className="mb-10">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Clock size={16} /> Shift & Schedule
                </h4>
                <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Standard Shift</p>
                      <p className="text-base font-bold text-slate-800 mt-1">{trainer.shift}</p>
                    </div>
                    <button className="text-xs font-bold text-indigo-600 hover:underline">Edit Shift</button>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-3">Today's Remaining Sessions</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">RV</div>
                          <div>
                            <p className="text-xs font-bold">Rohan Verma</p>
                            <p className="text-[10px] text-slate-400">Strength Training • 17:30</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Upcoming</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-10">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <BarChart3 size={16} /> Performance Metrics
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{trainer.activeClients}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Total Members</p>
                  </div>
                  <div className="text-center border-x border-slate-100">
                    <p className="text-2xl font-bold text-slate-900">₹{trainer.revenue / 1000}K</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Revenue (MTD)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{trainer.attendanceRate}%</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Punctuality</p>
                  </div>
                </div>
              </section>

              <div className="flex items-center gap-3 pt-4 sticky bottom-0 bg-white pb-8">
                <button className="flex-1 py-4 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                  Assign PT Client
                </button>
                <button className="flex-1 py-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all">
                  View Full Analytics
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default function AllTrainers() {
  const [viewMode, setViewMode] = useState("grid"); // grid or table
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filteredTrainers = useMemo(() => {
    return MOCK_TRAINERS.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           t.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = activeFilter === "All" || t.status === activeFilter.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  const handleTrainerClick = (trainer) => {
    setSelectedTrainer(trainer);
    setIsDrawerOpen(true);
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50/50">
      {/* ─────────────────────────────────────────
          TOP UTILITY HEADER
          ───────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white backdrop-blur-md border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <nav className="flex items-center text-sm font-medium">
            <span className="text-slate-400">Trainers & Staff</span>
            <ChevronRight size={16} className="text-slate-300 mx-2" />
            <span className="text-slate-900 font-bold">All Trainers</span>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-96 group">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search trainer, specialization, PT clients..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">⌘</span>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">K</span>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95">
            <Plus size={18} /> Add Trainer
          </button>
        </div>
      </header>

      <main className="p-8">
        {/* ─────────────────────────────────────────
            PAGE TITLE SECTION
            ───────────────────────────────────────── */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">All Trainers</h1>
            <p className="text-slate-500 font-medium mt-2 max-w-2xl">
              Manage trainers, PT staff, schedules, attendance, and operational performance across your fitness ecosystem.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {["PT Analytics", "Shift Management", "Payroll Insights", "Performance"].map((pill) => (
              <button key={pill} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                {pill}
              </button>
            ))}
          </div>
        </div>

        {/* ─────────────────────────────────────────
            KPI ANALYTICS STRIP
            ───────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-5 mb-10">
          <KPICard label="Total Trainers" value="18" icon={Users} tone="indigo" trend="+2 this month" />
          <KPICard label="Active PT Sessions" value="42" icon={Zap} tone="emerald" trend="8 active now" />
          <KPICard label="Trainers On Shift" value="7" icon={Clock} tone="blue" trend="Next shift: 14:00" />
          <KPICard label="PT Revenue Today" value="₹12.4K" icon={BarChart3} tone="amber" trend="15% above avg" />
          <KPICard label="Avg Rating" value="4.82" icon={Star} tone="rose" trend="Top 1% in sector" />
        </div>

        {/* ─────────────────────────────────────────
            SEARCH + FILTER TOOLBAR
            ───────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between mb-8 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filters</span>
            </div>
            
            <div className="h-6 w-px bg-slate-100" />

            <div className="flex items-center gap-3">
              <select className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
                <option>Specialization: All</option>
                {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
              </select>
              <select className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
                <option>Experience: All</option>
                <option>Junior</option>
                <option>Mid-Level</option>
                <option>Senior</option>
              </select>
              <select className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
                <option>Branch: All Branches</option>
                {BRANCHES.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg transition-all ${viewMode === "table" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────
            MAIN WORKSPACE
            ───────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* LEFT PANEL: QUICK FILTERS */}
          <aside className="col-span-2 space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Operational Status</p>
              {[
                { label: "All", count: 18, color: "bg-slate-500" },
                { label: "Active", count: 12, color: "bg-emerald-500" },
                { label: "Busy", count: 4, color: "bg-amber-500" },
                { label: "On Leave", count: 2, color: "bg-rose-500" }
              ].map((f) => (
                <button
                  key={f.label}
                  onClick={() => setActiveFilter(f.label)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeFilter === f.label ? "bg-white shadow-md border border-slate-100 ring-1 ring-slate-100" : "hover:bg-white/50 text-slate-500"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${f.color}`} />
                    <span className="text-sm font-bold">{f.label}</span>
                  </div>
                  <span className="text-xs font-bold opacity-40">{f.count}</span>
                </button>
              ))}
            </div>

            <div className="pt-6 border-t border-slate-200 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Staff Groups</p>
              {TRAINER_TYPES.map((type) => (
                <button key={type} className="w-full flex items-center justify-between p-3 rounded-xl text-slate-500 hover:bg-white/50 transition-all">
                  <span className="text-sm font-bold">{type}s</span>
                  <ChevronRight size={14} className="opacity-40" />
                </button>
              ))}
            </div>
          </aside>

          {/* CENTER: TRAINERS GRID / TABLE */}
          <section className="col-span-7">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredTrainers.map((trainer) => (
                    <TrainerCard key={trainer.id} trainer={trainer} onClick={handleTrainerClick} />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trainer</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Specialization</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workload</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrainers.map((trainer) => (
                      <tr 
                        key={trainer.id} 
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                        onClick={() => handleTrainerClick(trainer)}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img src={trainer.image} alt="" className="w-10 h-10 rounded-lg bg-slate-100" />
                            <div>
                              <p className="text-sm font-bold text-slate-900 leading-none">{trainer.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{trainer.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm font-semibold text-slate-600">{trainer.specialization}</td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between w-24">
                              <span className="text-[10px] font-bold text-slate-400">Utilization</span>
                              <span className="text-[10px] font-bold text-slate-700">75%</span>
                            </div>
                            <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: "75%" }} />
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-xs font-bold text-slate-800">₹{trainer.revenue / 1000}K</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Revenue</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{trainer.rating}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Rating</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${trainer.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <span className="text-xs font-bold text-slate-700 capitalize">{trainer.status}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* RIGHT PANEL: TRAINER INTELLIGENCE */}
          <aside className="col-span-3 space-y-6">
            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={18} className="text-indigo-200" />
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-100">AI Intelligence</span>
              </div>
              <h4 className="text-lg font-bold leading-tight mb-4">Trainer utilization increased 14% this week.</h4>
              <p className="text-sm text-indigo-100/80 leading-relaxed mb-6">
                3 trainers are nearing their overbooking threshold. Recommend redistributing 5 upcoming PT trials to Sneha.
              </p>
              <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/20">
                View Staff Recommendations
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Activity size={16} /> Live Staff Status
              </h4>
              <div className="space-y-4">
                {[
                  { name: "Ongoing PT Sessions", count: 8, trend: "+2" },
                  { name: "Available for Trials", count: 3, trend: "0" },
                  { name: "Shift Transitions (1h)", count: 2, trend: "-1" }
                ].map((s) => (
                  <div key={s.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{s.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Status: Stable</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900">{s.count}</p>
                      <span className="text-[10px] font-bold text-emerald-500">{s.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <TrendingUp size={16} /> Performance Snapshot
              </h4>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top Rated</span>
                    <span className="text-[10px] font-bold text-slate-900">Vikram Shah</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full">
                    <div className="h-full bg-rose-500" style={{ width: "98%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Highest Revenue</span>
                    <span className="text-[10px] font-bold text-slate-900">Manav Rao</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full">
                    <div className="h-full bg-emerald-500" style={{ width: "85%" }} />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* ─────────────────────────────────────────
            BOTTOM ANALYTICS & OPERATIONAL REPORTS
            ───────────────────────────────────────── */}
        <section className="mt-12 pt-12 border-t border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <PieChart size={24} className="text-indigo-600" /> Operational Workforce Analytics
            </h3>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                <Download size={14} /> Export Workforce Data
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                <Calendar size={14} /> View Shift Planner
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Revenue Leaderboard</p>
              <div className="space-y-4">
                {MOCK_TRAINERS.slice(0, 3).map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-300">0{i+1}</span>
                    <img src={t.image} alt="" className="w-8 h-8 rounded-lg bg-slate-50" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-800">{t.name}</p>
                      <div className="w-full h-1 bg-slate-50 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${80 - i*15}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-900">₹{t.revenue / 1000}K</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Staff Utilization</p>
              <div className="h-32 flex items-end gap-2 px-2">
                {[45, 68, 82, 91, 74, 56, 42].map((h, i) => (
                  <div key={i} className="flex-1 bg-slate-100 rounded-t-lg relative group">
                    <div 
                      className="absolute bottom-0 w-full bg-indigo-500/20 group-hover:bg-indigo-500 rounded-t-lg transition-all duration-500"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-[10px] font-bold text-slate-400">Mon</span>
                <span className="text-[10px] font-bold text-slate-400">Sun</span>
              </div>
            </div>

            <div className="col-span-2 bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Staffing Insight</p>
                  <h3 className="text-2xl font-bold max-w-sm leading-tight">Your trainer utilization is optimized for the morning shift.</h3>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-3xl font-black">74%</p>
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Avg Occupancy</p>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <div>
                    <p className="text-3xl font-black">₹4.2L</p>
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Projected Commission</p>
                  </div>
                  <button className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-xl shadow-indigo-900/40">
                    Review Payroll
                  </button>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 blur-[80px] rounded-full -ml-10 -mb-10" />
            </div>
          </div>
        </section>
      </main>

      <ProfileDrawer 
        trainer={selectedTrainer} 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />
    </div>
  );
}

// ─────────────────────────────────────────
// MOUNTING FUNCTION
// ─────────────────────────────────────────
export const mountAllTrainers = () => {
  const container = document.querySelector('[data-stage="trainers"]');
  if (!container) return null;
  
  const root = createRoot(container);
  root.render(<AllTrainers />);
  return root;
};
