import React, { useState, useMemo, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Search,
  Bell,
  Download,
  Filter,
  Calendar,
  ChevronRight,
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
  CalendarDays,
  FileCheck,
  FileBox,
  MonitorSmartphone,
  ScanLine,
  Image as ImageIcon,
  Check,
  Type,
  Layout,
  MessageSquare,
  History as HistoryIcon,
  Maximize2,
  ZoomIn,
  Move
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "./ErrorHandlers.jsx";

// --- Formatter ---
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

// --- Mock Data ---
const mockMember = {
  id: "MBR-9042",
  name: "Arjun Mehta",
  image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun",
  plan: "Pro Annual Membership",
  expiry: "2025-05-18",
  trainer: "Vikram S.",
  dues: 0,
  wallet: 1500,
  phone: "+91 98765 43210",
  email: "arjun.m@example.com",
  address: "123 Fitness Avenue, Mumbai"
};

const mockTransaction = {
  id: "TXN-8842901",
  invoiceId: "INV-2024-001",
  date: "2024-05-18 10:45 AM",
  method: "UPI (PhonePe)",
  subtotal: 15254.24,
  discount: 0,
  tax: 2745.76, // 18% GST
  total: 18000.00,
  items: [
    { name: "Pro Annual Membership Renewal", qty: 1, rate: 12000, tax: "18%", amount: 12000 },
    { name: "Personal Training (10 Sessions)", qty: 1, rate: 3254.24, tax: "18%", amount: 3254.24 }
  ],
  status: "Successful",
  staff: "Rahul K.",
  branch: "GymDeck HQ, Mumbai",
  gstin: "27AADCB2230M1Z2",
  address: "Building 4B, BKC, Mumbai, MH - 400051"
};

const receiptHistory = [
  { id: "RCP-1024", member: "Sneha Kapoor", date: "12 May, 2024", amount: "₹4,500", type: "Monthly" },
  { id: "RCP-1021", member: "Rohan Das", date: "10 May, 2024", amount: "₹12,000", type: "Renewal" },
  { id: "RCP-1018", member: "Meera R.", date: "08 May, 2024", amount: "₹1,200", type: "PT Single" }
];

// --- Sub-Components ---

const GenerateReceiptPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("modern");
  const [pageSize, setPageSize] = useState("A4");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [receiptOptions, setReceiptOptions] = useState({
    gst: true,
    qr: true,
    terms: true,
    signature: true,
    watermark: false,
    barcode: true
  });

  const toggleOption = (key) => {
    setReceiptOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-full bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100">
      {/* Top Utility Header (Blueprint Section 5) */}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span className="opacity-60">Payments & Billing</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold">Generate Receipt</span>
        </div>

        {/* Center Search */}
        <div className="flex-1 max-w-lg px-8 relative">
          <Search className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search invoice, member, transaction ID..."
            className="w-full h-10 bg-slate-100/70 border border-slate-200 rounded-xl pl-10 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Actions (Blueprint Section 5) */}
        <div className="flex items-center gap-2">
          <button className="h-10 px-3 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <button className="h-10 px-3 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
            <FileDown className="w-3.5 h-3.5" />
            PDF
          </button>
          <button className="h-10 px-3 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" />
            Email
          </button>
          <button className="h-10 px-3 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <button className="h-10 px-5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Generate Receipt
          </button>
        </div>
      </header>

      {/* Receipt Generation Controls Strip (Blueprint Section 3) */}
      <div className="h-14 bg-white border-b border-slate-100 px-8 flex items-center gap-8 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest border-r border-slate-100 pr-8 h-6">
          <History className="w-4 h-4" />
          Quick History
        </div>
        <div className="flex items-center gap-6">
          {["Monthly Dues", "PT Sessions", "Merchandise", "Renewal"].map(cat => (
            <button key={cat} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-blue-600 transition-colors">
              {cat}
            </button>
          ))}
        </div>
      </div>

      <main className="p-8 max-w-[1600px] mx-auto pb-24">
        {/* Title Section (Blueprint Section 6) */}
        <section className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Generate Receipt</h1>
            <p className="text-slate-500 max-w-2xl font-medium text-base">
              Create professional payment receipts, invoices, GST documents, and transaction confirmations for all billing activities.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {["Receipt Templates", "GST Settings", "Branding", "AI Summary"].map((pill) => (
              <button key={pill} className="px-5 py-2.5 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm">
                {pill}
              </button>
            ))}
          </div>
        </section>

        {/* Main Workspace Layout (Blueprint Section 7: 3-6-3 structure) */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* Left Panel - Billing & Member Info (Blueprint Section 8) */}
          <aside className="col-span-12 lg:col-span-3 space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-200 p-7 shadow-sm sticky top-24">
              <div className="mb-8">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4">Member Search</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="Search member or invoice..."
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Member Profile</h4>
              
              <div className="flex items-center gap-5 mb-8">
                <div className="relative">
                  <img src={mockMember.image} className="w-20 h-20 rounded-[24px] bg-slate-100 shadow-inner" alt="" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-[3px] border-white rounded-full shadow-md" />
                </div>
                <div>
                  <div className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1.5">{mockMember.name}</div>
                  <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none flex items-center gap-2">
                    {mockMember.id}
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    Pro Tier
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-[20px] border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Expiry</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">{mockMember.expiry}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-[20px] border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">Trainer</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">{mockMember.trainer}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Linked Transaction</h4>
                <div className="relative">
                  <select className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-800 appearance-none focus:outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm">
                    <option>{mockTransaction.id} • {currencyFormatter.format(mockTransaction.total)}</option>
                    <option>TXN-8842890 • ₹4,500.00</option>
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </aside>

          {/* Center Workspace - Receipt Canvas (Blueprint Section 9) */}
          <section className="col-span-12 lg:col-span-6 flex flex-col items-center">
            {/* Live Preview Controls */}
            <div className="w-full max-w-[780px] flex items-center justify-between mb-6 px-4 bg-white/50 backdrop-blur py-3 rounded-2xl border border-slate-200/50">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.1em]">Ready for Generation</span>
              </div>
              <div className="flex gap-2">
                <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm"><ZoomIn className="w-4 h-4" /></button>
                <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm"><Maximize2 className="w-4 h-4" /></button>
                <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm"><Move className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Receipt Canvas (Blueprint Section 10) */}
            <motion.div 
              layout
              className={`w-full max-w-[780px] bg-white rounded-sm shadow-[0_60px_120px_-20px_rgba(15,23,42,0.18)] overflow-hidden relative font-sans text-slate-800 flex flex-col transition-all duration-500 ${pageSize === 'thermal' ? 'max-w-[400px]' : ''}`}
            >
              {receiptOptions.watermark && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] select-none z-10">
                  <div className="text-[180px] font-black rotate-[-35deg] tracking-[0.2em] text-blue-600">PAID</div>
                </div>
              )}
              
              {/* Receipt Header (Blueprint Section 10) */}
              <div className="p-14 border-b border-slate-100 flex justify-between items-start shrink-0 bg-white relative">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-900 rounded-[20px] flex items-center justify-center text-white shadow-xl">
                    <Activity className="w-9 h-9" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter leading-none mb-1.5">GYMDECK</h2>
                    <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3">{mockTransaction.branch}</p>
                    <div className="text-[10px] font-bold text-slate-400 leading-relaxed max-w-[220px]">
                      {mockTransaction.address}
                      {receiptOptions.gst && <div className="mt-1 text-slate-900 font-black">GSTIN: {mockTransaction.gstin}</div>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <h1 className="text-4xl font-black text-slate-100 uppercase tracking-tighter mb-6 select-none leading-none">Tax Invoice</h1>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-end gap-6 border-b border-slate-50 pb-1">
                      <span className="font-bold text-slate-400 uppercase tracking-[0.1em]">Receipt #</span>
                      <span className="font-black text-slate-900">RCP-2024-9942</span>
                    </div>
                    <div className="flex justify-end gap-6 border-b border-slate-50 pb-1">
                      <span className="font-bold text-slate-400 uppercase tracking-[0.1em]">Invoice #</span>
                      <span className="font-black text-slate-900">{mockTransaction.invoiceId}</span>
                    </div>
                    <div className="flex justify-end gap-6">
                      <span className="font-bold text-slate-400 uppercase tracking-[0.1em]">Date</span>
                      <span className="font-black text-slate-900">{mockTransaction.date}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill To & Info (Blueprint Section 10) */}
              <div className="px-14 py-12 grid grid-cols-2 gap-16 shrink-0 border-b border-slate-50 bg-slate-50/30">
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-5 border-l-2 border-blue-600 pl-3">Bill To</h3>
                  <div className="text-lg font-black text-slate-900 mb-1.5">{mockMember.name}</div>
                  <div className="text-xs font-bold text-slate-600 mb-1">Membership ID: {mockMember.id}</div>
                  <div className="text-xs font-medium text-slate-400">{mockMember.phone}</div>
                  <div className="text-xs font-medium text-slate-400">{mockMember.email}</div>
                </div>
                <div className="text-right flex flex-col items-end justify-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-5 pr-3 border-r-2 border-emerald-600">Transaction</h3>
                  <div className="flex items-center justify-end gap-2 text-base font-black text-slate-900 mb-1">
                    <Smartphone className="w-5 h-5 text-blue-600" />
                    {mockTransaction.method}
                  </div>
                  <div className="text-xs font-black text-emerald-600 mb-1 uppercase tracking-widest">Payment {mockTransaction.status}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Gateway: {mockTransaction.id}</div>
                </div>
              </div>

              {/* Items Table (Blueprint Section 10) */}
              <div className="flex-1 px-14 py-10 min-h-[350px]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-900">
                      <th className="py-5 text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] text-left">Description</th>
                      <th className="py-5 text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] text-center">Qty</th>
                      <th className="py-5 text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] text-right">Unit Rate</th>
                      <th className="py-5 text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mockTransaction.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-6">
                          <div className="text-base font-black text-slate-800 leading-tight mb-1.5">{item.name}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2">
                            <Tag className="w-3 h-3" />
                            Tax Applied: {item.tax} Integrated GST
                          </div>
                        </td>
                        <td className="py-6 text-sm font-black text-slate-600 text-center">{item.qty}</td>
                        <td className="py-6 text-sm font-black text-slate-600 text-right">{currencyFormatter.format(item.rate)}</td>
                        <td className="py-6 text-base font-black text-slate-900 text-right">{currencyFormatter.format(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Section (Blueprint Section 10) */}
              <div className="px-14 py-12 bg-slate-900 text-white flex justify-end shrink-0 border-t border-slate-800">
                <div className="w-1/2 space-y-5">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-[0.15em]">
                    <span className="text-slate-400">Taxable Amount</span>
                    <span className="text-white">{currencyFormatter.format(mockTransaction.subtotal)}</span>
                  </div>
                  {receiptOptions.gst && (
                    <div className="flex justify-between text-xs font-bold uppercase tracking-[0.15em]">
                      <span className="text-slate-400">GST (18% Integrated)</span>
                      <span className="text-emerald-400">{currencyFormatter.format(mockTransaction.tax)}</span>
                    </div>
                  )}
                  <div className="pt-6 border-t border-white/20 flex justify-between items-center">
                    <span className="text-sm font-black uppercase tracking-[0.3em]">Grand Total</span>
                    <span className="text-4xl font-black text-blue-400 font-mono tracking-tighter">{currencyFormatter.format(mockTransaction.total)}</span>
                  </div>
                </div>
              </div>

              {/* Footer (Blueprint Section 10) */}
              <div className="p-14 border-t border-slate-100 flex items-end justify-between shrink-0 bg-white">
                <div className="max-w-[55%]">
                  {receiptOptions.terms && (
                    <>
                      <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        Terms of Service
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 leading-relaxed mb-8">
                        This document serves as an official confirmation of payment. Memberships are non-refundable and subject to club policies. For support, contact hi@gymdeck.hq.
                      </p>
                    </>
                  )}
                  <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-100 py-2.5 px-4 rounded-xl w-fit">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-[11px] font-black text-emerald-700 uppercase tracking-[0.2em]">Digitally Verified</span>
                  </div>
                </div>
                <div className="flex gap-12 items-end">
                  {receiptOptions.qr && (
                    <div className="text-center group">
                      <div className="w-24 h-24 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 border border-slate-100 p-3 shadow-inner group-hover:scale-105 transition-transform duration-500">
                        <ScanLine className="w-14 h-14 text-slate-200" />
                      </div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">Verification QR</div>
                    </div>
                  )}
                  {receiptOptions.signature && (
                    <div className="text-center">
                      <div className="w-40 h-16 border-b-2 border-dashed border-slate-200 mb-3 flex items-end justify-center pb-3">
                        <span className="font-custom text-3xl opacity-40 italic font-medium tracking-tighter text-blue-900"> राहुल के. </span>
                      </div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">Authorized Signatory</div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </section>

          {/* Right Panel - Settings & AI (Blueprint Section 12 & 20) */}
          <aside className="col-span-12 lg:col-span-3 space-y-6">
            {/* AI Billing Insight (Blueprint Section 20) */}
            <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group border border-white/5">
              <Brain className="absolute -bottom-10 -right-10 w-40 h-40 text-blue-500/10 group-hover:scale-110 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Financial IQ</span>
                </div>
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md mb-6">
                  <p className="text-sm font-medium leading-relaxed opacity-90">
                    <span className="font-black text-blue-400">Insight:</span> This member's PT sessions are expiring soon. Generate a <span className="font-black text-emerald-400">renewal-linked invoice</span> to increase PT attachment rate by 22%.
                  </p>
                </div>
                <button className="w-full py-4 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-xl active:scale-[0.98]">
                  Run Revenue Audit
                </button>
              </div>
            </div>

            {/* Document Settings (Blueprint Section 12) */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm sticky top-24 overflow-hidden">
              <div className="p-7 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Settings className="w-6 h-6 text-blue-600" />
                  Document Setup
                </h3>
              </div>

              <div className="p-7 space-y-8 h-[calc(100vh-480px)] overflow-y-auto custom-scrollbar">
                {/* Page Setup */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Layout className="w-3.5 h-3.5" />
                    Canvas Dimensions
                  </h4>
                  <div className="flex gap-2.5">
                    {["A4", "Thermal", "POS"].map(size => (
                      <button 
                        key={size}
                        onClick={() => setPageSize(size)}
                        className={`flex-1 py-3.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                          pageSize === size ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Template Selection */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Template Palette
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "modern", label: "Modern", icon: LayoutGrid },
                      { id: "corporate", label: "Corp.", icon: FileBox },
                      { id: "thermal", label: "POS", icon: MonitorSmartphone },
                      { id: "minimal", label: "Slim", icon: List }
                    ].map(tpl => (
                      <button 
                        key={tpl.id}
                        onClick={() => setSelectedTemplate(tpl.id)}
                        className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all ${
                          selectedTemplate === tpl.id ? 'border-blue-600 bg-blue-50/40 shadow-sm' : 'border-slate-100 bg-slate-50 hover:border-blue-200'
                        }`}
                      >
                        <tpl.icon className={`w-6 h-6 ${selectedTemplate === tpl.id ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${selectedTemplate === tpl.id ? 'text-blue-900' : 'text-slate-500'}`}>
                          {tpl.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Data Visibility */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Element Visibility
                  </h4>
                  <div className="space-y-3">
                    {[
                      { key: "gst", label: "GST Compliance Data" },
                      { key: "qr", label: "Audit QR Token" },
                      { key: "signature", label: "Authorized Signatory" },
                      { key: "watermark", label: "Payment Watermark" }
                    ].map(opt => (
                      <button 
                        key={opt.key}
                        onClick={() => toggleOption(opt.key)}
                        className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors group"
                      >
                        <span className="text-[11px] font-bold text-slate-700">{opt.label}</span>
                        <div className={`w-9 h-5 rounded-full relative transition-all duration-300 ${receiptOptions[opt.key] ? 'bg-blue-600' : 'bg-slate-200'}`}>
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${receiptOptions[opt.key] ? 'left-5 shadow-md' : 'left-1'}`} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom Expandable - Receipt History (Blueprint Section 17) */}
        <section className="mt-12">
          <button 
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="w-full bg-white border border-slate-200 rounded-[40px] p-7 flex items-center justify-between shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-slate-900 rounded-[20px] flex items-center justify-center text-white shadow-xl">
                <HistoryIcon className="w-7 h-7" />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1.5">Documentation Audit Logs</h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">Comprehensive ledger of generated financial documents</p>
              </div>
            </div>
            <div className={`w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center transition-all duration-500 group-hover:bg-blue-50 ${isHistoryOpen ? 'rotate-180 bg-blue-600 text-white' : ''}`}>
              <ChevronDown className={`w-6 h-6 ${isHistoryOpen ? 'text-white' : 'text-slate-400'}`} />
            </div>
          </button>
          
          <AnimatePresence>
            {isHistoryOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white border-x border-b border-slate-200 rounded-b-[48px] px-10 pb-12 pt-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {receiptHistory.map((log) => (
                      <div key={log.id} className="p-7 bg-slate-50 border border-slate-100 rounded-[32px] group hover:bg-white hover:border-blue-200 hover:shadow-2xl transition-all duration-500 cursor-pointer">
                        <div className="flex items-center justify-between mb-6">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">{log.id}</span>
                          <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-widest">{log.type}</span>
                        </div>
                        <div className="mb-6">
                          <div className="text-lg font-black text-slate-900 mb-1.5 leading-none">{log.member}</div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{log.date}</div>
                        </div>
                        <div className="flex items-center justify-between pt-6 border-t border-slate-100 group-hover:border-blue-50">
                          <span className="text-xl font-black text-slate-900 tracking-tighter">{log.amount}</span>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                            <button className="p-2.5 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-500 hover:text-blue-600 hover:scale-110 transition-all"><Printer className="w-4 h-4" /></button>
                            <button className="p-2.5 bg-blue-600 rounded-xl shadow-lg border border-blue-500 text-white hover:bg-blue-700 hover:scale-110 transition-all"><Download className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button className="p-7 bg-slate-50 border border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-200 transition-all group">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm group-hover:scale-110 transition-transform">
                        <SearchCode className="w-8 h-8" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-center leading-tight">Access Documentation Archive</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Floating Status (Blueprint Section 23 Success Experience) */}
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed bottom-10 right-10 z-50 flex items-center gap-5 bg-slate-900 text-white p-2.5 pr-8 rounded-full shadow-[0_20px_50px_rgba(15,23,42,0.4)] ring-1 ring-white/10"
        >
          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Check className="w-7 h-7" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-0.5">Engine Online</div>
            <div className="text-sm font-bold tracking-tight">Financial System Ready</div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export const mountGenerateReceipt = () => {
  console.log("GymDeck: Mounting Generate Receipt module...");
  const stage = document.querySelector('[data-stage="generate-receipt"]');
  if (!stage) {
    console.error("GymDeck: Generate Receipt stage element not found!");
    return null;
  }

  const rootElement = document.createElement("div");
  rootElement.dataset.generateReceiptReactRoot = "";
  rootElement.className = "min-h-full";
  stage.replaceChildren(rootElement);

  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <GenerateReceiptPage />
      </ErrorBoundary>
    );
    console.log("GymDeck: Generate Receipt module mounted successfully.");
    return root;
  } catch (err) {
    console.error("Failed to render Generate Receipt UI:", err);
    return null;
  }
};

export default GenerateReceiptPage;
