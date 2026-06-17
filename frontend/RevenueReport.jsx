import React, { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Search,
  Filter,
  Download,
  FileText,
  Plus,
  MoreVertical,
  LayoutGrid,
  List,
  ChevronRight,
  Zap,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Calendar,
  ArrowUpRight,
  Shield,
  Star,
  MapPin,
  Mail,
  Phone,
  X,
  PieChart,
  Target,
  Award,
  CreditCard,
  Banknote,
  Briefcase,
  History,
  Scale,
  Settings,
  Share2,
  Printer,
  ChevronDown,
  ArrowRight,
  RefreshCcw,
  Activity,
  FileSpreadsheet,
  Layers,
  ArrowRightCircle,
  Percent,
  Wallet,
  ZapOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createRoot } from "react-dom/client";

// ─────────────────────────────────────────
// CONSTANTS & MOCK DATA
// ─────────────────────────────────────────

const BRANCHES = ["All Branches", "Main Branch", "Downtown", "North Gym", "East Side"];

const REVENUE_SOURCES = [
  { id: "memberships", label: "Membership Fees", icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
  { id: "pt", label: "PT Packages", icon: Target, color: "text-emerald-500", bg: "bg-emerald-50" },
  { id: "supplements", label: "Supplement Sales", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
  { id: "merchandise", label: "Merchandise", icon: Briefcase, color: "text-indigo-500", bg: "bg-indigo-50" },
  { id: "lockers", label: "Locker Rentals", icon: Shield, color: "text-rose-500", bg: "bg-rose-50" },
  { id: "diet", label: "Diet Programs", icon: FileText, color: "text-purple-500", bg: "bg-purple-50" }
];

const PAYMENT_METHODS = ["UPI", "Cash", "Card", "Bank Transfer", "Online Gateway"];

const MOCK_TRANSACTIONS = [
  {
    id: "TXN-8842",
    source: "Membership Fees",
    member: "Arjun Mehta",
    branch: "Main Branch",
    method: "UPI",
    amount: 18000,
    status: "paid",
    date: "2026-05-20 10:45 AM",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun"
  },
  {
    id: "TXN-8843",
    source: "PT Packages",
    member: "Sneha Patel",
    branch: "Downtown",
    method: "Card",
    amount: 12500,
    status: "paid",
    date: "2026-05-20 11:20 AM",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha"
  },
  {
    id: "TXN-8844",
    source: "Supplement Sales",
    member: "Rohan Verma",
    branch: "Main Branch",
    method: "Cash",
    amount: 3200,
    status: "paid",
    date: "2026-05-20 12:05 PM",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan"
  },
  {
    id: "TXN-8845",
    source: "Membership Fees",
    member: "Priya Sharma",
    branch: "North Gym",
    method: "Online Gateway",
    amount: 2499,
    status: "pending",
    date: "2026-05-20 01:15 PM",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya"
  },
  {
    id: "TXN-8846",
    source: "PT Packages",
    member: "Vikram Shah",
    branch: "Main Branch",
    method: "Bank Transfer",
    amount: 45000,
    status: "paid",
    date: "2026-05-19 04:30 PM",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram"
  },
  {
    id: "TXN-8847",
    source: "Locker Rentals",
    member: "Ananya Iyer",
    branch: "East Side",
    method: "UPI",
    amount: 1500,
    status: "paid",
    date: "2026-05-19 05:45 PM",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya"
  }
];

const TOP_SOURCES = [
  { label: "Elite Annual Plan", amount: "₹8.4L", trend: "+12%", color: "bg-indigo-600" },
  { label: "Personal Training (Master)", amount: "₹4.2L", trend: "+18%", color: "bg-emerald-500" },
  { label: "Whey Protein Isolate", amount: "₹1.8L", trend: "+5%", color: "bg-amber-500" },
  { label: "Pro Quarterly Plan", amount: "₹1.2L", trend: "-2%", color: "bg-rose-500" }
];

// ─────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────

const formatCurrency = (val) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(val);
};

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
      <div className="mt-3 flex items-center gap-2">
         <div className="h-1 flex-1 bg-slate-50 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: "70%" }} className={`h-full ${color}`} />
         </div>
         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">YoY 14%</span>
      </div>
    </div>
  </motion.div>
);

