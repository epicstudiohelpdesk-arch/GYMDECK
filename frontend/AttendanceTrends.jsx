import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo } from "react";
import {
  Users,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  PieChart,
  Zap,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Search,
  Filter,
  Download,
  FileText,
  Plus,
  RefreshCcw,
  ArrowRightCircle,
  MapPin,
  Award,
  Shield,
  Star,
  Smartphone,
  Info,
  Layers,
  FileSpreadsheet,
  Printer,
  History,
  Settings,
  MoreVertical,
  Timer,
  CloudSun,
  Moon,
  Flame,
  UserCheck,
  UserMinus,
  Navigation
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createRoot } from "react-dom/client";

// ─────────────────────────────────────────
// CONSTANTS & MOCK DATA
// ─────────────────────────────────────────

const BRANCHES = ["All Branches", "Main Branch", "Downtown", "North Gym", "East Side"];

const ATTENDANCE_CATEGORIES = [
  { id: "general", label: "General Gym", icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
  { id: "pt", label: "PT Sessions", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
  { id: "yoga", label: "Yoga Classes", icon: CloudSun, color: "text-indigo-500", bg: "bg-indigo-50" },
  { id: "hiit", label: "HIIT Batch", icon: Zap, color: "text-emerald-500", bg: "bg-emerald-50" },
  { id: "zumba", label: "Zumba", icon: Moon, color: "text-purple-500", bg: "bg-purple-50" }
];

const MOCK_PEAK_HOURS = [
  { hour: "06 AM", val: 45 }, { hour: "07 AM", val: 85 }, { hour: "08 AM", val: 95 },
  { hour: "09 AM", val: 70 }, { hour: "10 AM", val: 40 }, { hour: "11 AM", val: 25 },
  { hour: "12 PM", val: 15 }, { hour: "01 PM", val: 20 }, { hour: "02 PM", val: 18 },
  { hour: "03 PM", val: 30 }, { hour: "04 PM", val: 55 }, { hour: "05 PM", val: 80 },
  { hour: "06 PM", val: 100 }, { hour: "07 PM", val: 92 }, { hour: "08 PM", val: 75 },
  { hour: "09 PM", val: 45 }, { hour: "10 PM", val: 20 }
];

const MOCK_DAILY_STATS = [
  { day: "Mon", checkins: 245 }, { day: "Tue", checkins: 210 }, { day: "Wed", checkins: 265 },
  { day: "Thu", checkins: 230 }, { day: "Fri", checkins: 280 }, { day: "Sat", checkins: 195 },
  { day: "Sun", checkins: 150 }
];

const ENGAGEMENT_RECORDS = [
  { id: "MEM-4421", name: "Rahul Sharma", tier: "Elite", branch: "Main Branch", streak: "12 Days", lastCheckin: "Today, 07:15 AM", status: "Active", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul" },
  { id: "MEM-4422", name: "Anjali Gupta", tier: "Pro", branch: "Downtown", streak: "4 Days", lastCheckin: "Today, 08:30 AM", status: "Active", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali" },
  { id: "MEM-4423", name: "Vikram Malhotra", tier: "Elite", branch: "Main Branch", streak: "0 Days", lastCheckin: "Yesterday, 06:45 PM", status: "Inactive", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram" },
  { id: "MEM-4424", name: "Sanya Iyer", tier: "Basic", branch: "North Gym", streak: "22 Days", lastCheckin: "Today, 09:10 AM", status: "Active", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sanya" },
  { id: "MEM-4425", name: "Amit Verma", tier: "Pro Plus", branch: "East Side", streak: "1 Day", lastCheckin: "Today, 10:20 AM", status: "Active", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit" }
];

// ─────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────

const KPICard = ({ title, value, trend, isUp, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm flex flex-col justify-between group hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-default relative overflow-hidden"
  >
    <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
       {Icon && <Icon size={120} />}
    </div>
    
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-current transition-transform group-hover:scale-110`}>
        {Icon && <Icon size={18} className={color.replace("bg-", "text-")} />}
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
        {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {trend}
      </div>
    </div>
    <div className="relative z-10">
      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 block mb-1">
        {title}
      </span>
      <strong className="text-xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
        {value}
      </strong>
    </div>
  </motion.div>
);

const AttendanceTrends = () => {
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="attendance-analytics-shell font-sans text-slate-900 selection:bg-indigo-100">
      {/* 5. TOP UTILITY HEADER */}
      <header className="relative z-50 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-slate-400" />
            <span>Reports & Analysis</span>
          </div>
          <ChevronRight size={14} className="opacity-40" />
          <span className="text-slate-900 font-bold font-sans">Attendance Trends</span>
        </div>

        <div className="flex-1 max-w-xl mx-12 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search members, peak hours, branch stats..."
            className="w-full h-11 pl-12 pr-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all focus:bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
            {["Live View", "Reports", "Heatmap"].map((btn) => (
              <button key={btn} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 hover:bg-white transition-all">
                {btn}
              </button>
            ))}
          </div>
          <button className="h-10 px-6 rounded-xl bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-[0.15em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2">
            <RefreshCcw size={16} />
            Generate Trends
          </button>
        </div>
      </header>

      {/* 6. PAGE TITLE SECTION */}
      <div className="flex justify-between items-end mb-2 relative z-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Attendance Trends</h1>
          <p className="text-slate-500 text-xs font-semibold mt-2 max-w-[760px]">
            Analyze gym occupancy, peak hours, member engagement streaks, and facility utilization patterns across your ecosystem.
          </p>
        </motion.div>
        <div className="flex gap-2">
          {["Occupancy", "Peak Hours", "Retention AI", "Shift Analytics"].map((pill, idx) => (
            <motion.button 
              key={pill} 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
              className="px-5 py-2.5 rounded-full bg-white border border-slate-200 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-50/50 transition-all"
            >
              {pill}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 7. KPI ANALYTICS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-2 relative z-10">
        <KPICard title="Check-ins Today" value="428" trend="+14.2%" isUp={true} icon={UserCheck} color="bg-indigo-600" delay={0.05} />
        <KPICard title="Peak Occupancy" value="92%" trend="+8.1%" isUp={true} icon={Flame} color="bg-rose-500" delay={0.1} />
        <KPICard title="Avg. Duration" value="72m" trend="+5.2%" isUp={true} icon={Timer} color="bg-blue-500" delay={0.15} />
        <KPICard title="Retention Rate" value="84%" trend="+2.4%" isUp={true} icon={Award} color="bg-emerald-500" delay={0.2} />
        <KPICard title="Morning Batch" value="184" trend="-4.2%" isUp={false} icon={CloudSun} color="bg-amber-500" delay={0.25} />
        <KPICard title="Evening Batch" value="244" trend="+6.1%" isUp={true} icon={Moon} color="bg-purple-500" delay={0.3} />
        <KPICard title="Weekly Growth" value="+12%" trend="Stable" isUp={true} icon={Activity} delay={0.35} color="bg-cyan-500" />
        <KPICard title="Inactive (7D)" value="42" trend="-8%" isUp={true} icon={UserMinus} color="bg-slate-500" delay={0.4} />
      </div>

      <div className="attendance-analytics-workspace">
        {/* 8. DATE FILTER & CONTROL BAR */}
        <section className="attendance-analytics-workspace-sticky-header">
           <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                 {["Today", "Last 7 Days", "Last 30 Days", "Monthly", "Annual"].map(range => (
                   <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      dateRange === range ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                   >
                     {range}
                   </button>
                 ))}
              </div>
           </div>

           <div className="flex items-center gap-4">
              <select 
                className="h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 focus:outline-none cursor-pointer"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                {BRANCHES.map(b => <option key={b}>{b}</option>)}
              </select>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 {["PDF", "Excel", "Print"].map(fmt => (
                   <button key={fmt} className="w-10 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-all">
                      {fmt === "PDF" && <FileText size={14} />}
                      {fmt === "Excel" && <FileSpreadsheet size={14} />}
                      {fmt === "Print" && <Printer size={14} />}
                   </button>
                 ))}
              </div>
           </div>
        </section>

        {/* 9. MAIN WORKSPACE STRUCTURE */}
        <div className="grid grid-cols-12 gap-8 items-start">
          
          {/* 10. LEFT PANEL → CATEGORIES (2 cols) */}
          <aside className="col-span-12 lg:col-span-2 space-y-8 sticky top-48">
             <section>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-4">Operational Filters</span>
                <div className="space-y-2">
                  {[
                    { label: "High Occupancy", color: "bg-rose-500", count: "90%+" },
                    { label: "Active Streaks", color: "bg-emerald-500", count: "124" },
                    { label: "Churn Risk", color: "bg-amber-500", count: "18" },
                    { label: "Peak Load", color: "bg-indigo-500", count: "06 PM" }
                  ].map((filter, i) => (
                    <button key={i} className="w-full flex items-center gap-3 px-4 py-3 rounded-[16px] border border-slate-200 bg-white hover:border-indigo-500 hover:bg-indigo-50/20 transition-all group">
                      <span className={`w-2 h-2 rounded-full ${filter.color}`} />
                      <span className="text-[11px] font-bold text-slate-600 flex-1 text-left">{filter.label}</span>
                      <span className="text-[9px] font-black text-slate-400">{filter.count}</span>
                    </button>
                  ))}
                </div>
             </section>

             <section className="bg-white border border-slate-200 p-5 rounded-[24px]">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-4">Activity Segments</span>
                <nav className="space-y-1">
                  {ATTENDANCE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all group ${
                        activeCategory === cat.id ? "bg-[#0F172A] text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${activeCategory === cat.id ? "bg-white/10" : "bg-slate-100"}`}>
                        <cat.icon size={14} />
                      </div>
                      <span className="truncate uppercase tracking-widest text-[9px] font-black">{cat.label}</span>
                    </button>
                  ))}
                </nav>
             </section>
          </aside>

          {/* 11. CENTER WORKSPACE → MAIN ANALYTICS ENGINE (7 cols) */}
          <div className="col-span-12 lg:col-span-7 space-y-8">
            
            {/* SECTION 1 → PEAK HOURS CHART */}
            <div className="bg-white rounded-[32px] border border-slate-200 p-10 shadow-sm relative overflow-hidden group">
               <div className="flex justify-between items-start mb-10 relative z-10">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1 uppercase">Peak Hour Analysis</h2>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gym Occupancy Heatmap</span>
                  </div>
                  <div className="flex gap-2">
                     <button className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[9px] font-black uppercase text-indigo-600">Hourly</button>
                     <button className="px-3 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[9px] font-black uppercase text-slate-500 hover:bg-white transition-all">Heatmap</button>
                  </div>
               </div>

               <div className="h-[320px] flex items-end justify-between gap-2 px-4 mb-12 group/chart">
                  {MOCK_PEAK_HOURS.map((h, i) => (
                    <div key={i} className="flex-1 relative group/bar h-full flex flex-col justify-end">
                       <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${h.val}%` }}
                        className={`w-full rounded-t-lg transition-all duration-700 relative overflow-hidden ${
                          h.val > 80 ? "bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]" : 
                          h.val > 60 ? "bg-indigo-500/80" : "bg-slate-100 group-hover/chart:bg-slate-50 hover:!bg-indigo-400"
                        }`}
                       />
                       <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-300 uppercase whitespace-nowrap rotate-[-45deg]">
                          {h.hour}
                       </div>
                       
                       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none z-20">
                          <div className="bg-[#0F172A] text-white px-3 py-2 rounded-xl shadow-2xl text-center border border-slate-700">
                             <span className="block text-[8px] font-black text-indigo-400 uppercase mb-1">{h.hour}</span>
                             <strong className="block text-xs font-black">{h.val}% Capacity</strong>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="flex gap-8 border-t border-slate-50 pt-8 mt-4">
                  <div className="flex items-center gap-3">
                     <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]" />
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Peak Load</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-3 h-3 rounded-full bg-indigo-400 opacity-50" />
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Normal Ops</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-3 h-3 rounded-full bg-slate-100" />
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Off-Peak</span>
                  </div>
               </div>
            </div>

            {/* SECTION 2 → ENGAGEMENT TABLE */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Recent Engagement</h2>
                  <div className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[9px] font-black text-emerald-600 uppercase tracking-widest">Live Flow</div>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-white border-b border-slate-50">
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Member Identity</th>
                           <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Check-in Time</th>
                           <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Streak</th>
                           <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Branch</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {ENGAGEMENT_RECORDS.map((rec, idx) => (
                           <motion.tr 
                              key={rec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                              className="hover:bg-slate-50/80 transition-all group cursor-pointer"
                           >
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                       <img src={rec.image} alt={rec.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                       <span className="block text-[12px] font-black text-slate-900 leading-tight mb-0.5">{rec.name}</span>
                                       <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">{rec.tier} Member</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-5 text-[11px] font-bold text-slate-600 uppercase">{rec.lastCheckin}</td>
                              <td className="px-6 py-5">
                                 <div className="flex items-center gap-2">
                                    <Flame size={14} className="text-orange-500" />
                                    <span className="text-[11px] font-black text-slate-900 uppercase">{rec.streak}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase">{rec.branch}</td>
                              <td className="px-8 py-5 text-right">
                                 <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                    rec.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                 }`}>
                                    {rec.status}
                                 </span>
                              </td>
                           </motion.tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          </div>

          {/* 12. RIGHT PANEL → AI & ANALYTICS INTELLIGENCE (3 cols) */}
          <aside className="col-span-12 lg:col-span-3 space-y-6 sticky top-48">
             <section className="bg-[#0F172A] border border-slate-800 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Zap size={120} className="text-indigo-400" />
               </div>
               
               <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <Zap size={24} />
                     </div>
                     <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Engagement AI</h2>
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Retention Intelligence</span>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="p-5 rounded-[24px] bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all cursor-default group/item">
                        <div className="flex gap-4">
                           <Users size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                           <p className="text-[13px] font-medium text-slate-300 leading-relaxed">
                              Morning batch engagement up <span className="font-black text-white">22%</span>. Opportunity for new class slot at 08 AM.
                           </p>
                        </div>
                     </div>
                     <div className="p-5 rounded-[24px] bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all cursor-default group/item">
                        <div className="flex gap-4">
                           <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                           <p className="text-[13px] font-medium text-slate-300 leading-relaxed">
                              <span className="font-black text-white">12 Elite members</span> haven't visited in 5 days. Churn risk detected.
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
             </section>

             <section className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                   <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Weekly Load</h2>
                   <Activity size={18} className="text-slate-400" />
                </div>
                
                <div className="space-y-6">
                   {MOCK_DAILY_STATS.map(stat => (
                      <div key={stat.day}>
                         <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                            <span className="text-slate-500">{stat.day}</span>
                            <span className="text-slate-900">{stat.checkins}</span>
                         </div>
                         <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                            <motion.div 
                               initial={{ width: 0 }} animate={{ width: `${(stat.checkins / 300) * 100}%` }}
                               className={`h-full rounded-full ${stat.checkins > 250 ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                            />
                         </div>
                      </div>
                   ))}
                </div>
             </section>
          </aside>
        </div>

        {/* 20. BOTTOM ANALYTICS SECTION */}
        <section className="mt-16 pt-16 border-t border-slate-200">
           <div className="flex justify-between items-end mb-12">
              <div>
                 <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Facility Intelligence Center</h2>
                 <p className="text-slate-500 text-[15px] font-medium mt-1">Deep-dive into equipment usage, shift efficiency, and batch-wise retention analytics.</p>
              </div>
              <div className="flex gap-4">
                 <button className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                    <History size={16} /> History Logs
                 </button>
                 <button className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#0F172A] text-white text-[10px] font-black uppercase hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">
                    <Navigation size={16} /> Live Occupancy
                 </button>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                 { label: "Check-in Velocity", icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
                 { label: "Churn Prediction", icon: UserMinus, color: "text-rose-600", bg: "bg-rose-50" },
                 { label: "Batch ROI", icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
                 { label: "Shift Efficiency", icon: Clock, color: "text-emerald-600", bg: "bg-emerald-50" }
              ].map((item, idx) => (
                 <motion.div 
                    key={item.label} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}
                    className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm group hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden"
                 >
                    <div className={`w-14 h-14 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                       <item.icon size={24} />
                    </div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2 leading-none">{item.label}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6">Explore Deep-dive</p>
                    <div className="absolute -right-6 -bottom-6 opacity-0 group-hover:opacity-[0.05] transition-opacity">
                       <item.icon size={160} />
                    </div>
                 </motion.div>
              ))}
           </div>
        </section>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// MOUNTING FUNCTION
// ─────────────────────────────────────────

export const mountAttendanceTrends = () => {
  const container = document.querySelector('[data-stage="attendance-analytics"]');
  if (!container) return null;
  
  container.innerHTML = "";
  
  const root = createRoot(container);
  root.render(<><AttendanceTrends /><BrandFooter /></>);
  return root;
};

export default AttendanceTrends;
