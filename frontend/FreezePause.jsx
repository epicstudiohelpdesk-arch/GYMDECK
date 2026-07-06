import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowRight,
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
  FileText,
  Filter,
  Globe,
  HelpCircle,
  History,
  Info,
  Layers,
  LayoutGrid,
  List,
  Lock,
  MessageSquare,
  MoreVertical,
  PauseCircle,
  Phone,
  PlayCircle,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Snowflake,
  Timer,
  Trash2,
  TrendingUp,
  UserCheck,
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
const INITIAL_FREEZES = [
  {
    id: "FRZ-8892",
    memberId: "MBR-0142",
    name: "Aarav Sharma",
    initials: "AS",
    plan: "Premium Annual Elite",
    reason: "Medical Recovery",
    startDate: "2026-05-18",
    endDate: "2026-06-18",
    daysRequested: 30,
    daysRemaining: 30,
    status: "Pending Review",
    revenuePaused: 4500,
    riskScore: "Low",
    pendingDues: 0,
    assignedStaff: "Pending",
    color: "#3b82f6",
  },
  {
    id: "FRZ-8711",
    memberId: "MBR-0521",
    name: "Meera Nair",
    initials: "MN",
    plan: "Quarterly Transformation",
    reason: "International Travel",
    startDate: "2026-05-01",
    endDate: "2026-05-20",
    daysRequested: 20,
    daysRemaining: 4,
    status: "Active Freeze",
    revenuePaused: 2100,
    riskScore: "Medium",
    pendingDues: 0,
    assignedStaff: "Sneha Patel",
    color: "#f59e0b",
  },
  {
    id: "FRZ-8604",
    memberId: "MBR-0319",
    name: "Kabir Singh",
    initials: "KS",
    plan: "Monthly Starter",
    reason: "Financial Issue",
    startDate: "2026-04-15",
    endDate: "2026-05-15",
    daysRequested: 30,
    daysRemaining: 0,
    status: "Reactivation Pending",
    revenuePaused: 2499,
    riskScore: "High",
    pendingDues: 2499,
    assignedStaff: "Ankit Kumar",
    color: "#10b981",
  },
  {
    id: "FRZ-8910",
    memberId: "MBR-0899",
    name: "Priya Desai",
    initials: "PD",
    plan: "Corporate Wellness",
    reason: "Work Relocation",
    startDate: "2026-05-20",
    endDate: "2026-08-20",
    daysRequested: 90,
    daysRemaining: 90,
    status: "Pending Review",
    revenuePaused: 18000,
    riskScore: "High",
    pendingDues: 0,
    assignedStaff: "Pending",
    color: "#8b5cf6",
  },
  {
    id: "FRZ-8544",
    memberId: "MBR-0211",
    name: "Rahul Verma",
    initials: "RV",
    plan: "Student Basic",
    reason: "Exams",
    startDate: "2026-04-01",
    endDate: "2026-05-01",
    daysRequested: 30,
    daysRemaining: 0,
    status: "Reactivated",
    revenuePaused: 1499,
    riskScore: "Low",
    pendingDues: 0,
    assignedStaff: "System Auto",
    color: "#64748b",
  },
];

const getFreezePriority = (freeze) => {
  if (freeze.status === "Pending Review") return "pending";
  if (freeze.status === "Active Freeze") return "active";
  if (freeze.status === "Reactivation Pending") return "reactivating";
  return "history";
};

const laneConfig = {
  pending: {
    title: "Pending Approvals",
    subtitle: "Requires manager or policy review",
    icon: ShieldAlert,
    lane: "border-blue-200 bg-blue-50/60",
    iconWrap: "bg-blue-100 text-blue-700",
    count: "text-blue-800",
  },
  active: {
    title: "Active Freezes",
    subtitle: "Currently suspended memberships",
    icon: Snowflake,
    lane: "border-slate-200 bg-slate-50/70",
    iconWrap: "bg-slate-200 text-slate-700",
    count: "text-slate-800",
  },
  reactivating: {
    title: "Reactivation Due",
    subtitle: "Freeze period ending, requires action",
    icon: PlayCircle,
    lane: "border-amber-200 bg-amber-50/60",
    iconWrap: "bg-amber-100 text-amber-700",
    count: "text-amber-800",
  },
};

