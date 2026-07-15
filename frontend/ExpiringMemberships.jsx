import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  Archive,
  ArrowUpDown,
  BarChart3,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  Edit,
  Eye,
  Filter,
  HelpCircle,
  Info,
  Layers,
  LayoutGrid,
  List,
  Lock,
  MessageSquare,
  MoreVertical,
  Phone,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Tag,
  Trash2,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────
// CONSTANTS & FORMATTERS
// ─────────────────────────────────────────
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const cn = (...classes) => classes.filter(Boolean).join(" ");

// ─────────────────────────────────────────


const getMemberPriority = (member) => {
  if (member.churnRisk === "High" || member.churnRisk === "Extreme") return "danger";
  if (member.churnRisk === "Medium") return "warning";
  return "healthy";
};

const laneConfig = {
  danger: {
    title: "Critical Churn Risk",
    subtitle: "High probability of loss, immediate action required",
    icon: AlertTriangle,
    lane: "border-rose-200 bg-rose-50/60",
    iconWrap: "bg-rose-100 text-rose-700",
    count: "text-rose-800",
  },
  warning: {
    title: "Action Needed",
    subtitle: "Nearing expiry with pending follow-ups",
    icon: Clock,
    lane: "border-amber-200 bg-amber-50/50",
    iconWrap: "bg-amber-100 text-amber-700",
    count: "text-amber-800",
  },
  healthy: {
    title: "Healthy Retention",
    subtitle: "Likely to renew or recently processed",
    icon: CheckCircle2,
    lane: "border-emerald-200 bg-emerald-50/50",
    iconWrap: "bg-emerald-100 text-emerald-700",
    count: "text-emerald-800",
  },
};

// ─────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────
function DashboardHeader({ title, description, stats, onRenew }) {
  const [campaignLaunched, setCampaignLaunched] = useState(false);

  const handleLaunchCampaign = () => {
    setCampaignLaunched(true);
    setTimeout(() => {
      setCampaignLaunched(false);
    }, 5000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between relative z-10">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500 font-sans">Retention Command Center</p>
          <h1 className="m-0 text-3xl font-black text-slate-900 tracking-tight leading-none">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-xs font-semibold leading-relaxed text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 lg:mt-0 mt-4">
          <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"><Bell size={18} /></button>
          <button onClick={onRenew} className="h-10 px-6 rounded-xl bg-slate-950 text-white flex items-center gap-2 text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"><Plus size={18} /> Renew Membership</button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 relative z-10 items-stretch">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[640px] relative z-10 shrink-0">
          <StatTile label="Expiring Today" value={stats.expiringToday} tone="rose" />
          <StatTile label="Upcoming (Week)" value={stats.totalExpiring} tone="blue" />
          <StatTile label="Revenue At Risk" value={currencyFormatter.format(stats.revenueAtRisk / 1000) + "K"} tone="amber" />
          <StatTile label="Renewal Prob." value={`${stats.avgRenewalProb}%`} tone="emerald" />
        </div>

        <div className="flex-1 min-w-[280px] rounded-xl bg-slate-950 text-white p-3 flex flex-col justify-between border border-slate-800/80 relative overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:border-slate-700/80">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              {campaignLaunched ? (
                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.15em] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Active
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.15em] bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Radar
                </div>
              )}
            </div>
            
            <h3 className="text-xs font-black text-white tracking-tight leading-none mt-1">
              Auto-Campaign: Annual Upgrades
            </h3>
            <p className="mt-1 text-[9px] font-semibold text-slate-400 leading-tight">
              {campaignLaunched 
                ? `Sending automated renewal reminders & 10% discounts...`
                : `Targeting ${stats.totalExpiring} upcoming expiries with loyalty offers.`
              }
            </p>
          </div>
          
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-900 pt-2">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Est. Revenue</span>
              <strong className="text-xs font-black text-emerald-400 leading-none mt-0.5">
                {currencyFormatter.format(stats.revenueAtRisk * 1.12)}
              </strong>
            </div>
            <button 
              onClick={handleLaunchCampaign}
              disabled={campaignLaunched}
              className={cn(
                "h-7 px-2.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-md",
                campaignLaunched 
                  ? "bg-emerald-600 text-white shadow-emerald-950/30 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30 active:scale-95"
              )}
            >
              {campaignLaunched ? (
                <>Sending...</>
              ) : (
                <>Run Campaign <ChevronRight size={8} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, tone = "slate" }) {
  const config = {
    rose: {
      border: "border-l-rose-500 border-slate-200/60",
      dot: "bg-rose-500",
      bg: "bg-rose-50/10",
      badge: "bg-rose-100 text-rose-700",
      badgeText: "Urgent",
      subtext: "Immediate action required",
    },
    blue: {
      border: "border-l-blue-500 border-slate-200/60",
      dot: "bg-blue-500",
      bg: "bg-blue-50/10",
      badge: "bg-blue-100 text-blue-700",
      badgeText: "Pipeline",
      subtext: "4 of 5 members contacted",
    },
    amber: {
      border: "border-l-amber-500 border-slate-200/60",
      dot: "bg-amber-500",
      bg: "bg-amber-50/10",
      badge: "bg-amber-100 text-amber-700",
      badgeText: "At Risk",
      subtext: "Requires active recovery",
    },
    emerald: {
      border: "border-l-emerald-500 border-slate-200/60",
      dot: "bg-emerald-500",
      bg: "bg-emerald-50/10",
      badge: "bg-emerald-100 text-emerald-700",
      badgeText: "+2.4% trend",
      subtext: "Average retention health",
    },
    slate: {
      border: "border-l-slate-400 border-slate-200/60",
      dot: "bg-slate-400",
      bg: "bg-white",
      badge: "bg-slate-100 text-slate-700",
      badgeText: "Info",
      subtext: "System status stable",
    },
  }[tone];

  return (
    <div className={cn(
      "min-w-0 rounded-xl border border-l-4 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between h-full",
      config.border,
      config.bg
    )}>
      <div>
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)} />
            <span className="block truncate text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
              {label}
            </span>
          </div>
          <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shrink-0", config.badge)}>
            {config.badgeText}
          </span>
        </div>
        <strong className="block truncate text-xl font-black tracking-tight text-slate-900 leading-none mt-0.5">
          {value}
        </strong>
      </div>
      <p className="mt-2 text-[9px] font-semibold text-slate-500 leading-tight">
        {config.subtext}
      </p>
    </div>
  );
}