const RevenueReport = () => {
  const [dateRange, setScheduleType] = useState("Last 30 Days");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-full bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 pb-20">
      {/* 5. TOP UTILITY HEADER */}
      <header className="h-[64px] bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-[100]">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <PieChart size={16} className="text-slate-400" />
            <span>Reports & Analysis</span>
          </div>
          <ChevronRight size={14} className="opacity-40" />
          <span className="text-slate-900 font-bold">Revenue Report</span>
        </div>

        <div className="flex-1 max-w-xl mx-12 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search transactions, revenue sources, branches..."
            className="w-full h-11 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      <main className="p-8 max-w-[1600px] mx-auto">
        {/* 6. PAGE TITLE SECTION */}
        <div className="flex justify-between items-end mb-10">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-[32px] font-black text-slate-900 tracking-tight mb-2 leading-none">Revenue Report</h1>
            <p className="text-slate-500 text-[15px] font-medium max-w-[760px] leading-relaxed">
              Monitor revenue streams, financial performance, membership collections, PT income, and operational profitability across your fitness ecosystem.
            </p>
          </motion.div>
          <div className="flex gap-2">
            {["Revenue Analytics", "PT Revenue", "Branch Performance", "Financial Forecasting"].map((pill, idx) => (
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-10">
          <KPICard title="Total Revenue" value="₹42.8L" trend="+14.2%" isUp={true} icon={DollarSign} color="bg-indigo-600" delay={0.05} />
          <KPICard title="This Month" value="₹8.12L" trend="+8.1%" isUp={true} icon={Calendar} color="bg-emerald-500" delay={0.1} />
          <KPICard title="Membership" value="₹24.5L" trend="+5.2%" isUp={true} icon={Users} color="bg-blue-500" delay={0.15} />
          <KPICard title="PT Revenue" value="₹12.4L" trend="+18.4%" isUp={true} icon={Target} color="bg-purple-500" delay={0.2} />
          <KPICard title="Pending Dues" value="₹1.84L" trend="-4.2%" isUp={false} icon={Clock} color="bg-rose-500" delay={0.25} />
          <KPICard title="Avg Per Member" value="₹4,200" trend="+2.1%" isUp={true} icon={Award} color="bg-amber-500" delay={0.3} />
          <KPICard title="Branch Profit" value="78%" trend="Stable" isUp={true} icon={TrendingUp} delay={0.35} color="bg-cyan-500" />
          <KPICard title="Growth %" value="14.8%" trend="+1.2%" isUp={true} icon={Activity} color="bg-orange-500" delay={0.4} />
        </div>

        {/* 8. DATE FILTER & REPORT CONTROL BAR */}
        <section className="bg-white border border-slate-200 rounded-3xl p-4 flex items-center justify-between mb-8 sticky top-[80px] z-[90] shadow-sm backdrop-blur-sm bg-white/95">
           <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                 {["Today", "Last 7 Days", "Last 30 Days", "Monthly", "Quarterly", "Annual"].map(range => (
                   <button
                    key={range}
                    onClick={() => setScheduleType(range)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      dateRange === range ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                   >
                     {range}
                   </button>
                 ))}
                 <button className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 flex items-center gap-2">
                   <Calendar size={12} /> Custom Range
                 </button>
              </div>
           </div>

           <div className="flex items-center gap-4">
              <div className="h-8 w-px bg-slate-200" />
              <select 
                className="h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                {BRANCHES.map(b => <option key={b}>{b}</option>)}
              </select>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 {["PDF", "Excel", "CSV", "Print"].map(fmt => (
                   <button key={fmt} className="w-10 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-all">
                      {fmt === "PDF" && <FileText size={14} />}
                      {fmt === "Excel" && <FileSpreadsheet size={14} />}
                      {fmt === "CSV" && <Layers size={14} />}
                      {fmt === "Print" && <Printer size={14} />}
                   </button>
                 ))}
              </div>
           </div>
        </section>

        {/* 9. MAIN WORKSPACE STRUCTURE */}
        <div className="grid grid-cols-12 gap-8 items-start">
          
          {/* 10. LEFT PANEL → REVENUE CATEGORIES (2 cols) */}
          <aside className="col-span-12 lg:col-span-2 space-y-8 sticky top-48">
             <section>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-4">Quick Insights</span>
                <div className="space-y-2">
                  {[
                    { label: "Revenue Growth", color: "bg-emerald-500", count: "8.2%" },
                    { label: "Pending Dues", color: "bg-rose-500", count: "₹1.8L" },
                    { label: "PT Revenue Spike", color: "bg-indigo-500", count: "18%" },
                    { label: "Profit Clusters", color: "bg-amber-500", count: "4 Br" }
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
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-4">Revenue Sources</span>
                <nav className="space-y-1">
                  {REVENUE_SOURCES.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => setActiveCategory(source.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all group ${
                        activeCategory === source.id ? "bg-[#0F172A] text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${activeCategory === source.id ? "bg-white/10" : "bg-slate-100"}`}>
                        <source.icon size={14} />
                      </div>
                      <span className="truncate uppercase tracking-widest text-[9px] font-black">{source.label}</span>
                    </button>
                  ))}
                </nav>
             </section>

             <section className="bg-white border border-slate-200 p-5 rounded-[24px]">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-4">Payment Status</span>
                <div className="grid grid-cols-2 gap-2">
                   {["Paid", "Pending", "Refunded", "Failed"].map(s => (
                     <button key={s} className="py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-[9px] font-black uppercase tracking-wider text-slate-500 hover:border-indigo-200 hover:text-indigo-600 transition-all">
                       {s}
                     </button>
                   ))}
                </div>
             </section>
          </aside>

          {/* 11. CENTER WORKSPACE → MAIN ANALYTICS ENGINE (7 cols) */}
          <div className="col-span-12 lg:col-span-7 space-y-8">
            
            {/* SECTION 1 → REVENUE OVERVIEW CHART */}
            <div className="bg-white rounded-[32px] border border-slate-200 p-10 shadow-sm relative overflow-hidden group">
               <div className="flex justify-between items-start mb-10 relative z-10">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1 uppercase">Revenue Over Time</h2>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interactive Financial Trajectory</span>
                  </div>
                  <div className="flex gap-2">
                     {["Volume", "Value", "Trend"].map(t => (
                       <button key={t} className="px-3 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-white hover:border-indigo-500 transition-all">
                         {t}
                       </button>
                     ))}
                  </div>
               </div>

               {/* Simulated Chart Rendering Area */}
               <div className="h-[380px] flex items-end justify-between gap-2.5 px-4 mb-12 group/chart">
                  {[65, 42, 85, 54, 72, 38, 92, 58, 44, 76, 88, 62, 95, 48, 70, 82, 55, 68, 90, 42, 75, 88, 60, 45, 78, 92, 58, 85, 98, 100].map((h, i) => (
                    <div key={i} className="flex-1 relative group/bar h-full flex flex-col justify-end">
                       <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        className={`w-full rounded-t-lg transition-all duration-700 relative overflow-hidden ${
                          i === 29 ? "bg-indigo-600 shadow-[0_0_30px_rgba(79,70,229,0.3)]" : 
                          i > 25 ? "bg-indigo-500/80" : "bg-slate-100 group-hover/chart:bg-slate-50 hover:!bg-indigo-400"
                        }`}
                       >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
                       </motion.div>
                       {i % 5 === 0 && (
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-300 uppercase">
                          May {i+1}
                        </div>
                       )}
                       
                       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none z-20">
                          <div className="bg-[#0F172A] text-white p-3 rounded-2xl shadow-2xl min-w-[120px] border border-slate-700">
                             <span className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">May {i+1}, 2026</span>
                             <strong className="block text-sm font-black">₹{(h * 4200 / 100).toFixed(0)}k</strong>
                             <div className="h-px bg-slate-700 my-2" />
                             <div className="flex justify-between text-[8px] font-bold text-slate-400">
                                <span>PT Income</span>
                                <span className="text-emerald-400">₹{(h * 0.4).toFixed(1)}k</span>
                             </div>
                          </div>
                          <div className="w-2 h-2 bg-[#0F172A] rotate-45 mx-auto -mt-1 border-r border-b border-slate-700" />
                       </div>
                    </div>
                  ))}
               </div>

               <div className="flex gap-8 border-t border-slate-50 pt-8 mt-4">
                  <div className="flex items-center gap-3">
                     <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]" />
                     <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">Total Collections</span>
                        <strong className="text-sm font-black text-slate-900 uppercase">₹42,85,000</strong>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                     <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">PT Revenue</span>
                        <strong className="text-sm font-black text-slate-900 uppercase">₹12,42,000</strong>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" />
                     <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">Products & Sales</span>
                        <strong className="text-sm font-black text-slate-900 uppercase">₹5,92,000</strong>
                     </div>
                  </div>
               </div>
            </div>

            {/* SECTION 2 → REVENUE SOURCE BREAKDOWN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                     <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em]">Revenue Distribution</h2>
                     <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <PieChart size={16} />
                     </div>
                  </div>
                  <div className="flex items-center gap-8">
                     <div className="relative w-36 h-36">
                        <svg className="w-full h-full -rotate-90">
                           <circle cx="72" cy="72" r="64" fill="none" stroke="#f1f5f9" strokeWidth="16" />
                           <motion.circle 
                              cx="72" cy="72" r="64" fill="none" stroke="#6366f1" strokeWidth="16" 
                              strokeDasharray="402" initial={{ strokeDashoffset: 402 }} animate={{ strokeDashoffset: 402 * 0.45 }}
                              strokeLinecap="round"
                           />
                           <motion.circle 
                              cx="72" cy="72" r="64" fill="none" stroke="#10b981" strokeWidth="16" 
                              strokeDasharray="402" initial={{ strokeDashoffset: 402 }} animate={{ strokeDashoffset: 402 * 0.75 }}
                              strokeLinecap="round" className="rotate-[162deg] origin-center"
                           />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                           <strong className="text-xl font-black text-slate-900">100%</strong>
                           <span className="text-[8px] font-black text-slate-400 uppercase">Market</span>
                        </div>
                     </div>
                     <div className="flex-1 space-y-4">
                        {[
                           { label: "Memberships", val: "58%", color: "bg-indigo-500" },
                           { label: "Personal Training", val: "28%", color: "bg-emerald-500" },
                           { label: "Retail & Cafe", val: "14%", color: "bg-amber-500" }
                        ].map(item => (
                           <div key={item.label}>
                              <div className="flex justify-between text-[9px] font-black uppercase mb-1.5">
                                 <span className="text-slate-400 flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${item.color}`} /> {item.label}</span>
                                 <span className="text-slate-900">{item.val}</span>
                              </div>
                              <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                                 <div className={`h-full ${item.color} rounded-full`} style={{ width: item.val }} />
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em]">Top Revenue Assets</h2>
                     <button className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">View All <ChevronRight size={10} /></button>
                  </div>
                  <div className="space-y-3">
                     {TOP_SOURCES.map(source => (
                        <div key={source.label} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-100 hover:shadow-lg transition-all cursor-default">
                           <div className="flex items-center gap-4">
                              <div className={`w-2 h-8 rounded-full ${source.color} opacity-20 group-hover:opacity-100 transition-opacity`} />
                              <div>
                                 <span className="block text-[11px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{source.label}</span>
                                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{source.trend} Growth</span>
                              </div>
                           </div>
                           <strong className="text-sm font-black text-slate-900">{source.amount}</strong>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* SECTION 3 → REVENUE TABLE */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                  <div className="flex items-center gap-4">
                     <h2 className="text-lg font-black text-slate-900 tracking-tight">Recent Transactions</h2>
                     <div className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[9px] font-black text-indigo-600 uppercase tracking-widest">Live Audit</div>
                  </div>
                  <div className="flex gap-2">
                     <button className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all shadow-sm bg-white">
                        <Download size={16} />
                     </button>
                     <button className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all shadow-sm bg-white">
                        <List size={16} />
                     </button>
                  </div>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-white border-b border-slate-50">
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction ID</th>
                           <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Member / Payer</th>
                           <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Revenue Source</th>
                           <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
                           <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Method</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">State</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {MOCK_TRANSACTIONS.map((txn, idx) => (
                           <motion.tr 
                              key={txn.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                              className="hover:bg-slate-50/80 transition-all group cursor-pointer"
                           >
                              <td className="px-8 py-5">
                                 <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">{txn.id}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{txn.date}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-5">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200">
                                       <img src={txn.image} alt={txn.member} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                       <span className="block text-[11px] font-black text-slate-900 tracking-tight leading-none mb-0.5">{txn.member}</span>
                                       <span className="text-[9px] font-bold text-slate-400 uppercase">{txn.branch}</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-5">
                                 <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[9px] font-black text-slate-600 uppercase tracking-widest">{txn.source}</span>
                              </td>
                              <td className="px-6 py-5">
                                 <span className="text-[11px] font-black text-slate-900">{formatCurrency(txn.amount)}</span>
                              </td>
                              <td className="px-6 py-5">
                                 <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase">{txn.method}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-5 text-right">
                                 <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                    txn.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                    'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                                 }`}>
                                    {txn.status}
                                 </span>
                              </td>
                           </motion.tr>
                        ))}
                     </tbody>
                  </table>
               </div>
               
               <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Showing 1-12 of 842 Transactions</span>
                  <div className="flex gap-2">
                     <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-all">Prev</button>
                     <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-all">Next</button>
                  </div>
               </div>
            </div>
          </div>

          {/* 12. RIGHT PANEL → AI & FINANCIAL INTELLIGENCE (3 cols) */}
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
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Financial AI</h2>
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Revenue Intelligence</span>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="p-5 rounded-[24px] bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all cursor-default group/item">
                        <div className="flex gap-4">
                           <TrendingUp size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                           <p className="text-[13px] font-medium text-slate-300 leading-relaxed">
                              PT revenue increased <span className="font-black text-white">18%</span> compared to last month. Consider scaling Elite tiers.
                           </p>
                        </div>
                     </div>
                     <div className="p-5 rounded-[24px] bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all cursor-default group/item">
                        <div className="flex gap-4">
                           <Shield size={18} className="text-rose-400 shrink-0 mt-0.5" />
                           <p className="text-[13px] font-medium text-slate-300 leading-relaxed">
                              Revenue leak detected: <span className="font-black text-white">₹1.2L pending dues</span> crossed this week limit.
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
             </section>

             <section className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                   <div className="flex flex-col">
                      <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Collections Live</h2>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time status</span>
                   </div>
                   <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <Activity size={18} />
                   </div>
                </div>
                
                <div className="space-y-6">
                   <div className="p-5 bg-slate-50 rounded-[28px] border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <Wallet size={20} />
                         </div>
                         <div>
                            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Today's Cashflow</span>
                            <strong className="text-sm font-black text-slate-900 uppercase tracking-tighter">₹48,200</strong>
                         </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   </div>

                   <div className="p-5 bg-slate-50 rounded-[28px] border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                            <ZapOff size={20} />
                         </div>
                         <div>
                            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Failed Payments</span>
                            <strong className="text-sm font-black text-slate-900 uppercase tracking-tighter">12 Txns</strong>
                         </div>
                      </div>
                      <AlertCircle size={14} className="text-rose-500" />
                   </div>
                </div>
             </section>

             <section className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                <div className="flex justify-between items-center mb-10">
                   <div className="flex flex-col">
                      <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Revenue Forecast</h2>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projected Q3 2026</span>
                   </div>
                </div>
                <div className="h-32 flex items-end gap-1.5 px-2">
                   {[30, 45, 60, 55, 75, 90, 85, 100].map((h, i) => (
                      <div key={i} className={`flex-1 rounded-t-lg transition-all duration-700 ${i > 4 ? "bg-indigo-600 border-2 border-dashed border-white/20" : "bg-slate-100"}`} style={{ height: `${h}%` }} />
                   ))}
                </div>
                <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                   <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Projected Total</span>
                      <strong className="text-lg font-black text-indigo-600 uppercase">₹14.8L</strong>
                   </div>
                   <div className="text-right">
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg inline-block">+18.2%</span>
                   </div>
                </div>
             </section>
          </aside>
        </div>

        {/* 20. BOTTOM ANALYTICS SECTION */}
        <section className="mt-16 pt-16 border-t border-slate-200">
          <div className="flex justify-between items-end mb-12">
             <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Executive Business Intelligence</h2>
                <p className="text-slate-500 text-[15px] font-medium mt-1">Advanced financial drill-downs into profitability heatmaps and audience response trends.</p>
             </div>
             <div className="flex gap-4">
                <button className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 hover:bg-slate-50 hover:border-indigo-500 transition-all shadow-sm">
                   <History size={16} /> Audit Logs
                </button>
                <button className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-[0.15em] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">
                   <Settings size={16} /> Automation Rules
                </button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
             {[
                { label: "Growth Trends", icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
                { label: "Profitability Heatmap", icon: PieChart, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Payment Method Analytics", icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Audience Response", icon: Activity, color: "text-rose-600", bg: "bg-rose-50" }
             ].map((item, idx) => (
                <motion.div 
                   key={item.label} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}
                   className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm group hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden"
                >
                   <div className={`w-14 h-14 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                      <item.icon size={24} />
                   </div>
                   <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2 leading-none">{item.label}</h3>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Executive Insight</p>
                   <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-auto">
                      Explore Deep-dive <ArrowRightCircle size={14} />
                   </div>
                   <div className="absolute -right-6 -bottom-6 opacity-0 group-hover:opacity-[0.05] transition-opacity">
                      <item.icon size={160} />
                   </div>
                </motion.div>
             ))}
          </div>
        </section>
      </main>
    </div>
  );
};

// ─────────────────────────────────────────
// MOUNTING FUNCTION
// ─────────────────────────────────────────

export const mountRevenueReport = () => {
  const container = document.querySelector('[data-stage="revenue-reports"]');
  if (!container) return null;
  
  // Clear any placeholder content
  container.innerHTML = "";
  
  const root = createRoot(container);
  root.render(<RevenueReport />);
  return root;
};

export default RevenueReport;
