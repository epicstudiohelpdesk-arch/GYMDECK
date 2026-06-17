import React, { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  Users,
  Search,
  RefreshCw,
  Download,
  Zap,
  Filter,
  MoreVertical,
  ChevronRight,
  TrendingUp,
  Clock,
  Activity,
  UserCheck,
  UserPlus,
  ArrowUpRight,
  MessageSquare,
  Calendar,
  BarChart3,
  X,
  FileText,
  AlertCircle,
  Mail,
  Phone,
  ArrowRight,
  Target,
  IndianRupee,
  Repeat,
  Award,
  ChevronDown,
  LayoutGrid,
  List,
  Sparkles,
  PieChart,
  ArrowUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────
// CONSTANTS & INITIAL DATA
// ─────────────────────────────────────────

const STATUS_OPTIONS = ["All", "Expired", "Cancelled", "Terminated"];
const POTENTIAL_OPTIONS = ["All", "High", "Medium", "Low"];

const getInitialPastMembers = () => {
  try {
    const stored = localStorage.getItem("gymdeck_past_members");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load past members from localStorage", e);
  }
  return [];
};

// ─────────────────────────────────────────
// REFINED UI COMPONENTS
// ─────────────────────────────────────────

const DashboardStat = ({ label, value, trend, icon: Icon, color }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2 rounded-xl bg-slate-50 ${color}`}>
        <Icon size={20} />
      </div>
      {trend && (
        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          <ArrowUp size={10} /> {trend}
        </span>
      )}
    </div>
    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
  </div>
);

const PastMemberCard = ({ member, onReactivate }) => {
  const scoreColors = {
    High: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Medium: "bg-amber-50 text-amber-600 border-amber-100",
    Low: "bg-slate-50 text-slate-400 border-slate-200"
  };

  const statusColors = {
    Expired: "bg-rose-50 text-rose-600",
    Cancelled: "bg-slate-100 text-slate-600",
    Terminated: "bg-red-50 text-red-600",
    Transferred: "bg-blue-50 text-blue-600"
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-3xl p-6 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all group flex flex-col"
    >
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={member.image} 
              alt={member.name} 
              className="w-14 h-14 rounded-2xl bg-slate-50 object-cover border border-slate-100"
            />
            <div className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter border shadow-sm ${statusColors[member.status]}`}>
              {member.status}
            </div>
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
              {member.name}
            </h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {member.formerPlan}
            </p>
          </div>
        </div>
        <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
          <MoreVertical size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-slate-50">
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Last Attendance</span>
          <p className="text-xs font-bold text-slate-700 mt-1">{member.lastAttendance}</p>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Days Inactive</span>
          <p className="text-xs font-bold text-rose-600 mt-1">{member.daysSinceExpiry} Days</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-auto">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest w-fit ${scoreColors[member.reactivationScore]}`}>
          <Zap size={12} className="fill-current" /> {member.reactivationScore} Potential
        </div>
        
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={12} className="text-indigo-500" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Reactivation Intelligence</span>
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed font-medium italic">
            "{member.intelligence}"
          </p>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Recovery Value</span>
            <p className="text-lg font-black text-slate-900">₹{member.potentialRevenue}</p>
          </div>
          <button 
            onClick={() => onReactivate(member)}
            className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95"
          >
            Reactivate
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default function PastMembers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [activePotential, setActivePotential] = useState("All");
  const [pastMembers, setPastMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPastMembers = async () => {
    if (window.__TAURI__) {
      try {
        const membersFromDb = await window.__TAURI__.core.invoke("get_past_members_command", { limit: 100, offset: 0 });
        
        // Map database model to the UI format
        const formattedMembers = membersFromDb.map(m => {
           return {
             id: m.member_code || m.id,
             name: m.full_name,
             formerPlan: "Basic Member", // You would join this properly in a full implementation
             status: "Terminated", 
             joinedDate: new Intl.DateTimeFormat('en-GB').format(new Date(m.joined_at)),
             expiryDate: m.expires_at ? new Intl.DateTimeFormat('en-GB').format(new Date(m.expires_at)) : "-",
             daysSinceExpiry: m.deleted_at ? Math.floor((new Date() - new Date(m.deleted_at)) / (1000 * 60 * 60 * 24)) : 0,
             lastAttendance: "-",
             reactivationScore: "Medium",
             potentialRevenue: 1999,
             reason: m.notes || "No reason provided",
             intelligence: "Transferred from active directory.",
             image: m.profile_photo_path || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.full_name}`,
             email: m.email || "Not provided",
             phone: m.phone
           };
        });
        
        setPastMembers(formattedMembers);
      } catch (err) {
        console.error("Failed to fetch past members from database", err);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Fallback for browser dev mode
      setPastMembers(getInitialPastMembers());
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPastMembers();

    // 1. Sync from memory event
    const handleMemberTransfer = (event) => {
      if (event.detail) {
        fetchPastMembers(); // Refresh from DB to guarantee source of truth
      }
    };

    // 2. Sync from local storage (fallback)
    const syncFromStorage = () => {
      if (!window.__TAURI__) {
         const latest = getInitialPastMembers();
         setPastMembers(latest);
      }
    };

    window.addEventListener('gymdeck:member-transferred', handleMemberTransfer);
    window.addEventListener('storage', syncFromStorage);
    
    // Also re-poll when the user clicks the "Past Members" navigation link
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-view="past-members"]')) {
        fetchPastMembers();
      }
    });

    return () => {
      window.removeEventListener('gymdeck:member-transferred', handleMemberTransfer);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  const filteredMembers = useMemo(() => {
    return pastMembers.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           m.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = activeStatus === "All" || m.status === activeStatus;
      const matchesPotential = activePotential === "All" || m.reactivationScore === activePotential;
      return matchesSearch && matchesStatus && matchesPotential;
    });
  }, [searchQuery, activeStatus, activePotential, pastMembers]);

  const totalRevenue = useMemo(() => {
    return pastMembers.reduce((acc, m) => acc + (Number(m.potentialRevenue) || 0), 0);
  }, [pastMembers]);

  return (
    <div className="flex flex-col min-h-full bg-[#f8fafc] p-6 lg:p-10 w-full max-w-full overflow-hidden">
      {/* ─────────────────────────────────────────
          HEADER SECTION (Alignment matching Directory)
          ───────────────────────────────────────── */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 mb-12">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-1 bg-indigo-600 rounded-full" />
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Revenue Recovery Hub</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-4">Past Members</h1>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            Manage former members, track churn reasons, and execute reactivation strategies. 
            This workspace is optimized for identifying and converting high-potential leads back into active members.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-sm font-bold text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
            <Download size={18} /> Export Data
          </button>
          <button className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95">
            <Target size={18} /> New Campaign
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────
          STATISTICS STRIP
          ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
        <DashboardStat label="Archive Total" value={pastMembers.length.toString()} icon={Users} color="text-slate-600" trend={pastMembers.length > 0 ? "New" : "0% this mo"} />
        <DashboardStat label="Critical Expired" value="0" icon={Clock} color="text-rose-600" trend="Last 7 days" />
        <DashboardStat label="High Potential" value={pastMembers.filter(m => m.reactivationScore === 'High').length.toString()} icon={Zap} color="text-emerald-600" trend="Hot Leads" />
        <DashboardStat label="Recoverable Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={IndianRupee} color="text-amber-600" />
        <DashboardStat label="Conversion Rate" value="0%" icon={Repeat} color="text-indigo-600" />
      </div>

      {/* ─────────────────────────────────────────
          MAIN WORKSPACE AREA
          ───────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-10 items-start">
        
        {/* CENTER: MEMBER REACTIVATION (9 COLS) */}
        <div className="col-span-12 xl:col-span-9 space-y-10">
          
          {/* SEARCH & FILTER TOOLBAR */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4 w-full 2xl:max-w-md">
              <div className="relative w-full">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search name or ID..." 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full 2xl:w-auto">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Status:</span>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                  {STATUS_OPTIONS.map(opt => (
                    <button 
                      key={opt}
                      onClick={() => setActiveStatus(opt)}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeStatus === opt ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="hidden sm:block h-8 w-px bg-slate-200" />
              <div className="flex items-center gap-2 shrink-0">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Potential:</span>
                 <select 
                   className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none cursor-pointer"
                   value={activePotential}
                   onChange={(e) => setActivePotential(e.target.value)}
                 >
                   {POTENTIAL_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                 </select>
              </div>
            </div>
          </div>

          {/* GRID VIEW */}
          {filteredMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {filteredMembers.map(member => (
                  <PastMemberCard key={member.id} member={member} onReactivate={() => {}} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="py-40 text-center bg-white border border-slate-200 rounded-[40px] shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                 <Users size={32} className="text-slate-200" />
              </div>
              <h3 className="text-xl font-black text-slate-900">No records matched</h3>
              <p className="text-slate-500 font-medium mt-2">Try adjusting your filters or search keywords.</p>
              <button 
                onClick={() => { setSearchQuery(""); setActiveStatus("All"); setActivePotential("All"); }}
                className="mt-8 px-8 py-3 bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
              >
                Reset Dashboard
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: INTELLIGENCE SIDEBAR (3 COLS) */}
        <aside className="col-span-12 xl:col-span-3 space-y-8">
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-8">
              <TrendingUp size={20} className="text-indigo-600" /> Reactivation Insights
            </h3>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Churn Driver</span>
                {[
                  { label: "Relocation", value: 0, color: "bg-indigo-500" },
                  { label: "Pricing", value: 0, color: "bg-rose-500" },
                  { label: "Attendance Drop", value: 0, color: "bg-amber-500" }
                ].map(item => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-700">{item.label}</span>
                      <span className="text-slate-400">{item.value}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 1 }}
                        className={`h-full ${item.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-slate-100 grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg. Return</p>
                    <p className="text-lg font-black text-slate-900">0 Mo</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Est. Recovery</p>
                    <p className="text-lg font-black text-slate-900">₹0</p>
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-200">
            <div className="relative z-10 flex flex-col h-full">
               <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                  <Sparkles size={20} className="text-indigo-300" />
               </div>
               <h4 className="text-xl font-black leading-tight mb-4">Focus on "Hot" leads today.</h4>
               <p className="text-sm text-slate-400 leading-relaxed font-medium mb-8">
                 We recommend launching the "Welcome Back" campaign for high-potential members when data is available.
               </p>
               <button className="w-full py-4 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-900/20 hover:bg-indigo-500 transition-all">
                  Launch AI Campaign
               </button>
            </div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/20 blur-[80px] rounded-full -mr-20 -mt-20" />
          </div>

          <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Retention Pulse</h4>
             <div className="h-32 flex items-end gap-2 px-2">
                {[0, 0, 0, 0, 0, 0, 0].map((h, i) => (
                  <div key={i} className="flex-1 bg-slate-50 rounded-lg relative group">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="absolute bottom-0 w-full bg-indigo-500/10 group-hover:bg-indigo-500 rounded-lg transition-all"
                    />
                  </div>
                ))}
             </div>
             <div className="flex justify-between mt-4">
                <span className="text-[9px] font-bold text-slate-300">Mon</span>
                <span className="text-[9px] font-bold text-slate-300">Sun</span>
             </div>
          </div>
        </aside>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MOUNTING FUNCTION
// ─────────────────────────────────────────
export const mountPastMembers = () => {
  const container = document.querySelector('[data-stage="past-members"]');
  if (!container) return null;
  
  const root = createRoot(container);
  root.render(<PastMembers />);
  return root;
};