function FilterTabs({ activeFilter, onChange, members }) {
  const options = [
    { id: "all", label: "All Members", predicate: () => true },
    { id: "critical", label: "Critical Risk", predicate: (m) => m.churnRisk === "High" || m.churnRisk === "Extreme" },
    { id: "today", label: "Expiring Today", predicate: (m) => m.daysRemaining === 0 },
    { id: "premium", label: "High Value", predicate: (m) => m.category === "Premium" },
  ];

  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-1" aria-label="Retention filters">
      <div className="flex min-h-9 flex-wrap gap-1">
        <span className="flex shrink-0 items-center gap-1.5 px-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Filter
        </span>
        {options.map((filter) => {
          const isActive = activeFilter === filter.id;
          const count = members.filter(filter.predicate).length;
          return (
            <button
              key={filter.id}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-black transition",
                isActive
                  ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:bg-white hover:text-slate-950"
              )}
              type="button"
              onClick={() => onChange(filter.id)}
            >
              {filter.label}
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BulkActionBar({ selectedCount, onClearSelection, onRenew, viewMode, setViewMode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg bg-slate-100/40 p-1 border border-slate-200/30">
          <button 
            onClick={() => setViewMode("grid")}
            className={cn("w-9 h-8 flex items-center justify-center rounded-md transition-all", viewMode === "grid" ? "bg-slate-950 text-white shadow-sm" : "text-slate-950 hover:text-slate-700")}
            title="Grid View"
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setViewMode("table")}
            className={cn("w-9 h-8 flex items-center justify-center rounded-md transition-all", viewMode === "table" ? "bg-slate-950 text-white shadow-sm" : "text-slate-950 hover:text-slate-700")}
            title="Table View"
          >
            <List size={18} />
          </button>
          <button 
            onClick={() => setViewMode("analytics")}
            className={cn("w-9 h-8 flex items-center justify-center rounded-md transition-all", viewMode === "analytics" ? "bg-slate-950 text-white shadow-sm" : "text-slate-950 hover:text-slate-700")}
            title="Analytics"
          >
            <BarChart3 size={18} />
          </button>
        </div>
        <div className="h-5 w-px bg-slate-300"></div>
        <span className="text-xs font-extrabold text-slate-800">
          {selectedCount > 0 ? `${selectedCount} selected` : "Global Actions"}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          type="button"
          disabled={!selectedCount}
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Bulk Reminder
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          disabled={!selectedCount}
          onClick={onRenew}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Bulk Renew
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          type="button"
          disabled={!selectedCount}
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Clear
        </button>
      </div>
    </div>
  );
}

function PriorityLane({ config, members, onProfile, onAction }) {
  const Icon = config.icon;
  return (
    <section className={cn("min-w-0 rounded-lg border p-3", config.lane)}>
      <header className="mb-3 flex min-h-12 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", config.iconWrap)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="m-0 text-sm font-black leading-tight text-slate-950">{config.title}</h2>
            <p className="m-0 truncate text-[11px] font-bold text-slate-500">{config.subtitle}</p>
          </div>
        </div>
        <strong className={cn("text-2xl font-black leading-none", config.count)}>{members.length}</strong>
      </header>

      <div className="grid items-start gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {members.map((m) => (
          <MemberCard
            key={m.id}
            member={m}
            onProfile={() => onProfile(m)}
            onAction={onAction}
          />
        ))}
      </div>
    </section>
  );
}

