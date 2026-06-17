import React, { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
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
  ZapOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createRoot } from "react-dom/client";

// ─────────────────────────────────────────
// CONSTANTS & MOCK DATA
// ─────────────────────────────────────────

const BRANCHES = ["Main Branch", "Downtown", "North Gym", "East Side"];

const MOCK_EARNINGS = [
  {
    id: "PAY-101",
    trainerId: "TR-101",
    name: "Ankit Kumar",
    role: "Senior Personal Trainer",
    branch: "Main Branch",
    baseSalary: 45000,
    ptCommission: 32500,
    incentives: 8500,
    bonuses: 5000,
    deductions: 2500,
    taxes: 4200,
    sessionsCompleted: 142,
    ptRevenueGenerated: 165000,
    status: "paid",
    payoutDate: "2026-05-15",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ankit",
    attendance: 98,
    clientRating: 4.9,
    payrollId: "PR-2026-05-01",
    email: "ankit@gymdeck.com",
    phone: "+91 98765 43210"
  },
  {
    id: "PAY-102",
    trainerId: "TR-102",
    name: "Sneha Patel",
    role: "Yoga & Mindfulness Coach",
    branch: "Downtown",
    baseSalary: 38000,
    ptCommission: 12000,
    incentives: 4200,
    bonuses: 2000,
    deductions: 1200,
    taxes: 2800,
    sessionsCompleted: 84,
    ptRevenueGenerated: 58000,
    status: "processing",
    payoutDate: "2026-05-20",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha",
    attendance: 95,
    clientRating: 4.8,
    payrollId: "PR-2026-05-02",
    email: "sneha@gymdeck.com",
    phone: "+91 98765 43211"
  },
  {
    id: "PAY-103",
    trainerId: "TR-103",
    name: "Manav Rao",
    role: "Group Instructor",
    branch: "Main Branch",
    baseSalary: 42000,
    ptCommission: 0,
    incentives: 15000,
    bonuses: 3000,
    deductions: 3500,
    taxes: 3800,
    sessionsCompleted: 156,
    ptRevenueGenerated: 0,
    status: "pending",
    payoutDate: "2026-05-25",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Manav",
    attendance: 92,
    clientRating: 4.7,
    payrollId: "PR-2026-05-03",
    email: "manav@gymdeck.com",
    phone: "+91 98765 43212"
  },
  {
    id: "PAY-104",
    trainerId: "TR-104",
    name: "Vikram Shah",
    role: "Rehabilitation Specialist",
    branch: "North Gym",
    baseSalary: 55000,
    ptCommission: 48000,
    incentives: 12000,
    bonuses: 8000,
    deductions: 4500,
    taxes: 6200,
    sessionsCompleted: 110,
    ptRevenueGenerated: 245000,
    status: "paid",
    payoutDate: "2026-05-12",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram",
    attendance: 99,
    clientRating: 4.9,
    payrollId: "PR-2026-05-04",
    email: "vikram@gymdeck.com",
    phone: "+91 98765 43213"
  },
  {
    id: "PAY-105",
    trainerId: "TR-105",
    name: "Priya Sharma",
    role: "Nutritionist",
    branch: "East Side",
    baseSalary: 35000,
    ptCommission: 8500,
    incentives: 3000,
    bonuses: 1500,
    deductions: 1000,
    taxes: 2500,
    sessionsCompleted: 62,
    ptRevenueGenerated: 32000,
    status: "failed",
    payoutDate: "2026-05-18",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
    attendance: 94,
    clientRating: 4.6,
    payrollId: "PR-2026-05-05",
    email: "priya@gymdeck.com",
    phone: "+91 98765 43214"
  },
  {
    id: "PAY-106",
    trainerId: "TR-106",
    name: "Rahul Mehra",
    role: "Strength Coach",
    branch: "Main Branch",
    baseSalary: 48000,
    ptCommission: 55000,
    incentives: 18000,
    bonuses: 10000,
    deductions: 3000,
    taxes: 7500,
    sessionsCompleted: 168,
    ptRevenueGenerated: 320000,
    status: "paid",
    payoutDate: "2026-05-10",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul",
    attendance: 100,
    clientRating: 5.0,
    payrollId: "PR-2026-05-06",
    email: "rahul@gymdeck.com",
    phone: "+91 98765 43215"
  }
];

