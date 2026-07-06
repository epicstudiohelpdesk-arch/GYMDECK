import React, { useState, useMemo, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertCircle,
  Zap,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Plus,
  ArrowRight,
  Target,
  BarChart3,
  Calendar,
  Lock,
  Gift,
  RefreshCcw,
  CheckCircle2,
  X,
  Shield,
  ArrowUpRight,
  HelpCircle,
  Search,
  LayoutGrid,
  Eye,
  Archive,
  Edit3,
  Copy,
  Clock,
  Award,
  Sparkles,
  PieChart,
  ArrowUp,
  ArrowDown,
  Activity,
  Percent,
  CreditCard,
  Repeat,
  Bell,
  FileText,
  DownloadCloud,
  Trash2,
  Hash,
  Circle
} from "lucide-react";
import { ErrorBoundary } from "./ErrorHandlers.jsx";

const formatCompact = (val) => {
  if (val === null || val === undefined || isNaN(val)) return "0";
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(val);
};

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

const cn = (...classes) => classes.filter(Boolean).join(" ");

const PORTFOLIO_STATS = {
  activePlans: 8,
  monthlyRevenue: 1450000,
  renewalRate: 68,
  expiring30Days: 48,
  forecastedRenewal: 680000,
  prevMonthRevenue: 1320000,
  prevRenewalRate: 64,
  potentialRevenue: 820000
};

const MEMBERSHIP_PORTFOLIO = [
  {
    id: "A1",
    name: "Annual Elite Performance",
    category: "Transformation",
    price: 18999,
    duration: "365 Days",
    activeMembers: 342,
    revenue: 8550000,
    monthlyContribution: 712500,
    renewalRate: 88,
    retention: 92,
    trend: "+12%",
    trendUp: true,
    status: "Healthy",
    membersEnrolled: 342,
    growth: 12,
    risk: "Low",
    color: "from-slate-800 to-indigo-900"
  },
  {
    id: "Q1",
    name: "Quarterly Transformation",
    category: "Bodybuilding",
    price: 7999,
    duration: "90 Days",
    activeMembers: 156,
    revenue: 1092000,
    monthlyContribution: 364000,
    renewalRate: 74,
    retention: 78,
    trend: "+4%",
    trendUp: true,
    status: "Healthy",
    membersEnrolled: 156,
    growth: 4,
    risk: "Low",
    color: "from-slate-800 to-indigo-900"
  },
  {
    id: "M1",
    name: "Monthly Entry Starter",
    category: "General",
    price: 1999,
    duration: "30 Days",
    activeMembers: 412,
    revenue: 1236000,
    monthlyContribution: 103000,
    renewalRate: 42,
    retention: 54,
    trend: "-14%",
    trendUp: false,
    status: "At Risk",
    membersEnrolled: 412,
    growth: -14,
    risk: "High",
    color: "from-slate-800 to-rose-900"
  },
  {
    id: "S1",
    name: "Student Basic Flex",
    category: "Student",
    price: 1299,
    duration: "30 Days",
    activeMembers: 218,
    revenue: 436000,
    monthlyContribution: 36333,
    renewalRate: 68,
    retention: 72,
    trend: "+2%",
    trendUp: true,
    status: "Growing",
    membersEnrolled: 218,
    growth: 2,
    risk: "Medium",
    color: "from-slate-800 to-amber-900"
  }
];

const RECOMMENDATIONS = [
  {
    id: 1,
    title: "Monthly Starter Churn Alert",
    description: "Renewals decreased by 14% this month. Churn risk detected for 12 members across the Monthly Entry Starter plan.",
    severity: "High",
    impact: "Potential ₹45k Revenue Loss",
    action: "Review Churn Data",
    color: "rose"
  },
  {
    id: 2,
    title: "Annual Upgrade Opportunity",
    description: "31 members on Quarterly plans are eligible for Annual Elite conversion. Estimated revenue uplift of ₹3.2L.",
    severity: "Medium",
    impact: "₹3.2L Revenue Boost",
    action: "Launch Campaign",
    color: "amber"
  },
  {
    id: 3,
    title: "Pricing Strategy Optimization",
    description: "Premium Elite plan retention is at 96%. Current pricing is 18% under market value for comparable plans.",
    severity: "Low",
    impact: "8% Margin Increase",
    action: "Analyze Market",
    color: "indigo"
  }
];


const FILTER_OPTIONS = ["All", "Active", "At Risk", "Growing", "Highest Revenue", "Newest"];

const PLAN_COLORS = {
  "A1": "from-indigo-600 to-indigo-800",
  "Q1": "from-emerald-600 to-emerald-800",
  "M1": "from-amber-600 to-amber-800",
  "S1": "from-sky-600 to-sky-800"
};