function MemberCard({ member, onProfile, onAction }) {
  const priority = getMemberPriority(member);
  
  const statusStyles = {
    "Not Contacted": "bg-slate-100 text-slate-600 border-slate-200/50",
    "Contacted": "bg-blue-50 text-blue-700 border-blue-100/80",
    "Interested": "bg-amber-50 text-amber-700 border-amber-100/80",
    "Renewed": "bg-emerald-50 text-emerald-700 border-emerald-100/80",
    "Lost": "bg-rose-50 text-rose-700 border-rose-100/80",
  };

  const priorityBorder = {
    danger: "border-l-rose-500",
    warning: "border-l-amber-500",
    healthy: "border-l-emerald-500",
  }[priority];

  const daysDanger = member.daysRemaining <= 3;
  const daysWarning = member.daysRemaining > 3 && member.daysRemaining <= 7;
  const daysColorClass = daysDanger 
    ? "text-rose-600 bg-rose-50/50 border-rose-100/70" 
    : daysWarning 
    ? "text-amber-600 bg-amber-50/50 border-amber-100/70" 
    : "text-slate-900 bg-slate-50/70 border-slate-100";

  const scoreSuccess = member.renewalProbability > 80;
  const scoreDanger = member.renewalProbability < 40;
  const scoreColorClass = scoreSuccess 
    ? "text-emerald-600 bg-emerald-50/50 border-emerald-100/70" 
    : scoreDanger 
    ? "text-rose-600 bg-rose-50/50 border-rose-100/70" 
    : "text-slate-900 bg-slate-50/70 border-slate-100";

  return (
    <article className={cn(
      "min-w-0 max-w-[340px] rounded-2xl border border-l-4 bg-white p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-[2px] duration-200 flex flex-col justify-between h-full border-slate-200/80", 
      priorityBorder
    )}>
      <div>
        {/* Header section */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 border-slate-100 bg-slate-50">
            <img 
              src={member.profilePhoto || (window.getDefaultAvatar ? window.getDefaultAvatar(member.gender, member.name) : "")} 
              alt={member.name} 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <h3 className="text-sm font-extrabold text-slate-950 truncate leading-none mb-0.5">{member.name}</h3>
              <button className="p-1 -mr-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors shrink-0">
                <MoreVertical size={14} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-mono font-bold text-slate-400 leading-none">{member.id}</span>
              <span className="text-[10px] text-slate-300">•</span>
              <StatusBadge className={statusStyles[member.status]} label={member.status} />
            </div>
          </div>
        </div>

        {/* Plan Information */}
        <div className="mt-3 flex items-center gap-1.5 bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-100">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Plan:</span>
          <span className="text-[11px] font-extrabold text-slate-700 truncate">{member.plan}</span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          {/* Expires In */}
          <div className={cn("rounded-xl border p-2 flex flex-col justify-between min-h-[52px]", daysColorClass)}>
            <span className="block text-[8px] font-black uppercase tracking-wider text-slate-450">Expires In</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xs font-black leading-none">{member.daysRemaining} Days</span>
            </div>
            <span className="block text-[8px] font-semibold text-slate-400 mt-0.5">{member.expiryDate}</span>
          </div>

          {/* Renewal Score */}
          <div className={cn("rounded-xl border p-2 flex flex-col justify-between min-h-[52px]", scoreColorClass)}>
            <span className="block text-[8px] font-black uppercase tracking-wider text-slate-450">Renewal Score</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xs font-black leading-none">{member.renewalProbability}%</span>
            </div>
            <div className="w-full bg-slate-200/50 h-1 rounded-full overflow-hidden mt-1">
              <div 
                className={cn(
                  "h-full rounded-full",
                  scoreSuccess ? "bg-emerald-500" : scoreDanger ? "bg-rose-500" : "bg-amber-500"
                )} 
                style={{ width: `${member.renewalProbability}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100">
        <button 
          onClick={() => onAction?.("renew", member)} 
          className="h-8 px-3 rounded-lg bg-slate-950 text-white text-[9px] font-black uppercase tracking-wider hover:bg-slate-800 transition-colors flex items-center gap-1.5"
        >
          <RotateCw size={10} /> Renew
        </button>
        <button 
          onClick={() => onAction?.("whatsapp", member)} 
          className="h-8 w-8 rounded-lg border border-slate-200/80 bg-white flex items-center justify-center text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
        >
          <MessageSquare size={13} />
        </button>
        <button 
          onClick={() => onAction?.("call", member)} 
          className="h-8 w-8 rounded-lg border border-slate-200/80 bg-white flex items-center justify-center text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all"
        >
          <Phone size={13} />
        </button>
        <button 
          onClick={onProfile} 
          className="h-8 px-2.5 rounded-lg border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider hover:bg-slate-50 hover:text-slate-900 transition-colors ml-auto"
        >
          Profile
        </button>
      </div>
    </article>
  );
}

function StatusBadge({ className, label }) {
  return (
    <mark className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider not-italic leading-none", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </mark>
  );
}

function MetricPill({ label, value, detail = "", danger = false, success = false, warning = false }) {
  const colorClass = danger 
    ? "border-rose-200 bg-rose-50 text-rose-700" 
    : success 
    ? "border-emerald-200 bg-emerald-50 text-emerald-700" 
    : warning
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : "border-slate-200 bg-slate-50 text-slate-950";

  const parts = colorClass.split(' ');
  const borderBg = parts.slice(0, 2).join(' ');
  const text = parts.slice(2).join(' ');

  return (
    <div className={cn("min-w-0 rounded-md border p-2", borderBg)}>
      <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <strong className={cn("mt-1 block truncate text-xs font-black", text)}>{value}</strong>
      {detail ? <small className="mt-1 block truncate text-[11px] font-bold text-slate-500">{detail}</small> : null}
    </div>
  );
}

// ─────────────────────────────────────────
// SHARED FORM COMPONENTS
// ─────────────────────────────────────────
function CustomSelect({ label, value, options, onChange, placeholder = "Select option..." }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 block">{label}</span>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-5 text-sm font-bold text-left flex items-center justify-between transition-all outline-none",
          isOpen ? "border-indigo-400 bg-white ring-4 ring-indigo-50" : "hover:border-slate-300"
        )}
      >
        <span className={cn(!value && "text-slate-400")}>{value || placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden py-2"
            >
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-5 py-3 text-sm font-bold text-left flex items-center justify-between transition-colors",
                    value === opt ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {opt}
                  {value === opt && <Check className="h-4 w-4" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────
// MODALS & DRAWERS
// ─────────────────────────────────────────
const MemberProfileDrawer = ({ isOpen, onClose, member, onAction }) => {
  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col">
        <header className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-950 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden bg-slate-800">
               <img src={member.profilePhoto || (window.getDefaultAvatar ? window.getDefaultAvatar(member.gender, member.name) : "")} alt="" />
            </div>
            <div>
              <h2 className="text-xl font-black">{member.name}</h2>
              <p className="text-xs font-semibold text-slate-400">{member.id} · {member.plan}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
            <X size={20} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-8">
           <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Retention Intelligence</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                    <span className="block text-[10px] font-black text-indigo-700 uppercase tracking-wider mb-1">Renewal Probability</span>
                    <strong className="text-2xl font-black text-indigo-900">{member.renewalProbability}%</strong>
                 </div>
                 <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
                    <span className="block text-[10px] font-black text-rose-700 uppercase tracking-wider mb-1">Churn Risk</span>
                    <strong className="text-2xl font-black text-rose-900">{member.churnRisk}</strong>
                 </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                 <Zap className="text-indigo-600" size={20} />
                 <p className="text-xs font-bold text-slate-700 leading-relaxed">
                    AI Suggestion: {member.renewalProbability < 50 ? "Member shows signs of engagement drop. Recommend a 1:1 trainer consultation." : "Loyal member. Highly likely to renew if offered an annual upgrade with a 10% loyalty bonus."}
                 </p>
              </div>
           </section>

           <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Activity & Financials</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="block text-[10px] font-black text-slate-400 uppercase">Last Attendance</span>
                  <span className="block text-sm font-bold text-slate-700">{member.lastAttendance}</span>
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] font-black text-slate-400 uppercase">Lifetime Value</span>
                  <span className="block text-sm font-bold text-slate-700">{currencyFormatter.format(member.lifetimeValue)}</span>
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] font-black text-slate-400 uppercase">Assigned Trainer</span>
                  <span className="block text-sm font-bold text-slate-700">{member.assignedTrainer}</span>
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] font-black text-slate-400 uppercase">Pending Dues</span>
                  <span className={cn("block text-sm font-bold", member.pendingDues > 0 ? "text-rose-600" : "text-emerald-600")}>
                    {currencyFormatter.format(member.pendingDues)}
                  </span>
                </div>
              </div>
           </section>

           <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Engagement History</h3>
              <div className="space-y-3">
                 {[
                   { date: "Yesterday", type: "WhatsApp", msg: "Expiry reminder sent." },
                   { date: "3 days ago", type: "Call", msg: "Member interested in Annual Plan." },
                   { date: "5 days ago", type: "Email", msg: "Loyalty offer delivered." },
                 ].map((h, i) => (
                   <div key={i} className="flex gap-4 items-start">
                      <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                         <span className="text-[10px] font-bold text-slate-500 uppercase">{h.date} · {h.type}</span>
                         <p className="text-xs font-semibold text-slate-700">{h.msg}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </section>
        </main>

        <footer className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3">
           <button onClick={() => { onClose(); onAction?.("renew", member); }} className="flex-1 h-11 rounded-xl bg-slate-950 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">Renew Membership</button>
           <button className="h-11 w-11 rounded-xl border border-slate-200 flex items-center justify-center text-emerald-600 hover:bg-white"><MessageSquare size={20} /></button>
           <button className="h-11 w-11 rounded-xl border border-slate-200 flex items-center justify-center text-blue-600 hover:bg-white"><Phone size={20} /></button>
        </footer>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────
// RENEWAL MODAL
// ─────────────────────────────────────────
const RenewalModal = ({ isOpen, onClose, member }) => {
  const [activeTab, setActiveTab] = useState(member ? "plan" : "member");
  const [selectedPlan, setSelectedPlan] = useState("Annual Elite Premium");

  if (!isOpen) return null;

  const tabs = [
    { id: "member", label: "Select Member", icon: Users },
    { id: "plan", label: "Select Plan", icon: Layers },
    { id: "pricing", label: "Pricing & Offer", icon: DollarSign },
    { id: "confirmation", label: "Finalize", icon: CheckCircle2 },
  ];

  return (
    <div className="fixed inset-0 z-[10001] flex items-end justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
        className="relative w-full max-w-4xl bg-white h-[82vh] shadow-2xl flex flex-col rounded-t-[32px] border-t border-white/20 overflow-hidden"
      >
        {/* Grabber Handle */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 rounded-full z-10" />

        <header className="px-6 pt-8 pb-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">Process Renewal</h2>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              {member ? `Secure recurring revenue for ${member.name} (${member.id}).` : "Select a member to renew their membership."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition-all"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-56 border-r border-slate-50 bg-slate-50/30 p-5">
            <nav className="space-y-1.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === tab.id
                      ? "bg-slate-950 text-white shadow-xl shadow-slate-200 translate-x-1"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 hover:translate-x-0.5"
                  )}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </nav>
            
            <div className="mt-10 p-4 rounded-2xl bg-emerald-50 border border-emerald-100/50">
               <Zap size={20} className="text-emerald-600 mb-2.5" />
               <p className="text-[9px] font-black text-emerald-900 uppercase tracking-widest leading-relaxed">
                  Loyalty Insight: {member ? `${member.name} has ${member.renewalProbability}% renewal probability.` : "Select a member to view insights."}
               </p>
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto p-8">
            <AnimatePresence mode="wait">
              {activeTab === "member" && (
                <motion.div
                  key="member"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="max-w-2xl space-y-6"
                >
                  <label className="block">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Search Member</span>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        defaultValue={member ? member.name : ""}
                        placeholder="Member Name, ID, or Phone"
                        className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                      />
                    </div>
                  </label>
                </motion.div>
              )}

              {activeTab === "plan" && (
                <motion.div
                  key="plan"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="max-w-2xl space-y-6"
                >
                   <CustomSelect
                      label="Select Membership Product"
                      value={selectedPlan}
                      options={["Annual Elite Premium", "Quarterly Transformation", "Monthly Starter", "Student Basic"]}
                      onChange={setSelectedPlan}
                   />
                   
                   <div className="p-6 rounded-[24px] bg-slate-50 border border-slate-200">
                      <h4 className="text-[9px] font-black text-slate-950 uppercase tracking-widest mb-4 flex items-center gap-2">
                         <Info size={14} /> Plan Benefits Preview
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                         {["All Branch Access", "24/7 Priority Entry", "12 PT Sessions", "Steam/Sauna Access"].map(b => (
                            <div key={b} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-100">
                               <CheckCircle2 size={12} className="text-emerald-500" />
                               <span className="text-[10px] font-bold text-slate-600">{b}</span>
                            </div>
                         ))}
                      </div>
                   </div>
                </motion.div>
              )}

              {activeTab === "pricing" && (
                 <motion.div key="pricing" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                    <div className="p-6 rounded-[24px] bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                       <div>
                          <span className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Retention Bonus Applied</span>
                          <span className="text-sm font-black text-emerald-900">Elite Loyalty Discount (10%)</span>
                       </div>
                       <div className="text-xl font-black text-emerald-700">-₹2,499</div>
                    </div>
                    
                    <div className="p-6 rounded-[24px] bg-slate-900 text-white shadow-2xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full -mr-12 -mt-12 blur-2xl" />
                       <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <DollarSign size={14} /> Renewal Calculation
                       </h4>
                       <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs">
                             <span className="font-bold text-slate-400">Standard Rate</span>
                             <span className="font-black text-white">₹24,999.00</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                             <span className="font-bold text-slate-400">GST (18%)</span>
                             <span className="font-black text-white">₹4,499.82</span>
                          </div>
                          <div className="h-px bg-white/10 my-3" />
                          <div className="flex justify-between items-center">
                             <span className="text-xs font-black uppercase tracking-widest">Grand Total</span>
                             <span className="text-2xl font-black text-indigo-400 tracking-tighter">₹26,999.82</span>
                          </div>
                       </div>
                    </div>
                 </motion.div>
              )}

              {activeTab === "confirmation" && (
                 <motion.div key="confirmation" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                    <div className="text-center py-10">
                       <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
                          <CheckCircle2 size={40} />
                       </div>
                       <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Ready to Finalize</h3>
                       <p className="text-sm font-bold text-slate-500 mt-2 max-w-sm mx-auto">
                          Processing this renewal will extend the membership validity and generate a production invoice.
                       </p>
                    </div>
                 </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        <footer className="px-8 py-6 border-t border-slate-100 bg-white flex justify-end gap-3.5 items-center">
          <button
            onClick={onClose}
            className="px-6 h-12 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button className="px-10 h-12 rounded-xl bg-slate-950 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-200 transition-all hover:bg-slate-800">
            Publish Renewal
          </button>
        </footer>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────
// RETENTION FUNNEL
// ─────────────────────────────────────────
function RetentionFunnel() {
  const stages = [
    { label: "Total Expiring", value: 42, color: "bg-slate-50 border-slate-200 text-slate-700" },
    { label: "Contacted", value: 28, color: "bg-blue-50/60 border-blue-150 text-blue-700" },
    { label: "Interested", value: 15, color: "bg-amber-50/60 border-amber-150 text-amber-700" },
    { label: "Renewed", value: 12, color: "bg-emerald-50/60 border-emerald-150 text-emerald-700" },
    { label: "Lost Members", value: 4, color: "bg-rose-50/60 border-rose-150 text-rose-700" },
  ];

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm -mt-2.5 mb-4">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Retention Pipeline</h3>
      <div className="flex items-center gap-1.5 h-16">
        {stages.map((stage, i) => (
          <div 
            key={i} 
            className={cn("relative flex-1 h-full flex flex-col items-center justify-center transition-all hover:scale-[1.01] border rounded-xl shadow-sm px-2 py-2.5", stage.color)}
            title={`${stage.label}: ${stage.value}`}
          >
            <span className="text-lg font-black leading-tight">{stage.value}</span>
            <span className="text-[9px] font-black uppercase tracking-wider opacity-75 mt-0.5">{stage.label}</span>
            {i < stages.length - 1 && (
               <ChevronRight size={14} className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-slate-350 bg-white rounded-full border border-slate-200 p-0.5 shadow-sm" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────
const ExpiringMembershipsPage = () => {
  const [viewMode, setViewMode] = useState("grid");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedMember, setSelectedMember] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRenewalOpen, setIsRenewalOpen] = useState(false);
  const [members, setMembers] = useState([]);

  const fetchDBMembers = useCallback(async () => {
    try {
      const dbMembers = await window.__TAURI__.core.invoke("get_members_command", { limit: 10000, offset: 0 }).catch(() => []);
      const dbPlans = await window.__TAURI__.core.invoke("get_plans_command").catch(() => []);
      
      const plansMap = {};
      if (dbPlans) {
        dbPlans.forEach(p => {
          plansMap[p.id] = p;
        });
      }

      const now = new Date();
      const mappedMembers = (dbMembers || [])
        .map(m => {
          if (!m.expires_at) return null;
          const expiry = new Date(m.expires_at);
          const diffTime = expiry - now;
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Only show those with <= 30 days remaining (or already expired)
          if (daysRemaining > 30) return null;

          const planObj = m.membership_plan_id ? plansMap[m.membership_plan_id] : null;
          const planName = planObj ? planObj.name : "General Membership";
          const planPrice = planObj ? planObj.price : 1500;
          
          // Try to extract category from plan description or notes
          let category = "General Fitness";
          if (planObj && planObj.description) {
            if (planObj.description.includes("||")) {
              const parts = planObj.description.split("||");
              category = parts[0] || "General Fitness";
            } else {
              category = planObj.description;
            }
          }

          // Calculate initials
          const initials = m.full_name
            ? m.full_name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
            : "M";

          let churnRisk = "Low";
          let status = "Renewed";
          let renewalProbability = 85;
          let color = "#10b981";

          if (daysRemaining <= 3) {
            churnRisk = "Extreme";
            status = "Not Contacted";
            renewalProbability = 15;
            color = "#ef4444";
          } else if (daysRemaining <= 10) {
            churnRisk = "High";
            status = "Contacted";
            renewalProbability = 42;
            color = "#f59e0b";
          } else if (daysRemaining <= 20) {
            churnRisk = "Medium";
            status = "Interested";
            renewalProbability = 78;
            color = "#3b82f6";
          }

          // Extract trainer from notes or defaults
          let assignedTrainer = "None";
          if (m.notes && m.notes.includes("Trainer:")) {
            const matches = m.notes.match(/Trainer:\s*([^|]+)/);
            if (matches && matches[1]) assignedTrainer = matches[1].trim();
          }

          return {
            id: m.member_code || `GD-${m.id.substring(0,4).toUpperCase()}`,
            name: m.full_name,
            initials,
            plan: planName,
            category,
            expiryDate: expiry.toISOString().split("T")[0],
            daysRemaining,
            renewalProbability,
            churnRisk,
            lastAttendance: "Yesterday",
            pendingDues: 0,
            lifetimeValue: planPrice,
            assignedTrainer,
            lastContacted: "Never",
            status,
            color,
            gender: m.gender || "Male",
            profilePhoto: m.profile_photo_path || null
          };
        })
        .filter(Boolean);

      setMembers(mappedMembers);
    } catch (err) {
      console.error("GymDeck: Failed to load members from Tauri DB:", err);
    }
  }, []);

  useEffect(() => {
    fetchDBMembers();
  }, [fetchDBMembers]);

  const stats = useMemo(() => ({
    totalExpiring: members.length,
    expiringToday: members.filter(m => m.daysRemaining === 0).length,
    revenueAtRisk: members.reduce((acc, m) => acc + (m.pendingDues || 5000), 0),
    avgRenewalProb: members.length ? Math.round(members.reduce((acc, m) => acc + m.renewalProbability, 0) / members.length) : 0,
  }), [members]);

  const filteredMembers = useMemo(() => {
    const lowQuery = query.toLowerCase();
    return members.filter(m => {
      const matchesQuery = !query || m.name.toLowerCase().includes(lowQuery) || m.id.toLowerCase().includes(lowQuery);
      if (!matchesQuery) return false;
      if (activeFilter === "critical") return m.churnRisk === "High" || m.churnRisk === "Extreme";
      if (activeFilter === "today") return m.daysRemaining === 0;
      if (activeFilter === "premium") return m.category === "Premium";
      return true;
    });
  }, [members, query, activeFilter]);

  const groupedMembers = useMemo(() => {
    return filteredMembers.reduce((groups, m) => {
      const p = getMemberPriority(m);
      if (groups[p]) groups[p].push(m);
      return groups;
    }, { danger: [], warning: [], healthy: [] });
  }, [filteredMembers]);

  const handleAction = useCallback((type, member) => {
    if (type === "renew") {
       setSelectedMember(member);
       setIsRenewalOpen(true);
    }
  }, []);

  const openProfile = useCallback((member) => {
     setSelectedMember(member);
     setIsDrawerOpen(true);
  }, []);

  const resetView = useCallback(() => {
    setQuery("");
    setActiveFilter("all");
  }, []);

  const openRenewalModal = useCallback(() => setIsRenewalOpen(true), []);
  const closeRenewalModal = useCallback(() => setIsRenewalOpen(false), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  return (
    <div className="expiring-memberships-shell font-sans text-slate-950">
      <div className="expiring-memberships-workspace">
        <DashboardHeader 
          title="Retention Command Center" 
          description="Monitor upcoming expiries, recover revenue, automate renewals, and reduce membership churn across your fitness ecosystem."
          stats={stats}
          onRenew={openRenewalModal}
        />

        <section className="expiring-memberships-workspace-sticky-header">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_max-content]">
            <label className="relative block min-w-0" htmlFor="retention-search-main">
              <Search 
                size={16} 
                className="pointer-events-none absolute left-4 text-slate-400" 
                style={{ top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                id="retention-search-main"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-xs font-semibold text-slate-900 outline-none transition focus:border-slate-450 focus:bg-white focus:ring-4 focus:ring-slate-100"
                placeholder="Quick search expiring members..."
                type="search"
              />
            </label>
            <div className="flex gap-2">
              <button className="h-11 px-4 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors flex items-center gap-2 border border-emerald-100 shadow-sm">
                <Zap size={14} />
                AI Insights
              </button>
              <button className="h-11 px-4 rounded-xl bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm">
                Revenue Forecast
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3.5 mt-3.5">
            {/* Left Side: View Mode switcher */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-[0.14em] leading-none font-sans">
                View
              </span>
              <div className="flex rounded-xl bg-slate-50/60 p-1 gap-1 border border-slate-200/30">
                <button 
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "w-9 h-8 flex items-center justify-center rounded-lg transition-all", 
                    viewMode === "grid" ? "bg-slate-950 text-white shadow-sm" : "text-slate-950 hover:text-slate-700"
                  )}
                  title="Grid View"
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "w-9 h-8 flex items-center justify-center rounded-lg transition-all", 
                    viewMode === "table" ? "bg-slate-950 text-white shadow-sm" : "text-slate-950 hover:text-slate-700"
                  )}
                  title="Table View"
                >
                  <List size={18} />
                </button>
                <button 
                  onClick={() => setViewMode("analytics")}
                  className={cn(
                    "w-9 h-8 flex items-center justify-center rounded-lg transition-all", 
                    viewMode === "analytics" ? "bg-slate-950 text-white shadow-sm" : "text-slate-950 hover:text-slate-700"
                  )}
                  title="Analytics"
                >
                  <BarChart3 size={18} />
                </button>
              </div>
            </div>

            {/* Right Side: Filter Tabs Pills */}
            <div className="flex flex-wrap items-center gap-1.5" aria-label="Retention filters">
              <span className="flex shrink-0 items-center gap-1.5 px-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-450">
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                Filter
              </span>
              {[
                { id: "all", label: "All Members", predicate: () => true },
                { id: "critical", label: "Critical Risk", predicate: (m) => m.churnRisk === "High" || m.churnRisk === "Extreme" },
                { id: "today", label: "Expiring Today", predicate: (m) => m.daysRemaining === 0 },
                { id: "premium", label: "High Value", predicate: (m) => m.category === "Premium" },
              ].map((filter) => {
                const isActive = activeFilter === filter.id;
                const count = members.filter(filter.predicate).length;
                return (
                  <button
                    key={filter.id}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-4 text-[10px] font-black uppercase tracking-wider transition-all",
                      isActive
                        ? "bg-slate-950 text-white shadow-md animate-fadeIn"
                        : "bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    )}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                  >
                    {filter.label}
                    <span className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-black font-mono",
                      isActive ? "bg-white/20 text-white" : "bg-slate-200/60 text-slate-500"
                    )}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <RetentionFunnel />

        <section className="pt-2">
          {viewMode === "grid" && (
            <div className="grid gap-4">
              {Object.entries(laneConfig).map(([p, config]) => groupedMembers[p]?.length > 0 && (
                <PriorityLane
                  key={p}
                  config={config}
                  members={groupedMembers[p]}
                  onProfile={openProfile}
                  onAction={handleAction}
                />
              ))}
              
              {!filteredMembers.length && (
                <div className="grid min-h-[260px] place-items-center rounded-lg border border-dashed border-slate-300 bg-white/80 p-8 text-center">
                  <div>
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-slate-500">
                      <Search className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h2 className="mt-4 text-lg font-black text-slate-950">No records match this view</h2>
                    <button onClick={resetView} className="mt-4 inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-slate-300 hover:text-slate-950">Reset view</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {isDrawerOpen && <MemberProfileDrawer isOpen={isDrawerOpen} onClose={closeDrawer} member={selectedMember} onAction={handleAction} />}
        {isRenewalOpen && <RenewalModal isOpen={isRenewalOpen} onClose={closeRenewalModal} member={selectedMember} />}
      </AnimatePresence>
    </div>
  );
};

import { ErrorBoundary } from "./ErrorHandlers.jsx";

export function mountExpiringMemberships() {
  const stage = document.querySelector('[data-stage="expiring-memberships"]');
  if (!stage) return null;
  const rootElement = document.createElement("div");
  rootElement.dataset.expiringMembershipsReactRoot = "";
  rootElement.className = "min-h-full";
  stage.replaceChildren(rootElement);
  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <><ExpiringMembershipsPage /><BrandFooter /></>
      </ErrorBoundary>
    );
    return root;
  } catch (err) {
    console.error("Failed to render Expiring Memberships:", err);
    return null;
  }
}

export default ExpiringMembershipsPage;
