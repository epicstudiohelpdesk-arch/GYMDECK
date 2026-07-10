import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Search,
  Bell,
  QrCode,
  Mic,
  Plus,
  Filter,
  Download,
  Send,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  CheckCircle2,
  Phone,
  MessageSquare,
  Mail,
  MoreHorizontal,
  ArrowRight,
  CreditCard,
  FileText,
  User,
  Activity,
  Zap,
  ShieldCheck,
  Brain,
  Layers,
  Wallet,
  Smartphone,
  LayoutGrid,
  List,
  Calendar,
  X,
  PlusCircle,
  HelpCircle,
  BarChart3,
  ArrowUpRight,
  Target,
  Users,
  Tag
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "./ErrorHandlers.jsx";

// --- Formatter ---
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

// --- Mock Data ---
const kpis = [
  { label: "Total Pending Dues", value: "₹4,82,000", trend: "+12.5%", isUp: true, icon: Wallet, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Overdue Members", value: "124", trend: "+5", isUp: true, icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Recovery This Month", value: "₹1,24,000", trend: "82%", isUp: true, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "High-Risk Accounts", value: "12", trend: "-2", isUp: false, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
  { label: "Recovery Efficiency", value: "94.2%", trend: "+2.1%", isUp: true, icon: Zap, color: "text-indigo-600", bg: "bg-indigo-50" }
];

const pendingDuesData = [
  {
    id: "INV-2024-001",
    member: { name: "Arjun Mehta", id: "MBR-9042", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun" },
    plan: "Pro Annual",
    amount: 18000,
    dueDate: "2024-05-10",
    overdueDays: 9,
    emiStatus: "N/A",
    lastPayment: "2023-05-10",
    probability: 85,
    risk: "Low",
    staff: "Vikram S.",
    status: "Follow-up Active"
  },
  {
    id: "INV-2024-012",
    member: { name: "Sneha Kapoor", id: "MBR-8821", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha" },
    plan: "Elite Monthly",
    amount: 4500,
    dueDate: "2024-05-01",
    overdueDays: 18,
    emiStatus: "Missed (2/6)",
    lastPayment: "2024-04-01",
    probability: 42,
    risk: "High",
    staff: "Rahul K.",
    status: "Critical Overdue"
  },
  {
    id: "INV-2024-015",
    member: { name: "Rohan Das", id: "MBR-7654", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan" },
    plan: "Standard Quarterly",
    amount: 9000,
    dueDate: "2024-05-15",
    overdueDays: 4,
    emiStatus: "N/A",
    lastPayment: "2024-02-15",
    probability: 92,
    risk: "Low",
    staff: "Vikram S.",
    status: "Recoverable"
  },
  {
    id: "INV-2024-022",
    member: { name: "Priya Sharma", id: "MBR-9011", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya" },
    plan: "Pro Annual",
    amount: 12000,
    dueDate: "2024-04-15",
    overdueDays: 34,
    emiStatus: "N/A",
    lastPayment: "2023-04-15",
    probability: 15,
    risk: "Critical",
    staff: "Rahul K.",
    status: "Likely Churn"
  }
];

const segments = [
  { label: "Recoverable Today", count: 24, amount: "₹85,000", color: "bg-emerald-500" },
  { label: "Follow-Up Needed", count: 42, amount: "₹1,42,000", color: "bg-amber-500" },
  { label: "Critical Overdue", count: 18, amount: "₹94,000", color: "bg-rose-500" },
  { label: "Likely Churn", count: 9, amount: "₹1,12,000", color: "bg-slate-700" },
  { label: "EMI Pending", count: 31, amount: "₹49,000", color: "bg-indigo-500" }
];

// --- Sub-Components ---

const StatCard = ({ label, value, trend, isUp, icon: Icon, color, bg }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {trend}
      </div>
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    </div>
    <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color.replace('text', 'bg')} opacity-20`} style={{ width: '70%' }}></div>
    </div>
  </motion.div>
);

const PaymentModal = ({ isOpen, onClose, member }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#04060c]/70 backdrop-blur-xl z-[10000]"
        />
        <motion.div 
          initial={{ y: "100%", x: "-50%" }}
          animate={{ y: 0, x: "-50%" }}
          exit={{ y: "100%", x: "-50%" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: "radial-gradient(circle at top right, rgba(255, 255, 255, 0.56), transparent 24%), linear-gradient(160deg, rgba(255, 255, 255, 0.99), rgba(243, 247, 255, 0.97))"
          }}
          className="fixed bottom-0 left-1/2 w-full max-w-[1000px] h-[82vh] rounded-t-[40px] border border-white/90 border-b-0 shadow-[0_-20px_100px_rgba(15,23,42,0.2)] z-[10001] overflow-hidden flex"
        >
          {/* Left Side - Financial Summary */}
          <div className="w-[42%] bg-slate-50/40 p-10 border-r border-slate-200/50 flex flex-col">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 leading-none mb-1">Invoice ID</div>
                <div className="text-base font-bold text-slate-900 leading-none">INV-2024-8842</div>
              </div>
            </div>

            <div className="flex-1 space-y-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="w-1 h-6 bg-blue-600 rounded-full" />
                  Billing Context
                </h3>
                <div className="space-y-5 px-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Member Name</span>
                    <span className="text-base font-semibold text-slate-900">{member?.member.name}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Plan</span>
                    <span className="text-base font-semibold text-slate-800">{member?.plan}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arrears Balance</span>
                    <span className="text-xl font-black text-rose-600 font-mono tracking-tight">{currencyFormatter.format(member?.amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto p-7 bg-slate-900 rounded-[32px] text-white flex items-center justify-between shadow-xl ring-1 ring-white/10">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Settlement Total</div>
                <div className="text-3xl font-black font-mono tracking-tighter">{currencyFormatter.format(member?.amount)}</div>
              </div>
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                <Wallet className="w-7 h-7 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Right Side - Payment Controls */}
          <div className="flex-1 p-10 flex flex-col relative">
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200/60 rounded-full" />
            
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Process Recovery</h3>
              <button onClick={onClose} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all text-slate-500 hover:text-slate-900 group">
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            <div className="space-y-8 flex-1 overflow-y-auto px-1 pr-4 custom-scrollbar">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Payment Mode</label>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Secure Gateway</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: "upi", label: "UPI (PhonePe/GPay)", icon: Smartphone },
                    { id: "card", label: "Debit / Credit Card", icon: CreditCard },
                    { id: "cash", label: "Physical Cash", icon: Wallet },
                    { id: "bank", label: "Direct Bank Transfer", icon: Activity }
                  ].map(method => (
                    <button key={method.id} className="p-4 border-2 border-slate-100 rounded-[20px] flex items-center gap-4 hover:border-blue-600 hover:bg-blue-50/40 transition-all text-left group">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors border border-slate-100 group-hover:border-blue-100 shadow-sm">
                        <method.icon className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 tracking-tight">{method.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Transaction Settings</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-4 bg-slate-50/60 rounded-[20px] border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="w-11 h-11 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-blue-600">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-800">Split Transaction</div>
                      <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-tighter">Enable multi-channel settlement</div>
                    </div>
                    <div className="w-12 h-6 bg-slate-200 rounded-full relative cursor-pointer ring-1 ring-slate-300/50">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-slate-50/60 rounded-[20px] border border-slate-100 hover:bg-slate-50 transition-colors opacity-75 grayscale hover:opacity-100 hover:grayscale-0">
                    <div className="w-11 h-11 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-emerald-600">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-800">Offer Settlement</div>
                      <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-tighter">Apply one-time recovery discount</div>
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase">Disabled</div>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button className="w-full py-5 bg-blue-600 text-white rounded-[24px] text-base font-black uppercase tracking-[0.15em] hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.98] transition-all shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] flex items-center justify-center gap-3">
                <CheckCircle2 className="w-6 h-6" />
                Finalize Collection
              </button>
              <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-4">
                Action will update member ledger & send receipt instantly
              </p>
            </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const PendingDuesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("All");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const openDrawer = (member) => {
    setSelectedMember(member);
    setIsDrawerOpen(true);
  };

  const openPaymentModal = (e, member) => {
    if (e) e.stopPropagation();
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  return (
    <div className="pending-dues-shell font-sans text-slate-900 selection:bg-indigo-100">
      {/* Top Utility Header */}
      <header className="relative z-50 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span>Payments & Billing</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold">Pending Dues</span>
        </div>

        <div className="flex-1 max-w-xl px-8 relative">
          <Search className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search member, invoice, phone, overdue amount..."
            className="w-full h-10 bg-slate-100/70 border border-slate-200 rounded-xl pl-10 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-slate-200 bg-white px-1.5 font-sans text-[10px] font-medium text-slate-400">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-xl border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50 transition-colors relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="h-10 px-5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Collect Payment
          </button>
        </div>
      </header>

      {/* Title Section */}
      <section className="mb-2 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 leading-none mb-2">Pending Dues</h1>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed max-w-2xl">
              Track overdue payments, recover revenue, automate collections, and reduce membership churn.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Recovery Analytics", "AI Insights", "Settlement Offers", "Reminder Automation"].map((pill) => (
              <button key={pill} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                {pill}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* KPI Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-2 relative z-10">
        {kpis.map((kpi, index) => (
          <StatCard key={index} {...kpi} />
        ))}
      </section>

      <div className="pending-dues-workspace">
        <div className="grid grid-cols-12 gap-8 w-full">
          
          {/* Left Panel - Filters */}
          <aside className="col-span-12 lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sticky top-24">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Quick Segments</h4>
              <div className="space-y-2">
                {segments.map((seg) => (
                  <button 
                    key={seg.label}
                    onClick={() => setSelectedSegment(seg.label)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedSegment === seg.label ? "bg-slate-900 text-white shadow-lg" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${seg.color}`} />
                      <span className="text-sm font-semibold">{seg.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold">{seg.count}</div>
                      <div className={`text-[10px] ${selectedSegment === seg.label ? "text-slate-400" : "text-slate-400"}`}>{seg.amount}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Smart Filters</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-2">Overdue Days</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                      <option>Any Duration</option>
                      <option>1-7 Days</option>
                      <option>8-15 Days</option>
                      <option>16-30 Days</option>
                      <option>30+ Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-2">Risk Level</label>
                    <div className="flex flex-wrap gap-2">
                      {["Low", "Medium", "High", "Critical"].map(level => (
                        <button key={level} className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-blue-500 transition-colors">
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Center Workspace - Main Table */}
          <section className="col-span-12 lg:col-span-6 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-slate-800">Recovery Queue</h3>
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">84 Members</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <Filter className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Member</th>
                      <th className="px-6 py-4 text-right">Pending</th>
                      <th className="px-6 py-4">Due Date</th>
                      <th className="px-6 py-4">Risk / Prob.</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingDuesData.map((row) => (
                      <tr 
                        key={row.id} 
                        className="group hover:bg-blue-50/30 transition-all cursor-pointer"
                        onClick={() => openDrawer(row)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img src={row.member.image} className="w-10 h-10 rounded-xl bg-slate-100" alt="" />
                              <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${row.risk === 'Critical' ? 'bg-rose-500' : row.risk === 'High' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{row.member.name}</p>
                              <p className="text-[11px] text-slate-400 font-medium">{row.member.id} • {row.plan}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-bold text-slate-900">{currencyFormatter.format(row.amount)}</p>
                          <p className="text-[10px] text-rose-500 font-bold">{row.overdueDays} days overdue</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600 font-medium">{new Date(row.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${row.probability > 80 ? 'bg-emerald-500' : row.probability > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${row.probability}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-500">{row.probability}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight ${
                            row.status === 'Critical Overdue' ? 'bg-rose-50 text-rose-600' :
                            row.status === 'Recoverable' ? 'bg-emerald-50 text-emerald-600' :
                            row.status === 'Follow-up Active' ? 'bg-blue-50 text-blue-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-600 transition-all shadow-sm">
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-emerald-600 hover:border-emerald-600 transition-all shadow-sm">
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => openPaymentModal(e, row)}
                              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Showing 4 of 84 members</p>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-400 cursor-not-allowed">Previous</button>
                  <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">Next</button>
                </div>
              </div>
            </div>

            {/* Recovery Pipeline Mini */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold mb-1">Recovery Pipeline</h3>
                    <p className="text-slate-400 text-sm">Visualize your revenue recovery workflow.</p>
                  </div>
                  <button className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                    <ArrowUpRight className="w-5 h-5 text-slate-300" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "New Dues", count: 12, color: "bg-blue-400" },
                    { label: "Follow-up", count: 8, color: "bg-amber-400" },
                    { label: "Negotiation", count: 5, color: "bg-emerald-400" },
                    { label: "Critical", count: 3, color: "bg-rose-400" }
                  ].map(step => (
                    <div key={step.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <div className={`w-1.5 h-8 ${step.color} rounded-full mb-3`} />
                      <div className="text-2xl font-bold mb-1">{step.count}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{step.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Right Panel - Intelligence */}
          <aside className="col-span-12 lg:col-span-3 space-y-6">
            {/* AI Insights Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
              <Brain className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 rotate-12" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Zap className="w-4 h-4 text-amber-300" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">AI Insights</span>
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-white/10 rounded-xl border border-white/10 backdrop-blur-md">
                    <p className="text-xs leading-relaxed">
                      <span className="font-bold text-amber-300">Arjun Mehta</span> is highly likely to pay within 48 hours if a WhatsApp reminder is sent today.
                    </p>
                  </div>
                  <div className="p-3 bg-white/10 rounded-xl border border-white/10 backdrop-blur-md">
                    <p className="text-xs leading-relaxed">
                      <span className="font-bold text-rose-300">Sneha Kapoor</span> has missed 2 EMIs. Recovery probability dropped by <span className="font-bold text-rose-300">18%</span>.
                    </p>
                  </div>
                </div>
                <button className="w-full mt-6 py-2.5 bg-white text-blue-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-lg">
                  Run Predictive Analysis
                </button>
              </div>
            </div>

            {/* Revenue Risk Widget */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Revenue Risk Analysis
              </h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase mb-2">
                    <span>At Risk</span>
                    <span className="text-rose-500">₹1,82,000</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 w-[38%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase mb-2">
                    <span>Recoverable</span>
                    <span className="text-emerald-500">₹3,00,000</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[62%]" />
                  </div>
                </div>
                <div className="pt-4 grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <div className="text-lg font-bold text-slate-800">42%</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Churn Risk</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <div className="text-lg font-bold text-slate-800">12d</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Avg. Delay</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Follow-up Suggestions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
                <span>Follow-up Tasks</span>
                <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full">3 New</span>
              </h4>
              <div className="space-y-3">
                {[
                  { user: "Arjun M.", action: "WhatsApp Reminder", time: "Due in 2h", icon: MessageSquare, color: "text-emerald-500" },
                  { user: "Sneha K.", action: "Manager Escalation", time: "Overdue", icon: ShieldCheck, color: "text-rose-500" },
                  { user: "Rohan D.", action: "Settlement Offer", time: "Recommended", icon: Tag, color: "text-blue-500" }
                ].map((task, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group">
                    <div className={`w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center ${task.color}`}>
                      <task.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-800">{task.action}</div>
                      <div className="text-[10px] text-slate-500">{task.user} • {task.time}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom Analytics */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-800">Recovery Trends</h3>
              <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 focus:outline-none">
                <option>Last 6 Months</option>
                <option>This Year</option>
              </select>
            </div>
            <div className="h-64 flex items-end gap-3 px-4">
              {[45, 62, 58, 75, 90, 82].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full relative">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: i * 0.1, duration: 1 }}
                      className="w-full bg-slate-100 rounded-t-xl group-hover:bg-blue-100 transition-colors relative overflow-hidden"
                    >
                      <div className="absolute bottom-0 left-0 right-0 bg-blue-600 h-1/3 opacity-40" />
                    </motion.div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">MAY</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-8 text-white">
            <h3 className="text-lg font-bold mb-8">Recovery Intelligence</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Recovery Target</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold">₹5,00,000</span>
                    <span className="text-xs font-bold text-emerald-400">+12% vs Target</span>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <h4 className="text-sm font-bold text-slate-300 mb-4">Staff Recovery Efficiency</h4>
                <div className="space-y-4">
                  {[
                    { name: "Vikram S.", score: 92, color: "bg-emerald-500" },
                    { name: "Rahul K.", score: 78, color: "bg-blue-500" },
                    { name: "Meera R.", score: 65, color: "bg-amber-500" }
                  ].map(staff => (
                    <div key={staff.name}>
                      <div className="flex justify-between text-[11px] font-bold mb-2">
                        <span>{staff.name}</span>
                        <span>{staff.score}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${staff.color}`} style={{ width: `${staff.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Member Financial Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-white shadow-2xl z-50 overflow-y-auto"
            >
              {selectedMember && (
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                    <h3 className="font-bold text-slate-900">Member Recovery Profile</h3>
                    <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                      <X className="w-5 h-5 text-slate-500" />
                    </button>
                  </div>
                  
                  <div className="p-8 space-y-8">
                    {/* Header Info */}
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <img src={selectedMember.member.image} className="w-24 h-24 rounded-3xl bg-slate-100 border-4 border-slate-50 shadow-inner" alt="" />
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-xl border-4 border-white">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">{selectedMember.member.name}</h2>
                        <div className="flex items-center gap-3 text-slate-500 text-sm font-medium mb-4">
                          <span>{selectedMember.member.id}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full" />
                          <span>Active Since Jan 2023</span>
                        </div>
                        <div className="flex gap-2">
                          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                            <Phone className="w-3.5 h-3.5" /> Call Now
                          </button>
                          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                            <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Financial Overview */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100">
                        <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1">Total Pending</div>
                        <div className="text-2xl font-bold text-rose-700">{currencyFormatter.format(selectedMember.amount)}</div>
                      </div>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Last Paid</div>
                        <div className="text-lg font-bold text-slate-700">{new Date(selectedMember.lastPayment).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      </div>
                    </div>

                    {/* AI Prediction Section */}
                    <div className="p-6 bg-slate-900 rounded-3xl text-white">
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Brain className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">Recovery Intelligence</span>
                      </div>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">Recovery Probability</span>
                          <span className={`text-xl font-bold ${selectedMember.probability > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{selectedMember.probability}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${selectedMember.probability > 80 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                            style={{ width: `${selectedMember.probability}%` }}
                          />
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-xs leading-relaxed text-slate-300">
                            Member has a high gym attendance score (<span className="text-emerald-400 font-bold">8.5/10</span>). Historical payment behavior suggests settlement is likely via UPI within the next follow-up call.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div>
                      <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        Follow-up History
                      </h4>
                      <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                        {[
                          { status: "WhatsApp Sent", time: "Today, 10:45 AM", type: "success" },
                          { status: "Call Attempted - No Response", time: "Yesterday, 4:20 PM", type: "warning" },
                          { status: "Reminder SMS Sent", time: "12 May, 11:00 AM", type: "info" }
                        ].map((event, i) => (
                          <div key={i} className="relative pl-10">
                            <div className={`absolute left-0 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                              event.type === 'success' ? 'bg-emerald-500' : event.type === 'warning' ? 'bg-rose-500' : 'bg-blue-500'
                            }`}>
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            </div>
                            <div className="text-sm font-bold text-slate-800">{event.status}</div>
                            <div className="text-xs text-slate-400">{event.time}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto p-6 border-t border-slate-100 bg-slate-50 grid grid-cols-2 gap-4">
                    <button className="py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
                      Offer Settlement
                    </button>
                    <button 
                      onClick={(e) => openPaymentModal(e, selectedMember)}
                      className="py-4 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                    >
                      Record Payment
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <PaymentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        member={selectedMember} 
      />
    </div>
  );
};

export const mountPendingDues = () => {
  console.log("GymDeck: Mounting Pending Dues module...");
  const stage = document.querySelector('[data-stage="pending-dues"]');
  if (!stage) {
    console.error("GymDeck: Pending Dues stage element not found!");
    return null;
  }

  const rootElement = document.createElement("div");
  rootElement.dataset.pendingDuesReactRoot = "";
  rootElement.className = "min-h-full";
  stage.replaceChildren(rootElement);

  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <><PendingDuesPage /><BrandFooter /></>
      </ErrorBoundary>
    );
    console.log("GymDeck: Pending Dues module mounted successfully.");
    return root;
  } catch (err) {
    console.error("Failed to render Pending Dues UI:", err);
    return null;
  }
};

export default PendingDuesPage;
