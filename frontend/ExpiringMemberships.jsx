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
  Globe,
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
// MOCK DATA
// ─────────────────────────────────────────
const INITIAL_EXPIRING_MEMBERS = [
  {
    id: "MBR-0842",
    name: "Vikram Malhotra",
    initials: "VM",
    plan: "Premium Annual Elite",
    category: "Premium",
    expiryDate: "2026-05-19",
    daysRemaining: 3,
    renewalProbability: 94,
    churnRisk: "Low",
    lastAttendance: "Today, 06:45 AM",
    pendingDues: 0,
    lifetimeValue: 48500,
    assignedTrainer: "Ankit Kumar",
    lastContacted: "Yesterday",
    status: "Contacted",
    color: "#3b82f6",
  },
  {
    id: "MBR-0721",
    name: "Ananya Iyer",
    initials: "AI",
    plan: "Monthly Starter",
    category: "General Fitness",
    expiryDate: "2026-05-17",
    daysRemaining: 1,
    renewalProbability: 42,
    churnRisk: "High",
    lastAttendance: "8 days ago",
    pendingDues: 2499,
    lifetimeValue: 7497,
    assignedTrainer: "None",
    lastContacted: "Never",
    status: "Not Contacted",
    color: "#f59e0b",
  },
  {
    id: "MBR-0912",
    name: "Siddharth Rao",
    initials: "SR",
    plan: "Quarterly Transformation",
    category: "Weight Loss",
    expiryDate: "2026-05-23",
    daysRemaining: 7,
    renewalProbability: 78,
    churnRisk: "Medium",
    lastAttendance: "Yesterday",
    pendingDues: 0,
    lifetimeValue: 21000,
    assignedTrainer: "Sneha Patel",
    lastContacted: "3 days ago",
    status: "Interested",
    color: "#10b981",
  },
  {
    id: "MBR-0554",
    name: "Pooja Hegde",
    initials: "PH",
    plan: "Student Basic",
    category: "Student",
    expiryDate: "2026-05-16",
    daysRemaining: 0,
    renewalProbability: 15,
    churnRisk: "Extreme",
    lastAttendance: "14 days ago",
    pendingDues: 0,
    lifetimeValue: 4497,
    assignedTrainer: "None",
    lastContacted: "5 days ago",
    status: "Lost",
    color: "#ef4444",
  },
  {
    id: "MBR-1022",
    name: "Kabir Singh",
    initials: "KS",
    plan: "Corporate Wellness",
    category: "Corporate",
    expiryDate: "2026-06-15",
    daysRemaining: 30,
    renewalProbability: 88,
    churnRisk: "Low",
    lastAttendance: "2 hours ago",
    pendingDues: 0,
    lifetimeValue: 36000,
    assignedTrainer: "Manav Rao",
    lastContacted: "None",
    status: "Renewed",
    color: "#6366f1",
  },
];

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
function DashboardHeader({ title, description, stats }) {
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
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[640px] relative z-10">
        <StatTile label="Expiring Today" value={stats.expiringToday} tone="rose" />
        <StatTile label="Upcoming (Week)" value={stats.totalExpiring} tone="blue" />
        <StatTile label="Revenue At Risk" value={currencyFormatter.format(stats.revenueAtRisk / 1000) + "K"} tone="amber" />
        <StatTile label="Renewal Prob." value={`${stats.avgRenewalProb}%`} tone="emerald" />
      </div>
    </div>
  );
}

