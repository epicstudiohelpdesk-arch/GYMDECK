import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  UserPlus,
  UserMinus,
  RefreshCcw,
  Target,
  DollarSign,
  Calendar,
  Search,
  Filter,
  Download,
  FileText,
  Plus,
  MoreVertical,
  ChevronRight,
  Zap,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  PieChart,
  Activity,
  Award,
  Shield,
  Star,
  Clock,
  ArrowUpRight,
  ArrowRightCircle,
  Percent,
  Layers,
  FileSpreadsheet,
  Printer,
  History,
  Settings,
  Flame,
  MousePointer2,
  FilterIcon,
  SearchCode,
  LineChart,
  AreaChart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createRoot } from "react-dom/client";

// ─────────────────────────────────────────
// CONSTANTS & MOCK DATA
// ─────────────────────────────────────────

const BRANCHES = ["All Branches", "Main Branch", "Downtown", "North Gym", "East Side"];

const GROWTH_KPIS = [
  { id: 1, label: "Total Active", value: "2,842", trend: "+8.4%", isUp: true, icon: Users, color: "bg-indigo-600" },
  { id: 2, label: "New Joins (Mo)", value: "148", trend: "+12.1%", isUp: true, icon: UserPlus, color: "bg-emerald-500" },
  { id: 3, label: "Growth Rate", value: "14.2%", trend: "+2.4%", isUp: true, icon: TrendingUp, color: "bg-blue-500" },
  { id: 4, label: "Renewal Rate", value: "78%", trend: "-1.2%", isUp: false, icon: RefreshCcw, color: "bg-amber-500" },
  { id: 5, label: "Churn Rate", value: "4.2%", trend: "-0.5%", isUp: true, icon: UserMinus, color: "bg-rose-500" },
  { id: 6, label: "Avg Lifetime", value: "14.2 Mo", trend: "+1.1 Mo", isUp: true, icon: Clock, color: "bg-purple-500" },
  { id: 7, label: "PT Conversion", value: "24%", trend: "+5.8%", isUp: true, icon: Target, color: "bg-cyan-500" },
  { id: 8, label: "Rev Per Member", value: "₹4,850", trend: "+₹420", isUp: true, icon: DollarSign, color: "bg-orange-500" }
];

const MEMBER_SEGMENTS = [
  { id: "monthly", label: "Monthly Plans", count: 842, color: "text-blue-500" },
  { id: "quarterly", label: "Quarterly Plans", count: 1240, color: "text-indigo-500" },
  { id: "annual", label: "Annual Plans", count: 642, color: "text-emerald-500" },
  { id: "pt", label: "PT Members", count: 428, color: "text-orange-500" },
  { id: "vip", label: "VIP Members", count: 112, color: "text-purple-500" }
];

const FUNNEL_DATA = [
  { stage: "Lead", value: "2,400", sub: "New Inquiries", percent: "100%" },
  { stage: "Trial", value: "1,200", sub: "Trial Passes", percent: "50%" },
  { stage: "Member", value: "640", sub: "Conversions", percent: "26%" },
  { stage: "PT Client", value: "142", sub: "Upsells", percent: "6%" },
  { stage: "Renewed", value: "480", sub: "Retention", percent: "75%" }
];

