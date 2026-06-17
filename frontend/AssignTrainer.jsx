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
  Brain,
  Hash,
  Info,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  PlusCircle,
  MessageCircle,
  CalendarDays,
  Clock3,
  Check,
  Smartphone,
  CreditCard,
  History,
  Target,
  Dumbbell,
  Stethoscope,
  Wind,
  Layers,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────
// CONSTANTS & MOCK DATA
// ─────────────────────────────────────────

const KPIS = [
  { id: 1, label: "Active Assignments", value: "128", trend: "+12.5%", isUp: true, subtext: "14 new this week" },
  { id: 2, label: "Available Trainers", value: "8", trend: "-2", isUp: false, subtext: "On floor now" },
  { id: 3, label: "PT Sessions Today", value: "42", trend: "+8.1%", isUp: true, subtext: "12 morning, 30 evening" },
  { id: 4, label: "Overbooked Trainers", value: "3", trend: "+1", isUp: false, subtext: "Action required" },
  { id: 5, label: "Pending Assignments", value: "18", trend: "-5", isUp: true, subtext: "Awaiting approval" },
  { id: 6, label: "Trainer Utilization %", value: "84%", trend: "+2.4%", isUp: true, subtext: "Peak efficiency" },
  { id: 7, label: "Avg PT Load", value: "12", trend: "Stable", isUp: true, subtext: "Sessions / week" },
  { id: 8, label: "Member Satisfaction", value: "4.9", trend: "+0.2", isUp: true, subtext: "Based on 120 reviews" }
];

const MOCK_MEMBERS = [
  {
    id: "MBR-9042",
    name: "Arjun Mehta",
    phone: "+91 98765 43210",
    email: "arjun.m@example.com",
    status: "Active",
    plan: "Pro Annual Elite",
    expiry: "2026-08-15",
    attendance: "85%",
    goals: ["Muscle Gain", "Strength", "Endurance"],
    currentTrainer: "None",
    ptPackage: "None",
    sessionsRemaining: 0,
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun",
    notes: "Prefers morning sessions. Needs focus on deadlift form."
  },
  {
    id: "MBR-8821",
    name: "Sneha Kapoor",
    phone: "+91 98111 22233",
    email: "sneha.k@example.com",
    status: "Active",
    plan: "Standard Monthly",
    expiry: "2026-05-28",
    attendance: "92%",
    goals: ["Weight Loss", "Yoga"],
    currentTrainer: "Sneha Patel",
    ptPackage: "12 Sessions Yoga",
    sessionsRemaining: 4,
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha",
    notes: "Requires rehabilitation-focused training for knee."
  }
];

const MOCK_TRAINERS = [
  {
    id: "TR-101",
    name: "Ankit Kumar",
    specialization: "Strength & Conditioning",
    experience: "8 years",
    status: "available",
    availability: "Available Now",
    rating: 4.9,
    activeClients: 12,
    sessionsToday: 5,
    utilization: 78,
    branch: "Main Branch",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ankit",
    certifications: ["NSCA-CPT", "Precision Nutrition"],
    slots: [
      { time: "06:00 AM", status: "occupied" },
      { time: "07:00 AM", status: "occupied" },
      { time: "08:00 AM", status: "free" },
      { time: "09:00 AM", status: "free" },
      { time: "10:00 AM", status: "occupied" }
    ]
  },
  {
    id: "TR-102",
    name: "Sneha Patel",
    specialization: "Yoga & Mindfulness",
    experience: "6 years",
    status: "busy",
    availability: "In Session",
    rating: 4.8,
    activeClients: 15,
    sessionsToday: 8,
    utilization: 94,
    branch: "Downtown",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha",
    certifications: ["RYT 500", "Holistic Nutrition"],
    slots: [
      { time: "06:00 AM", status: "occupied" },
      { time: "07:00 AM", status: "occupied" },
      { time: "08:00 AM", status: "occupied" },
      { time: "09:00 AM", status: "occupied" },
      { time: "10:00 AM", status: "occupied" }
    ]
  },
  {
    id: "TR-103",
    name: "Manav Rao",
    specialization: "CrossFit & HIIT",
    experience: "5 years",
    status: "available",
    availability: "Available Now",
    rating: 4.7,
    activeClients: 10,
    sessionsToday: 4,
    utilization: 65,
    branch: "Main Branch",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Manav",
    certifications: ["CrossFit L2", "Weightlifting"],
    slots: [
      { time: "06:00 AM", status: "free" },
      { time: "07:00 AM", status: "occupied" },
      { time: "08:00 AM", status: "free" },
      { time: "09:00 AM", status: "occupied" },
      { time: "10:00 AM", status: "free" }
    ]
  }
];