// ─────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────
function DashboardHeader({ title, description, stats }) {
  return (
    <header className="grid gap-3 rounded-lg border border-slate-200 bg-white/95 p-4 shadow-enterprise lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center mb-8">
      <div className="min-w-0">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Retention Safeguard</p>
        <h1 className="m-0 text-[clamp(28px,3vw,44px)] font-black leading-none tracking-normal text-slate-950">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-500">{description}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[640px]">
        <StatTile label="Total Active" value={stats.activeFreezes} tone="indigo" />
        <StatTile label="Pending" value={stats.pendingRequests} tone="blue" />
        <StatTile label="Revenue Paused" value={currencyFormatter.format(stats.revenuePaused / 1000) + "K"} tone="rose" />
        <StatTile label="Due Back" value={stats.reactivations} tone="amber" />
      </div>
    </header>
  );
}

function StatTile({ label, value, tone = "slate" }) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-950 border-slate-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
    indigo: "bg-indigo-50 text-indigo-800 border-indigo-200",
  }[tone];

  return (
    <div className={cn("min-w-0 rounded-lg border p-3", toneClass)}>
      <span className="block text-[10px] font-black uppercase tracking-[0.14em] opacity-70">{label}</span>
      <strong className="mt-2 block truncate text-xl font-black leading-none tracking-normal">{value}</strong>
    </div>
  );
}