// ─────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────
function KPICard({ label, value, trend, trendUp, subtitle, icon: Icon, accent }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[110px]">
      <div className="flex items-center justify-between">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          accent === "indigo" ? "bg-indigo-50 text-indigo-600" :
          accent === "emerald" ? "bg-emerald-50 text-emerald-600" :
          accent === "amber" ? "bg-amber-50 text-amber-600" :
          "bg-slate-950 text-white"
        )}>
          <Icon size={15} className="stroke-[2.2]" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0",
            trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {trendUp ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
            {trend}
          </div>
        )}
      </div>
      <div className="mt-2 text-left">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">{value}</p>
        {subtitle && <p className="text-[10px] text-slate-450 font-semibold leading-none">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// PLAN CARD (DIRECTORY STYLE)
// ─────────────────────────────────────────
function PlanCard({ plan, index, onViewDetails }) {
  const statusColor = plan.status === "Healthy" ? "emerald" : plan.status === "Growing" ? "indigo" : plan.status === "At Risk" ? "rose" : "amber";

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="relative grid grid-cols-3 gap-4 p-3 bg-white border border-slate-200/90 rounded-lg shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 list-none"
    >
      {/* Col 1: Identity & Classification */}
      <div className="flex items-center gap-3 min-w-0 text-left">
        <div className={cn(
          "w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0",
          PLAN_COLORS[plan.id] || "from-slate-800 to-indigo-900"
        )}>
          {plan.id}
        </div>
        <div className="min-w-0 text-left">
          <h4 className="text-xs font-bold text-slate-900 leading-tight truncate">{plan.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-1.5 py-0.2 rounded text-[7px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wider">
              {plan.category}
            </span>
            <span className="text-[9px] text-slate-400 font-bold font-mono">
              {plan.duration}
            </span>
          </div>
        </div>
      </div>

      {/* Col 2: Pricing & Key Metrics */}
      <div className="flex items-center justify-around gap-2 text-left">
        <div>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Price</span>
          <span className="text-xs font-bold text-slate-900 mt-0.5 block">{formatCurrency(plan.price)}</span>
        </div>
        <div>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Enrolled</span>
          <span className="text-xs font-bold text-slate-900 mt-0.5 block">{plan.activeMembers}</span>
        </div>
        <div>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">MRR</span>
          <span className="text-xs font-bold text-slate-900 mt-0.5 block">{formatCompact(plan.revenue)}</span>
        </div>
      </div>

      {/* Col 3: Status & Action Menu */}
      <div className="flex items-center justify-between gap-4 pr-10 text-left">
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[8px] font-bold border uppercase tracking-wider",
            statusColor === "emerald" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
            statusColor === "indigo" ? "bg-indigo-50 border-indigo-200 text-indigo-700" :
            statusColor === "rose" ? "bg-rose-50 border-rose-200 text-rose-700" :
            "bg-amber-50 border-amber-200 text-amber-700"
          )}>
            {plan.status}
          </span>
          <span className="text-[9px] text-slate-400 font-bold font-mono">
            {plan.retention}% ret.
          </span>
        </div>

        {/* More options button */}
        <div className="absolute right-2.5 top-2.5">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onViewDetails(plan)}
            className="w-7 h-7 rounded-full flex items-center justify-center border border-transparent bg-transparent hover:bg-slate-50 hover:border-slate-200/60 hover:text-slate-700 text-slate-400 transition-all duration-200 focus:outline-none"
          >
            <motion.div
              className="flex items-center justify-center"
            >
              <MoreVertical size={15} />
            </motion.div>
          </motion.button>
        </div>
      </div>
    </motion.tr>
  );
}