function StatTile({ label, value, tone = "slate" }) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-950 border-slate-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
  }[tone];

  return (
    <div className={cn("min-w-0 rounded-lg border p-3", toneClass)}>
      <span className="block text-[10px] font-black uppercase tracking-[0.14em] opacity-70">{label}</span>
      <strong className="mt-2 block truncate text-xl font-black leading-none tracking-normal">{value}</strong>
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
        <div className="flex rounded-lg bg-slate-200/50 p-1">
          <button 
            onClick={() => setViewMode("grid")}
            className={cn("w-9 h-8 flex items-center justify-center rounded-md transition-all", viewMode === "grid" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-700")}
            title="Grid View"
          >
            <LayoutGrid size={16} />
          </button>
          <button 
            onClick={() => setViewMode("table")}
            className={cn("w-9 h-8 flex items-center justify-center rounded-md transition-all", viewMode === "table" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-700")}
            title="Table View"
          >
            <List size={16} />
          </button>
          <button 
            onClick={() => setViewMode("analytics")}
            className={cn("w-9 h-8 flex items-center justify-center rounded-md transition-all", viewMode === "analytics" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-700")}
            title="Analytics"
          >
            <BarChart3 size={16} />
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

      <div className="grid items-start gap-3 lg:grid-cols-2 2xl:grid-cols-3">
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
    "Not Contacted": "border-slate-200 bg-slate-50 text-slate-700",
    "Contacted": "border-blue-200 bg-blue-50 text-blue-700",
    "Interested": "border-amber-200 bg-amber-50 text-amber-700",
    "Renewed": "border-emerald-200 bg-emerald-50 text-emerald-700",
    "Lost": "border-rose-200 bg-rose-50 text-rose-700",
  };

  const priorityBorder = {
    danger: "border-l-rose-500",
    warning: "border-l-amber-500",
    healthy: "border-l-emerald-500",
  }[priority];

  return (
    <article className={cn("min-w-0 rounded-xl border border-l-4 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-enterprise", priorityBorder)}>
      <div className="flex gap-4">
        <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
           <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${member.id}`} alt={member.name} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-base font-black text-slate-950 truncate">{member.name}</h3>
              <StatusBadge className={statusStyles[member.status]} label={member.status} />
            </div>
            <button className="p-1.5 -mr-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <MoreVertical size={16} />
            </button>
          </div>
          <p className="text-xs font-bold text-slate-500 mb-3">{member.plan} · {member.id}</p>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <MetricPill 
              label="Expires In" 
              value={`${member.daysRemaining} Days`} 
              detail={member.expiryDate}
              danger={member.daysRemaining <= 3}
              warning={member.daysRemaining > 3 && member.daysRemaining <= 7}
            />
            <MetricPill 
              label="Renewal Score" 
              value={`${member.renewalProbability}%`} 
              success={member.renewalProbability > 80}
              danger={member.renewalProbability < 40}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => onAction?.("renew", member)} className="h-8 px-3 rounded-lg bg-slate-950 text-white text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-colors">
              Renew Now
            </button>
            <button onClick={() => onAction?.("whatsapp", member)} className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-emerald-600 hover:bg-emerald-50">
              <MessageSquare size={14} />
            </button>
            <button onClick={() => onAction?.("call", member)} className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-blue-600 hover:bg-blue-50">
              <Phone size={14} />
            </button>
            <button onClick={onProfile} className="h-8 px-3 rounded-lg border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 ml-auto">
              Profile
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ className, label }) {
  return (
    <mark className={cn("inline-flex min-h-7 items-center gap-2 rounded-md border px-2.5 text-[11px] font-black not-italic", className)}>
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
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
               <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${member.id}`} alt="" />
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
    { label: "Total Expiring", value: 42, color: "bg-slate-100 text-slate-700" },
    { label: "Contacted", value: 28, color: "bg-blue-50 text-blue-700" },
    { label: "Interested", value: 15, color: "bg-amber-50 text-amber-700" },
    { label: "Renewed", value: 12, color: "bg-emerald-50 text-emerald-700" },
    { label: "Lost Members", value: 4, color: "bg-rose-50 text-rose-700" },
  ];

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm mb-6">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Retention Pipeline</h3>
      <div className="flex items-center gap-1 h-12">
        {stages.map((stage, i) => (
          <div 
            key={i} 
            className={cn("relative flex-1 h-full flex flex-col items-center justify-center transition-all hover:scale-[1.02] border border-slate-100 rounded-md", stage.color)}
            title={`${stage.label}: ${stage.value}`}
          >
            <span className="text-[11px] font-black leading-none">{stage.value}</span>
            <span className="text-[8px] font-bold uppercase tracking-tighter opacity-80 mt-1">{stage.label}</span>
            {i < stages.length - 1 && (
               <ChevronRight size={12} className="absolute -right-1.5 z-10 text-slate-300" />
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
  const [members] = useState(INITIAL_EXPIRING_MEMBERS);

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
      <header className="relative z-50 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <button className="h-10 px-4 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-3 hover:bg-white transition-all">
            <Globe size={14} className="text-slate-400" />
            Main Branch • Koramangala
            <ChevronDown size={14} className="text-slate-400" />
          </button>
        </div>
        <div className="flex-1 max-w-md mx-12">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search members, plans, trainers..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 text-xs font-semibold outline-none focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"><Bell size={18} /></button>
          <button onClick={openRenewalModal} className="h-10 px-6 rounded-xl bg-slate-950 text-white flex items-center gap-2 text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"><Plus size={18} /> Renew Membership</button>
        </div>
      </header>

      <div className="expiring-memberships-workspace">
        <DashboardHeader 
          title="Retention Command Center" 
          description="Monitor upcoming expiries, recover revenue, automate renewals, and reduce membership churn across your fitness ecosystem."
          stats={stats}
        />

        <section className="expiring-memberships-workspace-sticky-header">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_max-content]">
            <label className="relative block min-w-0" htmlFor="retention-search-main">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="retention-search-main"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                placeholder="Quick search expiring members..."
                type="search"
              />
            </label>
            <div className="flex gap-2">
              <button className="h-11 px-4 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider hover:bg-emerald-100 transition-colors flex items-center gap-2 border border-emerald-100">
                <Zap size={14} />
                AI Insights
              </button>
              <button className="h-11 px-4 rounded-lg bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-colors border border-slate-200">
                Revenue Forecast
              </button>
            </div>
          </div>
          <FilterTabs activeFilter={activeFilter} onChange={setActiveFilter} members={members} />
          <BulkActionBar selectedCount={0} onClearSelection={() => {}} onRenew={() => {}} viewMode={viewMode} setViewMode={setViewMode} />
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
