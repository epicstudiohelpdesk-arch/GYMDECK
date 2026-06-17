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
  CalendarDays,
  Percent,
  Receipt,
  BadgeCent,
  MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";
import { ErrorBoundary } from "./ErrorHandlers.jsx";

// --- Formatter ---
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

// --- Mock Data ---
const kpis = [
  { label: "Renewals Today", value: "24", trend: "+12%", isUp: true, icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Renewal Revenue", value: "₹2,84,000", trend: "+8.4%", isUp: true, icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Expiring This Week", value: "142", trend: "-5", isUp: true, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Churn Risk", value: "18", trend: "+2", isUp: false, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
  { label: "Upgrade Rate", value: "22.4%", trend: "+4.1%", isUp: true, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" }
];

const mockMember = {
  id: "MBR-8842",
  name: "Sneha Kapoor",
  image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha",
  plan: "Standard Monthly",
  expiry: "2024-05-22",
  trainer: "Rahul K.",
  attendance: "High",
  dues: 0,
  lifetimeSpend: 45000,
  probability: 88,
  status: "Expiring Soon"
};

const plans = [
  { id: "p1", name: "Standard Monthly", price: 4500, duration: "1 Month", popular: false },
  { id: "p2", name: "Pro Quarterly", price: 12000, duration: "3 Months", popular: true, save: "₹1,500" },
  { id: "p3", name: "Elite Annual", price: 36000, duration: "12 Months", popular: false, save: "₹18,000" }
];

const RenewMembershipPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(plans[1]); // Default select popular
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [autoRenew, setAutoRenew] = useState(false);

  // Calculations
  const basePrice = selectedPlan.price;
  const discountAmount = discount ? (basePrice * (parseInt(discount) / 100)) : 0;
  const subtotal = basePrice - discountAmount;
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 pb-24">
      {/* Top Utility Header */}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span className="opacity-60">Payments & Billing</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold">Renew Membership</span>
        </div>

        <div className="flex-1 max-w-lg px-8 relative">
          <Search className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search member by phone, ID or name..."
            className="w-full h-10 bg-slate-100/70 border border-slate-200 rounded-xl pl-10 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-xl border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50 transition-colors relative ml-1">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
          </button>
          <button className="h-10 px-5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Process Renewal
          </button>
        </div>
      </header>

      <main className="p-8 max-w-[1600px] mx-auto">
        {/* Title Section */}
        <section className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Renew Membership</h1>
            <p className="text-slate-500 max-w-2xl font-medium">
              Manage membership renewals, recurring billing, upgrades, and retention workflows across your fitness ecosystem.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["AI Retention Insights", "Revenue Forecast", "Upgrade Engine", "Renewal Automation"].map((pill) => (
              <button key={pill} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-blue-500 transition-all shadow-sm">
                {pill}
              </button>
            ))}
          </div>
        </section>

        {/* KPI Strip */}
        <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-10">
          {kpis.map((kpi, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 ${kpi.bg} ${kpi.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${kpi.isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                  {kpi.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {kpi.trend}
                </div>
              </div>
              <div>
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">{kpi.label}</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</h3>
              </div>
            </motion.div>
          ))}
        </section>

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* Left Panel - Member Profile */}
          <aside className="col-span-12 lg:col-span-3 space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm sticky top-24">
              <div className="flex justify-between items-start mb-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Member Identity</h4>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-100">
                  {mockMember.status}
                </span>
              </div>
              
              <div className="flex items-center gap-4 mb-8">
                <img src={mockMember.image} className="w-16 h-16 rounded-2xl bg-slate-100 shadow-inner" alt="" />
                <div>
                  <div className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">{mockMember.name}</div>
                  <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">{mockMember.id}</div>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Current Plan</div>
                      <div className="text-xs font-bold text-slate-800">{mockMember.plan}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-amber-50/50 rounded-2xl border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-[9px] font-bold text-amber-500 uppercase">Expiry Date</div>
                      <div className="text-xs font-bold text-amber-900">{mockMember.expiry}</div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-amber-600">4 Days Left</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Lifetime Value</div>
                  <div className="text-sm font-black text-slate-900">{currencyFormatter.format(mockMember.lifetimeSpend)}</div>
                </div>
                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendance</div>
                  <div className="text-sm font-black text-emerald-600">{mockMember.attendance}</div>
                </div>
              </div>
            </div>
          </aside>

          {/* Center Workspace - Renewal Engine */}
          <section className="col-span-12 lg:col-span-6 space-y-6">
            
            {/* Plan Selection */}
            <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Select Renewal Plan
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 ${
                      selectedPlan.id === plan.id 
                        ? 'border-blue-600 bg-blue-50/30 shadow-lg shadow-blue-600/10' 
                        : 'border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-slate-50/80'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                        Best Value
                      </div>
                    )}
                    <div className="text-xs font-bold text-slate-500 mb-1">{plan.duration}</div>
                    <div className="text-sm font-black text-slate-900 mb-3">{plan.name}</div>
                    <div className="text-2xl font-black text-blue-600 mb-2">{currencyFormatter.format(plan.price)}</div>
                    {plan.save && (
                      <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded-md border border-emerald-100">
                        Save {plan.save}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Discount Engine */}
              <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 text-slate-400">
                  <Percent className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Apply Discount</label>
                  <select 
                    className="w-full bg-transparent border-none text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  >
                    <option value="">No Discount Applied</option>
                    <option value="10">Loyalty Discount (10%)</option>
                    <option value="15">Corporate Partner (15%)</option>
                    <option value="20">Special Offer (20%)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Engine */}
            <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Payment Processing
              </h3>

              <div className="grid grid-cols-4 gap-3 mb-8">
                {[
                  { id: "upi", label: "UPI", icon: Smartphone },
                  { id: "card", label: "Card", icon: CreditCard },
                  { id: "cash", label: "Cash", icon: Wallet },
                  { id: "link", label: "Link", icon: Share2 }
                ].map(method => (
                  <button 
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === method.id 
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700' 
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <method.icon className={`w-5 h-5 ${paymentMethod === method.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{method.label}</span>
                  </button>
                ))}
              </div>

              {/* Professional Invoice Panel */}
              <div className="bg-slate-900 rounded-[24px] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
                
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Billing Summary</h4>
                
                <div className="space-y-4 mb-6 relative z-10">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300 font-medium">Base Plan ({selectedPlan.name})</span>
                    <span className="font-bold">{currencyFormatter.format(basePrice)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-400">
                      <span className="font-medium">Discount ({discount}%)</span>
                      <span className="font-bold">-{currencyFormatter.format(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300 font-medium">GST (18%)</span>
                    <span className="font-bold">{currencyFormatter.format(gst)}</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex justify-between items-end relative z-10">
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Payable</div>
                    <div className="text-4xl font-black text-white tracking-tighter">{currencyFormatter.format(total)}</div>
                  </div>
                  <button className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-[0_10px_20px_rgba(37,99,235,0.3)] active:scale-[0.98] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Renewal
                  </button>
                </div>
              </div>
            </div>

            {/* Auto Renew Setting */}
            <button 
              onClick={() => setAutoRenew(!autoRenew)}
              className={`w-full flex items-center justify-between p-5 rounded-[24px] border-2 transition-all ${
                autoRenew ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  autoRenew ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  <RefreshCw className={`w-5 h-5 ${autoRenew ? 'animate-spin-slow' : ''}`} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-black text-slate-900">Enable Auto-Renewal</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Automatically charge at next expiry</div>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-colors ${autoRenew ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${autoRenew ? 'left-7' : 'left-1'}`} />
              </div>
            </button>

          </section>

          {/* Right Panel - AI Intelligence */}
          <aside className="col-span-12 lg:col-span-3 space-y-6">
            {/* AI Retention Score */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[32px] p-7 text-white shadow-2xl relative overflow-hidden group">
              <Brain className="absolute -top-10 -right-10 w-40 h-40 text-white/5 group-hover:rotate-12 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10">
                    <Target className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Retention Score</span>
                </div>
                
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-black tracking-tighter">{mockMember.probability}%</span>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">High Prob.</span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                    <p className="text-xs font-medium leading-relaxed opacity-90">
                      <span className="font-black text-emerald-400">Upsell Opportunity:</span> High attendance pattern detected. Member is 3x more likely to accept an <span className="font-bold text-white">Annual Upgrade</span>.
                    </p>
                  </div>
                  <button className="w-full py-3.5 bg-white text-indigo-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-xl">
                    Apply Smart Upsell
                  </button>
                </div>
              </div>
            </div>

            {/* Suggested Actions */}
            <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                Suggested Actions
              </h4>
              <div className="space-y-3">
                {[
                  { title: "Offer PT Bundle", desc: "+15% Discount on 10 Sessions", icon: User, color: "text-blue-600", bg: "bg-blue-50" },
                  { title: "Send Expiry Reminder", desc: "WhatsApp automated message", icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { title: "Assign Trainer Follow-up", desc: "Task for Rahul K.", icon: CalendarDays, color: "text-amber-600", bg: "bg-amber-50" }
                ].map((action, i) => (
                  <button key={i} className="w-full flex items-center gap-4 p-3 bg-white border border-slate-100 rounded-2xl hover:border-slate-300 hover:bg-slate-50 transition-all text-left group">
                    <div className={`w-10 h-10 ${action.bg} ${action.color} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-800 leading-tight">{action.title}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">{action.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export const mountRenewMembership = () => {
  console.log("GymDeck: Mounting Renew Membership module...");
  const stage = document.querySelector('[data-stage="renew-membership"]');
  if (!stage) {
    console.error("GymDeck: Renew Membership stage element not found!");
    return null;
  }

  const rootElement = document.createElement("div");
  rootElement.dataset.renewMembershipReactRoot = "";
  rootElement.className = "min-h-full";
  stage.replaceChildren(rootElement);

  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <RenewMembershipPage />
      </ErrorBoundary>
    );
    console.log("GymDeck: Renew Membership module mounted successfully.");
    return root;
  } catch (err) {
    console.error("Failed to render Renew Membership UI:", err);
    return null;
  }
};

export default RenewMembershipPage;