// ─────────────────────────────────────────
// PLAN DETAILS MODAL
// ─────────────────────────────────────────
function PlanDetailsModal({ plan, onClose, onEdit, onDuplicate, onArchive, onDelete }) {
  if (!plan) return null;

  const statusColor = plan.status === "Healthy" ? "emerald" : plan.status === "Growing" ? "indigo" : plan.status === "At Risk" ? "rose" : "amber";
  const riskColor = plan.risk === "Low" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-rose-600 bg-rose-50 border-rose-200";

  return (
    <AnimatePresence>
      {plan && (
        <motion.div
          key="details-modal-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            key="details-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl"
          />

          {/* Panel */}
          <motion.div
            key="details-panel"
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
            className="relative w-full max-w-4xl bg-white rounded-[32px] border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col p-8 md:p-10 m-auto text-left max-h-[90vh] md:max-h-[600px] z-50"
          >
            {/* Absolute Close Button */}
            <motion.button
              whileHover="hovered"
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="absolute top-8 right-8 w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 bg-white text-slate-500 hover:text-white hover:bg-slate-950 hover:border-slate-950 shadow-sm transition-all duration-200 z-50"
              variants={{
                initial: { scale: 1 },
                hovered: { scale: 1.05 }
              }}
            >
              <motion.div
                variants={{
                  initial: { rotate: 0 },
                  hovered: { rotate: 90 }
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex items-center justify-center w-full h-full"
              >
                <X size={20} className="stroke-[2.5]" />
              </motion.div>
            </motion.button>

            {/* Header section with category and plan ID */}
            <header className="flex justify-between items-start gap-5 mb-6 shrink-0">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-black text-sm shadow-md shrink-0",
                  PLAN_COLORS[plan.id] || "from-slate-800 to-indigo-900"
                )}>
                  {plan.id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-500 uppercase tracking-widest">
                      {plan.category}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-500 uppercase tracking-widest">
                      {plan.duration}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1.5 leading-tight">{plan.name}</h2>
                </div>
              </div>
            </header>

            {/* Content Layout */}
            <div className="space-y-6 flex-1 overflow-y-auto pr-1">
              
              {/* Financial Strategy Grid */}
              <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <article className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col justify-between min-h-[90px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pricing</span>
                  <strong className="text-base md:text-lg font-black text-slate-900 mt-1 block">{formatCurrency(plan.price)}</strong>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1">Base Fee</span>
                </article>

                <article className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col justify-between min-h-[90px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Enrollment</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <strong className="text-base md:text-lg font-black text-slate-900">{plan.activeMembers}</strong>
                    <span className={cn(
                      "text-[10px] font-bold",
                      plan.trendUp ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {plan.trend}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1">Total Members</span>
                </article>

                <article className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col justify-between min-h-[90px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Contribution</span>
                  <strong className="text-base md:text-lg font-black text-slate-900 mt-1 block">{formatCurrency(plan.monthlyContribution)}</strong>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1">MRR contribution</span>
                </article>

                <article className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col justify-between min-h-[90px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">LTD Revenue</span>
                  <strong className="text-base md:text-lg font-black text-slate-900 mt-1 block">{formatCurrency(plan.revenue)}</strong>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1">Total Generated</span>
                </article>
              </section>

              {/* Grid side-by-side for Analytics and Privileges */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Status and Health Analytics */}
                <section className="md:col-span-7 grid grid-cols-1 sm:grid-cols-12 gap-4 p-4.5 rounded-2xl bg-slate-50/70 border border-slate-100 items-center">
                  
                  {/* Concentric Gauge SVG Column (span 5) */}
                  <div className="sm:col-span-5 flex justify-center items-center relative h-[130px] w-[130px] mx-auto shrink-0">
                    <svg className="w-[130px] h-[130px]" viewBox="0 0 120 120">
                      {/* Outer Track (Retention) */}
                      <circle
                        cx="60"
                        cy="60"
                        r="44"
                        className="stroke-slate-200/60 fill-none stroke-[6.5]"
                      />
                      {/* Outer Active Ring (Retention) */}
                      <motion.circle
                        cx="60"
                        cy="60"
                        r="44"
                        className={cn(
                          "fill-none stroke-[6.5]",
                          statusColor === "rose" ? "stroke-rose-500" : "stroke-emerald-500"
                        )}
                        strokeLinecap="round"
                        strokeDasharray="276.46"
                        initial={{ strokeDashoffset: 276.46 }}
                        animate={{ strokeDashoffset: 276.46 - (plan.retention / 100) * 276.46 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        transform="rotate(-90 60 60)"
                      />

                      {/* Inner Track (Renewal) */}
                      <circle
                        cx="60"
                        cy="60"
                        r="34"
                        className="stroke-slate-200/60 fill-none stroke-[6.5]"
                      />
                      {/* Inner Active Ring (Renewal) */}
                      <motion.circle
                        cx="60"
                        cy="60"
                        r="34"
                        className={cn(
                          "fill-none stroke-[6.5]",
                          plan.renewalRate < 60 ? "stroke-rose-500" : "stroke-indigo-500"
                        )}
                        strokeLinecap="round"
                        strokeDasharray="213.63"
                        initial={{ strokeDashoffset: 213.63 }}
                        animate={{ strokeDashoffset: 213.63 - (plan.renewalRate / 100) * 213.63 }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                        transform="rotate(-90 60 60)"
                      />
                    </svg>

                    {/* Centered text indicators inside Ring */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                      <span className={cn(
                        "text-[11px] font-black uppercase tracking-wider leading-none",
                        statusColor === "emerald" ? "text-emerald-600" :
                        statusColor === "indigo" ? "text-indigo-600" :
                        statusColor === "rose" ? "text-rose-600" :
                        "text-amber-600"
                      )}>
                        {plan.status}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {plan.risk} Risk
                      </span>
                    </div>
                  </div>

                  {/* Details and Legend Column (span 7) */}
                  <div className="sm:col-span-7 space-y-3 text-left">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Plan Performance Index</h4>
                      <p className="text-xs font-semibold text-slate-500 leading-relaxed mt-1">
                        This tier exhibits a <span className="font-extrabold text-slate-900">{plan.trend}</span> growth velocity with optimized operational health parameters.
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-slate-200/50 pt-2.5">
                      {/* Retention Legend */}
                      <div className="flex items-center justify-between text-xs leading-none">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2.5 h-2.5 rounded-full shrink-0",
                            statusColor === "rose" ? "bg-rose-500" : "bg-emerald-500"
                          )} />
                          <span className="font-bold text-slate-650 uppercase tracking-wide">Retention Rate</span>
                        </div>
                        <span className="font-black text-slate-900 font-mono text-sm">{plan.retention}%</span>
                      </div>

                      {/* Renewal Legend */}
                      <div className="flex items-center justify-between text-xs leading-none">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2.5 h-2.5 rounded-full shrink-0",
                            plan.renewalRate < 60 ? "bg-rose-500" : "bg-indigo-500"
                          )} />
                          <span className="font-bold text-slate-650 uppercase tracking-wide">Renewal Velocity</span>
                        </div>
                        <span className="font-black text-slate-900 font-mono text-sm">{plan.renewalRate}%</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Access Strategy & Privileges */}
                <section className="md:col-span-5 space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Access Privileges</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Gym Floor", enabled: true },
                      { label: "Cardio Zone", enabled: true },
                      { label: "Steam/Sauna", enabled: plan.id !== "M1" && plan.id !== "S1" },
                      { label: "Group Classes", enabled: plan.id !== "M1" && plan.id !== "S1" },
                      { label: "PT Sessions", enabled: plan.id === "A1" },
                      { label: "Roaming", enabled: plan.id === "A1" || plan.id === "Q1" },
                    ].map((privilege, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "p-3 rounded-2xl border text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-between shadow-sm",
                          privilege.enabled ? "bg-white border-slate-200 text-slate-700" : "bg-slate-50 border-slate-100 text-slate-350"
                        )}
                      >
                        <span className="truncate mr-1">{privilege.label}</span>
                        <div className={cn("w-2 h-2 rounded-full shrink-0", privilege.enabled ? "bg-emerald-400 animate-pulse" : "bg-slate-300")} />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <footer className="mt-10 pt-5 border-t border-slate-100 flex flex-wrap gap-2.5 justify-end shrink-0">
              <button 
                onClick={() => { onEdit(plan); onClose(); }}
                className="px-4.5 h-11 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5"
              >
                <Edit3 size={13} />
                Edit Plan
              </button>
              
              <button 
                onClick={() => { onDuplicate(plan); onClose(); }}
                className="px-4.5 h-11 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5"
              >
                <Copy size={13} />
                Duplicate
              </button>

              <button 
                onClick={() => { onArchive(plan); onClose(); }}
                className="px-4.5 h-11 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5"
              >
                <Archive size={13} />
                Archive
              </button>

              <button 
                onClick={() => { onDelete(plan); onClose(); }}
                className="px-4.5 h-11 rounded-2xl bg-rose-50 hover:bg-rose-100/70 text-rose-600 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                Delete
              </button>

              <div className="h-11 w-[1px] bg-slate-200 mx-1.5" />


              <button 
                onClick={onClose}
                className="px-7 h-11 rounded-2xl bg-slate-900 hover:bg-black text-white text-[11px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center"
              >
                Done
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────
// CUSTOM SELECT COMPONENT
// ─────────────────────────────────────────
function CustomSelect({ label, value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-1.5 relative">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full h-11 px-4 bg-white border rounded-xl text-xs font-semibold flex items-center justify-between outline-none transition-all duration-200 shadow-sm",
            isOpen
              ? "border-slate-400 bg-white ring-4 ring-slate-100"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
          )}
        >
          <span className={value ? "text-slate-700" : "text-slate-400"}>
            {value || `Select ${label}`}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="text-slate-400 shrink-0 ml-2"
          >
            <ChevronDown size={14} className="stroke-[2.5]" />
          </motion.div>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="absolute left-0 right-0 top-[48px] bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-50 overflow-hidden"
            >
              {options.map((option) => {
                const isSelected = value === option;
                return (
                  <motion.button
                    key={option}
                    type="button"
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      onChange(option);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-left transition-colors duration-150 rounded-lg",
                      isSelected
                        ? "text-indigo-600 bg-indigo-50/60"
                        : "text-slate-650 bg-transparent hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <span>{option}</span>
                    {isSelected && (
                      <CheckCircle2 size={13} className="text-indigo-600 stroke-[2.5] shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// CREATE PLAN MODAL
// ─────────────────────────────────────────
// ─────────────────────────────────────────
// TRAINERS LIST CONSTANT
// ─────────────────────────────────────────
function CreatePlanModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    category: "Transformation",
    audience: "Professionals",
    goal: "Revenue Generation",
    description: "",
    price: "",
    joiningFee: "",
    duration: "Monthly"
  });

  const [access, setAccess] = useState(["Single Branch Access"]);
  const [areas, setAreas] = useState(["Gym Floor", "Cardio Zone"]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setAccess(["Single Branch Access"]);
      setAreas(["Gym Floor", "Cardio Zone"]);
    }
  }, [isOpen]);

  const totalSteps = 4;
  const isLast = step === totalSteps;

  const stepInfo = {
    1: {
      kicker: "PLAN CONFIGURATION",
      title: "Create Membership Plan",
      description: "Set up the primary value proposition, target audience, and classification for your new plan."
    },
    2: {
      kicker: "PRICING & SCHEDULE",
      title: "Configure Price & Duration",
      description: "Define base subscription fees, joining charges, and estimate the monthly average revenue per user (ARPU)."
    },
    3: {
      kicker: "ACCESS & PERMISSIONS",
      title: "Set Access Permissions",
      description: "Configure gym floor access rules, priority hours, and specific zone permissions for enrolled members."
    },
    4: {
      kicker: "PLAN STRATEGY",
      title: "Publish to Portfolio",
      description: "Review the strategic performance forecasts and publish the plan live to your member portal."
    }
  };

  const { kicker, title, description } = stepInfo[step];

  const ACCESS_CARDS = [
    { id: "branch", label: "Single Branch Access", description: "Limit plan usage to the home branch location.", icon: Shield, color: "bg-slate-100 text-slate-600" },
    { id: "roaming", label: "All-Network Roaming", description: "Access any branch in the gym network.", icon: Activity, color: "bg-sky-50 text-sky-600" },
    { id: "priority", label: "Priority Time Slots", description: "Reservations for peak hours and premium slots.", icon: Clock, color: "bg-amber-50 text-amber-600" },
    { id: "guest", label: "Guest Pass Eligibility", description: "Allow members to bring a guest monthly.", icon: Users, color: "bg-violet-50 text-violet-600" },
    { id: "freeze", label: "Freeze Support", description: "Allows temporary account pause capabilities.", icon: Lock, color: "bg-indigo-50 text-indigo-600" }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[1000] flex items-end justify-center"
        >
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
          />
          <motion.div
            key="panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 260, mass: 1 }}
            className="relative w-full max-w-4xl bg-[#f4f6fa] rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col h-[600px] z-50"
          >
            {/* Top Handle Bar */}
            <div className="w-12 h-1 rounded-full bg-slate-200 mx-auto mt-4 shrink-0" />

            {/* Absolute Close Button */}
            <motion.button
              whileHover="hovered"
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="absolute top-6 right-8 w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 bg-white text-slate-500 hover:text-white hover:bg-slate-950 hover:border-slate-950 shadow-sm transition-all duration-200 z-50"
              variants={{
                initial: { scale: 1 },
                hovered: { scale: 1.05 }
              }}
            >
              <motion.div
                variants={{
                  initial: { rotate: 0 },
                  hovered: { rotate: 90 }
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex items-center justify-center w-full h-full"
              >
                <X size={20} className="stroke-[2.5]" />
              </motion.div>
            </motion.button>

            {/* Header Kicker/Title/Desc */}
            <header className="px-10 pt-6 pb-2 shrink-0">
              <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">{kicker}</p>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">{title}</h2>
              <p className="text-xs font-semibold text-slate-500 max-w-2xl leading-relaxed mt-1.5">{description}</p>
            </header>

            {/* Content Body */}
            <div className={cn("flex-1 px-10 py-6", (step === 1 || step === 4) ? "overflow-hidden" : "overflow-y-auto")}>
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plan Name *</label>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Annual Elite Performance" className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-450 focus:ring-4 focus:ring-slate-100 transition-all outline-none" />
                      </div>
                      <CustomSelect
                        label="Category"
                        value={form.category}
                        onChange={(val) => setForm({ ...form, category: val })}
                        options={["Transformation", "Weight Loss", "Bodybuilding", "General Fitness"]}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <CustomSelect
                        label="Target Audience"
                        value={form.audience}
                        onChange={(val) => setForm({ ...form, audience: val })}
                        options={["Professionals", "Students", "Senior Citizens", "Athletes"]}
                      />
                      <CustomSelect
                        label="Strategic Goal"
                        value={form.goal}
                        onChange={(val) => setForm({ ...form, goal: val })}
                        options={["Revenue Generation", "Member Acquisition", "Retention Focus", "High-Margin Upsell"]}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Description</label>
                      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Value proposition and key features..." className="w-full h-24 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-450 focus:ring-4 focus:ring-slate-100 transition-all outline-none resize-none" />
                    </div>
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</label>
                        <div className="grid grid-cols-2 gap-3">
                          {["Monthly", "Quarterly", "Half-Yearly", "Annual"].map(d => (
                            <motion.button
                              key={d}
                              type="button"
                              whileHover={{ scale: 1.02, y: -0.5 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setForm({ ...form, duration: d })}
                              className={cn(
                                "h-11 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm",
                                form.duration === d
                                  ? "border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/10"
                                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-350 hover:bg-slate-50/50"
                              )}
                            >{d}</motion.button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Base Price *</label>
                            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="₹24,999" className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-450 focus:ring-4 focus:ring-slate-100 transition-all outline-none" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Joining Fee</label>
                            <input type="number" value={form.joiningFee} onChange={(e) => setForm({ ...form, joiningFee: e.target.value })} placeholder="₹1,500" className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-450 focus:ring-4 focus:ring-slate-100 transition-all outline-none" />
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-center h-[90px]">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Projected ARPU</p>
                          <p className="text-xl font-black text-slate-900">₹{form.price ? formatCompact(Number(form.price) / (form.duration === "Annual" ? 12 : form.duration === "Half-Yearly" ? 6 : form.duration === "Quarterly" ? 3 : 1)) : "0"}<span className="text-xs font-medium text-slate-400">/mo</span></p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Facility Access</h4>
                        <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                          {ACCESS_CARDS.map(card => {
                            const Icon = card.icon;
                            const isChecked = access.includes(card.label);
                            return (
                              <div
                                key={card.id}
                                onClick={() => {
                                  setAccess(prev =>
                                    prev.includes(card.label)
                                      ? prev.filter(r => r !== card.label)
                                      : [...prev, card.label]
                                  );
                                }}
                                className={cn(
                                  "p-3 bg-white border rounded-2xl flex items-start gap-4 cursor-pointer hover:border-slate-350 shadow-sm transition-all duration-200",
                                  isChecked ? "ring-2 ring-indigo-500/5 border-indigo-400" : "border-slate-200"
                                )}
                              >
                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", card.color)}>
                                  <Icon size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-900 leading-none">{card.label}</h4>
                                    <div className={cn(
                                      "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                      isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                                    )}>
                                      {isChecked && <CheckCircle2 size={10} className="stroke-[3]" />}
                                    </div>
                                  </div>
                                  <p className="text-[9px] text-slate-400 mt-1 leading-normal">{card.description}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Area Permissions</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {["Gym Floor", "Cardio Zone", "Steam/Sauna", "Group Classes", "Personal Training", "Locker Premium"].map(area => {
                            const isActive = areas.includes(area);
                            return (
                              <motion.button
                                key={area}
                                type="button"
                                whileHover={{ scale: 1.02, y: -0.5 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  setAreas(prev =>
                                    prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
                                  );
                                }}
                                className={cn(
                                  "p-3 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all duration-200 shadow-sm flex items-center justify-between",
                                  isActive
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
                                )}
                              >
                                <span>{area}</span>
                                <div className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-400" : "bg-slate-300")} />
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                {step === 4 && (
                  <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="flex flex-col items-center text-center py-4">
                      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-inner"><CheckCircle2 size={28} className="stroke-[2.5]" /></div>
                      <h3 className="text-lg font-bold text-slate-900">Ready to Publish</h3>
                      <p className="text-xs font-semibold text-slate-500 mt-1 max-w-sm">Review the strategic plan details before publishing to your portfolio.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Revenue Potential</p>
                        <p className="text-base font-black text-slate-900">₹{form.price ? formatCompact(Number(form.price) * 100 * (form.duration === "Annual" ? 1 : form.duration === "Half-Yearly" ? 2 : form.duration === "Quarterly" ? 4 : 12)) : "0"}<span className="text-[10px] font-medium text-slate-400">/yr</span></p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Retention Forecast</p>
                        <p className="text-base font-black text-emerald-600">76%</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Market Position</p>
                        <p className="text-base font-black text-indigo-600">Strategic</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer buttons centered with a gap */}
            <footer className="px-10 py-5 border-t border-slate-100 bg-white flex items-center justify-center gap-5 shrink-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
                className="h-11 max-w-[360px] flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2"
              >
                {step === 1 ? "Cancel" : "← Back"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => isLast ? onClose() : setStep(s => s + 1)}
                className="h-11 max-w-[360px] flex-1 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLast ? "Publish Plan" : "Continue →"}
              </motion.button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
export default function MembershipPortfolioDashboard() {
  const [view, setView] = useState("portfolio");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailsPlan, setDetailsPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHeaderStuck, setIsHeaderStuck] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeaderStuck(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: [0],
        rootMargin: "-20px 0px 0px 0px" // Slight offset matching sticky top
      }
    );

    observer.observe(sentinel);
    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [isLoading]);

  const filteredPlans = useMemo(() => {
    return MEMBERSHIP_PORTFOLIO.filter(plan => {
      const matchesSearch = plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === "All" ||
        (activeFilter === "Active" && plan.status === "Healthy") ||
        (activeFilter === "At Risk" && plan.status === "At Risk") ||
        (activeFilter === "Growing" && plan.status === "Growing") ||
        (activeFilter === "Highest Revenue") ||
        (activeFilter === "Newest");
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  if (isLoading) {
    return (
      <div className="members-shell animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded-lg mb-6" />
        <div className="members-overview gap-3 mb-6">
          {[1, 2, 3, 4].map(j => (
            <div key={j} className="h-24 bg-slate-200 rounded-lg" />
          ))}
        </div>
        <div className="h-10 w-full bg-slate-200 rounded-lg mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white border border-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#FAFBFD] p-4 text-slate-900 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 16px)' }}>
      <div className="members-shell">
        {/* HEADER */}
        <header className="pb-1.5 border-b border-slate-200/60 mb-1 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-sm">
                <Shield size={18} />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Membership Portfolio</h1>
                <p className="text-xs text-slate-400 font-semibold mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Plan Configurations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              {/* Segmented Control */}
              <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200/20">
                <button
                  onClick={() => setView("portfolio")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200",
                    view === "portfolio"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/40"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Portfolio
                </button>
                <button
                  onClick={() => setView("analytics")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200",
                    view === "analytics"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/40"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Analytics
                </button>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="h-10 px-5 rounded-xl bg-slate-950 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 hover:-translate-y-[1px] active:translate-y-0 shadow-md shadow-slate-950/10 transition-all duration-200 flex items-center gap-1.5"
              >
                <Plus size={15} />
                Create Plan
              </button>
            </div>
          </div>
        </header>

        {/* OVERVIEW STAT CARDS */}
        {view === "portfolio" && (
          <section className="grid grid-cols-4 gap-4 mt-0.5">
            <KPICard
              label="Active Membership Plans"
              value={`${PORTFOLIO_STATS.activePlans} Plans`}
              trend="+2"
              trendUp={true}
              subtitle="Across active categories"
              icon={LayoutGrid}
              accent="indigo"
            />
            <KPICard
              label="Monthly Revenue Generated"
              value={formatCurrency(PORTFOLIO_STATS.monthlyRevenue)}
              trend="+9.8%"
              trendUp={true}
              subtitle={`${formatCompact(PORTFOLIO_STATS.monthlyRevenue / PORTFOLIO_STATS.activePlans)} avg per plan`}
              icon={DollarSign}
              accent="emerald"
            />
            <KPICard
              label="Average Plan Retention"
              value="89%"
              trend="+1.2%"
              trendUp={true}
              subtitle="Weighted index rating"
              icon={TrendingUp}
              accent="amber"
            />
            <KPICard
              label="Members Expiring Next 30D"
              value={PORTFOLIO_STATS.expiring30Days}
              subtitle={`${formatCurrency(PORTFOLIO_STATS.forecastedRenewal)} renewal potential`}
              icon={Calendar}
              accent="slate"
            />
          </section>
        )}

        <div className="members-workspace mt-4">
          <AnimatePresence mode="wait">
            {/* ─── PORTFOLIO VIEW ─── */}
            {view === "portfolio" && (
              <motion.div
                key="portfolio"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Sentinel to detect sticky state */}
                <div ref={sentinelRef} style={{ height: '1px', marginBottom: '-1px', pointerEvents: 'none' }} />

                {/* UNIFIED STICKY CONTROL PANEL */}
                <div 
                  className={cn(
                    "bg-white border border-slate-200/80 shadow-sm flex flex-col transition-all duration-200",
                    isHeaderStuck ? "rounded-none border-x-0 border-t-0" : "rounded-xl"
                  )}
                  style={{ position: 'sticky', top: '-16px', zIndex: 20 }}
                >
                  {/* SEARCH & FILTERS ROW (TOOLBAR) */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 pt-4 pb-2.5">
                    <div className="relative flex-1 max-w-md">
                      <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search plans by name, category or duration..."
                        className="w-full h-10 pl-11 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-slate-300 focus:bg-white transition-all placeholder:text-slate-400"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {FILTER_OPTIONS.map(filter => (
                        <button
                          key={filter}
                          onClick={() => setActiveFilter(filter)}
                          className={cn(
                            "h-10 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all duration-200 flex items-center justify-center shadow-sm",
                            activeFilter === filter
                              ? "bg-slate-950 border-slate-950 text-white shadow-sm"
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-350 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DIVIDER */}
                  <div className="border-t border-slate-100/80 mx-4" />

                  {/* TABLE META ROW */}
                  <div className="flex items-center justify-between gap-12 px-4 pt-1 pb-3.5 bg-white rounded-b-xl">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-widest leading-none">Membership Tiers</h3>
                      <span className="text-slate-350 text-xs">/</span>
                      <p className="text-xs text-slate-400 font-semibold leading-none">Configured subscription packages, rates, and enrollment status</p>
                    </div>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-950 rounded-lg text-[9px] font-extrabold text-white uppercase tracking-widest font-mono shadow-md select-none shrink-0 transition-all duration-300 hover:bg-black">
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      Updated today
                    </span>
                  </div>
                </div>

                {/* TABLE/GRID PANEL */}
                <div className="members-table-panel mt-4">

                  <section className="members-table-wrap">
                    {filteredPlans.length === 0 ? (
                      <div className="py-16 flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                          <Search size={20} className="text-slate-400" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">No Membership Plans Found</h3>
                        <p className="text-xs font-semibold text-slate-500 mt-1 max-w-sm">
                          Try adjusting your search query or clear the active filters.
                        </p>
                        <button
                          onClick={() => { setSearchQuery(""); setActiveFilter("All"); }}
                          className="mt-4 px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          Clear Filters
                        </button>
                      </div>
                    ) : (
                      <table className="members-table">
                        <tbody className="grid gap-3">
                          <LayoutGroup>
                            <AnimatePresence mode="popLayout">
                              {filteredPlans.map((plan, i) => (
                                <PlanCard
                                  key={plan.id}
                                  plan={plan}
                                  index={i}
                                  onViewDetails={setDetailsPlan}
                                />
                              ))}
                            </AnimatePresence>
                          </LayoutGroup>
                        </tbody>
                      </table>
                    )}
                  </section>
                </div>

                {/* COMPACT REDESIGNED DARK OPERATIONS PANEL */}
                {RECOMMENDATIONS.length > 0 && filteredPlans.length > 0 && (
                  <section 
                    className="text-white rounded-3xl p-6 md:p-8 border relative overflow-hidden mt-6"
                    style={{
                      background: '#090d16',
                      borderColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '24px',
                      color: '#ffffff'
                    }}
                  >
                    {/* Ambient Glow Graphic Elements */}
                    <div 
                      className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none" 
                      style={{ background: 'rgba(99, 102, 241, 0.08)' }}
                    />
                    <div 
                      className="absolute bottom-0 left-0 w-60 h-60 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none" 
                      style={{ background: 'rgba(16, 185, 129, 0.04)' }}
                    />

                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      {/* Left Column: Heading, Description, and Avatar Stack */}
                      <div className="flex flex-col items-start gap-4 text-left">
                        {/* Pill Tag */}
                        <div 
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
                          style={{
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            background: 'rgba(99, 102, 241, 0.1)',
                            color: '#818cf8'
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                          Core Operations Radar
                        </div>
                        
                        {/* Heading */}
                        <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight max-w-md">
                          Optimize your gym revenue models automatically.
                        </h2>
                        
                        {/* Description */}
                        <p className="text-slate-400 text-xs font-semibold leading-relaxed max-w-md mb-2">
                          Identify churn risks, upgrade quarterly memberships to annual packages, and optimize pricing tiers using automated operations intelligence.
                        </p>

                        {/* Avatar Stack */}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex -space-x-2">
                            <div className="w-6 h-6 rounded-full border border-slate-900 bg-indigo-500 flex items-center justify-center text-[8px] font-black text-white">SD</div>
                            <div className="w-6 h-6 rounded-full border border-slate-900 bg-emerald-500 flex items-center justify-center text-[8px] font-black text-white">GD</div>
                            <div className="w-6 h-6 rounded-full border border-slate-900 bg-rose-500 flex items-center justify-center text-[8px] font-black text-white">AD</div>
                            <div className="w-6 h-6 rounded-full border border-slate-900 bg-blue-600 flex items-center justify-center text-[8px] font-black text-white">+12</div>
                          </div>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            Monitoring 1,128 Members Today
                          </span>
                        </div>
                      </div>

                      {/* Right Column: Execute Actions & Stats Grid */}
                      <div className="flex flex-col gap-4">
                        {/* Primary Action Button (Solid Blue) */}
                        <button 
                          onClick={() => setIsModalOpen(true)}
                          className="w-full py-3.5 px-5 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
                          style={{ 
                            background: '#1b64f2',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Execute Churn Campaign
                          <ArrowRight size={14} className="stroke-[3]" />
                        </button>

                        {/* Secondary Action Glass Card */}
                        <div 
                          className="p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition-all hover:bg-white/[0.02] text-left"
                          style={{ 
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderColor: 'rgba(255, 255, 255, 0.05)'
                          }}
                          onClick={() => setIsModalOpen(true)}
                        >
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                            style={{
                              background: 'rgba(99, 102, 241, 0.1)',
                              borderColor: 'rgba(99, 102, 241, 0.2)',
                              color: '#a5b4fc'
                            }}
                          >
                            <Sparkles size={16} />
                          </div>
                          <div className="min-w-0 text-left">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Featured Strategy</span>
                            <span className="text-xs font-bold text-white block mt-0.5 leading-none">Annual Upgrade Campaign</span>
                            <span className="text-[10px] text-slate-400 block mt-1">Target 31 quarterly members • ₹3.2L Target</span>
                          </div>
                        </div>

                        {/* Stats Grid (3 columns) */}
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { value: "28", label: "Expiring", subtitle: "Follow Up" },
                            { value: "17", label: "Conversions", subtitle: "Upgrade Target" },
                            { value: "+8%", label: "Pricing Gap", subtitle: "Optimize Tiers" }
                          ].map((item, idx) => (
                            <div 
                              key={idx} 
                              className="p-4 rounded-xl border text-center transition-all hover:border-white/[0.08]"
                              style={{ 
                                background: 'rgba(255, 255, 255, 0.01)',
                                borderColor: 'rgba(255, 255, 255, 0.03)'
                              }}
                            >
                              <span className="text-lg font-black text-white block tracking-tight leading-none">{item.value}</span>
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mt-2 leading-none">{item.label}</span>
                              <span className="text-[7px] font-bold text-slate-400 block mt-1 leading-none">{item.subtitle}</span>
                            </div>
                          ))}
                        </div>

                        {/* Footer Disclaimer */}
                        <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[9px] font-bold uppercase tracking-wider mt-1">
                          <Shield size={11} className="text-slate-500 shrink-0" />
                          Secure payment audits. Encrypted database.
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </motion.div>
            )}

            {/* ─── ANALYTICS VIEW ─── */}
            {view === "analytics" && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Revenue + Retention trends */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Revenue Trends</h3>
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <ArrowUp size={12} /> +9.8% vs last month
                      </span>
                    </div>
                    {/* Simple bar chart */}
                    <div className="flex items-end gap-3 h-40">
                      {[
                        { label: "Jan", value: 65 },
                        { label: "Feb", value: 72 },
                        { label: "Mar", value: 68 },
                        { label: "Apr", value: 78 },
                        { label: "May", value: 85 },
                        { label: "Jun", value: 82 },
                        { label: "Jul", value: 92 },
                      ].map((m, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${m.value}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            className={cn(
                              "w-full rounded-lg",
                              m.value > 85 ? "bg-emerald-500" : m.value > 75 ? "bg-indigo-500" : "bg-slate-200"
                            )}
                          />
                          <span className="text-[8px] font-medium text-slate-400">{m.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Retention Trends</h3>
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <ArrowUp size={12} /> +4% improvement
                      </span>
                    </div>
                    <div className="flex items-end gap-3 h-40">
                      {[
                        { label: "Jan", value: 58 },
                        { label: "Feb", value: 62 },
                        { label: "Mar", value: 60 },
                        { label: "Apr", value: 64 },
                        { label: "May", value: 68 },
                        { label: "Jun", value: 72 },
                        { label: "Jul", value: 76 },
                      ].map((m, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${m.value}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            className={cn(
                              "w-full rounded-lg",
                              m.value > 70 ? "bg-emerald-500" : m.value > 62 ? "bg-indigo-500" : "bg-slate-200"
                            )}
                          />
                          <span className="text-[8px] font-medium text-slate-400">{m.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Plan Comparison + Growth */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-5">Plan Performance Comparison</h3>
                    <div className="space-y-4">
                      {MEMBERSHIP_PORTFOLIO.map(plan => (
                        <div key={plan.id} className="flex items-center gap-4">
                          <div className="w-7 h-7 rounded-lg bg-slate-950 text-white flex items-center justify-center text-[9px] font-bold shrink-0">{plan.id}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{plan.name}</p>
                            <p className="text-[9px] text-slate-400">{plan.activeMembers} members</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-900">{formatCompact(plan.revenue)}</p>
                            <p className={cn("text-[9px] font-semibold", plan.trendUp ? "text-emerald-600" : "text-rose-600")}>{plan.trend}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-5">Plan Popularity</h3>
                    <div className="space-y-4">
                      {[...MEMBERSHIP_PORTFOLIO].sort((a, b) => b.activeMembers - a.activeMembers).map(plan => {
                        const max = Math.max(...MEMBERSHIP_PORTFOLIO.map(p => p.activeMembers));
                        const pct = (plan.activeMembers / max) * 100;
                        return (
                          <div key={plan.id}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-medium text-slate-700">{plan.name}</span>
                              <span className="text-[11px] font-bold text-slate-900">{plan.activeMembers}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                                className={cn(
                                  "h-full rounded-full",
                                  plan.trendUp ? "bg-emerald-500" : "bg-rose-500"
                                )}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Renewal Forecast */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Renewal Forecast</h3>
                    <span className="text-[10px] font-bold text-slate-400">{PORTFOLIO_STATS.expiring30Days} members expiring</span>
                  </div>
                  <div className="grid grid-cols-4 gap-6">
                    {[
                      { label: "Expected Renewals", value: "34", pct: 71, color: "emerald" },
                      { label: "At Risk of Churn", value: "10", pct: 21, color: "amber" },
                      { label: "Likely to Expire", value: "4", pct: 8, color: "rose" },
                      { label: "Forecast Revenue", value: formatCompact(PORTFOLIO_STATS.forecastedRenewal), pct: 100, color: "indigo" },
                    ].map((item, i) => (
                      <div key={i} className="text-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-xl font-extrabold text-slate-900 mb-1">{item.value}</p>
                        <p className="text-[10px] text-slate-500">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ELEGANT BRAND SIGNATURE FOOTER */}
      <footer className="brand-signature-footer">
        <div className="signature-content">
          {/* Item 1: Flag & Kicker */}
          <div className="signature-flag-label">
            <span className="signature-flag">🇮🇳</span>
            <span className="signature-kicker">ENGINEERED IN INDIA</span>
          </div>
          
          {/* Item 2: Headline */}
          <h2 className="signature-primary">
            Made with <span className="signature-heart">❤️</span> in India
          </h2>
          
          {/* Item 3: Brand Philosophy */}
          <p className="signature-secondary">
            Built for the People Who Build Stronger People.
          </p>
          
          {/* Item 4: Brand Group */}
          <div className="signature-brand-group">
            <h1 className="signature-brand-name font-ethnocentric">GymDeck</h1>
            <p className="signature-brand-descriptor">FITNESS MANAGEMENT PLATFORM</p>
          </div>
        </div>
      </footer>

      {/* CREATE PLAN MODAL */}
      <CreatePlanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* PLAN DETAILS MODAL */}
      <PlanDetailsModal
        plan={detailsPlan}
        onClose={() => setDetailsPlan(null)}
        onEdit={(plan) => {
          setDetailsPlan(null);
          setIsModalOpen(true);
        }}
        onDuplicate={(plan) => {
          setDetailsPlan(null);
        }}
        onArchive={(plan) => {
          setDetailsPlan(null);
        }}
        onDelete={(plan) => {
          setDetailsPlan(null);
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────
// MOUNT UTILITY
// ─────────────────────────────────────────
export function mountMembershipPlans() {
  const stage = document.querySelector('[data-stage="membership-plans"]');
  if (!stage) return null;

  const rootElement = document.createElement("div");
  rootElement.className = "min-h-full";
  stage.replaceChildren(rootElement);

  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <MembershipPortfolioDashboard />
      </ErrorBoundary>
    );
    return root;
  } catch (err) {
    console.error("Mount Error:", err);
    return null;
  }
}
