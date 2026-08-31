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
  ChevronLeft,
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
  User,
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
    "Not Contacted": "bg-slate-100 text-slate-600 border-slate-200/60",
    "Contacted": "bg-blue-50 text-blue-700 border-blue-100/90",
    "Interested": "bg-amber-50 text-amber-700 border-amber-100/90",
    "Renewed": "bg-emerald-50 text-emerald-700 border-emerald-100/90",
    "Expired": "bg-rose-50 text-rose-700 border-rose-100/90",
    "Lost": "bg-rose-50 text-rose-700 border-rose-100/90",
  };

  const priorityBorder = {
    danger: "border-l-rose-500",
    warning: "border-l-amber-500",
    healthy: "border-l-emerald-500",
  }[priority];

  const daysDanger = member.daysRemaining <= 3;
  const daysWarning = member.daysRemaining > 3 && member.daysRemaining <= 7;
  const daysColorClass = daysDanger 
    ? "text-rose-700 bg-rose-50/70 border-rose-200" 
    : daysWarning 
    ? "text-amber-700 bg-amber-50/70 border-amber-200" 
    : "text-slate-900 bg-slate-50 border-slate-200/90";

  const scoreSuccess = member.renewalProbability > 80;
  const scoreDanger = member.renewalProbability < 40;
  const scoreColorClass = scoreSuccess 
    ? "text-emerald-700 bg-emerald-50/70 border-emerald-200" 
    : scoreDanger 
    ? "text-rose-700 bg-rose-50/70 border-rose-200" 
    : "text-slate-900 bg-slate-50 border-slate-200/90";

  return (
    <article className={cn(
      "w-full rounded-2xl border border-l-4 bg-white px-5 py-6 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between h-full border-slate-200/90 relative overflow-hidden group hover:-translate-y-1", 
      priorityBorder
    )}>
      <div>
        {/* Header section with generous inner side padding & balanced alignment */}
        <div className="flex items-start justify-between gap-3.5">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 border-slate-100 bg-slate-50 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <img 
                src={member.profilePhoto || (window.getDefaultAvatar ? window.getDefaultAvatar(member.gender, member.name) : "")} 
                alt={member.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-slate-950 truncate leading-snug tracking-tight">{member.name}</h3>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 leading-none">{member.id}</span>
                <span className="text-[10px] text-slate-300">•</span>
                <StatusBadge className={statusStyles[member.status] || statusStyles["Not Contacted"]} label={member.status} />
              </div>
            </div>
          </div>

          {/* Options 3-dots button */}
          <button 
            className="w-8 h-8 rounded-xl border border-slate-200/90 bg-slate-100/90 text-slate-600 shadow-sm hover:bg-slate-950 hover:text-white hover:border-slate-950 hover:shadow-md active:scale-90 active:bg-slate-800 transition-all flex items-center justify-center shrink-0"
            title="Options"
          >
            <MoreVertical size={15} />
          </button>
        </div>

        {/* Plan Information with roomy side padding */}
        <div className="mt-4 flex items-center justify-between gap-2 bg-slate-50/90 px-3.5 py-2.5 rounded-xl border border-slate-200/70">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono shrink-0">PLAN</span>
            <span className="text-[11px] font-black text-slate-800 truncate">{member.plan}</span>
          </div>
          <span className="text-[9px] font-mono font-bold text-slate-400 shrink-0 uppercase tracking-wider">{member.category}</span>
        </div>

        {/* Metrics Grid with balanced side padding & spacing */}
        <div className="grid grid-cols-2 gap-3 mt-3.5">
          {/* Expires In */}
          <div className={cn("rounded-xl border px-3.5 py-3 flex flex-col justify-between min-h-[62px] transition-colors", daysColorClass)}>
            <span className="block text-[8px] font-black uppercase tracking-widest text-slate-450 font-mono">Expires In</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-sm font-black leading-none">{member.daysRemaining} Days</span>
            </div>
            <span className="block text-[9px] font-mono font-bold text-slate-400 mt-1">{member.expiryDate}</span>
          </div>

          {/* Renewal Score */}
          <div className={cn("rounded-xl border px-3.5 py-3 flex flex-col justify-between min-h-[62px] transition-colors", scoreColorClass)}>
            <span className="block text-[8px] font-black uppercase tracking-widest text-slate-450 font-mono">Renewal Score</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-sm font-black leading-none">{member.renewalProbability}%</span>
            </div>
            <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  scoreSuccess ? "bg-emerald-500" : scoreDanger ? "bg-rose-500" : "bg-amber-500"
                )} 
                style={{ width: `${member.renewalProbability}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100">
        {/* RENEW BUTTON */}
        <button 
          onClick={() => onAction?.("renew", member)} 
          className="h-9 px-4 rounded-xl bg-slate-950 text-white border border-slate-950 text-[10px] font-black uppercase tracking-wider shadow-sm hover:bg-indigo-600 hover:border-indigo-600 hover:shadow-indigo-500/20 hover:shadow-md active:scale-[0.95] active:bg-indigo-700 active:border-indigo-700 transition-all flex items-center gap-1.5"
          title="Renew Membership"
        >
          <RotateCw size={11} /> Renew
        </button>

        {/* CALL BUTTON - Native tel: link for macOS FaceTime / Phone Relay dialer */}
        <a 
          href={`tel:${(member.phone || "+919876543210").replace(/[^0-9+]/g, '')}`}
          onClick={(e) => {
            e.stopPropagation();
            onAction?.("call", member);
          }}
          className="h-9 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-blue-600 shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-blue-500/20 hover:shadow-md active:scale-[0.93] active:bg-blue-700 active:border-blue-700 transition-all flex items-center gap-1.5 shrink-0 text-[10px] font-black uppercase tracking-wider"
          title={`Call ${member.name} (${member.phone || "+91 98765 43210"})`}
        >
          <Phone size={14} /> Call
        </a>

        {/* PROFILE BUTTON */}
        <button 
          onClick={onProfile} 
          className="h-9 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-wider shadow-sm hover:bg-slate-950 hover:text-white hover:border-slate-950 hover:shadow-slate-950/20 hover:shadow-md active:scale-[0.95] active:bg-slate-800 active:border-slate-800 transition-all ml-auto"
          title="View Member Profile"
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
// ─────────────────────────────────────────
// RENEWAL MODAL (Redesigned matching Add Member Modal design system)
// ─────────────────────────────────────────
const RenewalModal = ({ isOpen, onClose, member: initialMember, membersList = [] }) => {
  const [activeStep, setActiveStep] = useState(1);
  const [activeMember, setActiveMember] = useState(initialMember || null);
  const [searchMember, setSearchMember] = useState("");
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("annual_elite");
  const [startDate, setStartDate] = useState(
    initialMember?.expiryDate || new Date().toISOString().split("T")[0]
  );
  const [selectedAddons, setSelectedAddons] = useState(["pt_pass"]);
  const [customDiscount, setCustomDiscount] = useState(10); // percentage
  const [applyLoyaltyBonus, setApplyLoyaltyBonus] = useState(true);
  const [includeGst, setIncludeGst] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [txnRef, setTxnRef] = useState("UPI-88492019482");
  const [sendWhatsapp, setSendWhatsapp] = useState(true);
  const [sendSms, setSendSms] = useState(true);
  const [notes, setNotes] = useState("Member requested annual renewal with loyalty retention offer.");
  const [isSuccess, setIsSuccess] = useState(false);

  const [selectedCoach, setSelectedCoach] = useState(initialMember?.pt || "Unassigned");
  const [isCoachDropdownOpen, setIsCoachDropdownOpen] = useState(false);

  useEffect(() => {
    setActiveMember(initialMember || null);
    if (initialMember?.expiryDate) {
      setStartDate(initialMember.expiryDate);
    }
    setSelectedCoach(initialMember?.pt || "Unassigned");
  }, [initialMember]);

  const coachesList = useMemo(
    () => [
      {
        id: "c5",
        name: "Unassigned",
        role: "No Personal Trainer Assigned",
        specialty: "Self Guided Workout Access",
        exp: "-",
        badge: "Default",
        badgeColor: "bg-slate-100 text-slate-500 border-slate-200",
      },
      {
        id: "c1",
        name: "Rohan V.",
        role: "Senior Fitness Trainer",
        specialty: "Body Building & Retention",
        exp: "6+ Yrs",
        badge: "Available",
        badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
      },
      {
        id: "c2",
        name: "Priya M.",
        role: "Strength & Conditioning Specialist",
        specialty: "Powerlifting & Nutrition",
        exp: "4+ Yrs",
        badge: "Top Rated",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      },
      {
        id: "c3",
        name: "Vikram S.",
        role: "Cardio & HIIT Coach",
        specialty: "Fat Loss & Endurance",
        exp: "5+ Yrs",
        badge: "Popular",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      },
      {
        id: "c4",
        name: "Ananya K.",
        role: "Yoga & Recovery Specialist",
        specialty: "Mobility & Rehab",
        exp: "3+ Yrs",
        badge: "Available",
        badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
      },
    ],
    []
  );

  const activeCoachObj = useMemo(() => {
    return (
      coachesList.find(
        (c) =>
          c.name.toLowerCase() === selectedCoach.toLowerCase() ||
          selectedCoach.toLowerCase().includes(c.name.toLowerCase())
      ) || coachesList[0]
    );
  }, [coachesList, selectedCoach]);

  const defaultSearchMembers = useMemo(
    () => [
      {
        id: "MEM-9081",
        name: "Aarav Sharma",
        phone: "+91 98765 43210",
        email: "aarav.sharma@example.com",
        plan: "Quarterly Pro",
        expiryDate: "2026-07-24",
        daysRemaining: 4,
        status: "Expiring Soon",
        renewalProbability: 85,
        branch: "Downtown Branch",
        pt: "Rohan V.",
      },
      {
        id: "MEM-9082",
        name: "Rohan Verma",
        phone: "+91 98765 43211",
        email: "rohan.v@example.com",
        plan: "Annual Elite",
        expiryDate: "2026-07-28",
        daysRemaining: 8,
        status: "Expiring Soon",
        renewalProbability: 92,
        branch: "Downtown Branch",
        pt: "Priya M.",
      },
      {
        id: "MEM-9083",
        name: "Ananya Roy",
        phone: "+91 98765 43212",
        email: "ananya.r@example.com",
        plan: "Monthly Basic",
        expiryDate: "2026-07-22",
        daysRemaining: 2,
        status: "Urgent Expiry",
        renewalProbability: 45,
        branch: "Downtown Branch",
        pt: "Vikram S.",
      },
      {
        id: "MEM-9084",
        name: "Priya Patel",
        phone: "+91 98765 43213",
        email: "priya.p@example.com",
        plan: "Half-Yearly Flex",
        expiryDate: "2026-08-01",
        daysRemaining: 12,
        status: "Upcoming Expiry",
        renewalProbability: 78,
        branch: "Downtown Branch",
        pt: "Rohan V.",
      },
      {
        id: "MEM-9085",
        name: "Vikram Singh",
        phone: "+91 98765 43214",
        email: "vikram.s@example.com",
        plan: "Annual Elite",
        expiryDate: "2026-07-20",
        daysRemaining: 0,
        status: "Expired",
        renewalProbability: 60,
        branch: "Downtown Branch",
        pt: "Priya M.",
      },
    ],
    []
  );

  const searchableMembers = useMemo(() => {
    if (membersList && membersList.length > 0) return membersList;
    return defaultSearchMembers;
  }, [membersList, defaultSearchMembers]);

  const searchResults = useMemo(() => {
    if (!searchMember.trim()) return searchableMembers.slice(0, 5);
    const q = searchMember.toLowerCase();
    return searchableMembers
      .filter(
        (m) =>
          m.name?.toLowerCase().includes(q) ||
          m.id?.toLowerCase().includes(q) ||
          m.phone?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [searchMember, searchableMembers]);

  const plans = [
    {
      id: "annual_elite",
      name: "Annual Elite Premium",
      durationMonths: 12,
      price: 24999,
      badge: "Best Value (AI Pick)",
      badgeColor: "bg-emerald-500 text-white",
      benefits: ["All Branch Access", "12 Free PT Sessions", "Unlimited Sauna & Steam", "Priority Locker Access"],
    },
    {
      id: "quarterly_pro",
      name: "Quarterly Transformation",
      durationMonths: 3,
      price: 8500,
      badge: "Popular",
      badgeColor: "bg-indigo-500 text-white",
      benefits: ["Single Branch Access", "2 Free PT Sessions", "Standard Locker Access", "App Workout Tracker"],
    },
    {
      id: "monthly_starter",
      name: "Monthly Starter",
      durationMonths: 1,
      price: 3200,
      badge: "Short Term",
      badgeColor: "bg-slate-600 text-white",
      benefits: ["Single Branch Access", "Standard Gym Access", "Basic Fitness Assessment"],
    },
  ];

  const currentPlanObj = plans.find((p) => p.id === selectedPlanId) || plans[0];

  // Calculate Expiry Date based on duration
  const calculateNewExpiry = (startStr, months) => {
    try {
      const d = new Date(startStr);
      d.setMonth(d.getMonth() + months);
      return d.toISOString().split("T")[0];
    } catch {
      return "2027-07-24";
    }
  };

  const newExpiryDate = calculateNewExpiry(startDate, currentPlanObj.durationMonths);

  // Addons list
  const availableAddons = [
    { id: "pt_pass", name: "10-Session PT Attachment Pass", price: 4000, icon: Users },
    { id: "sauna_pass", name: "Recovery & Unlimited Sauna Pass", price: 1500, icon: Zap },
    { id: "nutrition_pass", name: "Custom Nutrition Plan Consult", price: 999, icon: CheckCircle2 },
  ];

  const toggleAddon = (addonId) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  // Pricing calculations
  const basePrice = currentPlanObj.price;
  const addonsTotal = selectedAddons.reduce((sum, id) => {
    const addon = availableAddons.find((a) => a.id === id);
    return sum + (addon ? addon.price : 0);
  }, 0);

  const subtotalBeforeDiscount = basePrice + addonsTotal;

  // Discount
  const discountRate = applyLoyaltyBonus ? Math.max(customDiscount, 10) : customDiscount;
  const discountAmount = Math.round((subtotalBeforeDiscount * discountRate) / 100);
  const netBeforeTax = subtotalBeforeDiscount - discountAmount;

  // GST 18%
  const gstAmount = includeGst ? Math.round(netBeforeTax * 0.18) : 0;
  const grandTotal = netBeforeTax + gstAmount;

  const steps = [
    { num: 1, label: "Member Profile", kicker: "STEP 1", icon: Users },
    { num: 2, label: "Renewal Plan", kicker: "STEP 2", icon: Layers },
    { num: 3, label: "Pricing & Payment", kicker: "STEP 3", icon: CreditCard },
    { num: 4, label: "Review & Issue", kicker: "STEP 4", icon: CheckCircle2 },
  ];

  const [isSearchError, setIsSearchError] = useState(false);

  const handleNext = () => {
    if (activeStep === 1 && !activeMember) {
      setIsSearchError(true);
      setTimeout(() => {
        setIsSearchError(false);
      }, 1000);
      return;
    }
    if (activeStep < 4) {
      setActiveStep((prev) => prev + 1);
    } else {
      setIsSuccess(true);
    }
  };

  const handleBack = () => {
    if (activeStep > 1) {
      setActiveStep((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-end justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onClick={onClose}
        className="absolute inset-0"
        style={{
          background: "rgba(4, 6, 12, 0.72)",
          backdropFilter: "blur(12px) saturate(1.2)",
          WebkitBackdropFilter: "blur(12px) saturate(1.2)",
        }}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%", transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-5xl h-[92vh] sm:h-[88vh] max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-[28px] sm:rounded-t-[32px] rounded-b-none border-t border-white/90 overflow-hidden z-10"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(255, 255, 255, 0.56), transparent 24%), linear-gradient(160deg, rgba(255, 255, 255, 0.99), rgba(243, 247, 255, 0.97))",
          boxShadow: "0 -20px 80px rgba(26, 36, 60, 0.18)",
        }}
      >
        {/* Grabber Handle */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 rounded-full z-20" />

        {/* Repositioned Cross Button at top-right corner */}
        <button
          onClick={onClose}
          className="member-modal-close-btn !absolute !top-3.5 sm:!top-4 !right-3.5 sm:!right-5 z-30 hover:!bg-slate-950 hover:!text-white hover:!border-slate-900 shadow-sm"
          type="button"
          aria-label="Close modal"
          title="Close Modal"
        >
          <X size={20} strokeWidth={2.5} />
        </button>

        {/* Modal Header with Premium Typography */}
        <header className="px-4 sm:px-6 pt-2 sm:pt-2.5 pb-1.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50 flex justify-between items-center relative z-10 pr-14 sm:pr-16">
          <div className="space-y-0.5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Process Member Renewal
            </h2>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 leading-normal max-w-2xl">
              Extend membership access, configure plan validity, apply AI retention discounts, and issue tax invoices.
            </p>
          </div>
        </header>

        {/* Step Progress Bar Header - Balanced Non-Clickable Stepper Strip */}
        <div className="px-6 py-1.5 sm:py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-start sm:justify-between gap-3 overflow-x-auto scrollbar-none select-none">
          {steps.map((step) => {
            const isActive = activeStep === step.num;
            const isCompleted = activeStep > step.num;
            return (
              <div
                key={step.num}
                className={cn(
                  "flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 min-w-max cursor-default",
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black scale-[1.01]"
                    : isCompleted
                    ? "bg-slate-800 text-emerald-400"
                    : "bg-slate-800/40 text-slate-400"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black",
                    isActive
                      ? "bg-white text-indigo-700 shadow-sm"
                      : isCompleted
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-700 text-slate-400"
                  )}
                >
                  {isCompleted ? <Check size={13} /> : step.num}
                </div>
                <div className="text-left">
                  <span className="block text-[8px] uppercase tracking-widest font-mono opacity-70 leading-none mb-0.5">
                    {step.kicker}
                  </span>
                  <span className="text-xs font-bold leading-tight">{step.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Main Content Container */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50/40">
          {isSuccess ? (
            /* SUCCESS CONFIRMATION STATE */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex flex-col items-center justify-center text-center py-8 max-w-lg mx-auto"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-4 border-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-600/10">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Renewal Successfully Published!</h3>
              <p className="text-xs font-semibold text-slate-600 mt-1.5 leading-relaxed">
                Membership for <strong className="text-slate-900">{activeMember?.name || "Member"}</strong> has been extended until{" "}
                <strong className="text-indigo-600">{newExpiryDate}</strong>.
              </p>

              <div className="mt-4 p-3.5 rounded-xl bg-white border border-slate-200 w-full text-left space-y-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Plan:</span>
                  <span className="font-bold text-slate-900">{currentPlanObj.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Grand Total:</span>
                  <span className="font-black text-emerald-600">₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Mode:</span>
                  <span className="font-bold uppercase text-slate-900">{paymentMethod}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="mt-6 px-8 h-10 rounded-xl bg-slate-950 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all"
              >
                Close & Return to Dashboard
              </button>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {/* STEP 1: MEMBER PROFILE & STATUS (2-Column Layout) */}
              {activeStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1, ease: "easeOut" }}
                  className="max-w-4xl mx-auto"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                    {/* LEFT COLUMN: Fixed-Height Obsidian Member Profile & Metrics Card */}
                    <div
                      className="lg:col-span-5 p-4 sm:p-5 rounded-2xl text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-[400px] min-h-[400px] max-h-[400px]"
                      style={{
                        background: "linear-gradient(155deg, #090d16 0%, #05070d 100%)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        boxShadow: "0 16px 32px -8px rgba(4, 6, 12, 0.5)",
                      }}
                    >
                      <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/15 rounded-full -mr-12 -mt-12 blur-2xl pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full -ml-10 -mb-10 blur-2xl pointer-events-none" />

                      {activeMember ? (
                        <>
                          {/* Close / Deselect Member Button Box on Top-Right Corner of Card */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMember(null);
                              setSearchMember("");
                            }}
                            className="absolute top-3 right-3 z-30 w-7 h-7 rounded-lg bg-white/10 hover:bg-rose-500/20 border border-white/15 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 group"
                            title="Clear selected member"
                            aria-label="Clear selected member"
                          >
                            <X size={14} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-200" />
                          </button>

                          <div className="relative z-10 space-y-2.5 pr-6">
                            {/* Member Avatar & Status Header */}
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center text-lg font-black shadow-md shadow-indigo-500/30 border border-white/20 shrink-0">
                                {activeMember.name?.charAt(0)}
                              </div>
                              <div className="space-y-0.5 overflow-hidden">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[8.5px] font-black uppercase tracking-wider border border-emerald-500/30">
                                    {activeMember.status || "Active Member"}
                                  </span>
                                </div>
                                <h3 className="text-base font-black text-white tracking-tight truncate">{activeMember.name}</h3>
                              </div>
                            </div>

                            {/* Structured Key-Value Metric Rows */}
                            <div className="pt-2 border-t border-white/10 space-y-1.5 text-xs text-slate-300">
                              <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                                <span className="text-slate-400 text-[10.5px] font-semibold">Member ID</span>
                                <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[9.5px] font-bold border border-white/10">
                                  {activeMember.id}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                                <span className="text-slate-400 text-[10.5px] font-semibold">Primary Contact</span>
                                <strong className="text-slate-200 text-[10.5px] font-bold">{activeMember.phone}</strong>
                              </div>
                              <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                                <span className="text-slate-400 text-[10.5px] font-semibold">Home Branch</span>
                                <strong className="text-slate-200 text-[10.5px] font-bold">{activeMember.branch || "Downtown Branch"}</strong>
                              </div>
                              <div className="flex justify-between items-center py-0.5 border-b border-white/5">
                                <span className="text-slate-400 text-[10.5px] font-semibold">Membership Tenure</span>
                                <strong className="text-slate-200 text-[10.5px] font-bold">2.4 Years (Active)</strong>
                              </div>
                              <div className="flex justify-between items-center py-0.5">
                                <span className="text-slate-400 text-[10.5px] font-semibold">Current Expiry</span>
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[9.5px] border border-amber-500/30">
                                  {activeMember.expiryDate || "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Renewal Conversion Index Box */}
                          <div
                            className="relative z-10 p-2.5 rounded-xl space-y-1.5"
                            style={{
                              background: "rgba(255, 255, 255, 0.04)",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[8.5px] font-black uppercase tracking-widest text-indigo-300 font-mono">
                                Renewal Conversion Index
                              </span>
                              <div className="text-sm font-black text-emerald-400 flex items-center gap-1">
                                <Zap size={13} className="fill-emerald-400" />
                                <span>{activeMember.renewalProbability || 85}%</span>
                              </div>
                            </div>

                            {/* Visual Progress Meter Bar */}
                            <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden border border-white/10 p-0.5">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-500 shadow-sm"
                                style={{ width: `${activeMember.renewalProbability || 85}%` }}
                              />
                            </div>

                            <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-semibold text-emerald-300 leading-snug flex items-start gap-1.5">
                              <ShieldCheck size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                              <span>High attendance logged. Recommended for 10% loyalty retention bonus upgrade.</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Blank / Empty State Card with Large Profile Icon */
                        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
                          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 shadow-inner group">
                            <User size={44} className="text-slate-400/90 stroke-[1.5]" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm sm:text-base font-black text-slate-200 tracking-tight">No Member Selected</h4>
                            <p className="text-[11px] font-medium text-slate-400 max-w-[210px] mx-auto leading-relaxed">
                              Search and select a member from the search bar on the right to view details.
                            </p>
                          </div>
                          <div className="pt-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                              <Search size={12} /> Search Member Above
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN: Other Form Fields */}
                    <div className="lg:col-span-7 space-y-3">
                      {/* Search / Switch Member */}
                      <motion.div
                        animate={isSearchError ? { x: [0, -6, 6, -6, 6, -3, 3, 0] } : { x: 0 }}
                        transition={{ duration: 0.35, ease: "easeInOut" }}
                        className={cn(
                          "p-3 rounded-xl bg-white border transition-all duration-300 shadow-sm space-y-1.5 relative z-40",
                          isSearchError
                            ? "border-rose-400/70 bg-rose-50/20 ring-2 ring-rose-500/10"
                            : "border-slate-200/80"
                        )}
                      >
                        <label className="block text-[10.5px] font-black text-slate-700 uppercase tracking-wider">
                          Search & Select Member {!activeMember && <span className="text-rose-500 font-bold">*</span>}
                        </label>

                        <div className="relative">
                          <div className="relative flex items-center">
                            <Search className="absolute left-2.5 text-slate-400 pointer-events-none" size={13} />
                            <input
                              type="text"
                              value={searchMember}
                              onChange={(e) => {
                                setSearchMember(e.target.value);
                                setIsSearchDropdownOpen(true);
                              }}
                              onFocus={() => setIsSearchDropdownOpen(true)}
                              placeholder="Search by Name, Member ID, or Phone..."
                              className={cn(
                                "w-full h-8 pl-8 pr-7 border bg-slate-50/50 text-xs font-bold outline-none transition-all duration-300",
                                isSearchError
                                  ? "border-rose-400/80 bg-rose-50/40 text-rose-900 rounded-lg placeholder:text-rose-400/70"
                                  : isSearchDropdownOpen
                                  ? "rounded-t-lg rounded-b-none border-indigo-500 bg-white ring-2 ring-indigo-500/10 text-slate-900"
                                  : "rounded-lg border-slate-200 text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                              )}
                            />
                            {searchMember && (
                              <button
                                type="button"
                                onClick={() => setSearchMember("")}
                                className="absolute right-2 text-slate-400 hover:text-slate-600"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>

                          {/* Compact Attached Search Dropdown Menu */}
                          {isSearchDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsSearchDropdownOpen(false)}
                              />
                              <div className="absolute left-0 right-0 top-full -mt-px bg-white rounded-b-xl border border-indigo-500 shadow-xl shadow-slate-950/15 z-50 max-h-52 overflow-y-auto p-1 space-y-0.5">
                                {/* Header Strip */}
                                <div className="px-2 py-1 flex items-center justify-between border-b border-slate-100 bg-slate-50/80 rounded-t-sm mb-0.5">
                                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">
                                    Member Suggestions
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 text-[8.5px] font-extrabold border border-indigo-100">
                                    {searchResults.length} {searchResults.length === 1 ? "Result" : "Results"}
                                  </span>
                                </div>

                                {searchResults.length > 0 ? (
                                  searchResults.map((m) => {
                                    const isSelected = activeMember?.id === m.id;
                                    return (
                                      <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => {
                                          setActiveMember(m);
                                          setSearchMember("");
                                          setIsSearchDropdownOpen(false);
                                        }}
                                        className={cn(
                                          "w-full flex items-center justify-between p-1.5 px-2 rounded-lg text-left transition-all group border cursor-pointer",
                                          isSelected
                                            ? "bg-indigo-50/90 border-indigo-200"
                                            : "bg-white hover:bg-slate-50 border-transparent hover:border-slate-100"
                                        )}
                                      >
                                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                                          <div
                                            className={cn(
                                              "w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0 shadow-2xs",
                                              isSelected ? "bg-indigo-600" : "bg-slate-900 group-hover:bg-indigo-600"
                                            )}
                                          >
                                            {m.name?.charAt(0)}
                                          </div>
                                          <div className="min-w-0 flex-1 truncate leading-tight">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[11px] font-black text-slate-900 truncate group-hover:text-indigo-600">
                                                {m.name}
                                              </span>
                                              {m.status && (
                                                <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-emerald-100 text-emerald-800 shrink-0">
                                                  {m.status}
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-[9.5px] text-slate-500 font-semibold truncate">
                                              <span className="font-mono text-slate-700 font-bold">{m.id}</span> • {m.phone}
                                            </p>
                                          </div>
                                        </div>

                                        <span
                                          className={cn(
                                            "inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded transition-all shrink-0 ml-1.5",
                                            isSelected
                                              ? "bg-indigo-600 text-white"
                                              : "bg-slate-100 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white"
                                          )}
                                        >
                                          {isSelected ? "Selected" : "Select"}
                                        </span>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="py-4 px-3 text-center text-xs font-semibold text-slate-500">
                                    No members match query.
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {activeMember ? (
                          <p className="text-[9.5px] font-semibold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-emerald-500" />
                            Selected: <strong className="text-slate-900 font-bold">{activeMember.name}</strong> ({activeMember.id})
                          </p>
                        ) : (
                          <p
                            className={cn(
                              "text-[9.5px] font-semibold transition-colors duration-300",
                              isSearchError ? "text-rose-600 font-black animate-pulse" : "text-amber-600"
                            )}
                          >
                            * Search & select a member to proceed.
                          </p>
                        )}
                      </motion.div>

                      {/* Compact Primary Fitness Coach / PT Dropdown */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-1.5 relative z-30">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10.5px] font-black text-slate-700 uppercase tracking-wider">
                            Primary Fitness Coach / PT
                          </label>
                          <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-full border border-indigo-100/80">
                            +34% Retention Boost
                          </span>
                        </div>

                        <div className="relative">
                          {/* Compact Trigger Button */}
                          <button
                            type="button"
                            onClick={() => setIsCoachDropdownOpen((prev) => !prev)}
                            className={cn(
                              "w-full h-8 px-2.5 border flex items-center justify-between text-left transition-all cursor-pointer bg-slate-50/70 hover:bg-slate-50 focus:outline-none",
                              isCoachDropdownOpen
                                ? "rounded-t-lg rounded-b-none border-indigo-500 bg-white ring-2 ring-indigo-500/10"
                                : "rounded-lg border-slate-200 hover:border-slate-300"
                            )}
                          >
                            <div className="flex items-center gap-2 overflow-hidden min-w-0">
                              <div className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                                {activeCoachObj.name.charAt(0)}
                              </div>
                              <span className="text-xs font-black text-slate-900 truncate">
                                {activeCoachObj.name}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500 truncate hidden sm:inline">
                                • {activeCoachObj.role}
                              </span>
                            </div>
                            <ChevronDown
                              size={14}
                              className={cn(
                                "text-slate-400 shrink-0 transition-transform duration-200",
                                isCoachDropdownOpen && "rotate-180 text-indigo-600"
                              )}
                            />
                          </button>

                          {/* Compact Attached Popover Dropdown Menu */}
                          {isCoachDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setIsCoachDropdownOpen(false)}
                              />
                              <div className="absolute left-0 right-0 top-full -mt-px bg-white rounded-b-xl border border-indigo-500 shadow-xl shadow-slate-950/15 z-40 max-h-52 overflow-y-auto p-1 space-y-0.5">
                                {/* Header Strip */}
                                <div className="px-2 py-1 flex items-center justify-between border-b border-slate-100 bg-slate-50/80 rounded-t-sm mb-0.5">
                                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">
                                    Fitness Coaches
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 text-[8.5px] font-bold border border-indigo-100">
                                    {coachesList.length} Options
                                  </span>
                                </div>

                                {coachesList.map((c) => {
                                  const isSelected = activeCoachObj.id === c.id;
                                  return (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedCoach(c.name);
                                        setIsCoachDropdownOpen(false);
                                      }}
                                      className={cn(
                                        "w-full flex items-center justify-between p-1.5 px-2 rounded-lg text-left transition-all group border cursor-pointer",
                                        isSelected
                                          ? "bg-indigo-50/90 border-indigo-200"
                                          : "bg-white hover:bg-slate-50 border-transparent hover:border-slate-100"
                                      )}
                                    >
                                      <div className="flex items-center gap-2 overflow-hidden min-w-0">
                                        <div
                                          className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0",
                                            isSelected ? "bg-indigo-600" : "bg-slate-900 group-hover:bg-indigo-600"
                                          )}
                                        >
                                          {c.name.charAt(0)}
                                        </div>

                                        <div className="min-w-0 flex-1 truncate leading-tight">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] font-black text-slate-900 truncate group-hover:text-indigo-600">
                                              {c.name}
                                            </span>
                                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-slate-100 text-slate-700 shrink-0">
                                              {c.badge}
                                            </span>
                                          </div>
                                          <p className="text-[9.5px] text-slate-500 font-semibold truncate">
                                            {c.role}
                                          </p>
                                        </div>
                                      </div>

                                      <span
                                        className={cn(
                                          "inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded transition-all shrink-0 ml-1.5",
                                          isSelected
                                            ? "bg-indigo-600 text-white"
                                            : "bg-slate-100 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white"
                                        )}
                                      >
                                        {isSelected ? "Assigned" : "Assign"}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Renewal Notes */}
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-2">
                        <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                          Renewal Special Instructions / Notes
                        </label>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add member notes, special requests, or discount justification..."
                          className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: RENEWAL PLAN & DURATION */}
              {activeStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1, ease: "easeOut" }}
                  className="space-y-4 max-w-4xl mx-auto"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight">Select Membership Plan</h3>
                      <p className="text-[11px] font-semibold text-slate-500">Choose plan duration and add-on services for this renewal.</p>
                    </div>
                  </div>

                  {/* Plan Cards Grid - Compact */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {plans.map((plan) => {
                      const isSelected = selectedPlanId === plan.id;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={cn(
                            "p-3.5 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between space-y-2 bg-white",
                            isSelected
                              ? "border-indigo-600 shadow-md shadow-indigo-600/10 ring-2 ring-indigo-500/10"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                          )}
                        >
                          {plan.badge && (
                            <span className={cn("absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shadow-sm", plan.badgeColor)}>
                              {plan.badge}
                            </span>
                          )}
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                              {plan.durationMonths} Months Plan
                            </span>
                            <h4 className="text-sm font-black text-slate-900 tracking-tight">{plan.name}</h4>
                            <div className="mt-1.5">
                              <span className="text-xl font-black text-slate-900">₹{plan.price.toLocaleString("en-IN")}</span>
                              <span className="text-[11px] text-slate-500 font-semibold"> / term</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 space-y-1">
                            {plan.benefits.map((b) => (
                              <div key={b} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dates Grid - Compact */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                        Effective Start Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                        Calculated Expiry Date
                      </label>
                      <div className="h-9 px-3 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
                        <span className="text-xs font-black text-indigo-900">{newExpiryDate}</span>
                        <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider bg-white px-2 py-0.5 rounded border border-indigo-200">
                          +{currentPlanObj.durationMonths} Months
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Addons Selection - Compact */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-2">
                    <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Recommended Renewal Add-ons</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {availableAddons.map((addon) => {
                        const isChecked = selectedAddons.includes(addon.id);
                        return (
                          <div
                            key={addon.id}
                            onClick={() => toggleAddon(addon.id)}
                            className={cn(
                              "p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2",
                              isChecked
                                ? "bg-indigo-50/60 border-indigo-300 text-indigo-950 font-bold"
                                : "bg-slate-50/50 border-slate-200 text-slate-600 hover:border-slate-300"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <addon.icon size={14} className={isChecked ? "text-indigo-600" : "text-slate-400"} />
                              <div>
                                <span className="block text-[11px] font-bold leading-tight">{addon.name}</span>
                                <span className="text-[9px] font-bold text-emerald-600">+₹{addon.price}</span>
                              </div>
                            </div>
                            <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all", isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white")}>
                              {isChecked && <Check size={10} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: PRICING & PAYMENT */}
              {activeStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1, ease: "easeOut" }}
                  className="space-y-4 max-w-4xl mx-auto"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Discounts & Taxes */}
                    <div className="space-y-3.5">
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                        <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign size={14} className="text-indigo-600" /> Retention Offer & Discounts
                        </h4>

                        {/* AI Bonus Alert */}
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200/70 flex items-start justify-between gap-2.5">
                          <div>
                            <span className="block text-[11px] font-black text-emerald-900">10% AI Loyalty Discount Recommended</span>
                            <span className="text-[10px] font-semibold text-emerald-700 block mt-0.5">
                              Applied based on member attendance & renewal score.
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={applyLoyaltyBonus}
                            onChange={(e) => setApplyLoyaltyBonus(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                          />
                        </div>

                        {/* Custom Discount Input */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Custom Discount (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={customDiscount}
                            onChange={(e) => setCustomDiscount(Number(e.target.value))}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                          />
                        </div>

                        {/* Tax Toggle */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="block text-xs font-bold text-slate-800">Include 18% GST Invoice Tax</span>
                            <span className="text-[9px] font-semibold text-slate-500">Generates GST-compliant tax receipt</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIncludeGst(!includeGst)}
                            className={cn("w-10 h-5 rounded-full transition-all relative p-0.5", includeGst ? "bg-indigo-600" : "bg-slate-300")}
                          >
                            <div className={cn("w-4 h-4 rounded-full bg-white transition-all shadow-sm", includeGst ? "translate-x-5" : "translate-x-0")} />
                          </button>
                        </div>
                      </div>

                      {/* Communication Preferences */}
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-2">
                        <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Receipt & Notifications</h4>
                        <div className="space-y-1.5">
                          <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/60 border border-slate-200/60 cursor-pointer">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-2">
                              <Smartphone size={14} className="text-emerald-600" /> Send Instant WhatsApp Receipt
                            </span>
                            <input
                              type="checkbox"
                              checked={sendWhatsapp}
                              onChange={(e) => setSendWhatsapp(e.target.checked)}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                          </label>
                          <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/60 border border-slate-200/60 cursor-pointer">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-2">
                              <MessageSquare size={14} className="text-indigo-600" /> Send SMS Expiry Confirmation
                            </span>
                            <input
                              type="checkbox"
                              checked={sendSms}
                              onChange={(e) => setSendSms(e.target.checked)}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Right: Payment Method & Live Calculation */}
                    <div className="space-y-3.5">
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                        <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Payment Method</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "upi", label: "UPI / QR", icon: Smartphone },
                            { id: "card", label: "Credit/Debit Card", icon: CreditCard },
                            { id: "cash", label: "Cash Payment", icon: DollarSign },
                            { id: "bank", label: "Bank Transfer", icon: Layers },
                          ].map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setPaymentMethod(mode.id)}
                              className={cn(
                                "p-2.5 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all text-left",
                                paymentMethod === mode.id
                                  ? "bg-slate-900 text-white border-slate-900 shadow-md"
                                  : "bg-slate-50/50 text-slate-700 border-slate-200 hover:border-slate-300"
                              )}
                            >
                              <mode.icon size={14} />
                              <span>{mode.label}</span>
                            </button>
                          ))}
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Transaction Ref / Receipt No.</label>
                          <input
                            type="text"
                            value={txnRef}
                            onChange={(e) => setTxnRef(e.target.value)}
                            placeholder="Enter UPI / Card transaction ID"
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                          />
                        </div>
                      </div>

                      {/* Live Calculation Box - Compact */}
                      <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-lg relative overflow-hidden border border-slate-800 space-y-2">
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Financial Summary</h4>
                        <div className="space-y-1.5 text-xs font-semibold">
                          <div className="flex justify-between text-slate-400">
                            <span>Base Plan Price</span>
                            <span className="text-slate-200">₹{basePrice.toLocaleString("en-IN")}</span>
                          </div>
                          {addonsTotal > 0 && (
                            <div className="flex justify-between text-slate-400">
                              <span>Selected Add-ons</span>
                              <span className="text-slate-200">+₹{addonsTotal.toLocaleString("en-IN")}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-emerald-400 font-bold">
                            <span>Discount ({discountRate}%)</span>
                            <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                          </div>
                          {includeGst && (
                            <div className="flex justify-between text-slate-400">
                              <span>GST Tax (18%)</span>
                              <span className="text-slate-200">+₹{gstAmount.toLocaleString("en-IN")}</span>
                            </div>
                          )}
                          <div className="h-px bg-slate-800 my-1.5" />
                          <div className="flex justify-between items-center pt-0.5">
                            <span className="text-[11px] font-black uppercase tracking-wider text-white">Grand Total Payable</span>
                            <span className="text-xl font-black text-indigo-400 tracking-tight">₹{grandTotal.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: REVIEW & ISSUE (2-Column Redesign) */}
              {activeStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1, ease: "easeOut" }}
                  className="max-w-4xl mx-auto"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                    {/* LEFT COLUMN: Line Items & Invoice Summary */}
                    <div className="lg:col-span-7 space-y-3">
                      {/* Member & Renewal Header Pill */}
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm shrink-0">
                            {activeMember?.name ? activeMember.name.charAt(0) : "?"}
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Member Profile</span>
                            <h4 className="text-sm font-black text-slate-900 leading-snug">{activeMember?.name || "No Member Selected"}</h4>
                            <span className="text-[10px] text-slate-500 font-semibold">{activeMember?.id ? `${activeMember.id} • ${activeMember.phone || ""}` : "Please select a member"}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">New Validity</span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-100 block mt-0.5">
                            {startDate} → {newExpiryDate}
                          </span>
                        </div>
                      </div>

                      {/* Line Items Breakdown Card */}
                      <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Itemized Line Items</h4>
                          <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            TAX INVOICE #{Math.floor(100000 + Math.random() * 900000)}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          {/* Main Plan */}
                          <div className="flex justify-between items-center py-1.5 border-b border-slate-100/80">
                            <div>
                              <span className="font-bold text-slate-900 block">{currentPlanObj.name}</span>
                              <span className="text-[10px] text-slate-500 font-semibold">{currentPlanObj.durationMonths} Months Full Access Plan</span>
                            </div>
                            <span className="font-bold text-slate-900">₹{basePrice.toLocaleString("en-IN")}</span>
                          </div>

                          {/* Selected Addons */}
                          {selectedAddons.map((addonId) => {
                            const addon = availableAddons.find((a) => a.id === addonId);
                            return addon ? (
                              <div key={addonId} className="flex justify-between items-center py-1.5 border-b border-slate-100/80 text-slate-700">
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 size={12} className="text-indigo-600 shrink-0" />
                                  <span className="font-semibold">{addon.name}</span>
                                </div>
                                <span className="font-bold text-slate-900">+₹{addon.price.toLocaleString("en-IN")}</span>
                              </div>
                            ) : null;
                          })}

                          {/* Loyalty Discount */}
                          {discountAmount > 0 && (
                            <div className="flex justify-between items-center py-1.5 border-b border-slate-100/80 text-emerald-700">
                              <div className="flex items-center gap-1.5">
                                <Zap size={12} className="fill-emerald-600 shrink-0" />
                                <span className="font-bold">Loyalty Retention Discount ({discountRate}%)</span>
                              </div>
                              <span className="font-extrabold">-₹{discountAmount.toLocaleString("en-IN")}</span>
                            </div>
                          )}

                          {/* GST Tax */}
                          {includeGst && (
                            <div className="flex justify-between items-center py-1.5 border-b border-slate-100/80 text-slate-600">
                              <span className="font-semibold">GST Tax Invoice (18%)</span>
                              <span className="font-bold text-slate-900">+₹{gstAmount.toLocaleString("en-IN")}</span>
                            </div>
                          )}
                        </div>

                        {/* Dispatch Preferences Summary */}
                        <div className="pt-2 flex items-center justify-between text-[10px] font-semibold text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span>Auto Digital Dispatch:</span>
                          <div className="flex items-center gap-2">
                            {sendWhatsapp && (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                                WhatsApp Receipt
                              </span>
                            )}
                            {sendSms && (
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">
                                SMS Receipt
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Grand Total & Final Issue Card */}
                    <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
                      {/* Hero Dark Payment Breakdown Box */}
                      <div
                        className="p-5 rounded-2xl text-white shadow-xl relative overflow-hidden flex flex-col justify-between flex-1 space-y-4"
                        style={{
                          background: "linear-gradient(155deg, #090d16 0%, #05070d 100%)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          boxShadow: "0 20px 40px -10px rgba(4, 6, 12, 0.6)",
                        }}
                      >
                        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/15 rounded-full -mr-12 -mt-12 blur-2xl pointer-events-none" />

                        <div className="relative z-10 space-y-3">
                          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 font-mono block">
                            Final Payable Summary
                          </span>

                          <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-semibold">
                              Net Payable Amount
                            </span>
                            <div className="text-3xl font-black text-emerald-400 tracking-tight mt-0.5">
                              ₹{grandTotal.toLocaleString("en-IN")}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-white/10 space-y-2 text-xs text-slate-300">
                            <div className="flex justify-between items-center py-1 border-b border-white/5">
                              <span className="text-slate-400 font-semibold">Payment Mode</span>
                              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold text-[10px] uppercase border border-indigo-500/30">
                                {paymentMethod}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-white/5">
                              <span className="text-slate-400 font-semibold">Txn Reference</span>
                              <strong className="text-slate-200 font-mono text-[11px] font-bold">{txnRef || "N/A"}</strong>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-slate-400 font-semibold">Plan Period</span>
                              <strong className="text-slate-200 font-bold">{currentPlanObj.durationMonths} Months</strong>
                            </div>
                          </div>
                        </div>

                        {/* System Verification Lock Badge */}
                        <div className="relative z-10 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-black uppercase tracking-wider">
                            <ShieldCheck size={16} />
                            <span>Verification Complete</span>
                          </div>
                          <p className="text-[9.5px] text-emerald-300 font-semibold leading-normal">
                            All plan terms and financial calculations verified. Clicking "Complete & Publish" will immediately update member status and issue invoice.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Modal Bottom Footer Actions - Balanced Padding & Height */}
        {!isSuccess && (
          <footer className="px-6 py-2.5 sm:py-3 border-t border-slate-100 bg-white flex justify-between items-center rounded-b-none gap-2.5">
            <button
              onClick={handleBack}
              disabled={activeStep === 1}
              className={cn(
                "px-4 sm:px-4.5 h-9 sm:h-9.5 rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all shrink-0 border shadow-2xs cursor-pointer active:scale-95 active:translate-y-0.5",
                activeStep === 1
                  ? "bg-slate-50 border-slate-200/60 text-slate-300 cursor-not-allowed shadow-none active:scale-100 active:translate-y-0"
                  : "bg-slate-100/80 border-slate-200/90 text-slate-700 hover:bg-slate-200/90 hover:text-slate-950 hover:border-slate-300 hover:shadow-xs"
              )}
            >
              <ChevronLeft size={15} /> Back
            </button>

            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <button
                onClick={onClose}
                className="px-4 sm:px-4.5 h-9 sm:h-9.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100/70 border border-slate-200/80 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200/90 hover:shadow-xs active:scale-95 active:bg-rose-100 active:translate-y-0.5 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleNext}
                className="px-5 sm:px-6 h-9 sm:h-9.5 rounded-xl bg-slate-950 text-white text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-md shadow-slate-950/20 hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-950/30 active:scale-95 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {activeStep === 4 ? (
                  <>
                    <CheckCircle2 size={15} className="text-emerald-400" /> Complete & Publish Renewal
                  </>
                ) : (
                  <>
                    Next Step <ChevronRight size={15} />
                  </>
                )}
              </button>
            </div>
          </footer>
        )}
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────
// RETENTION FUNNEL
// ─────────────────────────────────────────
function RetentionFunnel({ members = [] }) {
  const totalExpiring = members.length;
  const contacted = members.filter(m => m.status === "Contacted" || m.status === "Interested" || m.status === "Renewed").length;
  const interested = members.filter(m => m.status === "Interested" || m.status === "Renewed").length;
  const renewed = members.filter(m => m.status === "Renewed").length;
  const lost = members.filter(m => m.status === "Expired" || m.daysRemaining <= 0 || m.status === "Lost").length;

  const stages = [
    { label: "Total Expiring", value: totalExpiring, color: "bg-slate-50 border-slate-200 text-slate-700" },
    { label: "Contacted", value: contacted, color: "bg-blue-50/60 border-blue-150 text-blue-700" },
    { label: "Interested", value: interested, color: "bg-amber-50/60 border-amber-150 text-amber-700" },
    { label: "Renewed", value: renewed, color: "bg-emerald-50/60 border-emerald-150 text-emerald-700" },
    { label: "Lost Members", value: lost, color: "bg-rose-50/60 border-rose-150 text-rose-700" },
  ];

  return (
    <section className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm my-2">
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
      if (dbPlans && Array.isArray(dbPlans)) {
        dbPlans.forEach(p => {
          plansMap[p.id] = p;
        });
      }

      const now = new Date();
      const mappedMembers = (dbMembers || [])
        .map(m => {
          if (!m) return null;
          if (m.membership_status === "CANCELLED" || m.membership_status === "DELETED") return null;

          const planObj = m.membership_plan_id ? plansMap[m.membership_plan_id] : null;
          const planName = planObj ? planObj.name : "General Membership";
          const planPrice = planObj ? planObj.price : 1500;
          
          // Determine plan duration in days (default to 30 days if not set)
          const planDurationDays = planObj 
            ? (planObj.duration_days || (planObj.duration_months ? planObj.duration_months * 30 : 30))
            : 30;

          // Calculate expiry date: use explicit expires_at if provided, otherwise compute from joined_at/created_at + plan duration
          let expiryDateObj = null;
          if (m.expires_at) {
            expiryDateObj = new Date(m.expires_at);
          } else if (m.joined_at || m.created_at) {
            const startDate = new Date(m.joined_at || m.created_at);
            expiryDateObj = new Date(startDate.getTime() + planDurationDays * 24 * 60 * 60 * 1000);
          } else {
            return null;
          }

          if (isNaN(expiryDateObj.getTime())) return null;

          const diffTime = expiryDateObj - now;
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Only display member card on expiring memberships page when 7 days or fewer are remaining till expiry (or already expired)
          if (daysRemaining > 7) return null;

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

          if (daysRemaining <= 0) {
            churnRisk = "Extreme";
            status = "Expired";
            renewalProbability = 10;
            color = "#ef4444";
          } else if (daysRemaining <= 3) {
            churnRisk = "Extreme";
            status = "Not Contacted";
            renewalProbability = 25;
            color = "#ef4444";
          } else if (daysRemaining <= 7) {
            churnRisk = "High";
            status = "Contacted";
            renewalProbability = 50;
            color = "#f59e0b";
          }

          // Extract trainer from notes or defaults
          let assignedTrainer = "None";
          if (m.notes && m.notes.includes("Trainer:")) {
            const matches = m.notes.match(/Trainer:\s*([^|]+)/);
            if (matches && matches[1]) assignedTrainer = matches[1].trim();
          }

          const memberName = (m.full_name && m.full_name.trim() !== "" && m.full_name !== "Unnamed Member") 
            ? m.full_name 
            : `Gym Member ${m.member_code || (m.id ? m.id.substring(0, 4).toUpperCase() : "")}`;

          return {
            id: m.member_code || `GD-${m.id.substring(0,4).toUpperCase()}`,
            name: memberName,
            phone: m.phone || m.alternate_phone || m.phone_number || m.mobile || (m.member_code ? `+91 98${m.member_code.replace(/[^0-9]/g, '').slice(-7).padStart(7, '654321')}` : "+91 98765 43210"),
            initials,
            plan: planName,
            category,
            expiryDate: expiryDateObj.toISOString().split("T")[0],
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
        .filter(Boolean)
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

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
    return members.filter(m => {
      const q = query.toLowerCase().trim();
      const matchesSearch = !q || 
        m.name.toLowerCase().includes(q) || 
        m.id.toLowerCase().includes(q) || 
        m.plan.toLowerCase().includes(q) ||
        (m.phone && m.phone.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (activeFilter === "critical") return m.daysRemaining <= 3;
      if (activeFilter === "today") return m.daysRemaining === 0;
      if (activeFilter === "highValue") return m.lifetimeValue >= 5000;

      return true;
    });
  }, [members, query, activeFilter]);

  const [currentPage, setCurrentPage] = useState(1);
  const CARDS_PER_PAGE = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [query, activeFilter]);

  const totalPages = Math.ceil(filteredMembers.length / CARDS_PER_PAGE);

  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * CARDS_PER_PAGE;
    return filteredMembers.slice(start, start + CARDS_PER_PAGE);
  }, [filteredMembers, currentPage]);

  const groupedMembers = useMemo(() => {
    return paginatedMembers.reduce((groups, m) => {
      const p = getMemberPriority(m);
      if (groups[p]) groups[p].push(m);
      return groups;
    }, { danger: [], warning: [], healthy: [] });
  }, [paginatedMembers]);

  const handleAction = useCallback((type, member) => {
    if (type === "renew") {
       setSelectedMember(member);
       setIsRenewalOpen(true);
    } else if (type === "call") {
       const rawPhone = member?.phone || "+91 98765 43210";
       const cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
       
       // Instant device call contact handler (macOS FaceTime / Phone Relay / Native Dialer)
       if (window.__TAURI__?.shell?.open) {
         window.__TAURI__.shell.open(`tel:${cleanPhone}`).catch(() => {});
       } else if (window.__TAURI_INVOKE__) {
         window.__TAURI_INVOKE__("plugin:shell|open", { path: `tel:${cleanPhone}` }).catch(() => {});
       }
       
       // Trigger direct tel link navigation for OS dialer
       const link = document.createElement('a');
       link.href = `tel:${cleanPhone}`;
       link.target = '_self';
       document.body.appendChild(link);
       link.click();
       setTimeout(() => {
         if (document.body.contains(link)) document.body.removeChild(link);
       }, 500);
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

  const openRenewalModal = useCallback(() => {
    setSelectedMember(null);
    setIsRenewalOpen(true);
  }, []);
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

        <RetentionFunnel members={members} />

        <section className="pt-2 flex-1 flex flex-col justify-between">
          {viewMode === "grid" && (
            <div className="grid gap-4">
              {paginatedMembers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                  {paginatedMembers.map((m) => (
                    <MemberCard
                      key={m.id}
                      member={m}
                      onProfile={() => openProfile(m)}
                      onAction={handleAction}
                    />
                  ))}
                </div>
              ) : (
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

          {/* PAGINATION PANEL */}
          {viewMode !== "analytics" && filteredMembers.length > 0 && (
            <div className="mt-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none font-mono">
                PAGE {currentPage} OF {totalPages || 1} ({filteredMembers.length} EXPIRING MEMBERS)
              </span>
              
              <div className="flex items-center gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-black uppercase tracking-widest text-slate-600 hover:border-slate-400 hover:text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                
                <div className="flex items-center gap-1 font-mono">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "w-10 h-10 rounded-xl text-xs font-black transition-all",
                        currentPage === page 
                          ? "bg-slate-950 text-white shadow-md border border-slate-950" 
                          : "text-slate-500 hover:bg-slate-200 hover:text-slate-950"
                      )}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button 
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-black uppercase tracking-widest text-slate-600 hover:border-slate-400 hover:text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {isDrawerOpen && <MemberProfileDrawer isOpen={isDrawerOpen} onClose={closeDrawer} member={selectedMember} onAction={handleAction} />}
        {isRenewalOpen && <RenewalModal isOpen={isRenewalOpen} onClose={closeRenewalModal} member={selectedMember} membersList={members} />}
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
