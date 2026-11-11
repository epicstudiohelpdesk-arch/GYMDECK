import React, { useState, useMemo, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  LayoutGrid,
  List,
  ChevronDown,
  TrendingUp,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Shield,
  Zap,
  Award,
  Crown,
  X,
  CreditCard,
  Percent,
  Tag,
  Users,
  Dumbbell,
  Flame,
  Sparkles,
  Package,
  IndianRupee,
  Calendar,
  Trash2,
  Edit3,
  Eye,
  ArrowRight,
  FolderPlus
} from "lucide-react";
import { ErrorBoundary } from "./ErrorHandlers.jsx";
import BrandFooter from "./BrandFooter.jsx";

// ─────────────────────────────────────────
// UTILITIES & HELPERS
// ─────────────────────────────────────────

const formatCompact = (val) => {
  if (val === null || val === undefined || isNaN(val)) return "0";
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(val);
};

const formatCurrency = (val) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(val || 0);
};

const cn = (...classes) => classes.filter(Boolean).join(" ");

const getPackageVisual = (pkg) => {
  if (!pkg) return { gradient: "linear-gradient(135deg, #0ea5e9, #0284c7)", IconComponent: Package };
  
  const name = (pkg.name || "").toLowerCase();
  const category = (pkg.category || "").toLowerCase();
  
  let gradient = "linear-gradient(135deg, #0ea5e9, #0284c7)";
  let IconComponent = Package;
  
  if (category.includes("transform") || name.includes("transform") || name.includes("pro")) {
    gradient = "linear-gradient(135deg, #6366f1, #4f46e5)";
    IconComponent = Sparkles;
  } else if (category.includes("strength") || name.includes("strength") || name.includes("muscle") || name.includes("athlete")) {
    gradient = "linear-gradient(135deg, #10b981, #059669)";
    IconComponent = Dumbbell;
  } else if (category.includes("weight") || name.includes("burn") || name.includes("fat") || name.includes("loss")) {
    gradient = "linear-gradient(135deg, #f59e0b, #d97706)";
    IconComponent = Flame;
  } else if (category.includes("rehab") || name.includes("rehab") || name.includes("mobility") || name.includes("recovery")) {
    gradient = "linear-gradient(135deg, #8b5cf6, #7c3aed)";
    IconComponent = Shield;
  } else if (name.includes("starter") || name.includes("basic") || name.includes("kickoff")) {
    gradient = "linear-gradient(135deg, #f43f5e, #e11d48)";
    IconComponent = Zap;
  } else {
    gradient = "linear-gradient(135deg, #3b82f6, #1d4ed8)";
    IconComponent = Award;
  }
  
  return { gradient, IconComponent };
};

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────

const FILTER_OPTIONS = ["All", "Active", "Transformation", "Strength", "Weight Loss", "Rehabilitation", "General"];

const PT_PACKAGE_CATEGORIES = [
  "Transformation",
  "Strength",
  "Weight Loss",
  "Rehabilitation",
  "Athlete Coaching",
  "General"
];