const PAYROLL_CATEGORIES = [
  { id: "all", label: "All Earnings", icon: Banknote },
  { id: "salary", label: "Base Salary", icon: Briefcase },
  { id: "commission", label: "PT Commission", icon: Target },
  { id: "incentives", label: "Incentives", icon: Award },
  { id: "bonuses", label: "Bonuses", icon: Star },
  { id: "overtime", label: "Overtime", icon: Clock }
];

const QUICK_FILTERS = [
  { id: "paid", label: "Paid This Month", color: "bg-emerald-500" },
  { id: "pending", label: "Pending Payroll", color: "bg-amber-500" },
  { id: "failed", label: "Overdue Payouts", color: "bg-rose-500" },
  { id: "high-revenue", label: "High Revenue", color: "bg-indigo-500" },
  { id: "incentive-eligible", label: "Incentive Eligible", color: "bg-purple-500" }
];

const PAYOUT_STATUSES = ["Paid", "Pending", "Processing", "Failed", "Scheduled"];

// ─────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────

const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(val);
};

const calculateNet = (trainer) => {
  if (!trainer) return 0;
  return (
    (trainer.baseSalary || 0) +
    (trainer.ptCommission || 0) +
    (trainer.incentives || 0) +
    (trainer.bonuses || 0) -
    (trainer.deductions || 0) -
    (trainer.taxes || 0)
  );
};

// ─────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────