const MOCK_GROWTH_LIST = [
  { id: "MEM-8801", name: "Vikrant Singh", plan: "Annual Elite", joinDate: "2026-05-18", status: "Active", attendance: 92, ltv: "₹18,000", pt: "Yes", branch: "Main Branch", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikrant" },
  { id: "MEM-8802", name: "Ishita Rao", plan: "Quarterly Pro", joinDate: "2026-05-15", status: "Pending Renewal", attendance: 45, ltv: "₹8,500", pt: "No", branch: "Downtown", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ishita" },
  { id: "MEM-8803", name: "Kabir Mehra", plan: "Monthly Basic", joinDate: "2026-05-20", status: "Active", attendance: 100, ltv: "₹2,499", pt: "No", branch: "North Gym", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kabir" },
  { id: "MEM-8804", name: "Zoya Khan", plan: "Annual Elite", joinDate: "2026-05-10", status: "Active", attendance: 88, ltv: "₹18,000", pt: "Yes", branch: "East Side", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoya" },
  { id: "MEM-8805", name: "Arjun Das", plan: "Pro Plus", joinDate: "2026-05-12", status: "Expired", attendance: 12, ltv: "₹12,400", pt: "Yes", branch: "Main Branch", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun" }
];

// ─────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────

const KPICard = ({ label, value, trend, isUp, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
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
      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 block mb-1">{label}</span>
      <strong className="text-xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{value}</strong>
    </div>
  </motion.div>
);

const MembershipGrowth = () => {
  const [dateRange, setDateRange] = useState("Last 30 Days");
  const [activeSegment, setActiveSegment] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");

  return (
    <div className="member-growth-shell font-sans text-slate-900 selection:bg-indigo-100">
      {/* 5. TOP UTILITY HEADER */}
      <header className="relative z-50 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-slate-400" />
            <span>Reports & Analysis</span>
          </div>
          <ChevronRight size={14} className="opacity-40" />
          <span className="text-slate-900 font-bold font-sans">Membership Growth</span>
        </div>

        <div className="flex-1 max-w-xl mx-12 relative group hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search member, branch, campaign, growth trends..."
            className="w-full h-11 pl-12 pr-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
            {["PDF", "Excel", "Share"].map((btn) => (
              <button key={btn} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 hover:bg-white transition-all">
                {btn}
              </button>
            ))}
          </div>
          <button className="h-10 px-6 rounded-xl bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-[0.15em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2">
            <RefreshCcw size={16} />
            Generate Report
          </button>
        </div>
      </header>

      {/* 6. PAGE TITLE SECTION */}
      <div className="flex justify-between items-end mb-2 relative z-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Membership Growth</h1>
          <p className="text-slate-500 text-xs font-semibold mt-2 max-w-[760px]">
            Analyze membership acquisition, retention trends, churn behavior, branch performance, and business growth across your fitness ecosystem.
          </p>
        </motion.div>
        <div className="flex gap-2">
          {["Growth Analytics", "Retention Insights", "Churn Prediction", "Branch Performance"].map((pill, idx) => (
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
        {GROWTH_KPIS.map((kpi, idx) => (
          <KPICard key={kpi.id} label={kpi.label} value={kpi.value} trend={kpi.trend} isUp={kpi.isUp} icon={kpi.icon} color={kpi.color} delay={idx * 0.05} />
        ))}
      </div>

      <div className="member-growth-workspace">
        {/* 8. DATE FILTER & GROWTH CONTROL BAR */}
        <section className="member-growth-workspace-sticky-header">
           <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                 {["Today", "Last 7 Days", "Last 30 Days", "Monthly", "Quarterly", "Annual"].map(range => (
                   <button
                    key={range} onClick={() => setDateRange(range)}
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
                 {["General", "PT", "Premium", "Corporate"].map(f => (
                   <button key={f} className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-white hover:text-indigo-600 transition-all">
                     {f}
                   </button>
                 ))}
              </div>
           </div>
        </section>

        {/* 9. MAIN WORKSPACE STRUCTURE */}
        <div className="grid grid-cols-12 gap-8 items-start">
          
          {/* 10. LEFT PANEL → FILTERS & SEGMENTS (2 cols) */}
          <aside className="col-span-12 lg:col-span-2 space-y-8 sticky top-48">
             <section>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-4">Quick Insights</span>
                <div className="space-y-2">
                  {[
                    { label: "Fastest Growing", color: "bg-emerald-500", count: "Elite" },
                    { label: "High Renewal", color: "bg-indigo-500", count: "82%" },
                    { label: "Churn Risk", color: "bg-rose-500", count: "18 Members" },
                    { label: "PT Conversion", color: "bg-cyan-500", count: "+14%" }
                  ].map((f, i) => (
                    <button key={i} className="w-full flex items-center gap-3 px-4 py-3 rounded-[16px] border border-slate-200 bg-white hover:border-indigo-500 hover:bg-indigo-50/20 transition-all group text-left">
                      <span className={`w-2 h-2 rounded-full ${f.color}`} />
                      <span className="text-[10px] font-bold text-slate-600 flex-1">{f.label}</span>
                      <span className="text-[9px] font-black text-slate-400">{f.count}</span>
                    </button>
                  ))}
                </div>
             </section>

             <section className="bg-white border border-slate-200 p-5 rounded-[24px]">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-4">Member Segments</span>
                <nav className="space-y-1">
                  {MEMBER_SEGMENTS.map((seg) => (
                    <button
                      key={seg.id}
                      onClick={() => setActiveSegment(seg.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all group ${
                        activeSegment === seg.id ? "bg-[#0F172A] text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${activeSegment === seg.id ? "bg-white/10" : "bg-slate-100"}`}>
                        <Users size={12} />
                      </div>
                      <span className="truncate uppercase tracking-widest text-[9px] font-black">{seg.label}</span>
                      <span className="ml-auto text-[8px] opacity-40">{seg.count}</span>
                    </button>
                  ))}
                </nav>
             </section>

             <section className="bg-white border border-slate-200 p-5 rounded-[24px]">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-4">Acquisition Source</span>
                <div className="space-y-2">
                   {["Referral", "Instagram", "Facebook", "Walk-in"].map(s => (
                     <div key={s} className="flex justify-between items-center px-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{s}</span>
                        <span className="text-[10px] font-black text-slate-900">24%</span>
                     </div>
                   ))}
                </div>
             </section>
          </aside>

          {/* 11. CENTER WORKSPACE → MAIN ANALYTICS ENGINE (7 cols) */}
          <div className="col-span-12 lg:col-span-7 space-y-8">
            
            {/* SECTION 1 → MEMBERSHIP GROWTH GRAPH */}
            <div className="bg-white rounded-[32px] border border-slate-200 p-10 shadow-sm relative overflow-hidden group">
               <div className="flex justify-between items-start mb-10 relative z-10">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1 uppercase">Acquisition & Retention</h2>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Growth Performance Trajectory</span>
                  </div>
                  <div className="flex gap-2">
                     <button className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[9px] font-black uppercase text-indigo-600">Stacked</button>
                     <button className="px-3 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[9px] font-black uppercase text-slate-500 hover:bg-white transition-all">Trend</button>
                  </div>
               </div>

               <div className="h-[380px] flex items-end justify-between gap-3 px-4 mb-12 group/chart">
                  {[60, 45, 80, 55, 90, 70, 85, 60, 40, 75, 95, 100].map((h, i) => (
                    <div key={i} className="flex-1 relative group/bar h-full flex flex-col justify-end">
                       <div className="w-full flex flex-col justify-end gap-0.5 h-full">
                          <motion.div initial={{ height: 0 }} animate={{ height: `${h*0.3}%` }} className="bg-emerald-400 rounded-t-sm w-full" />
                          <motion.div initial={{ height: 0 }} animate={{ height: `${h*0.5}%` }} className="bg-indigo-500 rounded-t-sm w-full" />
                          <motion.div initial={{ height: 0 }} animate={{ height: `${h*0.2}%` }} className="bg-rose-400 rounded-t-sm w-full" />
                       </div>
                       <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-300 uppercase">
                          M{i+1}
                       </div>
                       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none z-20">
                          <div className="bg-[#0F172A] text-white p-3 rounded-2xl shadow-2xl min-w-[140px] border border-slate-700">
                             <span className="block text-[8px] font-black text-indigo-400 uppercase mb-2">Month {i+1} Performance</span>
                             <div className="space-y-1.5">
                                <div className="flex justify-between text-[9px]"><span className="text-slate-400">New Joins</span><span className="font-black text-emerald-400">+{Math.round(h*0.4)}</span></div>
                                <div className="flex justify-between text-[9px]"><span className="text-slate-400">Renewals</span><span className="font-black text-indigo-400">{Math.round(h*0.8)}</span></div>
                                <div className="flex justify-between text-[9px]"><span className="text-slate-400">Churn</span><span className="font-black text-rose-400">-{Math.round(h*0.1)}</span></div>
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="flex gap-8 border-t border-slate-50 pt-8 mt-4">
                  <div className="flex items-center gap-3">
                     <div className="w-3 h-3 rounded-full bg-indigo-500" />
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Members</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-3 h-3 rounded-full bg-emerald-500" />
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">New Acquisition</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-3 h-3 rounded-full bg-rose-500" />
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Membership Churn</span>
                  </div>
               </div>
            </div>

            {/* SECTION 2 → CONVERSION FUNNEL */}
            <div className="bg-white rounded-[32px] border border-slate-200 p-10 shadow-sm overflow-hidden">
               <div className="flex justify-between items-center mb-12">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1 uppercase">Acquisition Funnel</h2>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead to Long-Term Retention</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">+14.2% Efficiency</div>
                  </div>
               </div>

               <div className="flex flex-col gap-3">
                  {FUNNEL_DATA.map((item, idx) => (
                    <motion.div 
                      key={item.stage} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}
                      className="group relative flex items-center h-20"
                    >
                       <div 
                        className="h-full bg-[#0F172A] rounded-2xl flex items-center justify-between px-8 text-white relative z-10 overflow-hidden transition-all group-hover:bg-indigo-600"
                        style={{ width: `calc(${100 - idx * 10}% - 40px)` }}
                       >
                          <div className="flex items-center gap-4">
                             <span className="text-slate-500 font-black text-xl italic opacity-20">0{idx+1}</span>
                             <div>
                                <span className="block text-xs font-black uppercase tracking-widest leading-none mb-1">{item.stage}</span>
                                <span className="text-[10px] font-medium text-slate-400 group-hover:text-white/70">{item.sub}</span>
                             </div>
                          </div>
                          <div className="text-right">
                             <span className="block text-lg font-black tracking-tight leading-none">{item.value}</span>
                             <span className="text-[10px] font-bold text-indigo-400 group-hover:text-white/80 uppercase">{item.percent} Yield</span>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                       </div>
                       {idx < FUNNEL_DATA.length - 1 && (
                        <div className="flex-1 flex justify-center items-center">
                           <ArrowRightCircle size={20} className="text-slate-200" />
                        </div>
                       )}
                    </motion.div>
                  ))}
               </div>
            </div>

            {/* SECTION 3 → MEMBERSHIP TABLE */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Acquisition Ledger</h2>
                    <div className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[9px] font-black text-indigo-600 uppercase tracking-widest">Real-time Joins</div>
                  </div>
                  <div className="flex gap-2">
                     <button className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all bg-white"><Download size={16} /></button>
                     <button className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all bg-white"><Filter size={16} /></button>
                  </div>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-white border-b border-slate-50">
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Member Identity</th>
                           <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Growth Cohort</th>
                           <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Join Date</th>
                           <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">PT Conv.</th>
                           <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Retention Score</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">LTV</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {MOCK_GROWTH_LIST.map((mem, idx) => (
                           <motion.tr 
                              key={mem.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                              className="hover:bg-slate-50/80 transition-all group cursor-pointer"
                           >
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 group-hover:scale-110 transition-transform">
                                       <img src={mem.image} alt={mem.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                       <span className="block text-[12px] font-black text-slate-900 leading-tight mb-0.5">{mem.name}</span>
                                       <span className="text-[9px] font-bold text-slate-400 uppercase">{mem.branch}</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-5">
                                 <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[9px] font-black text-indigo-600 uppercase tracking-widest">{mem.plan}</span>
                              </td>
                              <td className="px-6 py-5">
                                 <span className="text-[11px] font-bold text-slate-500 uppercase">{mem.joinDate}</span>
                              </td>
                              <td className="px-6 py-5">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mem.pt === 'Yes' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-300'}`}>
                                    {mem.pt === 'Yes' ? <Target size={14} /> : <Users size={14} />}
                                 </div>
                              </td>
                              <td className="px-6 py-5">
                                 <div className="flex items-center gap-3">
                                    <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                       <div className={`h-full ${mem.attendance > 70 ? 'bg-emerald-500' : mem.attendance > 40 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${mem.attendance}%` }} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-900">{mem.attendance}%</span>
                                 </div>
                              </td>
                              <td className="px-8 py-5 text-right">
                                 <span className="text-[12px] font-black text-slate-900 uppercase">{mem.ltv}</span>
                              </td>
                           </motion.tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          </div>

          {/* 12. RIGHT PANEL → AI & GROWTH INTELLIGENCE (3 cols) */}
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
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Growth AI</h2>
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Predictive Insights</span>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div className="p-5 rounded-[24px] bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all cursor-default">
                        <p className="text-[13px] font-medium text-slate-300 leading-relaxed">
                           <strong className="text-indigo-400">Annual memberships</strong> show <span className="text-white font-black">34% higher retention</span> than monthly plans. Recommend upselling Elite tiers.
                        </p>
                     </div>
                     <div className="p-5 rounded-[24px] bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all cursor-default">
                        <p className="text-[13px] font-medium text-slate-300 leading-relaxed">
                           <strong className="text-rose-400">Churn Warning:</strong> 18 members in the 4-6 month cohort haven't attended in 10 days.
                        </p>
                     </div>
                  </div>
               </div>
             </section>

             <section className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                   <div className="flex flex-col">
                      <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Live Activity</h2>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Pulse</span>
                   </div>
                   <Activity size={18} className="text-indigo-500 animate-pulse" />
                </div>
                <div className="space-y-4">
                   {[
                      { label: "New Joins Today", val: "+8", color: "bg-emerald-500" },
                      { label: "Renewals Processed", val: "14", color: "bg-indigo-500" },
                      { label: "Expiring Today", val: "3", color: "bg-rose-500" }
                   ].map(item => (
                      <div key={item.label} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                         </div>
                         <strong className="text-sm font-black text-slate-900">{item.val}</strong>
                      </div>
                   ))}
                </div>
             </section>

             <section className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                <div className="flex justify-between items-center mb-10">
                   <div className="flex flex-col">
                      <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Growth Forecast</h2>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projected Q3 Joins</span>
                   </div>
                   <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
                      <RefreshCcw size={16} className="text-slate-300" />
                   </motion.div>
                </div>
                <div className="h-32 flex items-end gap-2 px-2">
                   {[40, 55, 75, 60, 85, 100, 95].map((h, i) => (
                      <div key={i} className={`flex-1 rounded-t-lg transition-all duration-700 ${i > 4 ? "bg-indigo-600" : "bg-slate-100"}`} style={{ height: `${h}%` }} />
                   ))}
                </div>
                <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                   <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Expected Delta</span>
                      <strong className="text-lg font-black text-indigo-600 uppercase">+340 New</strong>
                   </div>
                   <div className="text-right">
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg inline-block">+22.4%</span>
                   </div>
                </div>
             </section>
          </aside>
        </div>

        {/* 20. BOTTOM ANALYTICS SECTION */}
        <section className="mt-16 pt-16 border-t border-slate-200">
           <div className="flex justify-between items-end mb-12">
              <div>
                 <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Enterprise Growth BI</h2>
                 <p className="text-slate-500 text-[15px] font-medium mt-1">Deep-dive into acquisition source attribution, churn heatmaps, and multi-branch ROI analysis.</p>
              </div>
              <div className="flex gap-4">
                 <button className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                    <Download size={16} /> Export Detailed BI
                 </button>
                 <button className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#0F172A] text-white text-[10px] font-black uppercase hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">
                    <Settings size={16} /> Automate Retention
                 </button>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                 { label: "LTV Optimization", icon: Star, color: "text-indigo-600", bg: "bg-indigo-50" },
                 { label: "Acquisition ROI", icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-50" },
                 { label: "Churn Heatmap", icon: PieChart, color: "text-rose-600", bg: "bg-rose-50" },
                 { label: "Cohort Analysis", icon: Layers, color: "text-amber-600", bg: "bg-amber-50" }
              ].map((item, idx) => (
                 <motion.div 
                    key={item.label} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}
                    className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm group hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden"
                 >
                    <div className={`w-14 h-14 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                       <item.icon size={24} />
                    </div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2 leading-none">{item.label}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6">Launch Deep-dive</p>
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

export const mountMembershipGrowth = () => {
  const container = document.querySelector('[data-stage="member-growth"]');
  if (!container) return null;
  
  container.innerHTML = "";
  
  const root = createRoot(container);
  root.render(<><MembershipGrowth /><BrandFooter /></>);
  return root;
};

export default MembershipGrowth;
