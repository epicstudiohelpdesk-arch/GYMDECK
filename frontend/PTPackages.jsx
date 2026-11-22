import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  Check,
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
function CustomSelect({ value, onChange, placeholder, options, grid = "", label }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedItem = options.find((opt) =>
    typeof opt === "string" ? opt === value : opt.value === value
  );
  const displayLabel = selectedItem
    ? typeof selectedItem === "string"
      ? selectedItem
      : selectedItem.label
    : (placeholder || label || "Select option");

  return (
    <div ref={selectRef} className={`custom-select-wrapper ${isOpen ? "is-open" : ""}`}>
      <div
        className="custom-dropdown-trigger cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
      >
        <span className={`custom-dropdown-value ${!value ? "placeholder" : ""}`}>
          {displayLabel}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      <div className={`custom-dropdown-menu ${grid}`}>
        {placeholder && (
          <div
            className={`custom-dropdown-item placeholder ${!value ? "is-selected" : ""}`}
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
          >
            {placeholder}
          </div>
        )}
        {options.map((opt) => {
          const val = typeof opt === "string" ? opt : opt.value;
          const lbl = typeof opt === "string" ? opt : opt.label;
          const isSelected = value === val;
          return (
            <div
              key={val}
              className={`custom-dropdown-item ${isSelected ? "is-selected" : ""}`}
              onClick={() => {
                onChange(val);
                setIsOpen(false);
              }}
            >
              {lbl}
            </div>
          );
        })}
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
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [alertMessage, setAlertMessage] = useState("");
  const [whatsappConsent, setWhatsappConsent] = useState(true);

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
    commissionSplit: "60% Trainer / 40% Gym",
    commitment: "Standard Commitment",
    intensityFocus: "High Intensity Transformation",
    status: "active",
    features: [
      "1-on-1 Personal Training Sessions",
      "Customized Nutrition Plan",
      "Weekly Progress Assessments",
      "App Workout & Log Tracking"
    ]
  });

  const [featureInput, setFeatureInput] = useState("");

  const PRESET_INCLUSIONS = [
    "Customized Nutrition Plan",
    "Weekly Body Composition Scans",
    "1-on-1 Lifestyle Consultation",
    "WhatsApp Trainer Support",
    "Posture & Mobility Screenings",
    "App Workout & Log Tracking",
    "Supplement Guidance Protocol",
    "Post-Workout Recovery Protocol"
  ];

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setStep(1);
      setErrors({});
      setAlertMessage("");

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
          commissionSplit: editingPackage.commissionSplit || "60% Trainer / 40% Gym",
          commitment: editingPackage.commitment || "Standard Commitment",
          intensityFocus: editingPackage.intensityFocus || "High Intensity Transformation",
          status: editingPackage.status || "active",
          features: editingPackage.features && editingPackage.features.length > 0
            ? [...editingPackage.features]
            : [
                "1-on-1 Personal Training Sessions",
                "Customized Nutrition Plan",
                "Weekly Progress Assessments"
              ]
        });
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
          commissionSplit: "60% Trainer / 40% Gym",
          commitment: "Standard Commitment",
          intensityFocus: "High Intensity Transformation",
          status: "active",
          features: [
            "1-on-1 Personal Training Sessions",
            "Customized Nutrition Plan",
            "Weekly Progress Assessments",
            "App Workout & Log Tracking"
          ]
        });
      }

      const raf = requestAnimationFrame(() => {
        document.body.classList.add("member-form-open");
        document.body.style.overflow = "hidden";
      });
      return () => cancelAnimationFrame(raf);
    } else {
      document.body.classList.remove("member-form-open");
      document.body.style.overflow = "";
      const timer = setTimeout(() => {
        setMounted(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [editingPackage, isOpen]);

  if (!mounted && !isOpen) return null;

  const handleClose = () => {
    document.body.classList.remove("member-form-open");
    document.body.style.overflow = "";
    setTimeout(() => {
      onClose();
      setStep(1);
    }, 600);
  };

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const addFeature = (featToAdd) => {
    const text = (featToAdd || featureInput).trim();
    if (text && !formData.features.includes(text)) {
      setFormData((prev) => ({
        ...prev,
        features: [...prev.features, text]
      }));
      if (!featToAdd) setFeatureInput("");
    }
  };

  const removeFeature = (idx) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== idx)
    }));
  };

  const validateStep = (currentStep) => {
    const errs = {};
    if (currentStep === 1) {
      if (!formData.name.trim()) errs.name = "Please enter the PT package title.";
      if (!formData.category) errs.category = "Please select specialty category.";
      if (!formData.trainerType) errs.trainerType = "Please select trainer assignment tier.";
    } else if (currentStep === 2) {
      if (!formData.sessions || parseInt(formData.sessions) <= 0) {
        errs.sessions = "Please specify total number of 1-on-1 sessions.";
      }
      const p = parseFloat(formData.price.toString().replace(/[^\d.]/g, ""));
      if (!p || p <= 0) {
        errs.price = "Please specify a valid base price in INR.";
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setAlertMessage("Please complete all mandatory package fields marked with an asterisk (*).");
      return false;
    }
    setAlertMessage("");
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(3, s + 1));
  };

  const handleBack = () => {
    setAlertMessage("");
    setStep((s) => Math.max(1, s - 1));
  };

  const handleFinish = (e) => {
    e?.preventDefault();
    if (!validateStep(1) || !validateStep(2)) {
      setStep(1);
      return;
    }

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
      commissionSplit: formData.commissionSplit,
      commitment: formData.commitment,
      intensityFocus: formData.intensityFocus,
      activeClients: editingPackage?.activeClients || 0,
      status: formData.status || "active",
      trainerType: formData.trainerType,
      description: formData.description,
      features: formData.features,
      createdAt: editingPackage?.createdAt || new Date().toISOString()
    };

    onSave(savedItem);
    handleClose();
  };

  const basePriceNum = parseFloat(formData.price?.toString().replace(/[^\d.]/g, "")) || 0;
  const sessionsNum = parseInt(formData.sessions) || 1;
  const calculatedPerSession = basePriceNum > 0 && sessionsNum > 0
    ? Math.round(basePriceNum / sessionsNum)
    : 0;

  const splitPercent = formData.commissionSplit?.includes("70%")
    ? 70
    : formData.commissionSplit?.includes("50%")
    ? 50
    : formData.commissionSplit?.includes("40%")
    ? 40
    : 60; // 60/40 standard

  const trainerPayout = Math.round((basePriceNum * splitPercent) / 100);
  const gymRevenue = Math.max(0, basePriceNum - trainerPayout);

  const visual = getPackageVisual(formData);
  const { gradient, IconComponent } = visual;

  return createPortal(
    <>
      <div className="member-form-backdrop" onClick={handleClose} />

      <section
        className={`member-form-modal ${step > 1 ? `is-page-${step}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pt-package-form-title"
        aria-describedby="pt-package-form-copy"
      >
        <div className="drawer-handle" />

        <button
          className="member-modal-close-btn cursor-pointer"
          type="button"
          aria-label="Close modal form"
          onClick={handleClose}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="member-form-modal-container">
          {/* PAGE 1: PACKAGE IDENTITY & CURRICULUM */}
          <div className="member-form-page" data-member-form-page="1">
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">STEP 1 • PT PACKAGE CURRICULUM</p>
                <h2 id="pt-package-form-title">
                  {editingPackage ? "Edit Personal Training Package" : "Create Personal Training Package"}
                </h2>
              </div>
            </div>
            <p id="pt-package-form-copy" className="member-form-copy">
              Define the core program identity, specialty category, designated coach tier, and fitness objectives.
            </p>
            {alertMessage && (
              <p className="member-form-alert" style={{ display: "block" }}>
                {alertMessage}
              </p>
            )}

            <div className="plans-empty-state-card registration-engine-card">
              <div className="plans-empty-grid-pattern"></div>
              <div className="plans-empty-content-wrap">
                <div className="plans-empty-topbar">
                  <div className="plans-status-pill">
                    <span className="plans-status-dot"></span>
                    <span className="plans-status-sub">{formData.category} Curriculum</span>
                  </div>
                  <div className="plans-tags-group">
                    <span className="plans-tag-item">
                      <Dumbbell size={13} strokeWidth={2.2} className="inline mr-1 text-indigo-600" />
                      Training Specialty
                    </span>
                    <span className="plans-tag-divider">•</span>
                    <span className="plans-tag-item">
                      <Award size={13} strokeWidth={2.2} className="inline mr-1 text-emerald-600" />
                      Coach Tier
                    </span>
                    <span className="plans-tag-divider">•</span>
                    <span className="plans-tag-item">
                      <Sparkles size={13} strokeWidth={2.2} className="inline mr-1 text-blue-600" />
                      Program Goals
                    </span>
                  </div>
                </div>

                <div className="registration-engine-grid">
                  <form className="member-form-grid registration-form-grid" noValidate onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                    {/* Row 1: Package Title & Classification */}
                    <label className="member-field" data-field-label="Package Name">
                      <span>Package Title <em>*</em></span>
                      <input
                        type="text"
                        placeholder="e.g. 12-Week Transformation Pro"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                        style={{
                          borderColor: errors.name ? "#ef4444" : undefined,
                          backgroundColor: errors.name ? "#fff5f5" : undefined
                        }}
                      />
                      {errors.name && <small className="member-field-error" style={{ display: "block", color: "#e11d48" }}>{errors.name}</small>}
                    </label>

                    <div className="member-field" data-field-label="Specialty Category">
                      <span>Specialty Category <em>*</em></span>
                      <CustomSelect
                        value={formData.category}
                        onChange={(val) => handleChange("category", val)}
                        options={PT_PACKAGE_CATEGORIES}
                      />
                      {errors.category && <small className="member-field-error" style={{ display: "block", color: "#e11d48" }}>{errors.category}</small>}
                    </div>

                    <div className="member-field" data-field-label="Coach Tier">
                      <span>Trainer Assignment Tier <em>*</em></span>
                      <CustomSelect
                        value={formData.trainerType}
                        onChange={(val) => handleChange("trainerType", val)}
                        options={["Elite Coaches", "Master Coaches", "Senior Coaches", "Specialist Coaches", "General Trainers"]}
                      />
                    </div>

                    {/* Row 2: Frequency, Intensity & Status */}
                    <div className="member-field" data-field-label="Weekly Frequency">
                      <span>Weekly Session Cadence <em>*</em></span>
                      <CustomSelect
                        value={formData.frequency}
                        onChange={(val) => handleChange("frequency", val)}
                        options={["3 sessions/week", "4 sessions/week", "5 sessions/week", "2 sessions/week", "Daily 1-on-1", "Flexible Schedule"]}
                      />
                    </div>

                    <div className="member-field" data-field-label="Program Focus">
                      <span>Primary Fitness Focus</span>
                      <CustomSelect
                        value={formData.intensityFocus}
                        onChange={(val) => handleChange("intensityFocus", val)}
                        options={["High Intensity Transformation", "Hypertrophy & Bulking", "Fat Loss & Conditioning", "Active Rehab & Posture", "Athletic Performance"]}
                      />
                    </div>

                    <div className="member-field" data-field-label="Catalog Status">
                      <span>Catalog Status</span>
                      <CustomSelect
                        value={formData.status}
                        onChange={(val) => handleChange("status", val)}
                        options={["active", "inactive"]}
                      />
                    </div>

                    {/* Row 3: Description & Program Objectives */}
                    <label className="member-field member-field-span-3" data-field-label="Curriculum Description">
                      <span>Curriculum Description &amp; Client Objectives</span>
                      <textarea
                        rows={2}
                        placeholder="Describe program goals, target clientele, assessment milestones, and fitness outcomes..."
                        value={formData.description}
                        onChange={(e) => handleChange("description", e.target.value)}
                        style={{ resize: "none" }}
                      />
                    </label>
                  </form>
                </div>

                {/* Integrated Card Footer */}
                <div className="registration-card-integrated-footer">
                  <div className="registration-footnote-item">
                    <span className="registration-footnote-star">*</span>
                    <span className="registration-footnote-text">Fields with an asterisk are required. Session quotas and commercials are set in the next step.</span>
                  </div>

                  <label className="registration-whatsapp-consent-toggle" htmlFor="pt-whatsapp-consent">
                    <input
                      type="checkbox"
                      id="pt-whatsapp-consent"
                      checked={whatsappConsent}
                      onChange={(e) => setWhatsappConsent(e.target.checked)}
                    />
                    <span className="custom-consent-checkbox" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </span>
                    <img className="whatsapp-official-badge-icon" src="/whatsapp-logo.png" alt="WhatsApp" width="16" height="16" />
                    <span className="consent-text-wrap">
                      <span className="consent-headline">WhatsApp client booking &amp; enrollment alerts</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* PAGE 2: SESSIONS, DURATION & COMMERCIALS */}
          <div className="member-form-page" data-member-form-page="2">
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">STEP 2 • SESSIONS &amp; COMMERCIALS</p>
                <h2 id="sessions-pricing-title">Sessions, Duration &amp; Commercials</h2>
              </div>
            </div>
            <p className="member-form-copy">
              Configure package duration, total personal training sessions, price, and trainer commission structure.
            </p>

            <div className="plans-empty-state-card registration-engine-card">
              <div className="plans-empty-grid-pattern"></div>
              <div className="plans-empty-content-wrap">
                <div className="plans-empty-topbar">
                  <div className="plans-status-pill">
                    <span className="plans-status-dot"></span>
                    <span className="plans-status-sub">Commercial Engine Active</span>
                  </div>
                  <div className="plans-tags-group">
                    <span className="plans-tag-item">
                      <Clock size={13} strokeWidth={2.2} className="inline mr-1 text-indigo-600" />
                      {formData.duration} Tenure
                    </span>
                    <span className="plans-tag-divider">•</span>
                    <span className="plans-tag-item">
                      <CheckCircle2 size={13} strokeWidth={2.2} className="inline mr-1 text-emerald-600" />
                      {formData.sessions} 1-on-1 Sessions
                    </span>
                    <span className="plans-tag-divider">•</span>
                    <span className="plans-tag-item">
                      <IndianRupee size={13} strokeWidth={2.2} className="inline mr-1 text-amber-600" />
                      INR Commercials
                    </span>
                  </div>
                </div>

                <div className="registration-engine-grid">
                  <div className="member-form-grid registration-form-grid">
                    <div className="member-field" data-field-label="Duration">
                      <span>Package Duration <em>*</em></span>
                      <CustomSelect
                        value={formData.duration}
                        onChange={(val) => handleChange("duration", val)}
                        options={["30 Days", "45 Days", "60 Days", "90 Days", "180 Days", "365 Days"]}
                      />
                    </div>

                    <label className="member-field" data-field-label="Sessions">
                      <span>Total 1-on-1 Sessions <em>*</em></span>
                      <input
                        type="number"
                        placeholder="e.g. 36"
                        value={formData.sessions}
                        onChange={(e) => handleChange("sessions", e.target.value)}
                        min="1"
                        required
                        style={{
                          borderColor: errors.sessions ? "#ef4444" : undefined,
                          backgroundColor: errors.sessions ? "#fff5f5" : undefined
                        }}
                      />
                      {errors.sessions && <small className="member-field-error" style={{ display: "block", color: "#e11d48" }}>{errors.sessions}</small>}
                    </label>

                    <div className="member-field" data-field-label="Validity">
                      <span>Package Validity Window</span>
                      <CustomSelect
                        value={formData.validity}
                        onChange={(val) => handleChange("validity", val)}
                        options={["30 Days", "45 Days", "60 Days", "90 Days", "120 Days (Buffer)", "180 Days", "365 Days"]}
                      />
                    </div>

                    <label className="member-field" data-field-label="Base Price">
                      <span>Base Package Price (₹ INR) <em>*</em></span>
                      <div className="relative mt-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                        <input
                          type="number"
                          placeholder="e.g. 45000"
                          value={formData.price}
                          onChange={(e) => handleChange("price", e.target.value)}
                          className="!pl-8 !min-h-[42px] !rounded-xl"
                          min="0"
                          required
                          style={{
                            borderColor: errors.price ? "#ef4444" : undefined,
                            backgroundColor: errors.price ? "#fff5f5" : undefined
                          }}
                        />
                      </div>
                      {errors.price && <small className="member-field-error" style={{ display: "block", color: "#e11d48" }}>{errors.price}</small>}
                    </label>

                    <div className="member-field" data-field-label="Commission Model">
                      <span>Trainer Commission Model</span>
                      <CustomSelect
                        value={formData.commissionSplit}
                        onChange={(val) => handleChange("commissionSplit", val)}
                        options={["60% Trainer / 40% Gym", "70% Trainer / 30% Gym", "50% Trainer / 50% Gym", "40% Trainer / 60% Gym", "Flat Retainer Per Session"]}
                      />
                    </div>

                    <div className="member-field" data-field-label="Client Commitment">
                      <span>Client Commitment Level</span>
                      <CustomSelect
                        value={formData.commitment}
                        onChange={(val) => handleChange("commitment", val)}
                        options={["High Intensity / Competitive", "Standard Commitment", "Beginner Friendly", "Maintenance & Rehab"]}
                      />
                    </div>

                    {/* Commercials Calculation Dossier Card with Dotted Theme */}
                    <div className="member-field member-field-span-3 member-field-wide">
                      <div className="relative rounded-2xl border-2 border-dotted border-slate-300 bg-slate-50/80 p-4 shadow-2xs mt-2 overflow-hidden">
                        <div
                          className="absolute inset-0 opacity-[0.25] pointer-events-none"
                          style={{
                            backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
                            backgroundSize: "14px 14px"
                          }}
                        />
                        <div className="relative z-10">
                          <div className="flex items-center justify-between border-b border-dashed border-slate-200/90 pb-2.5 mb-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-xs font-bold text-slate-700">Projected Commercials &amp; Split Breakdown</span>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                              {formData.commissionSplit}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Per-Session Rate</p>
                              <p className="text-xl font-black text-slate-900 mt-0.5">
                                ₹{calculatedPerSession.toLocaleString("en-IN")}
                                <span className="text-xs font-bold text-slate-400 ml-1">/session</span>
                              </p>
                              <p className="text-[10.5px] text-slate-500 mt-0.5">{sessionsNum} total appointments</p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Coach Payout</p>
                              <p className="text-xl font-black text-emerald-600 mt-0.5">
                                ₹{trainerPayout.toLocaleString("en-IN")}
                              </p>
                              <p className="text-[10.5px] text-slate-500 mt-0.5">{splitPercent}% coach payout share</p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gym Net Retained</p>
                              <p className="text-xl font-black text-indigo-600 mt-0.5">
                                ₹{gymRevenue.toLocaleString("en-IN")}
                              </p>
                              <p className="text-[10.5px] text-slate-500 mt-0.5">{100 - splitPercent}% facility revenue</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Integrated Card Footer */}
                <div className="registration-card-integrated-footer">
                  <div className="registration-footnote-item">
                    <span className="registration-footnote-star">*</span>
                    <span className="registration-footnote-text">Calculated rates update live. Commissions are tracked automatically upon session completion.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PAGE 3: INCLUSIONS, PERKS & LIVE SUMMARY */}
          <div className="member-form-page" data-member-form-page="3">
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">STEP 3 • INCLUSIONS &amp; LIVE DOSSIER</p>
                <h2 id="inclusions-title">Inclusions, Perks &amp; Live Summary</h2>
              </div>
            </div>
            <p className="member-form-copy">
              Curate value-added client inclusions and inspect the live dossier card before saving the PT package.
            </p>

            <div className="plans-empty-state-card registration-engine-card">
              <div className="plans-empty-grid-pattern"></div>
              <div className="plans-empty-content-wrap">
                <div className="plans-empty-topbar">
                  <div className="plans-status-pill">
                    <span className="plans-status-dot"></span>
                    <span className="plans-status-sub">{formData.features.length} Value Perks Attached</span>
                  </div>
                  <div className="plans-tags-group">
                    <span className="plans-tag-item">
                      <Shield size={13} strokeWidth={2.2} className="inline mr-1 text-emerald-600" />
                      Verified Amenities
                    </span>
                    <span className="plans-tag-divider">•</span>
                    <span className="plans-tag-item">
                      <CheckCircle2 size={13} strokeWidth={2.2} className="inline mr-1 text-indigo-600" />
                      Catalog Ready
                    </span>
                  </div>
                </div>

                <div className="registration-engine-grid">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Manage Features */}
                    <div className="lg:col-span-7 flex flex-col gap-3">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-0.5">
                        Client Inclusions &amp; Amenities
                      </span>

                      {/* Custom Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add custom inclusion (e.g. Weekly Body Composition Scans)..."
                          value={featureInput}
                          onChange={(e) => setFeatureInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addFeature();
                            }
                          }}
                          className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => addFeature()}
                          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-800 transition-colors shrink-0"
                        >
                          <Plus size={14} className="inline mr-1" /> Add
                        </button>
                      </div>

                      {/* Quick Add Presets */}
                      <div>
                        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Quick-Add Standard Perks
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {PRESET_INCLUSIONS.map((preset) => {
                            const isAdded = formData.features.includes(preset);
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => isAdded ? setFormData(p => ({ ...p, features: p.features.filter(f => f !== preset) })) : addFeature(preset)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                                  isAdded
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                    : "bg-white border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                                }`}
                              >
                                {isAdded ? <Check size={11} strokeWidth={3} /> : <Plus size={11} />}
                                <span>{preset}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Current Active Features */}
                      <div className="mt-2">
                        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Current Active Inclusions ({formData.features.length})
                        </span>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50/70 border-2 border-dotted border-slate-200 rounded-xl">
                          {formData.features.length === 0 ? (
                            <span className="text-xs text-slate-400 font-medium p-2">No inclusions added yet. Select from presets above.</span>
                          ) : (
                            formData.features.map((feat, i) => (
                              <span
                                key={i}
                                className="px-3 py-1.5 rounded-lg bg-white text-slate-700 text-xs font-bold flex items-center gap-2 border border-slate-200 shadow-2xs"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>{feat}</span>
                                <button
                                  type="button"
                                  onClick={() => removeFeature(i)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Remove"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Live PT Package Dossier Preview */}
                    <div className="lg:col-span-5">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                        Live Package Dossier Preview
                      </span>

                      <div className="relative rounded-2xl border-2 border-dotted border-slate-300 bg-white p-5 shadow-xs overflow-hidden">
                        <div
                          className="absolute inset-0 opacity-[0.25] pointer-events-none"
                          style={{
                            backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
                            backgroundSize: "14px 14px"
                          }}
                        />
                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-3">
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                              style={{ background: gradient }}
                            >
                              <IconComponent size={20} strokeWidth={2.2} />
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {formData.status || "active"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider">
                              {formData.category}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {formData.duration}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-slate-900 leading-snug">
                            {formData.name.trim() || "Untitled PT Package"}
                          </h3>

                          {formData.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                              {formData.description}
                            </p>
                          )}

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mt-3 mb-3">
                            <div className="flex items-baseline justify-between">
                              <span className="text-lg font-black text-slate-900">
                                ₹{basePriceNum.toLocaleString("en-IN")}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                ₹{calculatedPerSession.toLocaleString("en-IN")}/sess
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                              <span className="font-bold text-indigo-600">{formData.sessions} Sessions</span>
                              <span>•</span>
                              <span className="truncate">{formData.trainerType}</span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Included Perks ({formData.features.length})
                            </span>
                            <div className="space-y-1">
                              {formData.features.slice(0, 3).map((feat, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-xs text-slate-700">
                                  <Check size={11} className="text-emerald-500 shrink-0" strokeWidth={3} />
                                  <span className="truncate">{feat}</span>
                                </div>
                              ))}
                              {formData.features.length > 3 && (
                                <p className="text-[10.5px] text-slate-400 font-medium mt-1">
                                  +{formData.features.length - 3} more client amenities included
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="doc-upload-disclaimer" role="note">
              <div className="doc-upload-disclaimer-icon" aria-hidden="true">
                <Shield size={18} strokeWidth={2} />
              </div>
              <div className="doc-upload-disclaimer-copy">
                <strong>Personal training catalog compliance</strong>
                <p>
                  PT packages published to the catalog are instantly available for trainer assignment, client enrollment, and automated invoice calculation. Commissions are credited upon attendance logging.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SHARED FOOTER ACTIONS */}
        <div className="member-form-actions-footer">
          <div className="member-form-page-actions" data-for-page="1">
            <button className="dialog-btn dialog-btn-muted cursor-pointer" type="button" onClick={handleClose}>
              Cancel
            </button>
            <button className="dialog-btn dialog-btn-danger cursor-pointer" type="button" onClick={handleNext}>
              <span>NEXT</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-arrow-icon">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="member-form-page-actions" data-for-page="2">
            <button className="dialog-btn dialog-btn-muted cursor-pointer" type="button" onClick={handleBack}>
              ← Back
            </button>
            <button className="dialog-btn dialog-btn-danger cursor-pointer" type="button" onClick={handleNext}>
              <span>NEXT</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-arrow-icon">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="member-form-page-actions" data-for-page="3">
            <button className="dialog-btn dialog-btn-muted cursor-pointer" type="button" onClick={handleBack}>
              ← Back
            </button>
            <button className="dialog-btn dialog-btn-danger cursor-pointer" type="button" onClick={handleFinish}>
              {editingPackage ? "Save Package Changes" : "Create PT Package"}
            </button>
          </div>
        </div>
      </section>
    </>,
    document.body
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
