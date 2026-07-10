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
  Circle,
  FolderPlus
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

const getPlanInitials = (name) => {
  if (!name) return "PL";
  const words = name.trim().split(/\s+/);
  const initials = words.map(w => w[0]).join("").toUpperCase();
  return initials.substring(0, 3);
};

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

const INITIAL_MOCK_PLANS = [
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
          plan.color || "from-slate-800 to-indigo-900"
        )}>
          {getPlanInitials(plan.name)}
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
function PlanDetailsModal({ plan, onClose, onEdit, onDuplicate, onArchive, onDelete, isSubModalOpen }) {
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
            onClick={isSubModalOpen ? undefined : onClose}
            className={cn(
              "absolute inset-0 bg-slate-950/85 backdrop-blur-xl",
              isSubModalOpen && "bg-slate-950/95"
            )}
            style={{
              transition: "background-color 0.3s ease, backdrop-filter 0.3s ease",
              willChange: "opacity, background-color"
            }}
          />

          {/* Panel */}
          <motion.div
            key="details-panel"
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.45 }}
            className="relative w-full max-w-4xl bg-white rounded-[32px] border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col p-8 md:p-10 m-auto text-left max-h-[90vh] md:max-h-[600px] z-50"
            style={{
              filter: isSubModalOpen ? "blur(5px) brightness(0.65)" : "none",
              pointerEvents: isSubModalOpen ? "none" : "auto",
              willChange: "transform, opacity, filter",
              transition: "filter 0.3s ease"
            }}
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
                  plan.color || "from-slate-800 to-indigo-900"
                )}>
                  {getPlanInitials(plan.name)}
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
                onClick={() => { onDelete(plan); }}
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
// DELETE CONFIRMATION MODAL
// ─────────────────────────────────────────
function DeleteConfirmationModal({ isOpen, plan, onClose, onConfirm }) {
  if (!plan) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="delete-modal-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md"
        >
          <motion.div
            key="delete-panel"
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl relative text-left"
          >
            {/* Header Warning Icon */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-650 shrink-0 shadow-sm animate-pulse">
                <AlertCircle size={24} className="stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Delete Membership Plan</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">This action is permanent and irreversible.</p>
              </div>
            </div>

            {/* Target Card Preview */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-bold text-[10px] shadow-sm shrink-0",
                  plan.color || "from-slate-800 to-indigo-900"
                )}>
                  {getPlanInitials(plan.name)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">{plan.name}</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{plan.category} • {plan.duration}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900">{formatCurrency(plan.price)}</p>
                <p className="text-[9px] text-slate-400 font-semibold">{plan.activeMembers || 0} active members</p>
              </div>
            </div>

            {/* Warning Message details */}
            <p className="text-xs font-semibold text-slate-500 leading-relaxed mb-6">
              Deleting this plan will permanently remove it from the catalog. Members currently enrolled under this plan will remain active, but you won't be able to register new sign-ups or renewals under this configuration.
            </p>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl bg-slate-105 hover:bg-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider transition-all duration-150"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-rose-200"
              >
                <Trash2 size={13} className="stroke-[2.5]" />
                Delete Plan
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────
// CREATE PLAN MODAL
// ─────────────────────────────────────────
// ─────────────────────────────────────────
// TRAINERS LIST CONSTANT
// ─────────────────────────────────────────
function CreatePlanModal({ isOpen, onClose, onPublish }) {
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

  const [access, setAccess] = useState(["Freeze Support"]);
  const [areas, setAreas] = useState(["Gym Floor", "Cardio Zone"]);
  const [accessCards, setAccessCards] = useState([
    { id: "freeze", label: "Freeze Support", description: "Allows temporary account pause capabilities.", icon: Lock, color: "bg-indigo-50 text-indigo-600" }
  ]);
  const [isCustomAccessModalOpen, setIsCustomAccessModalOpen] = useState(false);
  const [customAccessName, setCustomAccessName] = useState("");
  const [customAccessDesc, setCustomAccessDesc] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setAccess(["Freeze Support"]);
      setAreas(["Gym Floor", "Cardio Zone"]);
      setAccessCards([
        { id: "freeze", label: "Freeze Support", description: "Allows temporary account pause capabilities.", icon: Lock, color: "bg-indigo-50 text-indigo-600" }
      ]);
      setIsCustomAccessModalOpen(false);
      setCustomAccessName("");
      setCustomAccessDesc("");
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-container"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[1000] flex items-end justify-center overflow-hidden"
        >
           <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "tween", ease: "easeInOut", duration: 0.35 }}
            onClick={onClose}
            className="absolute inset-0 backdrop-blur-2xl"
            style={{ 
              backgroundColor: "rgba(9, 13, 22, 0.92)",
              willChange: "opacity" 
            }}
          />
          <motion.div
            key="panel"
            initial={{ y: 650 }}
            animate={{ y: 0 }}
            exit={{ y: 650 }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 32,
              mass: 0.85
            }}
            className="relative w-full max-w-4xl bg-[#f4f6fa] rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col h-[600px] z-50"
            style={{ willChange: "transform" }}
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
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Fees *</label>
                            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="₹24,999" className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-450 focus:ring-4 focus:ring-slate-100 transition-all outline-none" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Joining Fee (One time)</label>
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
                          {accessCards.map(card => {
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
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-xs font-bold text-slate-900 leading-tight break-all break-words">{card.label}</h4>
                                    <div className={cn(
                                      "w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 mt-0.5",
                                      isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                                    )}>
                                      {isChecked && <CheckCircle2 size={10} className="stroke-[3]" />}
                                    </div>
                                  </div>
                                  <p className="text-[9px] text-slate-400 mt-1 leading-normal break-all break-words">{card.description}</p>
                                </div>
                              </div>
                            );
                          })}

                          {/* Dotted custom access creator card */}
                          <div
                            onClick={() => {
                              setCustomAccessName("");
                              setCustomAccessDesc("");
                              setIsCustomAccessModalOpen(true);
                            }}
                            className="p-3 bg-white border-2 border-dashed border-slate-200 hover:border-slate-350 rounded-2xl flex items-center gap-4 cursor-pointer transition-all duration-200 hover:bg-slate-50/50 min-h-[62px]"
                          >
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                              <Plus size={16} className="stroke-[2.5]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-slate-500">Create Custom Access</h4>
                              <p className="text-[9px] text-slate-400 mt-0.5">Click to define a new access rule.</p>
                            </div>
                          </div>
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
                onClick={() => {
                  if (isLast) {
                    onPublish(form);
                    onClose();
                  } else {
                    setStep(s => s + 1);
                  }
                }}
                className="h-11 max-w-[360px] flex-1 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLast ? "Publish Plan" : "Continue →"}
              </motion.button>
            </footer>
          </motion.div>

          {/* NESTED CUSTOM ACCESS MODAL */}
          <AnimatePresence>
            {isCustomAccessModalOpen && (
              <motion.div
                key="custom-access-modal-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
              >
                {/* Dark blur backdrop */}
                <motion.div
                  key="custom-access-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsCustomAccessModalOpen(false)}
                  className="absolute inset-0 bg-slate-950/75 backdrop-blur-xl"
                />
                
                {/* Small central card */}
                <motion.div
                  key="custom-access-panel"
                  initial={{ scale: 0.95, y: 10, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.95, y: 10, opacity: 0 }}
                  transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
                  className="relative w-full max-w-md bg-white border border-slate-200 rounded-[24px] shadow-2xl p-6 z-50 flex flex-col gap-4 text-left"
                >
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider font-mono">Create Custom Access</h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-wide">Define a new facility permission rule</p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Access Name *</label>
                        <span className="text-[8px] font-mono text-slate-400">{customAccessName.length}/25</span>
                      </div>
                      <input
                        type="text"
                        value={customAccessName}
                        onChange={(e) => setCustomAccessName(e.target.value)}
                        maxLength={25}
                        placeholder="e.g. Steam/Sauna Access"
                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-450 focus:ring-4 focus:ring-slate-100 transition-all outline-none"
                        autoFocus
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Description (Optional)</label>
                        <span className="text-[8px] font-mono text-slate-400">{customAccessDesc.length}/60</span>
                      </div>
                      <textarea
                        value={customAccessDesc}
                        onChange={(e) => setCustomAccessDesc(e.target.value)}
                        maxLength={60}
                        placeholder="Describe the limits or benefits of this access..."
                        rows={3}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-450 focus:ring-4 focus:ring-slate-100 transition-all outline-none resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => setIsCustomAccessModalOpen(false)}
                      className="flex-1 h-10 rounded-xl border border-slate-200 bg-white text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const trimmedName = customAccessName.trim();
                        if (!trimmedName) return;
                        const newId = `custom-${Date.now()}`;
                        const newCard = {
                          id: newId,
                          label: trimmedName,
                          description: customAccessDesc.trim(),
                          icon: Lock,
                          color: "bg-indigo-50 text-indigo-600"
                        };
                        setAccessCards(prev => [...prev, newCard]);
                        setAccess(prev => [...prev, trimmedName]);
                        setIsCustomAccessModalOpen(false);
                      }}
                      disabled={!customAccessName.trim()}
                      className="flex-1 h-10 rounded-xl bg-slate-950 hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-black uppercase tracking-widest text-white transition-all shadow-md"
                    >
                      Save Access
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
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
  const [deletePlanTarget, setDeletePlanTarget] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHeaderStuck, setIsHeaderStuck] = useState(false);
  const sentinelRef = useRef(null);

  const [plans, setPlans] = useState([]);

  const loadPlans = async () => {
    try {
      const dbPlans = await window.__TAURI__.core.invoke("get_plans_command");
      if (dbPlans && dbPlans.length > 0) {
        const mapped = dbPlans.map(p => {
          let category = "General";
          let desc = p.description || "";
          if (desc.includes("||")) {
            const parts = desc.split("||");
            category = parts[0];
            desc = parts[1];
          }
          const orig = INITIAL_MOCK_PLANS.find(m => m.id === p.id);
          return {
            id: p.id,
            name: p.plan_name,
            category: category,
            price: p.price,
            duration: `${p.duration_days} Days`,
            activeMembers: orig ? orig.activeMembers : 0,
            revenue: orig ? orig.revenue : 0,
            monthlyContribution: orig ? orig.monthlyContribution : 0,
            renewalRate: orig ? orig.renewalRate : 100,
            retention: orig ? orig.retention : 100,
            trend: orig ? orig.trend : "+0%",
            trendUp: orig ? orig.trendUp : true,
            status: p.is_active ? (orig ? orig.status : "Healthy") : "At Risk",
            membersEnrolled: orig ? orig.membersEnrolled : 0,
            growth: orig ? orig.growth : 0,
            risk: orig ? orig.risk : "Low",
            color: orig ? orig.color : (
              category === "Transformation" ? "from-indigo-600 to-indigo-800" :
              category === "Bodybuilding" ? "from-emerald-600 to-emerald-800" :
              category === "Weight Loss" ? "from-amber-600 to-amber-800" :
              "from-sky-600 to-sky-800"
            ),
            description: desc,
            createdAt: p.created_at
          };
        });
        setPlans(mapped);
      } else {
        // Seed the initial mock plans
        for (const mock of INITIAL_MOCK_PLANS) {
          const planData = {
            id: mock.id,
            gym_id: "00000000-0000-0000-0000-000000000000",
            plan_name: mock.name,
            duration_days: parseInt(mock.duration) || 30,
            price: mock.price,
            description: `${mock.category}||${mock.description || ""}`,
            is_active: true,
            created_by_user_id: "00000000-0000-0000-0000-000000000000",
            updated_by_user_id: "00000000-0000-0000-0000-000000000000",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null
          };
          try {
            await window.__TAURI__.core.invoke("create_plan_command", { plan: planData });
          } catch (e) {
            console.error("Failed to seed plan:", e);
          }
        }
        const seeded = await window.__TAURI__.core.invoke("get_plans_command");
        const mapped = seeded.map(p => {
          let category = "General";
          let desc = p.description || "";
          if (desc.includes("||")) {
            const parts = desc.split("||");
            category = parts[0];
            desc = parts[1];
          }
          const orig = INITIAL_MOCK_PLANS.find(m => m.id === p.id);
          return {
            id: p.id,
            name: p.plan_name,
            category: category,
            price: p.price,
            duration: `${p.duration_days} Days`,
            activeMembers: orig ? orig.activeMembers : 0,
            revenue: orig ? orig.revenue : 0,
            monthlyContribution: orig ? orig.monthlyContribution : 0,
            renewalRate: orig ? orig.renewalRate : 100,
            retention: orig ? orig.retention : 100,
            trend: orig ? orig.trend : "+0%",
            trendUp: orig ? orig.trendUp : true,
            status: p.is_active ? (orig ? orig.status : "Healthy") : "At Risk",
            membersEnrolled: orig ? orig.membersEnrolled : 0,
            growth: orig ? orig.growth : 0,
            risk: orig ? orig.risk : "Low",
            color: orig ? orig.color : (
              category === "Transformation" ? "from-indigo-600 to-indigo-800" :
              category === "Bodybuilding" ? "from-emerald-600 to-emerald-800" :
              category === "Weight Loss" ? "from-amber-600 to-amber-800" :
              "from-sky-600 to-sky-800"
            ),
            description: desc,
            createdAt: p.created_at
          };
        });
        setPlans(mapped);
      }
    } catch (err) {
      console.error("Failed to load plans from DB:", err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletePlanTarget) return;
    const planName = deletePlanTarget.name;
    try {
      await window.__TAURI__.core.invoke("delete_plan_command", { planId: deletePlanTarget.id });
      setDeletePlanTarget(null);
      setDetailsPlan(null);
      
      // Trigger dynamic bottom toast notification
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      setToastMessage(`"${planName}" deleted permanently.`);
      toastTimerRef.current = setTimeout(() => {
        setToastMessage(null);
        toastTimerRef.current = null;
      }, 3500);

      await loadPlans();
    } catch (e) {
      console.error("Failed to delete plan:", e);
      alert("Error deleting plan from secure vault database: " + e);
    }
  };

  const handlePublishPlan = async (formDetails) => {
    let durationDays = 30;
    if (formDetails.duration === "Quarterly") durationDays = 90;
    else if (formDetails.duration === "Half-Yearly") durationDays = 180;
    else if (formDetails.duration === "Annual") durationDays = 365;

    const newPlan = {
      id: crypto.randomUUID(),
      gym_id: "00000000-0000-0000-0000-000000000000",
      plan_name: formDetails.name,
      duration_days: durationDays,
      price: parseFloat(formDetails.price) || 0,
      description: `${formDetails.category}||${formDetails.description || ""}`,
      is_active: true,
      created_by_user_id: "00000000-0000-0000-0000-000000000000",
      updated_by_user_id: "00000000-0000-0000-0000-000000000000",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };

    try {
      await window.__TAURI__.core.invoke("create_plan_command", { plan: newPlan });
      await loadPlans();
    } catch (e) {
      console.error("Failed to create plan:", e);
      alert("Error saving plan to the secure vault database: " + e);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadPlans();
      setIsLoading(false);
    };
    init();
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
    const filtered = plans.filter(plan => {
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

    if (activeFilter === "Highest Revenue") {
      return [...filtered].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
    }
    return [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [plans, searchQuery, activeFilter]);

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
    <div className="min-h-full bg-[#FAFBFD] p-4 text-slate-900">
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
                className="flex flex-col"
              >
                {/* Sentinel to detect sticky state */}
                <div ref={sentinelRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', pointerEvents: 'none' }} />

                {/* UNIFIED STICKY CONTROL PANEL */}
                <div 
                  className={cn(
                    "bg-white border border-slate-200/80 shadow-sm flex flex-col transition-all duration-200",
                    isHeaderStuck ? "rounded-none border-x-0 border-t-0" : "rounded-xl"
                  )}
                  style={{ position: 'sticky', top: '-1px', zIndex: 20 }}
                >
                  {/* SEARCH & FILTERS ROW (TOOLBAR) */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 pt-4 pb-2.5">
                    <div className="relative flex-1 max-w-md">
                      <Search 
                        size={15} 
                        className="absolute left-4 text-slate-400 pointer-events-none" 
                        style={{ top: "50%", transform: "translateY(-50%)" }}
                      />
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
                          className="absolute right-3.5 w-5 h-5 rounded-full bg-slate-200/50 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all duration-200 flex items-center justify-center border-0 p-0 outline-none cursor-pointer"
                          style={{ top: "50%", transform: "translateY(-50%)" }}
                        >
                          <X size={10} className="stroke-[2.5]" />
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
                      <div 
                        className="w-full mt-4 mb-8 pt-10 pb-11 px-8 bg-gradient-to-b from-slate-50/70 via-slate-50/45 to-white border-2 border-dotted border-slate-200 rounded-[28px] shadow-sm flex flex-col items-center text-center relative overflow-hidden"
                      >
                        {/* Elegant Double-Layered Circular Icon */}
                        <div className="w-14 h-14 rounded-full bg-slate-100/70 border border-slate-200/40 flex items-center justify-center mb-4 relative shrink-0 shadow-inner">
                          <div className="absolute inset-0 rounded-full bg-slate-500/5 blur-md" />
                          <div className="w-10 h-10 rounded-full bg-slate-950 text-white flex items-center justify-center shadow-md shadow-slate-950/20 relative z-10">
                            <FolderPlus size={16} className="stroke-[2.2]" />
                          </div>
                        </div>
                        
                        <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                          {activeFilter === "All" ? "No Membership Plans Created" : "No Membership Plans Found"}
                        </h3>
                        
                        <p className="text-xs font-bold text-slate-550 mt-2 max-w-sm leading-relaxed">
                          {activeFilter === "All" 
                            ? "Get started by creating your first subscription package configuration." 
                            : "Try adjusting your search query or clear the active filters."}
                        </p>
                        
                        {activeFilter === "All" ? (
                          <motion.button
                            whileHover={{ scale: 1.02, y: -0.5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsModalOpen(true)}
                            className="mt-6 h-11 px-6 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-2xl transition-all duration-200 flex items-center gap-2 shadow-md shadow-slate-950/20"
                          >
                            <Plus size={15} className="stroke-[2.5]" />
                            Create Plan
                          </motion.button>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.02, y: -0.5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { setSearchQuery(""); setActiveFilter("All"); }}
                            className="mt-6 h-11 px-6 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-2xl transition-all duration-200 flex items-center gap-2 shadow-md shadow-slate-950/20"
                          >
                            Clear Filters
                          </motion.button>
                        )}
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
                {RECOMMENDATIONS.length > 0 && (
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
                      {plans.map(plan => (
                        <div key={plan.id} className="flex items-center gap-4">
                          <div className="w-7 h-7 rounded-lg bg-slate-950 text-white flex items-center justify-center text-[9px] font-bold shrink-0">{plan.id.length > 4 ? plan.id.substring(0, 3).toUpperCase() : plan.id}</div>
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
                      {[...plans].sort((a, b) => b.activeMembers - a.activeMembers).map(plan => {
                        const max = plans.length > 0 ? Math.max(...plans.map(p => p.activeMembers)) : 1;
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
      <CreatePlanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onPublish={handlePublishPlan} />

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
          setDeletePlanTarget(plan);
        }}
        isSubModalOpen={deletePlanTarget !== null}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmationModal
        isOpen={deletePlanTarget !== null}
        plan={deletePlanTarget}
        onClose={() => setDeletePlanTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* TOAST ALERT NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%", scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 20, x: "-50%", scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-6 z-[3000] flex items-center gap-2.5 px-4 py-3 bg-slate-950 border border-slate-800 text-white rounded-xl shadow-2xl text-[11px] font-bold pointer-events-none tracking-wide"
            style={{ left: "50%" }}
          >
            <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 size={13} className="stroke-[2.5]" />
            </span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
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
