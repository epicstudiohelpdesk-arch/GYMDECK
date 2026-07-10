import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Filter,
  History,
  Info,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Formatter
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

// Mock Data
const kpiData = [
  { label: "Today's Collections", value: 48500, trend: "+12.5%", isUp: true },
  { label: "Pending Dues", value: 12400, trend: "-4.2%", isUp: false },
  { label: "Monthly Revenue", value: 420000, trend: "+8.1%", isUp: true },
  { label: "Failed Payments", value: 2, trend: "-1", isUp: false }
];

const mockMember = {
  id: "MBR-9042",
  name: "Arjun Mehta",
  phone: "+91 98765 43210",
  status: "Active",
  plan: "Pro Annual",
  expiry: "2026-08-15",
  trainer: "Vikram S.",
  pendingDues: 0,
  wallet: 1200
};

const CollectFeesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState(mockMember);
  const [invoiceItems, setInvoiceItems] = useState([
    { id: 1, name: "Pro Annual Renewal", qty: 1, price: 18000, discount: 0 }
  ]);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [discountValue, setDiscountValue] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Computed Totals
  const subtotal = useMemo(() => invoiceItems.reduce((acc, item) => acc + (item.qty * item.price) - item.discount, 0), [invoiceItems]);
  const totalDiscount = discountValue;
  const tax = useMemo(() => (subtotal - totalDiscount) * 0.18, [subtotal, totalDiscount]);
  const totalPayable = useMemo(() => subtotal - totalDiscount + tax, [subtotal, totalDiscount, tax]);

  const handleAddItem = useCallback(() => {
    setInvoiceItems((prev) => [...prev, { id: Date.now(), name: "Add-on / PT Session", qty: 1, price: 2000, discount: 0 }]);
  }, []);

  const handleRemoveItem = useCallback((id) => {
    setInvoiceItems((prev) => prev.filter(item => item.id !== id));
  }, []);

  const handleProcessPayment = useCallback(() => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
    }, 1500);
  }, []);

  const resetBilling = useCallback(() => {
    setIsSuccess(false);
    setInvoiceItems([]);
    setSelectedMember(null);
    setSearchQuery("");
  }, []);


  return (
    <div className="payments-shell font-sans text-slate-900 selection:bg-indigo-100">
      {/* Top Utility Header */}
      <header className="relative z-50 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span>Payments & Billing</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold">Collect Fees</span>
        </div>

        <div className="flex-1 max-w-xl px-8 relative">
          <Search className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search member, invoice, phone, membership ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-slate-100/70 border border-slate-200 rounded-lg pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
          <button className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <QrCode className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-lg border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50 relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          <button className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Walk-In Billing
          </button>
        </div>
      </header>

      {/* Page Title & KPI Strip */}
      <section className="flex flex-col gap-6 relative z-10 mb-2">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Collect Fees</h1>
            <p className="text-xs font-semibold text-slate-500 mt-2 max-w-lg">Manage membership payments, renewals, dues recovery, invoices, and recurring billing across your fitness ecosystem.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-9 px-4 rounded-md text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2">
              <History className="w-4 h-4" />
              Pending Dues
            </button>
            <button className="h-9 px-4 rounded-md text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Revenue Reports
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((kpi, idx) => (
            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 animate-fadeIn">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{kpi.label}</span>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-slate-900">{typeof kpi.value === 'number' && kpi.value > 1000 ? currencyFormatter.format(kpi.value) : kpi.value}</span>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 ${kpi.isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {kpi.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {kpi.trend}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3-Column Billing Workspace */}
      <div className="payments-workspace">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
          
          {/* LEFT: Member Profile */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg">
                  {selectedMember ? selectedMember.name.charAt(0) : <User className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{selectedMember ? selectedMember.name : "Select Member"}</h3>
                  <p className="text-xs text-slate-500">{selectedMember ? selectedMember.id : "---"}</p>
                </div>
              </div>
              
              {selectedMember && (
                <div className="p-4 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                    <div>
                      <span className="block text-xs text-slate-400 mb-1">Status</span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 font-semibold text-[11px] rounded-md uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {selectedMember.status}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400 mb-1">Expiry Date</span>
                      <span className="font-medium text-slate-700">{selectedMember.expiry}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-xs text-slate-400 mb-1">Active Plan</span>
                      <span className="font-medium text-slate-900">{selectedMember.plan}</span>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 w-full" />

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Pending Dues</span>
                      <span className="font-semibold text-slate-900">{currencyFormatter.format(selectedMember.pendingDues)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-2"><Wallet className="w-4 h-4" /> Wallet Balance</span>
                      <span className="font-semibold text-indigo-600">{currencyFormatter.format(selectedMember.wallet)}</span>
                    </div>
                  </div>
                </div>
              )}
              {!selectedMember && (
                <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                  <Search className="w-8 h-8 opacity-50" />
                  <p>Search for a member to start billing.</p>
                </div>
              )}
            </div>

            {selectedMember && (
              <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-amber-900 block mb-1">Smart Recommendation</span>
                  <span className="text-amber-800">Upgrade to Annual Pro plan and save ₹4,200. Eligible for 10% loyalty discount.</span>
                </div>
              </div>
            )}
          </div>

          {/* CENTER: Invoice Builder */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-200px)]">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Invoice Details
              </h2>
              <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">INV-2605-4921</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              <div className="grid grid-cols-12 gap-4 pb-2 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
                <div className="col-span-5">Item</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-3 text-right">Price</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              <AnimatePresence>
                {invoiceItems.map((item) => (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, x: -20 }}
                    key={item.id} 
                    className="grid grid-cols-12 gap-4 items-center bg-white p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors group"
                  >
                    <div className="col-span-5 flex flex-col">
                      <input type="text" value={item.name} className="font-medium text-slate-900 text-sm bg-transparent outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1" readOnly={false} />
                      <span className="text-[11px] text-slate-400 px-1 -ml-1">12 Months</span>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <input type="number" value={item.qty} className="w-12 text-center text-sm font-medium bg-slate-100 border border-slate-200 rounded-md py-1 outline-none" readOnly />
                    </div>
                    <div className="col-span-3 text-right">
                      <input type="text" value={currencyFormatter.format(item.price)} className="text-sm text-slate-600 bg-transparent text-right outline-none w-full" readOnly />
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <span className="text-sm font-semibold text-slate-900">{currencyFormatter.format((item.qty * item.price) - item.discount)}</span>
                      <button onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <button onClick={handleAddItem} className="mt-2 flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
                <Plus className="w-4 h-4" />
                Add Billable Item
              </button>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-900">{currencyFormatter.format(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm group relative">
                <span className="text-slate-500 flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors">
                  Discount <Tag className="w-3 h-3" />
                </span>
                <span className="font-medium text-emerald-600">-{currencyFormatter.format(totalDiscount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Taxes (GST 18%)</span>
                <span className="font-medium text-slate-900">{currencyFormatter.format(tax)}</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Payment Panel */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="bg-slate-900 rounded-xl shadow-enterprise overflow-hidden text-white p-6 relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <span className="block text-slate-400 text-sm font-medium mb-2 uppercase tracking-wider">Total Payable</span>
                <div className="text-4xl font-bold tracking-tight mb-6">
                  {currencyFormatter.format(totalPayable)}
                </div>
                
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Payment Method</span>
                  {['UPI', 'Credit Card', 'Cash'].map((method) => (
                    <button 
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${paymentMethod === method ? 'bg-indigo-600 border-indigo-500 shadow-md shadow-indigo-900/50' : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'}`}
                    >
                      <span className="font-medium text-sm">{method}</span>
                      {paymentMethod === method && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-slate-700/50 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-all">
                    Split Payment
                  </button>
                </div>

                <div className="mt-8">
                  <button 
                    onClick={handleProcessPayment}
                    disabled={isProcessing || invoiceItems.length === 0}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20 rounded-xl py-4 font-bold text-sm tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>Collect {currencyFormatter.format(totalPayable)}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Installments Mini Panel */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-slate-900 text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> EMI / Installments</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">Off</span>
              </div>
              <button className="w-full text-sm text-indigo-600 font-medium py-2 rounded-lg hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100">
                Convert to Installments
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal Overlay */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="bg-emerald-500 p-8 flex flex-col items-center justify-center text-white relative">
                <button onClick={resetBilling} className="absolute top-4 right-4 text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-700/30 mb-4">
                  <Check className="w-8 h-8 text-emerald-500 stroke-[3]" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Payment Successful</h2>
                <p className="text-emerald-50 mt-1 opacity-90">{currencyFormatter.format(totalPayable)} collected via {paymentMethod}</p>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-3 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Transaction ID</span><span className="font-medium text-slate-900">TXN-8472910</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Member</span><span className="font-medium text-slate-900">{selectedMember?.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">New Expiry</span><span className="font-medium text-emerald-600">15 Aug 2027</span></div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 font-semibold text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <Printer className="w-4 h-4" /> Print Receipt
                  </button>
                  <button className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 font-semibold text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <Smartphone className="w-4 h-4" /> SMS / WhatsApp
                  </button>
                  <button onClick={resetBilling} className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 font-semibold text-sm text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20">
                    Collect Another Payment <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import { ErrorBoundary } from "./ErrorHandlers.jsx";

export function mountCollectFees() {
  const stage = document.querySelector('[data-stage="payments"]');
  if (!stage) return null;

  const rootElement = document.createElement("div");
  rootElement.dataset.collectFeesReactRoot = "";
  rootElement.className = "min-h-full";
  stage.replaceChildren(rootElement);

  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <><CollectFeesPage /><BrandFooter /></>
      </ErrorBoundary>
    );
    return root;
  } catch (err) {
    console.error("Failed to render Collect Fees UI:", err);
    return null;
  }
}

export default CollectFeesPage;
