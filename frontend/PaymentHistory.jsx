import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Search,
  Bell,
  Download,
  Filter,
  Calendar,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileText,
  User,
  Activity,
  Zap,
  ShieldCheck,
  Brain,
  Layers,
  Wallet,
  LayoutGrid,
  List,
  X,
  PlusCircle,
  HelpCircle,
  BarChart3,
  ArrowUpRight,
  Target,
  Users,
  Tag,
  CreditCard,
  Smartphone,
  History,
  MoreVertical,
  Printer,
  RefreshCw,
  Eye,
  Mail,
  Share2,
  Settings,
  MoreHorizontal,
  ChevronDown,
  ArrowRight,
  SearchCode,
  PieChart,
  LineChart,
  FileDown,
  CalendarDays
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
  { label: "Total Revenue", value: "₹18,42,000", trend: "+14.2%", isUp: true, icon: Wallet, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Transactions Today", value: "42", trend: "+8", isUp: true, icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Avg. Transaction", value: "₹4,200", trend: "+2.1%", isUp: true, icon: Target, color: "text-indigo-600", bg: "bg-indigo-50" },
  { label: "Failed Payments", value: "3", trend: "-2", isUp: false, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
  { label: "Renewal Revenue", value: "₹8,12,000", trend: "+18%", isUp: true, icon: RefreshCw, color: "text-amber-600", bg: "bg-amber-50" }
];