const TIMELINE_DATA = [
  { id: 1, type: "assignment", member: "Rohan Verma", trainer: "Ankit Kumar", time: "2 hours ago", status: "completed" },
  { id: 2, type: "renewal", member: "Aisha Khan", trainer: "Sneha Patel", time: "4 hours ago", status: "pending" },
  { id: 3, type: "change", member: "Karthik Rao", trainer: "Manav Rao", time: "Yesterday", status: "completed" }
];

// ─────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────

const StatCard = ({ kpi }) => (
  <article className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
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

const AssignTrainer = () => {
  const [viewMode, setViewMode] = useState("grid"); // grid | table
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState(MOCK_MEMBERS[0]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);

  const filteredTrainers = useMemo(() => {
    return MOCK_TRAINERS.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.specialization.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleAssignClick = (trainer) => {
    setSelectedTrainer(trainer);
    setIsDrawerOpen(true);
  };

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* 5. TOP UTILITY HEADER */}
      <header className="sticky top-0 z-50 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span className="hover:text-slate-900 cursor-pointer">Trainers & Staff</span>
          <ChevronRight size={14} className="opacity-40" />
          <span className="text-slate-900 font-bold">Assign Trainer</span>
        </div>

        <div className="flex-1 max-w-2xl px-12">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member, trainer, PT package, specialization..."
              className="w-full h-11 pl-12 pr-4 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-sm font-medium transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
            <History size={16} />
            Assignment History
          </button>
          <button className="h-10 px-6 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2">
            <Plus size={16} />
            New Assignment
          </button>
        </div>
      </header>

      <main className="p-8 max-w-[1600px] mx-auto">
        {/* 6. PAGE TITLE SECTION */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Assign Trainer</h1>
            <p className="text-slate-500 font-medium mt-1 max-w-[680px]">
              Assign trainers intelligently based on specialization, availability, workload, schedules, and member requirements.
            </p>
          </div>
          <div className="flex gap-2">
            {['PT Matching', 'Availability Engine', 'Smart Scheduling', 'Workload Insights'].map(pill => (
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

        <div className="grid grid-cols-12 gap-6">
          {/* MEMBER PROFILE */}
          <aside className="col-span-3 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 overflow-hidden">
                    <img src={selectedMember.image} alt={selectedMember.name} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 tracking-tight">{selectedMember.name}</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{selectedMember.id}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-md">
                      {selectedMember.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plan</span>
                    <p className="text-xs font-bold text-slate-800">{selectedMember.plan}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attendance</span>
                    <p className="text-xs font-bold text-slate-800">{selectedMember.attendance}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fitness Goals</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.goals.map(goal => (
                      <span key={goal} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* TRAINER GRID */}
          <section className="col-span-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {filteredTrainers.map(trainer => (
                <div key={trainer.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <div className="flex gap-4 mb-4">
                    <img src={trainer.image} alt="" className="w-12 h-12 rounded-xl bg-slate-50" />
                    <div>
                      <h4 className="font-black text-slate-900">{trainer.name}</h4>
                      <p className="text-[10px] font-bold text-slate-500">{trainer.specialization}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAssignClick(trainer)}
                    className="w-full h-10 rounded-xl bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    Assign Trainer
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* AI INSIGHTS */}
          <aside className="col-span-3 space-y-6">
            <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl">
              <h4 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap size={14} fill="white" />
                AI Insights
              </h4>
              <p className="text-xs font-medium text-indigo-100 leading-relaxed">
                {filteredTrainers[0]?.name} is the best match for {selectedMember.name}'s strength goals.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <AnimatePresence>
        {isDrawerOpen && (
          <div key="drawer-root">
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
              className="fixed right-0 top-0 bottom-0 w-[420px] bg-white z-[101] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black">Assign {selectedTrainer?.name}</h2>
                <button onClick={() => setIsDrawerOpen(false)}><X /></button>
              </div>
              <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Specialization</p>
                  <p className="font-black text-slate-900">{selectedTrainer?.specialization}</p>
                </div>
                <button className="w-full h-12 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest">
                  Confirm Assignment
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const mountAssignTrainer = () => {
  const container = document.querySelector('[data-stage="assign-trainer"]');
  if (!container) return null;
  const root = createRoot(container);
  root.render(<AssignTrainer />);
  return root;
};

export default AssignTrainer;