const KPICard = ({ title, value, trend, isUp, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm flex flex-col justify-between group hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-default"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-current transition-transform group-hover:scale-110`}>
        {Icon && <Icon size={18} className={color.replace("bg-", "text-")} />}
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
        {isUp ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
        {trend}
      </div>
    </div>
    <div>
      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 block mb-1">
        {title}
      </span>
      <strong className="text-xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
        {value}
      </strong>
      <div className="mt-3 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "65%" }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  </motion.div>
);

const TrainerEarnings = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewType, setViewType] = useState("table"); // table | card
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filteredEarnings = useMemo(() => {
    return MOCK_EARNINGS.filter((e) => {
      const name = e.name || "";
      const id = e.id || "";
      const payrollId = e.payrollId || "";
      
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payrollId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBranch = selectedBranch === "all" || e.branch === selectedBranch;
      const matchesStatus = selectedStatus === "all" || e.status.toLowerCase() === selectedStatus.toLowerCase();
      
      return matchesSearch && matchesBranch && matchesStatus;
    });
  }, [searchQuery, selectedBranch, selectedStatus]);

  const openDetails = (trainer) => {
    setSelectedTrainer(trainer);
    setIsDrawerOpen(true);
  };

  return (
    <div className="min-h-full bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 pb-20">
      {/* 5. TOP UTILITY HEADER (Production Grade) */}
      <header className="h-[64px] bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-[100]">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            <span>Trainers & Staff</span>
          </div>
          <ChevronRight size={14} className="opacity-40" />
          <span className="text-slate-900 font-bold">Trainer Earnings</span>
        </div>

        <div className="flex-1 max-w-xl mx-12 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search trainer, payroll ID, commission, branch..."
            className="w-full h-11 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all group-hover:bg-slate-100"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
             <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-white px-1.5 font-sans text-[10px] font-medium text-slate-400 opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
            {["Export Payroll", "Generate Payslips", "Incentive Rules"].map((btn) => (
              <button key={btn} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 hover:bg-white transition-all">
                {btn}
              </button>
            ))}
          </div>
          <button className="h-10 px-6 rounded-xl bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-[0.15em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2">
            <Plus size={16} />
            Process Payroll
          </button>
        </div>
      </header>

      <main className="p-8 max-w-[1600px] mx-auto">
        {/* 6. PAGE TITLE SECTION */}
        <div className="flex justify-between items-end mb-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-[32px] font-black text-slate-900 tracking-tight mb-2 leading-none">Trainer Earnings</h1>
            <p className="text-slate-500 text-[15px] font-medium max-w-[720px] leading-relaxed">
              Manage trainer salaries, PT commissions, incentives, payouts, and financial performance across your fitness ecosystem.
            </p>
          </motion.div>
          <div className="flex gap-2">
            {["Payroll Analytics", "PT Revenue", "Incentive Tracking", "Financial Reports"].map((pill, idx) => (
              <motion.button 
                key={pill} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="px-5 py-2.5 rounded-full bg-white border border-slate-200 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-50/50 transition-all"
              >
                {pill}
              </motion.button>
            ))}
          </div>
        </div>

        {/* 7. KPI ANALYTICS STRIP (8 Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-10">
          <KPICard title="Total Payroll" value="₹18.4L" trend="+12.4%" isUp={true} icon={Banknote} color="bg-indigo-600" delay={0.05} />
          <KPICard title="PT Commission" value="₹4.12L" trend="+8.1%" isUp={true} icon={Target} color="bg-emerald-500" delay={0.1} />
          <KPICard title="Highest Earner" value="Rahul M." trend="Star" isUp={true} icon={Award} color="bg-amber-500" delay={0.15} />
          <KPICard title="Pending Payouts" value="₹1.24L" trend="-4.2%" isUp={false} icon={Clock} color="bg-rose-500" delay={0.2} />
          <KPICard title="Avg Trainer Revenue" value="₹1.18L" trend="+5.2%" isUp={true} icon={TrendingUp} color="bg-blue-500" delay={0.25} />
          <KPICard title="Incentives" value="₹84K" trend="+14%" isUp={true} icon={Zap} color="bg-purple-500" delay={0.3} />
          <KPICard title="PT Generated" value="₹14.2L" trend="+18%" isUp={true} icon={DollarSign} delay={0.35} color="bg-cyan-500" />
          <KPICard title="Profitability" value="78%" trend="+2.1%" isUp={true} icon={PieChart} color="bg-orange-500" delay={0.4} />
        </div>

        {/* 8. MASTER PAGE STRUCTURE (12-column grid) */}
        <div className="grid grid-cols-12 gap-8 items-start">
          
          {/* 9. LEFT PANEL → CATEGORIES & FILTERS (2 cols) */}
          <aside className="col-span-12 lg:col-span-2 space-y-8 sticky top-24">
            <section>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-4">Earnings Categories</span>
              <nav className="space-y-1.5">
                {PAYROLL_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-[18px] text-[11px] font-black uppercase tracking-wider transition-all group ${
                      activeCategory === cat.id 
                        ? "bg-[#0F172A] text-white shadow-xl shadow-slate-200" 
                        : "text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200"
                    }`}
                  >
                    <div className={`p-2 rounded-xl transition-colors ${activeCategory === cat.id ? "bg-white/10" : "bg-slate-100 group-hover:bg-slate-200"}`}>
                      {cat.icon && <cat.icon size={14} />}
                    </div>
                    {cat.label}
                  </button>
                ))}
              </nav>
            </section>

            <section>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-4">Operational Status</span>
              <div className="space-y-2">
                {QUICK_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-[16px] border border-slate-200 bg-white hover:border-indigo-500 hover:bg-indigo-50/20 transition-all text-[11px] font-bold text-slate-600 group"
                  >
                    <span className={`w-2 h-2 rounded-full ${filter.color} ring-4 ring-offset-2 ring-transparent group-hover:ring-${filter.color.replace('bg-', '')}/20`} />
                    {filter.label}
                    <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-all text-slate-400" />
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-200 p-5 rounded-[24px]">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-4">Location Filters</span>
              <div className="space-y-4">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Branch</label>
                    <select 
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                    >
                      <option value="all">All Locations</option>
                      {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Payout Status</label>
                    <div className="grid grid-cols-2 gap-2">
                       {PAYOUT_STATUSES.slice(0, 4).map(s => (
                         <button 
                           key={s}
                           onClick={() => setSelectedStatus(s === selectedStatus ? "all" : s)}
                           className={`h-9 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                             selectedStatus === s 
                               ? "bg-indigo-600 text-white border-indigo-600" 
                               : "bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-300"
                           }`}
                         >
                           {s}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>
            </section>
          </aside>

          {/* 10. CENTER WORKSPACE → EARNINGS TABLE / GRID (7 cols) */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden min-h-[720px] flex flex-col">
              
              {/* TABLE HEADER/CONTROLS */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Payroll Overview</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">May 2026 Distribution</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-black text-emerald-600">
                    {filteredEarnings.length} TRAINERS ACTIVE
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex bg-slate-100 p-1.5 rounded-[14px]">
                    <button 
                      onClick={() => setViewType("table")}
                      className={`px-4 py-2 rounded-[10px] flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                        viewType === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <List size={14} />
                      Table
                    </button>
                    <button 
                      onClick={() => setViewType("card")}
                      className={`px-4 py-2 rounded-[10px] flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                        viewType === "card" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <LayoutGrid size={14} />
                      Cards
                    </button>
                  </div>
                  <button className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-white transition-all">
                    <RefreshCcw size={18} />
                  </button>
                </div>
              </div>

              {/* VIEW RENDERING */}
              <div className="flex-1 overflow-x-auto">
                <AnimatePresence mode="wait">
                  {viewType === "table" ? (
                    <motion.table 
                      key="table-view"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full text-left border-collapse"
                    >
                      <thead>
                        <tr className="bg-white border-b border-slate-100">
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Trainer Identity</th>
                          <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Salary Model</th>
                          <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Performance</th>
                          <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Revenue AI</th>
                          <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Net Payout</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Operations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredEarnings.map((trainer, idx) => (
                          <motion.tr 
                            key={trainer.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="hover:bg-slate-50/80 transition-all group cursor-pointer relative"
                            onClick={() => openDetails(trainer)}
                          >
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-[18px] overflow-hidden bg-slate-100 border border-slate-200 shadow-sm group-hover:scale-110 transition-transform">
                                  <img src={trainer.image} alt={trainer.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  <span className="block text-[15px] font-black text-slate-900 leading-tight">{trainer.name}</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-1.5 rounded">{trainer.role}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{trainer.branch}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-700">{formatCurrency(trainer.baseSalary)}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Fixed Monthly</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-black text-emerald-600">+{formatCurrency(trainer.ptCommission)}</span>
                                  <div className="w-8 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[70%]" />
                                  </div>
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{trainer.sessionsCompleted} SESSIONS LOGGED</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                               <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-900">{formatCurrency(trainer.ptRevenueGenerated)}</span>
                                <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">Contribution Rank: #2</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                               <div className="flex items-center gap-3">
                                  <span className="text-sm font-black text-slate-900 bg-white border border-slate-200 px-4 py-1.5 rounded-2xl shadow-sm">
                                    {formatCurrency(calculateNet(trainer))}
                                  </span>
                                  <div className={`w-2 h-2 rounded-full ${
                                    trainer.status === "paid" ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" :
                                    trainer.status === "pending" ? "bg-amber-500" :
                                    trainer.status === "failed" ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : "bg-blue-500 animate-pulse"
                                  }`} />
                               </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex justify-end gap-2">
                                <button className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all group-hover:translate-x-[-4px]">
                                  <FileText size={16} />
                                </button>
                                <button className="p-2.5 rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-indigo-600 transition-all">
                                  <ChevronRight size={16} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </motion.table>
                  ) : (
                    <motion.div 
                      key="card-view"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-8 p-10"
                    >
                       {filteredEarnings.map((trainer, idx) => (
                        <motion.div
                          key={trainer.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-white border border-slate-200 rounded-[40px] p-8 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group cursor-pointer relative overflow-hidden flex flex-col justify-between"
                          onClick={() => openDetails(trainer)}
                        >
                          <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-6">
                              <div className="w-16 h-16 rounded-[24px] overflow-hidden bg-slate-100 border-2 border-slate-50 shadow-inner group-hover:scale-110 transition-transform">
                                <img src={trainer.image} alt={trainer.name} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">{trainer.name}</h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{trainer.role}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-200" />
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">{trainer.branch}</span>
                                </div>
                              </div>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border ${
                              trainer.status === "paid" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                              trainer.status === "pending" ? "bg-amber-50 text-amber-600 border-amber-100" :
                              "bg-rose-50 text-rose-600 border-rose-100"
                            }`}>
                              {trainer.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="p-5 bg-slate-50 rounded-[28px] group-hover:bg-indigo-50/50 transition-colors">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total Payout</span>
                              <strong className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{formatCurrency(calculateNet(trainer))}</strong>
                            </div>
                            <div className="p-5 bg-slate-50 rounded-[28px] group-hover:bg-emerald-50/50 transition-colors">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">PT Earnings</span>
                              <strong className="text-2xl font-black text-emerald-600 group-hover:text-emerald-700 transition-colors">{formatCurrency(trainer.ptCommission)}</strong>
                            </div>
                          </div>

                          <div className="space-y-4 pt-6 border-t border-slate-100">
                             <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                      <RefreshCcw size={14} />
                                   </div>
                                   <div>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase block leading-none">Sessions</span>
                                      <span className="text-xs font-black text-slate-900">{trainer.sessionsCompleted} Logged</span>
                                   </div>
                                </div>
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                      <TrendingUp size={14} />
                                   </div>
                                   <div>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase block leading-none">Revenue</span>
                                      <span className="text-xs font-black text-slate-900">{formatCurrency(trainer.ptRevenueGenerated)}</span>
                                   </div>
                                </div>
                             </div>
                             <div className="flex items-center justify-between pt-2">
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} size={12} fill={s <= Math.floor(trainer.clientRating || 0) ? "#fbbf24" : "none"} className={s <= Math.floor(trainer.clientRating || 0) ? "text-amber-400" : "text-slate-100"} />
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <button className="h-10 px-6 rounded-2xl bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2">
                                    Details
                                    <ArrowRight size={14} />
                                  </button>
                                </div>
                             </div>
                          </div>
                        </motion.div>
                       ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* EMPTY STATE */}
              {filteredEarnings.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                  <div className="w-24 h-24 bg-slate-50 rounded-[48px] flex items-center justify-center mb-8 relative">
                    <Search size={40} className="text-slate-300" />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0, 1, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-indigo-500/5 rounded-full"
                    />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-3">No matching records</h3>
                  <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto leading-relaxed">
                    We couldn't find any trainer payroll data matching your current filters. Try refining your search or filter criteria.
                  </p>
                  <button 
                    onClick={() => {setSearchQuery(""); setSelectedBranch("all"); setSelectedStatus("all");}}
                    className="mt-10 h-12 px-10 bg-[#0F172A] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 15. RIGHT PANEL → AI FINANCIAL INTELLIGENCE (3 cols) */}
          <aside className="col-span-12 lg:col-span-3 space-y-6 sticky top-24">
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
                    <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">AI Intelligence</h2>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Financial Insights</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-5 rounded-[24px] bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all cursor-default group/item">
                    <div className="flex gap-4">
                      <TrendingUp size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-[13px] font-medium text-slate-300 leading-relaxed">
                        Trainer <span className="font-black text-white">Rahul Mehra</span> generated <span className="font-black text-emerald-400">24% more PT revenue</span> this month.
                      </p>
                    </div>
                  </div>
                  <div className="p-5 rounded-[24px] bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all cursor-default group/item">
                    <div className="flex gap-4">
                      <Target size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-[13px] font-medium text-slate-300 leading-relaxed">
                        PT commission payouts increased <span className="font-black text-indigo-400">18% WoW</span>. Consider optimizing commission tiers.
                      </p>
                    </div>
                  </div>
                  <div className="p-5 rounded-[24px] bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/50 transition-all cursor-default group/item">
                    <div className="flex gap-4">
                      <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[13px] font-medium text-slate-300 leading-relaxed">
                        <span className="font-black text-amber-400">3 trainers</span> eligible for performance bonuses. Payout impact: <span className="text-white">₹42K</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <div className="flex flex-col">
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Revenue Flow</h2>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Week Over Week</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <BarChart3 size={18} />
                </div>
              </div>
              
              <div className="h-48 flex items-end justify-between gap-2.5 px-2 mb-8">
                {[65, 42, 85, 54, 72, 38, 92].map((h, i) => (
                  <div key={i} className="flex-1 group relative h-full flex flex-col justify-end">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      className={`w-full rounded-t-xl transition-all duration-700 ${i === 6 ? "bg-indigo-600 shadow-[0_0_25px_rgba(79,70,229,0.3)]" : "bg-slate-100 group-hover:bg-slate-200"}`}
                    />
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-400 uppercase">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-12 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">PT Revenue</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">₹14.2L</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Net Payroll</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">₹18.4L</span>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm overflow-hidden group">
               <div className="flex items-center gap-3 mb-6">
                 <Shield size={18} className="text-indigo-600" />
                 <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Payroll Security</h3>
               </div>
               <p className="text-[11px] font-bold text-slate-400 leading-relaxed mb-4">
                 All payroll transactions are end-to-end encrypted and audited for compliance.
               </p>
               <button className="w-full py-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:bg-[#0F172A] group-hover:text-white transition-all">
                 View Audit Logs
               </button>
            </section>
          </aside>
        </div>

        {/* 21. BOTTOM ANALYTICS SECTION */}
        <section className="mt-16 pt-16 border-t border-slate-200">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Enterprise Payroll Analytics</h2>
              <p className="text-slate-500 text-[15px] font-medium mt-1">Deep-dive into compensation models, workforce profitability, and incentive effectiveness.</p>
            </div>
            <button className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 hover:bg-slate-50 hover:border-indigo-500 transition-all shadow-sm">
              <Download size={16} />
              Full Financial Report
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm group hover:shadow-xl transition-all">
              <div className="flex justify-between items-center mb-10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Growth Trends</span>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg mt-1 inline-block w-fit">+14.2% YoY</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="h-48 flex items-end gap-1.5 px-2">
                {[30, 45, 35, 60, 55, 75, 50, 40, 65, 80, 70, 95].map((h, i) => (
                  <div key={i} className="flex-1 bg-slate-100 rounded-t-lg hover:bg-indigo-600 transition-all cursor-help relative group/bar" title={`Month ${i+1}: ₹${h}k`}>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-xl opacity-0 group-hover/bar:opacity-100 transition-all whitespace-nowrap z-10 shadow-xl pointer-events-none translate-y-2 group-hover/bar:translate-y-0">
                      ₹{h}K
                    </div>
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      className="w-full h-full"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>JAN 2026</span>
                <span>DEC 2026</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm group hover:shadow-xl transition-all">
              <div className="flex justify-between items-center mb-10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incentive Engine</span>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg mt-1 inline-block w-fit">Active Rewards</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                  <Zap size={20} />
                </div>
              </div>
              <div className="space-y-8">
                {[
                  { label: "PT Sales Target", value: 45, color: "bg-indigo-600" },
                  { label: "Client Retention", value: 30, color: "bg-emerald-500" },
                  { label: "Shift Attendance", value: 15, color: "bg-amber-500" },
                  { label: "New Referrals", value: 10, color: "bg-rose-500" }
                ].map((item) => (
                  <div key={item.label} className="group/item">
                    <div className="flex justify-between text-[11px] font-black mb-3">
                      <span className="text-slate-400 uppercase tracking-widest group-hover/item:text-slate-900 transition-colors">{item.label}</span>
                      <span className="text-slate-900">{item.value}% Impact</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${item.value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full ${item.color} rounded-full shadow-[0_0_10px_rgba(0,0,0,0.05)]`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0F172A] border border-slate-800 rounded-[40px] p-10 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-10 opacity-5">
                  <Award size={160} className="text-white" />
               </div>
               <div className="relative z-10 flex flex-col h-full">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] block mb-10">Profitability AI</span>
                  
                  <div className="flex-1 flex flex-col items-center justify-center py-4">
                    <div className="relative w-40 h-40 flex items-center justify-center mb-8">
                      <svg className="w-full h-full -rotate-90 drop-shadow-2xl">
                        <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
                        <motion.circle 
                          cx="80" cy="80" r="72" fill="none" stroke="#6366f1" strokeWidth="14" 
                          strokeDasharray="452"
                          initial={{ strokeDashoffset: 452 }}
                          whileInView={{ strokeDashoffset: 452 * 0.22 }}
                          viewport={{ once: true }}
                          transition={{ duration: 2, ease: "circOut" }}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <strong className="block text-4xl font-black text-white tracking-tighter leading-none">78%</strong>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 block">Avg Margin</span>
                      </div>
                    </div>

                    <div className="space-y-4 w-full">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-[11px] font-medium text-slate-300">Revenue Contribution covers 4.2x cost.</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-400" />
                        <span className="text-[11px] font-medium text-slate-300">Optimized compensation ROI in Q2.</span>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </section>
      </main>

      {/* 12. PAYROLL DETAILS DRAWER (Enterprise Grade) */}
      <AnimatePresence mode="wait">
        {isDrawerOpen && selectedTrainer && (
          <motion.div
            key="drawer-overlay-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex justify-end"
          >
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              key="drawer-content"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 200 }}
              className="relative h-full w-full max-w-[640px] bg-white shadow-2xl flex flex-col overflow-hidden rounded-l-[40px]"
            >
              {/* DRAWER HEADER */}
              <div className="p-10 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-start mb-10">
                  <div className="flex items-center gap-8">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-[32px] overflow-hidden border-4 border-white shadow-2xl relative z-10">
                        <img src={selectedTrainer.image} alt={selectedTrainer.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[#0F172A] border-4 border-white shadow-lg flex items-center justify-center text-indigo-400 z-20">
                        <Award size={18} />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-3">{selectedTrainer.name}</h2>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-black uppercase tracking-wider text-indigo-600">
                          {selectedTrainer.role}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedTrainer.payrollId}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedTrainer.branch}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-3.5 rounded-2xl bg-white text-slate-400 hover:text-slate-900 hover:shadow-xl transition-all border border-slate-100 shadow-sm"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: "Attendance", value: `${selectedTrainer.attendance}%`, icon: Clock, color: "text-indigo-600" },
                    { label: "Rating", value: selectedTrainer.clientRating, icon: Star, color: "text-amber-500" },
                    { label: "Status", value: selectedTrainer.status, icon: CheckCircle2, color: selectedTrainer.status === 'paid' ? 'text-emerald-600' : 'text-amber-600' },
                    { label: "Rank", value: "#04", icon: Award, color: "text-purple-600" }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <stat.icon size={12} className="text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">{stat.label}</span>
                      </div>
                      <strong className={`text-lg font-black tracking-tight ${stat.color} uppercase`}>{stat.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* DRAWER SCROLLABLE CONTENT */}
              <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar scroll-smooth">
                
                {/* EARNINGS BREAKDOWN */}
                <section>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Banknote size={20} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Financial Breakdown</h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">May 2026 Earnings Cycle</span>
                      </div>
                    </div>
                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors">
                      Edit Rules
                    </button>
                  </div>
                  
                  <div className="space-y-4 bg-slate-50/80 border border-slate-100 p-8 rounded-[40px] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                       <DollarSign size={140} className="text-slate-900" />
                    </div>
                    
                    <div className="relative z-10 space-y-5">
                      <div className="flex justify-between items-center group/item">
                        <span className="text-sm font-bold text-slate-500 flex items-center gap-3">
                          <Briefcase size={14} className="text-slate-400" />
                          Base Monthly Salary
                        </span>
                        <span className="text-sm font-black text-slate-900">{formatCurrency(selectedTrainer.baseSalary)}</span>
                      </div>
                      <div className="flex justify-between items-center group/item">
                        <span className="text-sm font-bold text-slate-500 flex items-center gap-3">
                          <Target size={14} className="text-emerald-500" />
                          PT Commission ({selectedTrainer.sessionsCompleted} sessions)
                        </span>
                        <span className="text-sm font-black text-emerald-600">+{formatCurrency(selectedTrainer.ptCommission)}</span>
                      </div>
                      <div className="flex justify-between items-center group/item">
                        <span className="text-sm font-bold text-slate-500 flex items-center gap-3">
                          <Award size={14} className="text-amber-500" />
                          Performance Incentives
                        </span>
                        <span className="text-sm font-black text-emerald-600">+{formatCurrency(selectedTrainer.incentives)}</span>
                      </div>
                      <div className="flex justify-between items-center group/item">
                        <span className="text-sm font-bold text-slate-500 flex items-center gap-3">
                          <Star size={14} className="text-indigo-500" />
                          Quarterly Retention Bonus
                        </span>
                        <span className="text-sm font-black text-emerald-600">+{formatCurrency(selectedTrainer.bonuses)}</span>
                      </div>
                      
                      <div className="h-px bg-slate-200/60 my-6" />
                      
                      <div className="flex justify-between items-center opacity-70">
                        <span className="text-sm font-bold text-slate-500 flex items-center gap-3">
                          <ZapOff size={14} className="text-rose-400" />
                          Deductions (Unpaid Leaves)
                        </span>
                        <span className="text-sm font-black text-rose-600">-{formatCurrency(selectedTrainer.deductions)}</span>
                      </div>
                      <div className="flex justify-between items-center opacity-70">
                        <span className="text-sm font-bold text-slate-500 flex items-center gap-3">
                          <Shield size={14} className="text-rose-400" />
                          Professional Tax / TDS (10%)
                        </span>
                        <span className="text-sm font-black text-rose-600">-{formatCurrency(selectedTrainer.taxes)}</span>
                      </div>
                      
                      <div className="mt-8 pt-8 border-t border-slate-200 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block leading-none mb-1">Total Net Payout</span>
                          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Confirmed for May 20th</span>
                        </div>
                        <span className="text-4xl font-black text-[#0F172A] tracking-tighter drop-shadow-sm">
                          {formatCurrency(calculateNet(selectedTrainer))}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* PAYOUT HISTORY TIMELINE */}
                <section>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                      <History size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Transaction History</h3>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Last 6 Months Records</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { month: "April 2026", date: "05 May 2026", amount: 102400, status: "paid" },
                      { month: "March 2026", date: "02 Apr 2026", amount: 98600, status: "paid" },
                      { month: "February 2026", date: "05 Mar 2026", amount: 112000, status: "paid" }
                    ].map((history, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between p-6 rounded-[24px] border border-slate-100 hover:bg-slate-50 hover:shadow-xl hover:shadow-slate-100 transition-all cursor-default group"
                      >
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${history.status === 'paid' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-rose-50 text-rose-600'}`}>
                            <Calendar size={20} />
                          </div>
                          <div>
                            <span className="block text-sm font-black text-slate-900 uppercase tracking-tight">{history.month} Payroll</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Processed on {history.date}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block text-lg font-black text-slate-900 leading-none mb-1">{formatCurrency(history.amount)}</span>
                          <div className="flex items-center gap-1.5 justify-end">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                             <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.15em]">Transaction Success</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* DOCUMENTS & ATTACHMENTS */}
                <section>
                   <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Payroll Documents</h3>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Payslips, Tax forms & Agreements</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: "Payslip_May_2026.pdf", size: "420 KB", icon: FileText },
                      { name: "Tax_Deduction_Form.pdf", size: "1.2 MB", icon: Shield },
                      { name: "Commission_Report.xlsx", size: "85 KB", icon: Target },
                      { name: "Bonus_Approval.pdf", size: "210 KB", icon: Award }
                    ].map((doc, i) => (
                      <button key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/20 transition-all text-left group">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <doc.icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-black text-slate-900 truncate uppercase tracking-tighter">{doc.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{doc.size}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <div className="h-10" />
              </div>

              {/* DRAWER FOOTER ACTIONS */}
              <div className="p-10 border-t border-slate-100 bg-white shadow-[0_-20px_40px_rgba(0,0,0,0.02)]">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <button className="h-14 rounded-2xl bg-white border border-slate-200 text-[#0F172A] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-indigo-500 transition-all shadow-sm">
                    <Printer size={18} />
                    Print Summary
                  </button>
                  <button className="h-14 rounded-2xl bg-white border border-slate-200 text-[#0F172A] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-indigo-500 transition-all shadow-sm">
                    <Share2 size={18} />
                    Share Payslip
                  </button>
                </div>
                <button className="w-full h-16 rounded-[24px] bg-indigo-600 text-white text-[11px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-4 hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all active:scale-[0.98] group">
                  <CreditCard size={20} className="group-hover:rotate-12 transition-transform" />
                  Initiate Bank Transfer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────
// MOUNTING FUNCTION
// ─────────────────────────────────────────

export const mountTrainerEarnings = () => {
  const container = document.querySelector('[data-stage="trainer-earnings"]');
  if (!container) return null;
  
  // Clear any placeholder content
  container.innerHTML = "";
  
  const root = createRoot(container);
  root.render(<TrainerEarnings />);
  return root;
};

export default TrainerEarnings;