const transactionData = [
  {
    id: "TXN-8842901",
    member: { name: "Arjun Mehta", id: "MBR-9042", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun" },
    invoiceId: "INV-2024-001",
    type: "Membership Renewal",
    amount: 18000,
    tax: 3240,
    method: "UPI (PhonePe)",
    date: "2024-05-18 10:45 AM",
    branch: "Main Branch",
    status: "Successful",
    staff: "Vikram S."
  },
  {
    id: "TXN-8842905",
    member: { name: "Sneha Kapoor", id: "MBR-8821", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha" },
    invoiceId: "INV-2024-012",
    type: "PT Session Pack",
    amount: 12500,
    tax: 2250,
    method: "Credit Card",
    date: "2024-05-18 09:30 AM",
    branch: "Main Branch",
    status: "Failed",
    staff: "Rahul K."
  },
  {
    id: "TXN-8842912",
    member: { name: "Rohan Das", id: "MBR-7654", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan" },
    invoiceId: "INV-2024-015",
    type: "Monthly Membership",
    amount: 4500,
    tax: 810,
    method: "Cash",
    date: "2024-05-17 06:15 PM",
    branch: "North Branch",
    status: "Successful",
    staff: "Vikram S."
  },
  {
    id: "TXN-8842922",
    member: { name: "Priya Sharma", id: "MBR-9011", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya" },
    invoiceId: "INV-2024-022",
    type: "Membership Renewal",
    amount: 12000,
    tax: 2160,
    method: "UPI (GPay)",
    date: "2024-05-17 11:20 AM",
    branch: "Main Branch",
    status: "Refunded",
    staff: "Rahul K."
  }
];

const quickFilters = [
  { label: "Successful Payments", count: 842, amount: "₹15.2L", color: "bg-emerald-500", trend: "+12%" },
  { label: "Failed Transactions", count: 12, amount: "₹42,000", color: "bg-rose-500", trend: "-5%" },
  { label: "Refund Requests", count: 5, amount: "₹18,500", color: "bg-purple-500", trend: "+2" },
  { label: "Pending EMIs", count: 24, amount: "₹94,000", color: "bg-amber-500", trend: "-8" },
  { label: "High-Value Payments", count: 18, amount: "₹5.4L", color: "bg-slate-900", trend: "+20%" }
];

// --- Sub-Components ---

const StatCard = ({ label, value, trend, isUp, icon: Icon, color, bg }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {trend}
      </div>
    </div>
    <div>
      <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">{label}</p>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
    </div>
    <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color.replace('text', 'bg')} opacity-30`} style={{ width: '65%' }}></div>
    </div>
  </motion.div>
);

const PaymentDetailsDrawer = ({ isOpen, onClose, transaction }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[10000]"
        />
        <motion.div 
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-white shadow-2xl z-[10001] overflow-y-auto flex flex-col"
        >
          {transaction && (
            <>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    transaction.status === 'Successful' ? 'bg-emerald-50 text-emerald-600' :
                    transaction.status === 'Failed' ? 'bg-rose-50 text-rose-600' : 'bg-purple-50 text-purple-600'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-none mb-1">Transaction Audit</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">{transaction.id}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 p-8 space-y-8">
                {/* Status Hero */}
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment Amount</div>
                    <div className="text-3xl font-black text-slate-900">{currencyFormatter.format(transaction.amount)}</div>
                  </div>
                  <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
                    transaction.status === 'Successful' ? 'bg-emerald-100 text-emerald-700' :
                    transaction.status === 'Failed' ? 'bg-rose-100 text-rose-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {transaction.status}
                  </span>
                </div>

                {/* Member Info */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Member Identity</h4>
                  <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <img src={transaction.member.image} className="w-12 h-12 rounded-xl bg-slate-100" alt="" />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-900">{transaction.member.name}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{transaction.member.id} • Pro Member</div>
                    </div>
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <User className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Billing Breakdown */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Billing Breakdown</h4>
                  <div className="space-y-3 px-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-medium">Base Amount</span>
                      <span className="text-slate-900 font-bold">{currencyFormatter.format(transaction.amount - transaction.tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-medium">Tax (GST 18%)</span>
                      <span className="text-slate-900 font-bold">{currencyFormatter.format(transaction.tax)}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex justify-between">
                      <span className="text-sm font-black text-slate-900">Total Charged</span>
                      <span className="text-lg font-black text-blue-600">{currencyFormatter.format(transaction.amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Gateway Info */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Payment Gateway Info</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mode</div>
                      <div className="text-xs font-bold text-slate-800">{transaction.method}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</div>
                      <div className="text-xs font-bold text-slate-800">{transaction.date.split(' ')[0]}</div>
                    </div>
                  </div>
                </div>

                {/* Audit Logs */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Operational Audit</h4>
                  <div className="space-y-4 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    <div className="relative pl-8">
                      <div className="absolute left-0 w-5 h-5 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                      <div className="text-[11px] font-bold text-slate-800">Payment Processed Successfully</div>
                      <div className="text-[10px] text-slate-400">{transaction.date} • by {transaction.staff}</div>
                    </div>
                    <div className="relative pl-8">
                      <div className="absolute left-0 w-5 h-5 rounded-full bg-blue-500 border-4 border-white shadow-sm" />
                      <div className="text-[11px] font-bold text-slate-800">Invoice Generated & Emailed</div>
                      <div className="text-[10px] text-slate-400">System Automated</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto p-6 border-t border-slate-100 bg-slate-50 grid grid-cols-3 gap-3">
                <button className="flex flex-col items-center gap-1.5 p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all group">
                  <Printer className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                  <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-blue-600">Print</span>
                </button>
                <button className="flex flex-col items-center gap-1.5 p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all group">
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                  <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-blue-600">Save</span>
                </button>
                <button className="flex flex-col items-center gap-1.5 p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
                  <Share2 className="w-4 h-4" />
                  <span className="text-[9px] font-black uppercase">Resend</span>
                </button>
              </div>
            </>
          )}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const PaymentHistoryPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("All");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTxn, setSelectedTransaction] = useState(null);

  const openDrawer = (txn) => {
    setSelectedTransaction(txn);
    setIsDrawerOpen(true);
  };

  return (
    <div className="payment-history-shell font-sans text-slate-900 selection:bg-blue-100">
      {/* Top Utility Header */}
      <header className="relative z-50 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span className="opacity-60">Payments & Billing</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold font-sans">Payment History</span>
        </div>

        <div className="flex-1 max-w-lg px-8 relative">
          <Search className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search transaction ID, member, invoice..."
            className="w-full h-10 bg-slate-100/70 border border-slate-200 rounded-xl pl-10 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="h-10 px-4 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
            <Download className="w-3.5 h-3.5" />
            Export Data
          </button>
          <button className="h-10 px-5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
            <PlusCircle className="w-3.5 h-3.5" />
            Generate Report
          </button>
          <button className="w-10 h-10 rounded-xl border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50 transition-colors relative ml-1">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
          </button>
        </div>
      </header>

      {/* Title Section */}
      <section className="mb-2 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Payment History</h1>
          <p className="text-slate-500 text-xs font-semibold max-w-2xl">
            Audit transaction records, monitor revenue flow, analyze financial activity, and manage billing operations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["Refund Center", "AI Analysis", "Tax Reports", "Revenue Trends"].map((pill) => (
            <button key={pill} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-blue-500 transition-all shadow-sm">
              {pill}
            </button>
          ))}
        </div>
      </section>

      {/* KPI Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-2 relative z-10">
        {kpis.map((kpi, index) => (
          <StatCard key={index} {...kpi} />
        ))}
      </section>

      <div className="payment-history-workspace">
        {/* Timeline Visualization */}
        <section className="mb-10 bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">Revenue Timeline</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Hourly transaction flow & spikes</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Live View</button>
              <button className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Compare</button>
            </div>
          </div>
          <div className="h-48 flex items-end gap-2.5 px-4 overflow-x-auto pb-4 custom-scrollbar">
            {Array.from({ length: 24 }).map((_, i) => {
              const height = Math.floor(Math.random() * 80) + 10;
              return (
                <div key={i} className="flex-1 min-w-[32px] flex flex-col items-center gap-3 group">
                  <div className="w-full relative">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: i * 0.02, duration: 1 }}
                      className={`w-full rounded-t-xl transition-all duration-300 ${
                        height > 70 ? 'bg-blue-600' : height > 40 ? 'bg-blue-400' : 'bg-slate-200 group-hover:bg-blue-200'
                      }`}
                    />
                    {height > 60 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded pointer-events-none">
                        ₹{height}K
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter opacity-40 group-hover:opacity-100">{i}:00</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Main Workspace */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* Left Panel - Quick Access */}
          <aside className="col-span-12 lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[24px] border border-slate-200 p-5 sticky top-24 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Focus Segments</h4>
              <div className="space-y-2.5">
                {quickFilters.map((seg) => (
                  <button 
                    key={seg.label}
                    onClick={() => setSelectedSegment(seg.label)}
                    className={`w-full flex flex-col p-4 rounded-2xl transition-all border ${
                      selectedSegment === seg.label ? "bg-slate-900 border-slate-900 text-white shadow-xl translate-x-1" : "bg-white border-slate-100 text-slate-600 hover:border-blue-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-2 h-2 rounded-full ${seg.color}`} />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${selectedSegment === seg.label ? "text-emerald-400" : "text-slate-400"}`}>{seg.trend}</span>
                    </div>
                    <span className="text-[11px] font-black leading-tight mb-1">{seg.label}</span>
                    <div className="flex items-end justify-between">
                      <span className="text-lg font-black tracking-tighter leading-none">{seg.amount}</span>
                      <span className={`text-[10px] font-bold ${selectedSegment === seg.label ? "text-slate-400" : "text-slate-400"}`}>{seg.count}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Center Workspace - Main Table */}
          <section className="col-span-12 lg:col-span-7 space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
              {/* Toolbar */}
              <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <h3 className="font-black text-slate-900 tracking-tight">Ledger Records</h3>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Real-time Data</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Filter className="w-4 h-4" /></button>
                  <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><FileDown className="w-4 h-4" /></button>
                  <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Settings className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">
                      <th className="px-8 py-4">Transaction Details</th>
                      <th className="px-6 py-4">Classification</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4">Timeline</th>
                      <th className="px-8 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transactionData.map((row) => (
                      <tr 
                        key={row.id} 
                        className="group hover:bg-blue-50/[0.15] transition-all cursor-pointer relative"
                        onClick={() => openDrawer(row)}
                      >
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 group-hover:border-blue-200 group-hover:bg-white transition-all shadow-sm">
                              <Wallet className={`w-5 h-5 ${
                                row.status === 'Successful' ? 'text-emerald-500' :
                                row.status === 'Failed' ? 'text-rose-500' : 'text-purple-500'
                              }`} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight mb-1">{row.member.name}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{row.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-700">{row.type}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{row.method}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-black text-slate-900 tracking-tight">{currencyFormatter.format(row.amount)}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Tax: {currencyFormatter.format(row.tax)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-600">{row.date.split(' ')[0]}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{row.date.split(' ').slice(1).join(' ')}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex items-center justify-between">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                              row.status === 'Successful' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              row.status === 'Failed' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              'bg-purple-50 text-purple-600 border-purple-100'
                            }`}>
                              {row.status}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 transition-transform">
                              <MoreHorizontal className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Records 1 - 4 of 2,842 Transactions</p>
                <div className="flex gap-2">
                  <button className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-not-allowed">Back</button>
                  <button className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-blue-500 transition-all">Next</button>
                </div>
              </div>
            </div>
          </section>

          {/* Right Panel - Intelligence */}
          <aside className="col-span-12 lg:col-span-3 space-y-6">
            {/* AI Revenue Insight */}
            <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
              <Brain className="absolute -bottom-8 -right-8 w-40 h-40 text-white/10 rotate-12 group-hover:scale-110 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner">
                    <Zap className="w-5 h-5 text-amber-300 animate-pulse" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Financial AI</span>
                </div>
                <div className="space-y-4">
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-lg">
                    <p className="text-sm font-medium leading-relaxed opacity-90">
                      <span className="font-black text-amber-300">Renewal Revenue</span> is trending <span className="font-black text-emerald-400">+18% higher</span> than Q1 average. Recommendation: Focus on premium tier upselling.
                    </p>
                  </div>
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-lg">
                    <p className="text-sm font-medium leading-relaxed opacity-90">
                      <span className="font-black text-rose-300">Failed transactions</span> spiked between 10AM - 11AM today. Suspected gateway maintenance detected.
                    </p>
                  </div>
                </div>
                <button className="w-full mt-8 py-3.5 bg-white text-blue-900 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-xl active:scale-[0.98]">
                  Predictive Forecasting
                </button>
              </div>
            </div>

            {/* Revenue Distribution */}
            <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-600" />
                Revenue Distribution
              </h4>
              <div className="space-y-5">
                {[
                  { label: "Memberships", value: 68, color: "bg-blue-600" },
                  { label: "PT Sessions", value: 22, color: "bg-emerald-500" },
                  { label: "Merchandise", value: 10, color: "bg-purple-500" }
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider mb-2">
                      <span className="text-slate-500">{item.label}</span>
                      <span className="text-slate-900">{item.value}%</span>
                    </div>
                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        className={`h-full ${item.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Snapshot */}
            <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 leading-none">Global Performance</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group-hover:border-white/10 transition-colors">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Growth</div>
                  <div className="text-xl font-black text-emerald-400">+24%</div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group-hover:border-white/10 transition-colors">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">ARPU</div>
                  <div className="text-xl font-black text-blue-400">₹4.8K</div>
                </div>
              </div>
              <button className="w-full mt-6 py-3 bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10">
                Full Financial Audit
              </button>
            </div>
          </aside>
        </div>

        {/* Bottom Analytics Section */}
        <section className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">Branch Revenue Performance</h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Multi-location comparison & analytics</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all"><CalendarDays className="w-4 h-4 text-slate-400" /></button>
                <button className="h-10 px-5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Export Visuals</button>
              </div>
            </div>
            <div className="h-64 flex items-end gap-6 px-4">
              {[60, 85, 45, 90, 65, 75, 40].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                  <div className="w-full relative">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 1.2, ease: "backOut" }}
                      className={`w-full rounded-2xl transition-all duration-500 relative overflow-hidden ${
                        i === 3 ? 'bg-blue-600 shadow-[0_15px_30px_-5px_rgba(37,99,235,0.4)]' : 'bg-slate-100 group-hover:bg-slate-200'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                    </motion.div>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter opacity-60">BR-{i + 10}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
            <LineChart className="absolute top-10 right-10 w-24 h-24 text-blue-500/10" />
            <h3 className="text-2xl font-black mb-8 tracking-tight">Accounting Snapshot</h3>
            <div className="space-y-8">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                  <BarChart3 className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Fiscal Year Revenue</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">₹2.4Cr</span>
                    <span className="text-xs font-black text-emerald-400 leading-none">↑ 18.2%</span>
                  </div>
                </div>
              </div>

              <div className="p-7 bg-white/5 rounded-[32px] border border-white/10 space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    <span>Tax Liability</span>
                    <span className="text-white">₹4.2L</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[65%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    <span>Net Margin</span>
                    <span className="text-emerald-400">42.8%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[42.8%]" />
                  </div>
                </div>
              </div>

              <button className="w-full py-5 bg-white text-slate-900 rounded-[24px] text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-xl">
                Generate GST Summary
              </button>
            </div>
          </div>
        </section>
      </div>

      <PaymentDetailsDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        transaction={selectedTxn} 
      />
    </div>
  );
};

export const mountPaymentHistory = () => {
  console.log("GymDeck: Mounting Payment History module...");
  const stage = document.querySelector('[data-stage="payment-history"]');
  if (!stage) {
    console.error("GymDeck: Payment History stage element not found!");
    return null;
  }

  const rootElement = document.createElement("div");
  rootElement.dataset.paymentHistoryReactRoot = "";
  rootElement.className = "min-h-full";
  stage.replaceChildren(rootElement);

  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <><PaymentHistoryPage /><BrandFooter /></>
      </ErrorBoundary>
    );
    console.log("GymDeck: Payment History module mounted successfully.");
    return root;
  } catch (err) {
    console.error("Failed to render Payment History UI:", err);
    return null;
  }
};

export default PaymentHistoryPage;
