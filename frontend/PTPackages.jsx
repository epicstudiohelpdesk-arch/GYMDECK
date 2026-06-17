import React, { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  LayoutGrid,
  List,
  ChevronRight,
  TrendingUp,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Download,
  Shield,
  Zap,
  Award,
  TrendingDown,
  RefreshCw,
  MoreHorizontal,
  Clock3,
  BrainCircuit,
  Crown,
  Share2,
  X,
  CreditCard,
  Percent,
  Tag,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────
// CONSTANTS & MOCK DATA
// ─────────────────────────────────────────

const PT_PACKAGE_CATEGORIES = [
  "Weight Loss", "Muscle Building", "Strength Training", "Rehabilitation", "Athlete Coaching", "Premium Transformation"
];

const DURATION_FILTERS = [
  "1 Month", "3 Months", "6 Months", "Annual", "Session-Based"
];

const MOCK_PT_PACKAGES = [
  {
    id: "PKG-2001",
    name: "Transformation Pro (36 Sessions)",
    type: "Premium Transformation",
    duration: "3 Months",
    sessions: 36,
    price: "₹85,000",
    priceValue: 85000,
    status: "active",
    activeClients: 42,
    completionRate: 94,
    renewalRate: 78,
    trainerType: "Elite Coaches",
    revenueGenerated: "₹35.7L",
    features: ["36 PT Sessions", "Nutrition Coaching", "Weekly Assessments", "Transformation Reports", "Priority Scheduling"]
  },
  {
    id: "PKG-2002",
    name: "Monthly Starter (12 Sessions)",
    type: "Weight Loss",
    duration: "1 Month",
    sessions: 12,
    price: "₹15,000",
    priceValue: 15000,
    status: "active",
    activeClients: 128,
    completionRate: 88,
    renewalRate: 65,
    trainerType: "Senior Coaches",
    revenueGenerated: "₹19.2L",
    features: ["12 PT Sessions", "Basic Diet Plan", "Monthly Assessment", "App Tracking"]
  },
  {
    id: "PKG-2003",
    name: "Athlete Strength Camp",
    type: "Athlete Coaching",
    duration: "6 Months",
    sessions: 72,
    price: "₹1,50,000",
    priceValue: 150000,
    status: "active",
    activeClients: 15,
    completionRate: 98,
    renewalRate: 85,
    trainerType: "Master Coaches",
    revenueGenerated: "₹22.5L",
    features: ["72 PT Sessions", "Sports Nutrition", "Biomechanical Analysis", "Recovery Protocols", "Competition Prep"]
  },
  {
    id: "PKG-2004",
    name: "Rehab & Recovery Core",
    type: "Rehabilitation",
    duration: "Session-Based",
    sessions: 10,
    price: "₹20,000",
    priceValue: 20000,
    status: "inactive",
    activeClients: 0,
    completionRate: 0,
    renewalRate: 0,
    trainerType: "Specialist Coaches",
    revenueGenerated: "₹0",
    features: ["10 Rehab Sessions", "Physio Consultation", "Mobility Tracking"]
  }
];

const REVENUE_ANALYTICS = [
  { id: 1, label: "Active PT Packages", value: "185", trend: "+12", isUp: true, subtext: "Total active subscriptions", icon: CheckCircle2 },
  { id: 2, label: "PT Revenue This Month", value: "₹28.4L", trend: "+15.2%", isUp: true, subtext: "Target: ₹30L", icon: BarChart3 },
  { id: 3, label: "Most Purchased Package", value: "Monthly Starter", trend: "128 Active", isUp: true, subtext: "Consistent driver", icon: Crown },
  { id: 4, label: "Avg Package Value", value: "₹38,500", trend: "+4.5%", isUp: true, subtext: "Per subscriber", icon: Tag },
  { id: 5, label: "Package Renewals", value: "42", trend: "This Week", isUp: true, subtext: "High retention", icon: RefreshCw },
  { id: 6, label: "Session Utilization %", value: "88.4%", trend: "+2.1%", isUp: true, subtext: "System healthy", icon: Activity },
  { id: 7, label: "Expiring Packages", value: "18", trend: "Critical", isUp: false, subtext: "Next 7 days", icon: AlertCircle },
  { id: 8, label: "PT Conversion Rate", value: "12.4%", trend: "+1.2%", isUp: true, subtext: "Trial to paid", icon: TrendingUp }
];

// ─────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────

function KPICard({ item }) {
  const Icon = item.icon;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${item.isUp ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'} transition-colors group-hover:scale-110 duration-300`}>
          <Icon size={20} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${item.isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
          {item.isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {item.trend}
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-slate-500 text-[11px] font-black uppercase tracking-wider">{item.label}</h3>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{item.value}</p>
        <p className="text-slate-400 text-[10px] font-medium">{item.subtext}</p>
      </div>
      
      <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "70%" }}
          className={`h-full ${item.isUp ? 'bg-indigo-500' : 'bg-rose-500'}`}
        />
      </div>
    </motion.div>
  );
}

function PackageCard({ pkg, onClick }) {
  const statusColors = {
    active: "bg-emerald-100 text-emerald-700",
    inactive: "bg-slate-100 text-slate-600"
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden flex flex-col"
      onClick={() => onClick(pkg)}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />
      
      <div className="flex justify-between items-start relative z-10 mb-4">
        <div>
          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${statusColors[pkg.status]}`}>
            {pkg.status}
          </span>
        </div>
        <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
          <MoreVertical size={20} />
        </button>
      </div>

      <div className="relative z-10 mb-6">
        <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight mb-1 group-hover:text-indigo-600 transition-colors">
          {pkg.name}
        </h3>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{pkg.type}</p>
      </div>

      <div className="relative z-10 mb-6">
        <p className="text-3xl font-black text-slate-900 tracking-tight">{pkg.price}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">per package</p>
      </div>

      <div className="space-y-3 relative z-10 flex-1">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Clock size={16} className="text-slate-400" /> {pkg.duration} ({pkg.sessions} Sessions)
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Shield size={16} className="text-slate-400" /> {pkg.trainerType}
        </div>
        <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
          {pkg.features.slice(0, 3).map((feature, i) => (
            <div key={i} className="flex items-start gap-2 text-xs font-medium text-slate-600">
              <CheckCircle2 size={14} className="text-indigo-500 shrink-0 mt-0.5" />
              <span>{feature}</span>
            </div>
          ))}
          {pkg.features.length > 3 && (
            <p className="text-xs font-bold text-indigo-600 pl-6">+ {pkg.features.length - 3} more features</p>
          )}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4 relative z-10">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Clients</p>
          <p className="text-sm font-black text-slate-900">{pkg.activeClients}</p>
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Renewal Rate</p>
          <p className="text-sm font-black text-slate-900">{pkg.renewalRate}%</p>
        </div>
      </div>

      <div className="mt-6 flex gap-2 relative z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors">
          View Details
        </button>
      </div>
    </motion.div>
  );
}

function PackageDrawer({ pkg, isOpen, onClose }) {
  if (!pkg) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[560px] bg-white shadow-2xl z-[70] overflow-y-auto"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-10">
                <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all">
                  <X size={24} />
                </button>
                <div className="flex gap-3">
                  <button className="px-5 py-3 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                    Edit Package
                  </button>
                  <button className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                    <Share2 size={20} />
                  </button>
                </div>
              </div>

              <div className="mb-8">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4 inline-block ${pkg.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {pkg.status} Package
                </span>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{pkg.name}</h2>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{pkg.type}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Package Price</p>
                  <p className="text-xl font-black text-slate-900">{pkg.price}</p>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration & Sessions</p>
                  <p className="text-xl font-black text-slate-900">{pkg.duration}</p>
                  <p className="text-[10px] font-bold text-indigo-600 mt-1">{pkg.sessions} Total Sessions</p>
                </div>
              </div>

              <section className="mb-10">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Zap size={16} />
                  Included Features
                </h3>
                <div className="space-y-3">
                  {pkg.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={16} />
                      </div>
                      <span className="text-sm font-bold text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mb-10 grid grid-cols-2 gap-6">
                <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50">
                  <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Trainer Assignment</h3>
                  <div className="flex items-center gap-3 mb-2">
                    <Shield size={20} className="text-indigo-600" />
                    <span className="text-sm font-black text-slate-900">{pkg.trainerType}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed">Only trainers with this designation can be assigned to this package.</p>
                </div>
                
                <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100/50">
                  <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Revenue Generated</h3>
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 size={20} className="text-emerald-600" />
                    <span className="text-lg font-black text-slate-900">{pkg.revenueGenerated}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed">Lifetime revenue generated from {pkg.activeClients} active subscriptions.</p>
                </div>
              </section>

              <section className="mb-10">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Activity size={16} />
                  Client Analytics
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Subs</p>
                    <p className="text-lg font-black text-slate-900">{pkg.activeClients}</p>
                  </div>
                  <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Completion</p>
                    <p className="text-lg font-black text-slate-900">{pkg.completionRate}%</p>
                  </div>
                  <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Renewal</p>
                    <p className="text-lg font-black text-slate-900">{pkg.renewalRate}%</p>
                  </div>
                </div>
              </section>

              <div className="p-8 bg-slate-900 rounded-[40px] text-white relative overflow-hidden shadow-2xl shadow-slate-200">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 blur-3xl -mr-20 -mt-20" />
                <h4 className="text-xl font-black tracking-tight mb-2">Assign to Client</h4>
                <p className="text-slate-300 text-xs font-medium leading-relaxed mb-6">Enroll a member into this transformation package directly.</p>
                <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/20">
                  <Users size={16} />
                  Enroll Member
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CreatePackageModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    category: "Weight Loss",
    description: "",
    trainerType: "Senior Coaches",
    duration: "1 Month",
    sessions: 12,
    frequency: "3 days/week",
    validity: "45 Days",
    basePrice: "",
    discount: "",
    gst: "18%",
    renewalPricing: "",
    features: {
      nutrition: true,
      assessments: true,
      tracking: true,
      whatsapp: false,
      priority: false
    },
    trainerEligibility: ["Senior Coaches"]
  });

  if (!isOpen) return null;

  const totalSteps = 5;

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                  Step {step} of {totalSteps}
                </span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Create PT Package</h2>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {step === 1 && "Basic Information"}
                {step === 2 && "Duration & Session Allocation"}
                {step === 3 && "Pricing & Monetization"}
                {step === 4 && "Included Features & Services"}
                {step === 5 && "Trainer Eligibility & Restrictions"}
              </p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white hover:shadow-md rounded-2xl text-slate-400 transition-all">
              <X size={24} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-8 overflow-y-auto flex-1">
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Package Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 12-Week Transformation Pro" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none">
                      {PT_PACKAGE_CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trainer Type</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none">
                      <option>Elite Coaches</option>
                      <option>Senior Coaches</option>
                      <option>General Trainers</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea 
                    rows={4}
                    placeholder="Describe the package benefits and target audience..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none">
                      {DURATION_FILTERS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sessions</label>
                    <input type="number" placeholder="24" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session Frequency</label>
                    <input type="text" placeholder="3 sessions/week" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Validity (Days)</label>
                    <input type="number" placeholder="45" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all" />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Price (₹)</label>
                    <input type="text" placeholder="15,000" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discount (%)</label>
                    <input type="text" placeholder="10" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GST Rate</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all appearance-none">
                      <option>18% (Standard)</option>
                      <option>12%</option>
                      <option>5%</option>
                      <option>Exempted</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Renewal Price (₹)</label>
                    <input type="text" placeholder="12,500" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all" />
                  </div>
                </div>
                <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Final Client Price</p>
                    <p className="text-2xl font-black text-indigo-600">₹16,200 <span className="text-xs font-bold opacity-60">(incl. GST)</span></p>
                  </div>
                  <Tag className="text-indigo-200" size={32} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                {[
                  { id: 'nutrition', label: 'Nutrition Guidance', icon: Heart },
                  { id: 'assessments', label: 'Weekly Body Assessments', icon: Activity },
                  { id: 'tracking', label: 'Transformation Tracking', icon: Zap },
                  { id: 'whatsapp', label: 'WhatsApp Support', icon: Share2 },
                  { id: 'priority', label: 'Priority Scheduling', icon: Clock }
                ].map(item => (
                  <div key={item.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <item.icon size={20} />
                      </div>
                      <span className="text-sm font-bold text-slate-700">{item.label}</span>
                    </div>
                    <div className="w-12 h-6 bg-slate-200 rounded-full relative p-1 cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trainer Category Restrictions</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Elite Coaches', 'Senior Coaches', 'Specialists', 'General Trainers'].map(cat => (
                      <div key={cat} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="w-5 h-5 border-2 border-slate-300 rounded" />
                        <span className="text-xs font-bold text-slate-600">{cat}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Specialization Requirements</label>
                  <div className="flex flex-wrap gap-2">
                    {['Weight Loss', 'Bodybuilding', 'Yoga', 'Physio'].map(s => (
                      <span key={s} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                        {s}
                      </span>
                    ))}
                    <button className="px-4 py-2 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-500 transition-all">
                      + Add Rule
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <button 
              onClick={prevStep}
              disabled={step === 1}
              className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all"
            >
              Back
            </button>
            <button 
              onClick={step === totalSteps ? onClose : nextStep}
              className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
            >
              {step === totalSteps ? "Create Package" : "Continue"}
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────

export default function PTPackages() {
  const [viewMode, setViewMode] = useState("grid");
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredPackages = useMemo(() => {
    return MOCK_PT_PACKAGES.filter(pkg => {
      const matchesSearch = pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          pkg.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === "all" || pkg.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  const handlePackageClick = (pkg) => {
    setSelectedPackage(pkg);
    setIsDrawerOpen(true);
  };

  return (
    <div className="min-h-full bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100">
      {/* 5. TOP UTILITY HEADER */}
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span className="opacity-60">Personal Training</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold">PT Packages</span>
        </div>

        <div className="flex-1 max-w-2xl px-12">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search package, duration, trainer, pricing..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            <Plus size={16} />
            Create PT Package
          </button>
          <div className="h-8 w-px bg-slate-200 mx-1" />
          <button className="px-4 h-10 flex items-center justify-center border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest text-slate-500">
            Discount Rules
          </button>
          <button className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500">
            <Download size={18} />
          </button>
        </div>
      </header>

      <main className="p-8 pb-24">
        {/* 6. PAGE TITLE SECTION */}
        <section className="flex justify-between items-end mb-10">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">PT Packages</h1>
            <p className="text-slate-500 font-medium max-w-2xl">
              Create, manage, optimize, and monitor personal training packages, subscriptions, coaching plans, and PT revenue operations.
            </p>
          </div>
          <div className="flex gap-2">
            {["Revenue Analytics", "Package Optimization", "Session Intelligence"].map((tag) => (
              <span key={tag} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* 7. KPI ANALYTICS STRIP */}
        <section className="grid grid-cols-8 gap-4 mb-10">
          {REVENUE_ANALYTICS.map((item) => (
            <KPICard key={item.id} item={item} />
          ))}
        </section>

        {/* 8. MAIN WORKSPACE STRUCTURE */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* 9. LEFT PANEL → PACKAGE CATEGORIES & QUICK FILTERS */}
          <aside className="col-span-2 space-y-8 sticky top-24 h-fit">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Quick Filters</h3>
              <div className="space-y-1">
                <button onClick={() => setActiveFilter("active")} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${activeFilter === 'active' ? 'bg-white shadow-md border-indigo-100 ring-1 ring-indigo-50' : 'hover:bg-slate-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 size={14} /></div>
                    <span className={`text-[11px] font-bold ${activeFilter === 'active' ? 'text-slate-900' : 'text-slate-500'}`}>Active Packages</span>
                  </div>
                </button>
                <button onClick={() => setActiveFilter("inactive")} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${activeFilter === 'inactive' ? 'bg-white shadow-md border-indigo-100 ring-1 ring-indigo-50' : 'hover:bg-slate-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500"><X size={14} /></div>
                    <span className={`text-[11px] font-bold ${activeFilter === 'inactive' ? 'text-slate-900' : 'text-slate-500'}`}>Inactive Packages</span>
                  </div>
                </button>
                <button onClick={() => setActiveFilter("all")} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${activeFilter === 'all' ? 'bg-white shadow-md border-indigo-100 ring-1 ring-indigo-50' : 'hover:bg-slate-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600"><LayoutGrid size={14} /></div>
                    <span className={`text-[11px] font-bold ${activeFilter === 'all' ? 'text-slate-900' : 'text-slate-500'}`}>All Packages</span>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Categories</h3>
              <div className="space-y-2">
                {PT_PACKAGE_CATEGORIES.map((cat) => (
                  <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-bold text-slate-500 group-hover:text-slate-900 transition-colors">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Duration</h3>
              <div className="space-y-2">
                {DURATION_FILTERS.map((dur) => (
                  <label key={dur} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-bold text-slate-500 group-hover:text-slate-900 transition-colors">{dur}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* 10. CENTER WORKSPACE → PT PACKAGE GRID / TABLE */}
          <section className="col-span-7 space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex gap-1">
                <button 
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode("table")}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <List size={18} />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-xs font-bold text-slate-400">Showing {filteredPackages.length} packages</p>
                <div className="h-4 w-px bg-slate-200" />
                <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">
                  <Filter size={16} />
                  Filters
                </button>
              </div>
            </div>

            {filteredPackages.length === 0 ? (
              <div className="bg-white rounded-[40px] border border-slate-200 border-dashed p-20 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-300 mb-8">
                  <Tag size={48} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">No PT packages created yet</h3>
                <p className="text-slate-500 font-medium max-w-sm mb-8">
                  Personal training packages and coaching plans will appear here once you create them.
                </p>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2"
                >
                  <Plus size={16} />
                  Create First PT Package
                </button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredPackages.map((pkg) => (
                    <PackageCard 
                      key={pkg.id} 
                      pkg={pkg} 
                      onClick={handlePackageClick} 
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Package</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Clients</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPackages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => handlePackageClick(pkg)}>
                        <td className="px-6 py-5">
                          <p className="text-sm font-black text-slate-900 leading-tight">{pkg.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pkg.type}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-bold text-slate-700">{pkg.duration}</p>
                          <p className="text-[10px] font-bold text-slate-400">{pkg.sessions} Sessions</p>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-sm font-black text-slate-900">{pkg.price}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-sm font-black text-slate-900">{pkg.activeClients}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            pkg.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {pkg.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                            <MoreHorizontal size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 14. RIGHT PANEL → PT REVENUE & AI INSIGHTS */}
          <aside className="col-span-3 space-y-8 sticky top-24 h-fit">
            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <BrainCircuit size={20} />
                </div>
              </div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">AI Monetization Insights</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-1 h-10 bg-emerald-400 rounded-full" />
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-snug">3-month PT plans converting 24% better than monthly plans.</p>
                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2 hover:underline">View Analytics</button>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 h-10 bg-amber-400 rounded-full" />
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-snug">Premium coaching package demand rising in evening shifts.</p>
                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2 hover:underline">Adjust Trainer Load</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Live PT Sales Status</h3>
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CreditCard size={16} /></div>
                    <div>
                      <p className="text-xs font-black text-slate-900 leading-none mb-1">Monthly Starter</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Purchased 2m ago</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-emerald-600">+₹15,000</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CreditCard size={16} /></div>
                    <div>
                      <p className="text-xs font-black text-slate-900 leading-none mb-1">Transformation Pro</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Renewed 15m ago</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-emerald-600">+₹85,000</span>
                </div>
              </div>
              <button className="w-full mt-6 py-4 bg-slate-50 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-colors">
                View All Transactions
              </button>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 rounded-[40px] text-white relative overflow-hidden shadow-2xl shadow-indigo-100">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16" />
              <Percent className="w-10 h-10 text-white/20 mb-6" />
              <h4 className="text-xl font-black tracking-tight mb-2">Discount & Offer Engine</h4>
              <p className="text-indigo-100 text-[11px] font-medium leading-relaxed mb-6">Create promotional codes, seasonal offers, and loyalty discounts to boost conversions.</p>
              <button className="w-full bg-white text-indigo-600 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-xl">
                Manage Discounts
              </button>
            </div>
          </aside>
        </div>
      </main>

      <PackageDrawer 
        pkg={selectedPackage} 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />

      <CreatePackageModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}

// ─────────────────────────────────────────
// MOUNTING FUNCTION
// ─────────────────────────────────────────
export const mountPTPackages = () => {
  const container = document.querySelector('[data-stage="pt-packages"]');
  if (!container) return null;
  
  const root = createRoot(container);
  root.render(<PTPackages />);
  return root;
};