function FilterTabs({ activeFilter, onChange, freezes }) {
  const options = [
    { id: "all", label: "All Records", predicate: () => true },
    { id: "pending", label: "Pending Approval", predicate: (f) => f.status === "Pending Review" },
    { id: "active", label: "Active Freezes", predicate: (f) => f.status === "Active Freeze" },
    { id: "reactivating", label: "Reactivation Due", predicate: (f) => f.status === "Reactivation Pending" },
  ];

  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-1" aria-label="Freeze filters">
      <div className="flex min-h-9 flex-wrap gap-1">
        <span className="flex shrink-0 items-center gap-1.5 px-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Filter
        </span>
        {options.map((filter) => {
          const isActive = activeFilter === filter.id;
          const count = freezes.filter(filter.predicate).length;
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

function BulkActionBar({ selectedCount, onClearSelection, onCreate, viewMode, setViewMode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg bg-slate-200/50 p-1">
          <button onClick={() => setViewMode("grid")} className={cn("w-9 h-8 flex items-center justify-center rounded-md transition-all", viewMode === "grid" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-700")}><LayoutGrid size={16} /></button>
          <button onClick={() => setViewMode("table")} className={cn("w-9 h-8 flex items-center justify-center rounded-md transition-all", viewMode === "table" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-700")}><List size={16} /></button>
          <button onClick={() => setViewMode("analytics")} className={cn("w-9 h-8 flex items-center justify-center rounded-md transition-all", viewMode === "analytics" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-700")}><BarChart3 size={16} /></button>
        </div>
        <div className="h-5 w-px bg-slate-300"></div>
        <span className="text-xs font-extrabold text-slate-800">{selectedCount > 0 ? `${selectedCount} selected` : "Operational Actions"}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <button onClick={onCreate} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
          <Plus className="h-4 w-4" /> Request Freeze
        </button>
        <button className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition disabled:opacity-45" disabled={!selectedCount}><Edit className="h-4 w-4" /> Bulk Approve</button>
        <button onClick={onClearSelection} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition disabled:opacity-45" disabled={!selectedCount}><X className="h-4 w-4" /> Clear</button>
      </div>
    </div>
  );
}

function PriorityLane({ config, freezes, onProfile, onAction }) {
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
        <strong className={cn("text-2xl font-black leading-none", config.count)}>{freezes.length}</strong>
      </header>
      <div className="grid items-start gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {freezes.map((f) => (
          <FreezeCard key={f.id} freeze={f} onProfile={() => onProfile(f)} onAction={onAction} />
        ))}
      </div>
    </section>
  );
}

function FreezeCard({ freeze, onProfile, onAction }) {
  const priority = getFreezePriority(freeze);
  const statusStyles = {
    "Pending Review": "border-blue-200 bg-blue-50 text-blue-700",
    "Active Freeze": "border-slate-200 bg-slate-100 text-slate-700",
    "Reactivation Pending": "border-amber-200 bg-amber-50 text-amber-700",
    "Reactivated": "border-emerald-200 bg-emerald-50 text-emerald-700",
    "Rejected": "border-rose-200 bg-rose-50 text-rose-700",
  };
  const priorityBorder = { pending: "border-l-blue-500", active: "border-l-slate-400", reactivating: "border-l-amber-500", history: "border-l-emerald-500" }[priority];

  return (
    <article className={cn("min-w-0 rounded-xl border border-l-4 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-enterprise", priorityBorder)}>
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center text-slate-400">
           <UserCheck size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-base font-black text-slate-950 truncate">{freeze.name}</h3>
              <StatusBadge className={statusStyles[freeze.status]} label={freeze.status} />
            </div>
            <button className="p-1.5 -mr-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <MoreVertical size={16} />
            </button>
          </div>
          <p className="text-xs font-bold text-slate-500 mb-3">{freeze.plan} · {freeze.memberId}</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <MetricPill label="Duration" value={`${freeze.daysRequested} Days`} detail={`${freeze.startDate} to ${freeze.endDate}`} info={priority === 'pending'} />
            <MetricPill label={priority === 'reactivating' ? "Ends In" : "Status"} value={priority === 'reactivating' ? `${freeze.daysRemaining} Days` : freeze.reason} warning={priority === 'reactivating'} danger={freeze.pendingDues > 0} detail={freeze.pendingDues > 0 ? `Dues: ₹${freeze.pendingDues}` : "Clear"} />
          </div>
          <div className="flex flex-wrap gap-2">
            {priority === 'pending' && (
              <>
                <button onClick={() => onAction?.("approve", freeze)} className="h-8 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-colors">Approve</button>
                <button onClick={() => onAction?.("reject", freeze)} className="h-8 px-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black uppercase tracking-wider hover:bg-rose-100 transition-colors">Reject</button>
              </>
            )}
            {priority === 'reactivating' && <button onClick={() => onAction?.("reactivate", freeze)} className="h-8 px-3 rounded-lg bg-slate-950 text-white text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-colors">Reactivate Now</button>}
            <button onClick={onProfile} className="h-8 px-3 rounded-lg border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 ml-auto">Details</button>
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

function MetricPill({ label, value, detail = "", danger = false, success = false, warning = false, info = false }) {
  const colorClass = danger ? "border-rose-200 bg-rose-50 text-rose-700" : success ? "border-emerald-200 bg-emerald-50 text-emerald-700" : warning ? "border-amber-200 bg-amber-50 text-amber-700" : info ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-950";
  const parts = colorClass.split(' ');
  return (
    <div className={cn("min-w-0 rounded-md border p-2", parts.slice(0, 2).join(' '))}>
      <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <strong className={cn("mt-1 block truncate text-xs font-black", parts.slice(2).join(' '))}>{value}</strong>
      {detail ? <small className="mt-1 block truncate text-[11px] font-bold text-slate-500">{detail}</small> : null}
    </div>
  );
}

function TableView({ freezes, onAction }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-enterprise">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="p-4 w-10"><input type="checkbox" className="h-4 w-4 rounded border-slate-300" /></th>
            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Freeze ID & Member</th>
            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Duration & Dates</th>
            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Reason</th>
            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {freezes.map((f) => (
            <tr key={f.id} className="hover:bg-slate-50 transition-colors group">
              <td className="p-4"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-slate-950" /></td>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-600 font-black text-[10px]">{f.initials}</div>
                  <div className="min-w-0">
                    <span className="block text-sm font-black text-slate-950 truncate">{f.name}</span>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{f.id}</span>
                  </div>
                </div>
              </td>
              <td className="p-4"><span className="text-sm font-black text-slate-950">{f.daysRequested} Days</span><span className="block text-[10px] font-bold text-slate-500">{f.startDate} to {f.endDate}</span></td>
              <td className="p-4 text-xs font-bold text-slate-600 uppercase tracking-tight">{f.reason}</td>
              <td className="p-4"><StatusBadge className="bg-slate-100" label={f.status} /></td>
              <td className="p-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onAction?.("edit", f)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:shadow-sm"><Edit size={14} /></button>
                  <button onClick={() => onAction?.("approve", f)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:shadow-sm"><Check size={14} /></button>
                  <button onClick={() => onAction?.("reject", f)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:shadow-sm"><X size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────
// MODALS & DRAWERS
// ─────────────────────────────────────────
const FreezeProfileDrawer = ({ isOpen, onClose, freeze }) => {
  if (!isOpen || !freeze) return null;
  return (
    <div className="fixed inset-0 z-[10001] flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col">
        <header className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-950 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl border border-white/20 bg-white/10 flex items-center justify-center text-white font-black">{freeze.initials}</div>
            <div>
              <h2 className="text-xl font-black">{freeze.name}</h2>
              <p className="text-xs font-semibold text-slate-400">{freeze.memberId} · {freeze.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"><X size={20} /></button>
        </header>
        <main className="flex-1 overflow-y-auto p-6 space-y-8">
           <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Freeze Intelligence</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                    <span className="block text-[10px] font-black text-indigo-700 uppercase tracking-wider mb-1">Reactivation Prob.</span>
                    <strong className="text-2xl font-black text-indigo-900">88%</strong>
                 </div>
                 <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
                    <span className="block text-[10px] font-black text-rose-700 uppercase tracking-wider mb-1">Revenue Paused</span>
                    <strong className="text-2xl font-black text-rose-900">₹{freeze.revenuePaused}</strong>
                 </div>
              </div>
           </section>
           <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Freeze Lifecycle</h3>
              <div className="space-y-3">
                 <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div><span className="block text-[10px] font-black text-slate-400 uppercase mb-1">Start Date</span><span className="text-sm font-bold text-slate-700">{freeze.startDate}</span></div>
                    <ArrowRight className="text-slate-300" size={16} />
                    <div><span className="block text-[10px] font-black text-slate-400 uppercase mb-1">End Date</span><span className="text-sm font-bold text-slate-700">{freeze.endDate}</span></div>
                    <div className="text-right"><span className="block text-[10px] font-black text-slate-400 uppercase mb-1">Extension</span><span className="text-sm font-black text-indigo-600">+{freeze.daysRequested} Days</span></div>
                 </div>
              </div>
           </section>
        </main>
        <footer className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3">
           <button className="flex-1 h-11 rounded-xl bg-slate-950 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">Reactivate Now</button>
           <button className="h-11 w-11 rounded-xl border border-slate-200 flex items-center justify-center text-emerald-600 hover:bg-white"><MessageSquare size={20} /></button>
        </footer>
      </motion.div>
    </div>
  );
};

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
// CREATE / EDIT FREEZE MODAL
// ─────────────────────────────────────────
const FreezeRequestModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState({
    member: "",
    startDate: "",
    endDate: "",
    reason: "Medical Issue",
  });

  if (!isOpen) return null;

  const tabs = [
    { id: "basic", label: "Member & Request", icon: Info },
    { id: "policy", label: "Policy Validation", icon: ShieldCheck },
    { id: "financial", label: "Billing Adjustments", icon: DollarSign },
    { id: "approval", label: "Approval Flow", icon: CheckCircle2 },
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
            <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight">New Freeze Request</h2>
            <p className="text-xs font-bold text-slate-500 mt-0.5">Process temporary membership suspension and validity extension.</p>
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
            
            <div className="mt-10 p-4 rounded-2xl bg-blue-50 border border-blue-100/50">
               <ShieldCheck size={20} className="text-blue-600 mb-2.5" />
               <p className="text-[9px] font-black text-blue-900 uppercase tracking-widest leading-relaxed">
                  System Audit: All freeze actions are logged for compliance monitoring.
               </p>
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto p-8">
            <AnimatePresence mode="wait">
              {activeTab === "basic" && (
                <motion.div
                  key="basic"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="max-w-2xl space-y-6"
                >
                  <div className="grid gap-5">
                    <label className="block">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Search Member</span>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          placeholder="Member Name, ID, or Phone"
                          className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
                        />
                      </div>
                    </label>
                    
                    <div className="grid grid-cols-2 gap-5">
                      <label className="block">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Start Date</span>
                        <input
                          type="date"
                          className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-5 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">End Date</span>
                        <input
                          type="date"
                          className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-5 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all"
                        />
                      </label>
                    </div>

                    <CustomSelect
                      label="Reason for Freeze"
                      value={formData.reason}
                      options={["Medical Issue", "Travel / Vacation", "Work Relocation", "Financial Hardship", "Injury", "Exams", "Personal Reason"]}
                      onChange={(val) => setFormData({...formData, reason: val})}
                    />

                    <label className="block">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Internal Notes</span>
                      <textarea
                        rows="3"
                        placeholder="Add additional context for approval..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-5 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all resize-none"
                      ></textarea>
                    </label>
                  </div>
                </motion.div>
              )}

              {activeTab === "policy" && (
                 <motion.div key="policy" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                    <div className="p-6 rounded-[24px] bg-slate-50 border border-slate-200 space-y-5">
                       <h4 className="text-[10px] font-black text-slate-950 uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck size={14} className="text-emerald-500" /> Policy Compliance Check
                       </h4>
                       <div className="space-y-4">
                          {[
                             { label: "Minimum Active Period", desc: "Member active for > 30 days.", status: "success" },
                             { label: "Freeze Quota Remaining", desc: "1 of 3 requests remaining this year.", status: "success" },
                             { label: "Pending Dues Validation", desc: "Clear account balance detected.", status: "success" },
                             { label: "Duration Policy", desc: "Requested 45 days. Max policy is 30 days.", status: "warning" },
                          ].map((check, i) => (
                             <div key={i} className="flex items-start gap-3">
                                {check.status === "success" ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" /> : <AlertTriangle size={18} className="text-amber-500 shrink-0" />}
                                <div>
                                   <span className="block text-xs font-black text-slate-900">{check.label}</span>
                                   <span className="text-[10px] font-bold text-slate-500">{check.desc}</span>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </motion.div>
              )}

              {activeTab === "financial" && (
                <motion.div key="financial" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                   <div className="grid gap-5">
                      <div className="p-6 rounded-[24px] bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                         <div>
                            <span className="block text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1">Shifted Expiry Projection</span>
                            <span className="text-lg font-black text-indigo-900">26 Nov 2026</span>
                         </div>
                         <div className="text-right">
                            <span className="block text-[10px] font-black text-indigo-400 uppercase mb-1">Extension</span>
                            <span className="text-sm font-black text-indigo-600">+45 Days</span>
                         </div>
                      </div>
                      
                      <div className="p-6 rounded-[24px] bg-slate-50 border border-slate-200">
                         <h4 className="text-[10px] font-black text-slate-950 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <CreditCard size={14} /> Billing Pause Logic
                         </h4>
                         <p className="text-xs font-bold text-slate-600 leading-relaxed mb-4">
                            All recurring invoices and automated payments will be suspended during the freeze period.
                         </p>
                         <label className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 cursor-pointer">
                            <input type="checkbox" className="w-4.5 h-4.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500" defaultChecked />
                            <span className="text-xs font-black text-slate-700">Apply standard Freeze processing fee (₹500)</span>
                         </label>
                      </div>
                   </div>
                </motion.div>
              )}

              {activeTab === "approval" && (
                 <motion.div key="approval" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Final Action Selection</span>
                    <div className="grid gap-3">
                       {[
                          { id: "approve", title: "Approve & Activate", desc: "Instantly suspend access and shift dates.", color: "emerald", icon: CheckCircle2 },
                          { id: "review", title: "Manager Review", desc: "Escalate for manual policy override.", color: "amber", icon: ShieldAlert },
                          { id: "reject", title: "Reject Request", desc: "Deny suspension and notify member.", color: "rose", icon: X },
                       ].map((action) => (
                          <label key={action.id} className={cn("flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all hover:translate-x-1", 
                            action.id === "approve" ? "border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100" : 
                            action.id === "review" ? "border-amber-100 bg-amber-50/50 hover:bg-amber-100" : 
                            "border-rose-100 bg-rose-50/50 hover:bg-rose-100")}>
                             <input type="radio" name="approval_action" className={cn("w-5 h-5", `text-${action.color}-600 focus:ring-${action.color}-500`)} defaultChecked={action.id === "approve"} />
                             <div className="flex items-center gap-3.5 flex-1">
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", `bg-${action.color}-100 text-${action.color}-600`)}>
                                   <action.icon size={20} />
                                </div>
                                <div>
                                   <span className={cn("block text-sm font-black", `text-${action.color}-900`)}>{action.title}</span>
                                   <span className={cn("text-[10px] font-bold", `text-${action.color}-700`)}>{action.desc}</span>
                                </div>
                             </div>
                          </label>
                       ))}
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
            Confirm Action
          </button>
        </footer>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────
// FREEZE PIPELINE FUNNEL
// ─────────────────────────────────────────
function FreezePipeline() {
  const stages = [
    { label: "Requested", value: 12, color: "bg-slate-100 text-slate-700" },
    { label: "Under Review", value: 5, color: "bg-blue-50 text-blue-700" },
    { label: "Approved", value: 8, color: "bg-emerald-50 text-emerald-700" },
    { label: "Active Freeze", value: 34, color: "bg-indigo-50 text-indigo-700" },
    { label: "Reactivation Pending", value: 6, color: "bg-amber-50 text-amber-700" },
    { label: "Reactivated", value: 142, color: "bg-emerald-100 text-emerald-900" },
  ];

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm mb-6">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Freeze Pipeline</h3>
      <div className="flex items-center gap-1 h-12">
        {stages.map((stage, i) => (
          <div key={i} className={cn("relative flex-1 h-full flex flex-col items-center justify-center transition-all hover:scale-[1.02] border border-slate-100 rounded-md", stage.color)} title={`${stage.label}: ${stage.value}`}>
            <span className="text-[11px] font-black leading-none">{stage.value}</span>
            <span className="text-[8px] font-bold uppercase tracking-tighter opacity-80 mt-1">{stage.label}</span>
            {i < stages.length - 1 && (<ChevronRight size={12} className="absolute -right-1.5 z-10 text-slate-300" />)}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────
const FreezePausePage = () => {
  const [viewMode, setViewMode] = useState("grid");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedFreeze, setSelectedFreeze] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [freezes] = useState(INITIAL_FREEZES);

  const stats = useMemo(() => ({
    activeFreezes: freezes.filter(f => f.status === "Active Freeze").length,
    pendingRequests: freezes.filter(f => f.status === "Pending Review").length,
    revenuePaused: freezes.filter(f => f.status === "Active Freeze" || f.status === "Pending Review").reduce((acc, f) => acc + f.revenuePaused, 0),
    reactivations: freezes.filter(f => f.status === "Reactivation Pending" || f.status === "Reactivated").length,
  }), [freezes]);

  const filteredFreezes = useMemo(() => {
    const lowQuery = query.toLowerCase();
    return freezes.filter(f => {
      const matchesQuery = !query || f.name.toLowerCase().includes(lowQuery) || f.memberId.toLowerCase().includes(lowQuery);
      if (!matchesQuery) return false;
      if (activeFilter === "pending") return f.status === "Pending Review";
      if (activeFilter === "active") return f.status === "Active Freeze";
      if (activeFilter === "reactivating") return f.status === "Reactivation Pending";
      return true;
    });
  }, [freezes, query, activeFilter]);

  const groupedFreezes = useMemo(() => {
    return filteredFreezes.reduce((groups, f) => {
      const p = getFreezePriority(f);
      if (groups[p]) groups[p].push(f);
      return groups;
    }, { pending: [], active: [], reactivating: [], history: [] });
  }, [filteredFreezes]);

  const handleAction = useCallback((type, f) => {
    // Action logic here
  }, []);

  const openProfile = useCallback((f) => {
     setSelectedFreeze(f);
     setIsDrawerOpen(true);
  }, []);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  return (
    <div className="min-h-full font-sans text-slate-950 bg-slate-50/30">
      <header className="sticky top-0 z-50 h-[72px] bg-white backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between">
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
            <input type="text" placeholder="Search member, freeze ID, plan..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 text-xs font-semibold outline-none focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"><Bell size={18} /></button>
          <button onClick={openModal} className="h-10 px-6 rounded-xl bg-slate-950 text-white flex items-center gap-2 text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"><Plus size={18} /> Create Freeze Request</button>
        </div>
      </header>

      <main className="p-8 max-w-[1600px] mx-auto space-y-4">
        <DashboardHeader 
          title="Retention Safeguard" 
          description="Manage temporary membership suspensions, automate validity adjustments, and retain members without permanent cancellations."
          stats={stats}
        />
        <section className="grid gap-3 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-enterprise">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_max-content]">
            <label className="relative block min-w-0" htmlFor="freeze-search-main"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input id="freeze-search-main" value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100" placeholder="Quick search freeze records..." type="search" /></label>
            <div className="flex gap-2"><button className="h-11 px-4 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider hover:bg-emerald-100 transition-colors flex items-center gap-2 border border-emerald-100"><Zap size={14} /> AI Insights</button><button className="h-11 px-4 rounded-lg bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-colors border border-slate-200">Configure Policies</button></div>
          </div>
          <FilterTabs activeFilter={activeFilter} onChange={setActiveFilter} freezes={freezes} />
          <BulkActionBar selectedCount={0} onClearSelection={() => {}} onCreate={openModal} viewMode={viewMode} setViewMode={setViewMode} />
        </section>
        <FreezePipeline />
        <section className="pt-2">
          {viewMode === "grid" && (
            <div className="grid gap-4">
              {Object.entries(laneConfig).map(([p, config]) => groupedFreezes[p]?.length > 0 && (
                <PriorityLane key={p} config={config} freezes={groupedFreezes[p]} onProfile={openProfile} onAction={handleAction} />
              ))}
            </div>
          )}
          {viewMode === "table" && (<TableView freezes={filteredFreezes} onAction={handleAction} />)}
        </section>
      </main>
      <AnimatePresence>
        {isDrawerOpen && <FreezeProfileDrawer isOpen={isDrawerOpen} onClose={closeDrawer} freeze={selectedFreeze} />}
        {isModalOpen && <FreezeRequestModal isOpen={isModalOpen} onClose={closeModal} />}
      </AnimatePresence>
    </div>
  );
};

import { ErrorBoundary } from "./ErrorHandlers.jsx";

export function mountFreezePause() {
  const stage = document.querySelector('[data-stage="freeze-pause"]');
  if (!stage) return null;
  const rootElement = document.createElement("div");
  rootElement.dataset.freezePauseReactRoot = "";
  rootElement.className = "min-h-full";
  stage.replaceChildren(rootElement);
  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <FreezePausePage />
      </ErrorBoundary>
    );
    return root;
  } catch (err) {
    console.error("Failed to render Freeze/Pause:", err);
    return null;
  }
}

export default FreezePausePage;