// ─────────────────────────────────────────
// KPI CARD COMPONENT
// ─────────────────────────────────────────
const KPICard = ({ label, value, subtext, icon: Icon, tone = "indigo" }) => {
  const tones = {
    indigo: {
      icon: "text-indigo-600 bg-indigo-50 border-indigo-100"
    },
    emerald: {
      icon: "text-emerald-600 bg-emerald-50 border-emerald-100"
    },
    blue: {
      icon: "text-blue-600 bg-blue-50 border-blue-100"
    },
    amber: {
      icon: "text-amber-600 bg-amber-50 border-amber-100"
    }
  };

  const currentTone = tones[tone] || tones.indigo;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between min-h-[105px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shrink-0", currentTone.icon)}>
          <Icon size={16} strokeWidth={2.2} />
        </div>
      </div>
      <div className="mt-2 text-left">
        <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1.5">{value}</p>
        <p className="text-[11px] text-slate-400 font-medium leading-none">{subtext}</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// CUSTOM SELECT COMPONENT
// ─────────────────────────────────────────
function CustomSelect({ label, value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-1.5 relative">
      {label && <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between hover:bg-slate-100 transition-all text-left cursor-pointer"
        >
          <span>{value}</span>
          <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="absolute left-0 right-0 top-[48px] bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-50 overflow-hidden max-h-48 overflow-y-auto"
              >
                {options.map((option) => {
                  const isSelected = value === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        onChange(option);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2.5 text-xs font-bold text-left transition-colors flex items-center justify-between cursor-pointer",
                        isSelected
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <span>{option}</span>
                      {isSelected && <CheckCircle2 size={12} className="text-emerald-400" />}
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// DIRECTORY ROW CARD COMPONENT
// ─────────────────────────────────────────
function PTPackageRow({ pkg, index, onViewDetails, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { gradient, IconComponent } = getPackageVisual(pkg);
  const pricePerSession = Math.round((pkg.price || 0) / (pkg.sessions || 1));

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className="relative grid grid-cols-3 gap-4 p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-xs hover:shadow-sm hover:border-slate-300 transition-all duration-200 list-none cursor-pointer"
      onClick={() => onViewDetails(pkg)}
    >
      {/* Col 1: Identity & Parameters */}
      <div className="flex items-center gap-3.5 min-w-0 text-left">
        <div 
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
          style={{ background: gradient }}
        >
          <IconComponent size={20} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 text-left">
          <h4 className="text-sm font-bold text-slate-900 leading-tight truncate">{pkg.name}</h4>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider">
              {pkg.category}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {pkg.duration}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {pkg.sessions} Sessions
            </span>
          </div>
        </div>
      </div>

      {/* Col 2: Commercials & Assigned Tier */}
      <div className="flex items-center justify-around gap-2 text-left">
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Price</span>
          <span className="text-sm font-black text-slate-900 mt-0.5 block">{formatCurrency(pkg.price)}</span>
          <span className="text-[10px] text-slate-400 font-medium">₹{pricePerSession.toLocaleString("en-IN")}/session</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Coach Tier</span>
          <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate max-w-[120px]">{pkg.trainerType || "General"}</span>
          <span className="text-[10px] text-slate-400 font-medium">{pkg.frequency || "Standard"}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Clients</span>
          <span className="text-sm font-black text-slate-900 mt-0.5 block">{pkg.activeClients || 0}</span>
          <span className="text-[10px] text-slate-400 font-medium">enrolled</span>
        </div>
      </div>

      {/* Col 3: Status & Action Menu */}
      <div className="flex items-center justify-between gap-4 pr-10 text-left">
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider",
            pkg.status === "inactive"
              ? "bg-slate-50 border-slate-200 text-slate-600"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          )}>
            {pkg.status === "inactive" ? "Inactive" : "Active"}
          </span>
          <span className="text-xs text-slate-400 font-bold font-mono">
            {pkg.validity ? `${pkg.validity} val.` : `${pkg.duration}`}
          </span>
        </div>

        {/* More options button */}
        <div className="absolute right-3 top-3.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="Package options"
          >
            <MoreVertical size={16} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-8 w-36 bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-40"
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onViewDetails(pkg);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-left cursor-pointer"
                  >
                    <Eye size={13} className="text-slate-400" /> View Details
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(pkg);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-left cursor-pointer"
                  >
                    <Edit3 size={13} className="text-slate-400" /> Edit Package
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(pkg);
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 text-left cursor-pointer"
                  >
                    <Trash2 size={13} className="text-rose-400" /> Delete Package
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.tr>
  );
}

// ─────────────────────────────────────────
// GRID CARD COMPONENT
// ─────────────────────────────────────────
function PTPackageGridCard({ pkg, onViewDetails, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { gradient, IconComponent } = getPackageVisual(pkg);
  const pricePerSession = Math.round((pkg.price || 0) / (pkg.sessions || 1));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer relative"
      onClick={() => onViewDetails(pkg)}
    >
      <div>
        <div className="flex items-start justify-between mb-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
            style={{ background: gradient }}
          >
            <IconComponent size={22} strokeWidth={2.2} />
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider",
              pkg.status === "inactive"
                ? "bg-slate-50 border-slate-200 text-slate-600"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            )}>
              {pkg.status === "inactive" ? "Inactive" : "Active"}
            </span>

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <MoreVertical size={16} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 top-7 w-36 bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-40"
                    >
                      <button
                        onClick={() => { setMenuOpen(false); onViewDetails(pkg); }}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-left cursor-pointer"
                      >
                        <Eye size={13} className="text-slate-400" /> View Details
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); onEdit(pkg); }}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-left cursor-pointer"
                      >
                        <Edit3 size={13} className="text-slate-400" /> Edit Package
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); onDelete(pkg); }}
                        className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 text-left cursor-pointer"
                      >
                        <Trash2 size={13} className="text-rose-400" /> Delete Package
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
              {pkg.category}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {pkg.duration}
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-1.5 leading-snug group-hover:text-indigo-600 transition-colors">
            {pkg.name}
          </h3>
          {pkg.description && (
            <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
              {pkg.description}
            </p>
          )}
        </div>

        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 mb-4">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-black text-slate-900">{formatCurrency(pkg.price)}</span>
            <span className="text-[11px] text-slate-400 font-medium">₹{pricePerSession.toLocaleString("en-IN")}/sess</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
            <span className="font-bold text-indigo-600">{pkg.sessions} Sessions</span>
            <span>•</span>
            <span className="truncate">{pkg.trainerType || "General Coaches"}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <span className="text-slate-500 font-medium">
          <strong className="text-slate-900 font-bold">{pkg.activeClients || 0}</strong> Clients Enrolled
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(pkg);
          }}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
        >
          View Details →
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// PACKAGE DETAILS MODAL
// ─────────────────────────────────────────
function PackageDetailsModal({ pkg, isOpen, onClose, onEdit, onDelete }) {
  if (!pkg) return null;

  const { gradient, IconComponent } = getPackageVisual(pkg);
  const pricePerSession = Math.round((pkg.price || 0) / (pkg.sessions || 1));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
          >
            {/* Header with Visual Card */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xs"
                  style={{ background: gradient }}
                >
                  <IconComponent size={22} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">{pkg.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {pkg.status === "inactive" ? "Inactive" : "Active"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{pkg.category}</span>
                    <span>•</span>
                    <span>{pkg.duration}</span>
                    <span>•</span>
                    <span className="text-indigo-600 font-bold">{pkg.sessions} Sessions</span>
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Stat Tiles */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Package Price</span>
                  <span className="text-base font-black text-slate-900 mt-1 block">{formatCurrency(pkg.price)}</span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Rate / Session</span>
                  <span className="text-base font-black text-slate-900 mt-1 block">₹{pricePerSession.toLocaleString("en-IN")}</span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Sessions Pool</span>
                  <span className="text-base font-black text-slate-900 mt-1 block">{pkg.sessions} Sessions</span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Enrolled Clients</span>
                  <span className="text-base font-black text-slate-900 mt-1 block">{pkg.activeClients || 0}</span>
                </div>
              </div>

              {/* Description */}
              {pkg.description && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Package Description &amp; Scope
                  </span>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{pkg.description}</p>
                </div>
              )}

              {/* Features Included */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                  Included Features &amp; Privileges
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {(pkg.features || []).length > 0 ? (
                    pkg.features.map((feat, i) => (
                      <div key={i} className="p-3 rounded-xl border border-slate-100 bg-white flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic col-span-2">No custom features listed for this package.</p>
                  )}
                </div>
              </div>

              {/* Trainer Allocation & Rules */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                  <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block mb-1">Trainer Tier Allocation</span>
                  <p className="text-xs font-bold text-slate-900">{pkg.trainerType || "General Trainers"}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Designated coach level authorized for this package.</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Session Frequency &amp; Validity</span>
                  <p className="text-xs font-bold text-slate-900">{pkg.frequency || "Flexible"} • {pkg.validity || pkg.duration}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Operating schedule &amp; validity expiry window.</p>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(pkg);
                }}
                className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={14} /> Delete
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(pkg);
                  }}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 size={14} /> Edit Package
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────
// CREATE / EDIT PACKAGE MODAL
// ─────────────────────────────────────────
function CreatePackageModal({ isOpen, onClose, onSave, editingPackage }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    category: "Transformation",
    description: "",
    trainerType: "Elite Coaches",
    duration: "90 Days",
    sessions: 36,
    frequency: "3 sessions/week",
    validity: "90 Days",
    price: "",
    features: [
      "1-on-1 Personal Training Sessions",
      "Customized Nutrition Plan",
      "Weekly Progress Assessments",
      "App Workout & Log Tracking"
    ]
  });

  const [featureInput, setFeatureInput] = useState("");

  useEffect(() => {
    if (editingPackage) {
      setFormData({
        name: editingPackage.name || "",
        category: editingPackage.category || "Transformation",
        description: editingPackage.description || "",
        trainerType: editingPackage.trainerType || "Elite Coaches",
        duration: editingPackage.duration || "90 Days",
        sessions: editingPackage.sessions || 36,
        frequency: editingPackage.frequency || "3 sessions/week",
        validity: editingPackage.validity || "90 Days",
        price: editingPackage.price?.toString() || "",
        features: editingPackage.features || [
          "1-on-1 Personal Training Sessions",
          "Customized Nutrition Plan",
          "Weekly Progress Assessments"
        ]
      });
      setStep(1);
    } else {
      setFormData({
        name: "",
        category: "Transformation",
        description: "",
        trainerType: "Elite Coaches",
        duration: "90 Days",
        sessions: 36,
        frequency: "3 sessions/week",
        validity: "90 Days",
        price: "",
        features: [
          "1-on-1 Personal Training Sessions",
          "Customized Nutrition Plan",
          "Weekly Progress Assessments",
          "App Workout & Log Tracking"
        ]
      });
      setStep(1);
    }
  }, [editingPackage, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const addFeature = () => {
    if (featureInput.trim() && !formData.features.includes(featureInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        features: [...prev.features, featureInput.trim()]
      }));
      setFeatureInput("");
    }
  };

  const removeFeature = (idx) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== idx)
    }));
  };

  const handleFinish = (e) => {
    e?.preventDefault();
    if (!formData.name.trim()) return;

    const basePriceNum = parseFloat(formData.price.toString().replace(/[^\d.]/g, "")) || 0;
    const sessionsNum = parseInt(formData.sessions) || 12;

    const savedItem = {
      id: editingPackage?.id || `PKG-${Math.floor(1000 + Math.random() * 9000)}`,
      name: formData.name.trim(),
      category: formData.category,
      price: basePriceNum,
      duration: formData.duration,
      sessions: sessionsNum,
      frequency: formData.frequency,
      validity: formData.validity,
      activeClients: editingPackage?.activeClients || 0,
      status: editingPackage?.status || "active",
      trainerType: formData.trainerType,
      description: formData.description,
      features: formData.features,
      createdAt: editingPackage?.createdAt || new Date().toISOString()
    };

    onSave(savedItem);
    onClose();
  };

  const calculatedPerSession = formData.price && formData.sessions > 0
    ? Math.round(parseFloat(formData.price.toString().replace(/[^\d.]/g, "")) / formData.sessions)
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-900 text-white">
                  Step {step} of 3
                </span>
                <h3 className="text-base font-black text-slate-900">
                  {editingPackage ? "Edit PT Package" : "Create PT Package"}
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-semibold">
                {step === 1 && "Basic Package Details & Classification"}
                {step === 2 && "Sessions, Frequency & Commercials"}
                {step === 3 && "Inclusions & Features Checklist"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto space-y-5">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12-Week Transformation Pro"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-all"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <CustomSelect
                    label="Category"
                    value={formData.category}
                    onChange={(val) => handleChange("category", val)}
                    options={PT_PACKAGE_CATEGORIES}
                  />

                  <CustomSelect
                    label="Trainer Assignment Tier"
                    value={formData.trainerType}
                    onChange={(val) => handleChange("trainerType", val)}
                    options={["Elite Coaches", "Master Coaches", "Senior Coaches", "Specialist Coaches", "General Trainers"]}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Description &amp; Target Goal
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe program goals, target clientele, and curriculum..."
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-all resize-none"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <CustomSelect
                    label="Package Duration"
                    value={formData.duration}
                    onChange={(val) => handleChange("duration", val)}
                    options={["30 Days", "45 Days", "60 Days", "90 Days", "180 Days", "365 Days"]}
                  />

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Total 1-on-1 Sessions *
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 36"
                      value={formData.sessions}
                      onChange={(e) => handleChange("sessions", e.target.value)}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-all"
                      min="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Session Frequency
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3 sessions/week"
                      value={formData.frequency}
                      onChange={(e) => handleChange("frequency", e.target.value)}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Package Validity
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 90 Days"
                      value={formData.validity}
                      onChange={(e) => handleChange("validity", e.target.value)}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Base Package Price (₹ INR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      placeholder="e.g. 45000"
                      value={formData.price}
                      onChange={(e) => handleChange("price", e.target.value)}
                      className="w-full h-11 pl-8 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-all"
                      min="0"
                    />
                  </div>
                  {calculatedPerSession > 0 && (
                    <small className="text-[11px] text-slate-500 font-medium mt-1 block">
                      Equivalent to <strong className="text-slate-800">₹{calculatedPerSession.toLocaleString("en-IN")}</strong> per individual session.
                    </small>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Features &amp; Client Inclusions
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add feature (e.g. Weekly Body Composition Scans)..."
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addFeature();
                        }
                      }}
                      className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={addFeature}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-800 transition-colors"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3 max-h-40 overflow-y-auto">
                    {formData.features.map((feat, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-2 border border-slate-200/80"
                      >
                        {feat}
                        <button
                          type="button"
                          onClick={() => removeFeature(i)}
                          className="hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900">Summary Preview</span>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                      {formData.category}
                    </span>
                  </div>
                  <p className="text-sm font-black text-slate-900">{formData.name || "Untitled PT Package"}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formData.sessions} Sessions • {formData.duration} • ₹{Number(formData.price || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-30 cursor-pointer hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(3, s + 1))}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {editingPackage ? "Save Changes" : "Create Package"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────
// DELETE CONFIRMATION MODAL
// ─────────────────────────────────────────
function DeleteConfirmationModal({ isOpen, pkg, onClose, onConfirm }) {
  if (!pkg) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl text-center"
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-black text-slate-900">Delete PT Package</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-800">{pkg.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center gap-2 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm(pkg);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE COMPONENT (NO FAKE DATA)
// ─────────────────────────────────────────
export default function PTPackages() {
  const [view, setView] = useState("packages"); // "packages" | "analytics"
  const [viewMode, setViewMode] = useState("list"); // "list" | "grid"

  // Clean data initialization from localStorage, purging any fake legacy mock packages
  const [packages, setPackages] = useState(() => {
    try {
      const saved = localStorage.getItem("gymdeck_pt_packages");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const fakeMockIds = new Set([
            "PKG-2001",
            "PKG-2002",
            "PKG-2003",
            "PKG-2004",
            "PT-TRANS-PRO",
            "PT-STR-CAMP",
            "PT-MTH-START",
            "PT-REHAB-CORE"
          ]);
          const userCreatedPackages = parsed.filter((p) => !fakeMockIds.has(p.id));
          return userCreatedPackages;
        }
      }
    } catch (e) {
      console.error("Error reading gymdeck_pt_packages:", e);
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [detailsPackage, setDetailsPackage] = useState(null);
  const [editingPackage, setEditingPackage] = useState(null);
  const [deletePackage, setDeletePackage] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isHeaderStuck, setIsHeaderStuck] = useState(false);
  const sentinelRef = useRef(null);

  // Sync to localStorage
  const savePackagesToStorage = (updated) => {
    setPackages(updated);
    try {
      localStorage.setItem("gymdeck_pt_packages", JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving to gymdeck_pt_packages:", e);
    }
  };

  // Sticky header observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeaderStuck(!entry.isIntersecting);
      },
      { threshold: [0], rootMargin: "-20px 0px 0px 0px" }
    );

    observer.observe(sentinel);
    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, []);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    let result = [...packages];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.duration?.toLowerCase().includes(q) ||
          p.trainerType?.toLowerCase().includes(q)
      );
    }

    if (activeFilter === "Active") {
      result = result.filter((p) => p.status !== "inactive");
    } else if (activeFilter !== "All") {
      result = result.filter((p) => p.category?.toLowerCase().includes(activeFilter.toLowerCase()));
    }

    return result;
  }, [packages, searchQuery, activeFilter]);

  // Aggregate real stats
  const totalPackages = packages.length;
  const activePackages = packages.filter((p) => p.status !== "inactive").length;
  const totalClients = packages.reduce((acc, p) => acc + (p.activeClients || 0), 0);
  const totalRevenue = packages.reduce((acc, p) => acc + ((p.price || 0) * (p.activeClients || 0)), 0);
  const totalSessions = packages.reduce((acc, p) => acc + (p.sessions || 0), 0);
  const avgPackagePrice = totalPackages > 0
    ? Math.round(packages.reduce((acc, p) => acc + (p.price || 0), 0) / totalPackages)
    : 0;

  const handleSavePackage = (savedPkg) => {
    setPackages((prev) => {
      const exists = prev.some((p) => p.id === savedPkg.id);
      let updated;
      if (exists) {
        updated = prev.map((p) => (p.id === savedPkg.id ? { ...p, ...savedPkg } : p));
      } else {
        updated = [savedPkg, ...prev];
      }
      try {
        localStorage.setItem("gymdeck_pt_packages", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleDeletePackage = (pkgToDelete) => {
    const updated = packages.filter((p) => p.id !== pkgToDelete.id);
    savePackagesToStorage(updated);
  };

  return (
    <div className="min-h-full bg-[#FAFBFD] p-5 text-slate-900 font-sans">
      <div className="members-shell max-w-7xl mx-auto">
        {/* HEADER */}
        <header className="pb-3 border-b border-slate-200/80 mb-3 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-xs">
                <Dumbbell size={18} />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Personal Training Packages</h1>
                <p className="text-xs text-slate-400 font-semibold mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live PT Coaching Configurations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Segmented Control */}
              <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200/20 gap-1">
                <button
                  onClick={() => setView("packages")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer",
                    view === "packages"
                      ? "bg-slate-950 text-white shadow-xs"
                      : "bg-white text-slate-500 hover:text-slate-800 shadow-xs border border-slate-200/40"
                  )}
                >
                  Packages
                </button>
                <button
                  onClick={() => setView("analytics")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer",
                    view === "analytics"
                      ? "bg-slate-950 text-white shadow-xs"
                      : "bg-white text-slate-500 hover:text-slate-800 shadow-xs border border-slate-200/40"
                  )}
                >
                  Analytics
                </button>
              </div>

              <button
                onClick={() => {
                  setEditingPackage(null);
                  setIsCreateModalOpen(true);
                }}
                className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} strokeWidth={2.5} />
                Create PT Package
              </button>
            </div>
          </div>
        </header>

        {/* OVERVIEW STAT CARDS (REAL DATA ONLY) */}
        {view === "packages" && (
          <section className="grid grid-cols-4 gap-4 mt-1 mb-4">
            <KPICard
              label="Active Packages"
              value={totalPackages.toString()}
              subtext={totalPackages === 0 ? "No packages configured" : `${activePackages} active packages`}
              icon={Package}
              tone="indigo"
            />
            <KPICard
              label="Clients Enrolled"
              value={totalClients.toString()}
              subtext={totalClients === 0 ? "0 active PT subscriptions" : "Across active coaching tiers"}
              icon={Users}
              tone="emerald"
            />
            <KPICard
              label="Total PT Revenue"
              value={formatCurrency(totalRevenue)}
              subtext={totalPackages === 0 ? "No active earnings" : `Avg. ${formatCurrency(avgPackagePrice)} / package`}
              icon={IndianRupee}
              tone="blue"
            />
            <KPICard
              label="Sessions Configured"
              value={totalSessions.toString()}
              subtext={totalSessions === 0 ? "0 sessions in catalog" : "Total 1-on-1 session pool"}
              icon={Clock}
              tone="amber"
            />
          </section>
        )}

        <div className="members-workspace">
          <AnimatePresence mode="wait">
            {/* ─── PACKAGES VIEW ─── */}
            {view === "packages" && (
              <motion.div
                key="packages"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col"
              >
                {/* Sentinel for sticky detection */}
                <div ref={sentinelRef} style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", pointerEvents: "none" }} />

                {/* UNIFIED STICKY CONTROL PANEL */}
                <div 
                  className={cn(
                    "bg-white border border-slate-200/90 shadow-xs flex flex-col transition-all duration-200 mb-4",
                    isHeaderStuck ? "rounded-none border-x-0 border-t-0" : "rounded-2xl"
                  )}
                  style={{ position: "sticky", top: "-1px", zIndex: 20 }}
                >
                  {/* SEARCH & FILTERS ROW */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 pt-3.5 pb-2.5">
                    <div className="relative flex-1 max-w-md">
                      <Search 
                        size={15} 
                        className="absolute left-3.5 text-slate-400 pointer-events-none" 
                        style={{ top: "50%", transform: "translateY(-50%)" }}
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search packages by name, category, or coach tier..."
                        className="w-full h-10 pl-10 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-slate-300 focus:bg-white transition-all placeholder:text-slate-400"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 w-5 h-5 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center border-0 p-0 outline-none cursor-pointer"
                          style={{ top: "50%", transform: "translateY(-50%)" }}
                        >
                          <X size={11} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {FILTER_OPTIONS.map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={cn(
                              "h-9 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all duration-200 flex items-center justify-center cursor-pointer",
                              activeFilter === filter
                                ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            )}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>

                      {/* View Mode Switcher */}
                      <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 ml-2">
                        <button
                          type="button"
                          onClick={() => setViewMode("list")}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors cursor-pointer",
                            viewMode === "list" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-700"
                          )}
                          title="List view"
                        >
                          <List size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("grid")}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors cursor-pointer",
                            viewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-700"
                          )}
                          title="Grid view"
                        >
                          <LayoutGrid size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* META SUB-BAR */}
                  <div className="border-t border-slate-100 mx-4" />
                  <div className="flex items-center justify-between px-4 py-2 bg-white rounded-b-2xl">
                    <p className="text-[11px] text-slate-400 font-medium">
                      Showing <strong className="text-slate-700 font-bold">{filteredPackages.length}</strong> of {totalPackages} configured packages
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Catalog Status: {totalPackages > 0 ? "Active" : "Ready for Setup"}
                    </span>
                  </div>
                </div>

                {/* CONTENT AREA */}
                {filteredPackages.length === 0 ? (
                  <div className="w-full my-6 py-14 px-8 bg-gradient-to-b from-slate-50/70 via-slate-50/45 to-white border-2 border-dashed border-slate-200 rounded-3xl shadow-xs flex flex-col items-center text-center relative overflow-hidden">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-4 shadow-xs">
                      <Package size={26} strokeWidth={2} />
                    </div>

                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                      {activeFilter === "All" && !searchQuery ? "No PT Packages Configured Yet" : "No Matching PT Packages Found"}
                    </h3>

                    <p className="text-xs text-slate-500 font-medium mt-1.5 max-w-md leading-relaxed">
                      {activeFilter === "All" && !searchQuery
                        ? "Create structured personal training packages with customized session allocations, coach tiers, and pricing models to start onboarding clients."
                        : "Try adjusting your search query or reset the active filter options."}
                    </p>

                    {activeFilter === "All" && !searchQuery ? (
                      <button
                        onClick={() => {
                          setEditingPackage(null);
                          setIsCreateModalOpen(true);
                        }}
                        className="mt-5 h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                      >
                        <Plus size={15} strokeWidth={2.5} />
                        Create First PT Package
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setActiveFilter("All");
                        }}
                        className="mt-5 h-10 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : viewMode === "list" ? (
                  <div className="space-y-3">
                    <LayoutGroup>
                      <AnimatePresence mode="popLayout">
                        {filteredPackages.map((pkg, i) => (
                          <PTPackageRow
                            key={pkg.id}
                            pkg={pkg}
                            index={i}
                            onViewDetails={setDetailsPackage}
                            onEdit={(item) => {
                              setEditingPackage(item);
                              setIsCreateModalOpen(true);
                            }}
                            onDelete={setDeletePackage}
                          />
                        ))}
                      </AnimatePresence>
                    </LayoutGroup>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <LayoutGroup>
                      <AnimatePresence mode="popLayout">
                        {filteredPackages.map((pkg) => (
                          <PTPackageGridCard
                            key={pkg.id}
                            pkg={pkg}
                            onViewDetails={setDetailsPackage}
                            onEdit={(item) => {
                              setEditingPackage(item);
                              setIsCreateModalOpen(true);
                            }}
                            onDelete={setDeletePackage}
                          />
                        ))}
                      </AnimatePresence>
                    </LayoutGroup>
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── REAL ANALYTICS VIEW ─── */}
            {view === "analytics" && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {packages.length === 0 ? (
                  <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                      <BarChart3 size={24} />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">No Analytics Data Available</h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Create personal training packages and enroll clients to see real revenue distribution, session pools, and coach allocations.
                    </p>
                    <button
                      onClick={() => {
                        setEditingPackage(null);
                        setIsCreateModalOpen(true);
                      }}
                      className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-800 transition-colors"
                    >
                      Create Package
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-5">
                    {/* Category Breakdown */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4">
                        Packages by Category
                      </h3>
                      <div className="space-y-3.5">
                        {PT_PACKAGE_CATEGORIES.map((cat) => {
                          const catPackages = packages.filter((p) => p.category?.toLowerCase() === cat.toLowerCase());
                          const pct = packages.length > 0 ? Math.round((catPackages.length / packages.length) * 100) : 0;
                          return (
                            <div key={cat}>
                              <div className="flex items-center justify-between mb-1 text-xs">
                                <span className="font-semibold text-slate-700">{cat}</span>
                                <span className="font-bold text-slate-900">{catPackages.length} ({pct}%)</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Revenue Contribution */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4">
                        Revenue Contribution by Package
                      </h3>
                      <div className="space-y-3.5">
                        {packages.map((pkg) => {
                          const pkgRev = (pkg.price || 0) * (pkg.activeClients || 0);
                          const revPct = totalRevenue > 0 ? Math.round((pkgRev / totalRevenue) * 100) : 0;
                          return (
                            <div key={pkg.id}>
                              <div className="flex items-center justify-between mb-1 text-xs">
                                <span className="font-semibold text-slate-700 truncate max-w-[200px]">{pkg.name}</span>
                                <span className="font-bold text-slate-900">{formatCurrency(pkgRev)} ({revPct}%)</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                  style={{ width: `${revPct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* MODALS */}
      <PackageDetailsModal
        pkg={detailsPackage}
        isOpen={Boolean(detailsPackage)}
        onClose={() => setDetailsPackage(null)}
        onEdit={(pkg) => {
          setEditingPackage(pkg);
          setIsCreateModalOpen(true);
        }}
        onDelete={setDeletePackage}
      />

      <CreatePackageModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingPackage(null);
        }}
        onSave={handleSavePackage}
        editingPackage={editingPackage}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(deletePackage)}
        pkg={deletePackage}
        onClose={() => setDeletePackage(null)}
        onConfirm={handleDeletePackage}
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
  root.render(
    <ErrorBoundary>
      <PTPackages />
      <BrandFooter />
    </ErrorBoundary>
  );
  return root;
};
