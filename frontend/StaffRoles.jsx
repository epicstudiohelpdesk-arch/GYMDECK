import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import {
  Users,
  Search,
  Plus,
  Filter,
  ChevronRight,
  Clock,
  Activity,
  CheckCircle2,
  Calendar,
  Shield,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  X,
  FileText,
  Camera,
  Check,
  Sparkles,
  ChevronDown,
  CalendarClock,
  IndianRupee,
  Key,
  Building,
  UserCheck,
  User,
  HeartPulse,
  BadgeCheck,
  TrendingUp,
  Layers,
  ArrowUpDown,
  MoreVertical,
  ExternalLink,
  Upload,
  Lock,
  Award,
  CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────
// CONSTANTS & CATALOGS (ZERO MOCK DATA)
// ─────────────────────────────────────────

const STAFF_ROLES = [
  {
    id: "FRONT_DESK",
    label: "Front Desk & Reception",
    department: "Operations",
    badge: "bg-sky-50 text-sky-700 border-sky-200/80",
    dot: "bg-sky-500",
    color: "bg-sky-500",
    permissions: ["ManageMembers", "ManageOwnProfile"]
  },
  {
    id: "FLOOR_MANAGER",
    label: "Floor Manager / Ops Supervisor",
    department: "Management",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    dot: "bg-indigo-500",
    color: "bg-indigo-500",
    permissions: ["ManageMembers", "ManageTrainers", "ViewReports", "ManageOwnProfile"]
  },
  {
    id: "ACCOUNTANT",
    label: "Accountant & Billing Exec",
    department: "Finance",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    dot: "bg-emerald-500",
    color: "bg-emerald-500",
    permissions: ["ManageFinances", "ViewReports", "ManageOwnProfile"]
  },
  {
    id: "PHYSIOTHERAPIST",
    label: "In-House Physiotherapist",
    department: "Wellness & Health",
    badge: "bg-rose-50 text-rose-700 border-rose-200/80",
    dot: "bg-rose-500",
    color: "bg-rose-500",
    permissions: ["ViewReports", "ManageOwnProfile"]
  },
  {
    id: "MAINTENANCE_EQUIPMENT",
    label: "Equipment & Maintenance Technician",
    department: "Facilities",
    badge: "bg-amber-50 text-amber-700 border-amber-200/80",
    dot: "bg-amber-500",
    color: "bg-amber-500",
    permissions: ["ManageOwnProfile"]
  },
  {
    id: "HOUSEKEEPING_PANTRY",
    label: "Housekeeping & Pantry Steward",
    department: "Facilities",
    badge: "bg-teal-50 text-teal-700 border-teal-200/80",
    dot: "bg-teal-500",
    color: "bg-teal-500",
    permissions: ["ManageOwnProfile"]
  },
  {
    id: "ADMIN_OFFICER",
    label: "General Administrator",
    department: "Management",
    badge: "bg-violet-50 text-violet-700 border-violet-200/80",
    dot: "bg-violet-500",
    color: "bg-violet-500",
    permissions: ["ManageMembers", "ManageFinances", "ViewReports", "ManageTrainers", "ManageOwnProfile"]
  },
  {
    id: "NUTRITION_DIETITIAN",
    label: "Clinical Dietitian / Nutritionist",
    department: "Wellness & Health",
    badge: "bg-orange-50 text-orange-700 border-orange-200/80",
    dot: "bg-orange-500",
    color: "bg-orange-500",
    permissions: ["ViewReports", "ManageOwnProfile"]
  }
];

const ROLE_OPTIONS = STAFF_ROLES.map(r => r.label);

const DEPARTMENTS = [
  "All Departments",
  "Operations",
  "Finance",
  "Management",
  "Wellness & Health",
  "Facilities"
];

const SHIFT_SCHEDULES = [
  "06:00 - 14:00 (Morning Shift)",
  "07:00 - 15:30 (Morning Peak)",
  "10:00 - 18:30 (General Day Shift)",
  "13:30 - 22:00 (Evening Closing Shift)",
  "22:00 - 06:00 (Overnight Facility Shift)",
  "Flexible / Split Shift"
];

const BRANCHES = ["Main Branch", "Downtown", "North Gym", "East Side"];

const PERMISSIONS = [
  { id: "ManageMembers", label: "Manage Members", description: "Create, view, update and manage member records & attendance." },
  { id: "ManageFinances", label: "Manage Finances", description: "Billing receipts, cash collection, fee waivers and reports." },
  { id: "ManageSystem", label: "Manage System", description: "System configuration, audit trail, integrations & hardware." },
  { id: "ViewReports", label: "View Reports", description: "Business analytics, revenue logs, trends & rosters." },
  { id: "ManageTrainers", label: "Manage Staff & Trainers", description: "Staff roster, work assignments, compensation." },
  { id: "ManageOwnProfile", label: "Manage Own Profile", description: "Self profile information & personal security pin." }
];

// Helper to generate initials avatar SVG
const getInitialsAvatar = (name) => {
  const cleanName = (name || "Staff").trim();
  const parts = cleanName.split(" ").filter(Boolean);
  const initials = parts.length > 1 
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() 
    : cleanName.slice(0, 2).toUpperCase();
  
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%234f46e5"/><text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="800" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
};

// ─────────────────────────────────────────
// UI HELPER COMPONENTS WITH DOTTED DESIGN
// ─────────────────────────────────────────

const StatCard = ({ label, value, hint, icon: Icon, tone = "indigo" }) => {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100"
  };
  const toneClass = tones[tone] || tones.indigo;

  return (
    <div className="relative rounded-2xl border-2 border-dotted border-slate-300 hover:border-indigo-400 bg-white/90 p-3.5 sm:p-4 shadow-xs transition-all duration-200 overflow-hidden group">
      {/* Subtle technical background grid dots */}
      <div 
        className="absolute inset-0 opacity-[0.35] pointer-events-none group-hover:opacity-[0.55] transition-opacity"
        style={{
          backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
          backgroundSize: "14px 14px"
        }}
      />
      <div className="relative z-10 flex flex-col justify-between gap-2.5 h-full">
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate min-w-0" title={label}>
            {label}
          </span>
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${toneClass}`}>
            <Icon size={16} strokeWidth={2.4} />
          </div>
        </div>
        <div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
            {value}
          </p>
          <p className="mt-1.5 text-[11px] font-medium text-slate-500 truncate" title={hint}>
            {hint}
          </p>
        </div>
      </div>
    </div>
  );
};

const CustomDropdown = ({ label, value, options, onChange, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) =>
    typeof opt === "string" ? opt === value : opt.value === value
  );

  const displayLabel = selectedOption
    ? typeof selectedOption === "string"
      ? selectedOption
      : selectedOption.label
    : label;

  const isSelected = value && value !== "All" && value !== "All Departments" && value !== "All Shifts" && value !== "All Status";

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border cursor-pointer select-none ${
          isSelected
            ? "bg-indigo-50/80 border-indigo-300 text-indigo-900 shadow-xs ring-1 ring-indigo-200/50"
            : isOpen
            ? "bg-white border-slate-300 text-slate-900 shadow-sm ring-2 ring-indigo-500/10"
            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50/80 hover:border-slate-300 shadow-xs"
        }`}
      >
        {Icon && (
          <Icon
            size={13}
            className={`shrink-0 transition-colors ${
              isSelected ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
            }`}
          />
        )}
        <span className="truncate max-w-[130px]">{displayLabel}</span>
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 mt-1.5 min-w-[210px] max-h-72 overflow-y-auto bg-white rounded-xl shadow-xl shadow-slate-900/10 border border-slate-200/90 py-1.5 z-[250] focus:outline-none"
          >
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
              {label}
            </div>
            {options.map((opt) => {
              const optVal = typeof opt === "string" ? opt : opt.value;
              const optLabel = typeof opt === "string" ? opt : opt.label;
              const optCount = typeof opt === "object" ? opt.count : undefined;
              const optColor = typeof opt === "object" ? opt.color : undefined;
              const isItemActive = value === optVal;

              return (
                <button
                  key={optVal}
                  type="button"
                  onClick={() => {
                    onChange(optVal);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer text-left ${
                    isItemActive
                      ? "bg-indigo-50/70 text-indigo-900 font-bold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {optColor && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${optColor}`} />
                    )}
                    <span className="truncate">{optLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {optCount !== undefined && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isItemActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {optCount}
                      </span>
                    )}
                    {isItemActive && (
                      <Check size={13} className="text-indigo-600 stroke-[2.5]" />
                    )}
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CustomSelect = ({ value, onChange, placeholder, options, grid = "" }) => {
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
    : placeholder;

  return (
    <div ref={selectRef} className={`custom-select-wrapper ${isOpen ? "is-open" : ""}`}>
      <div
        className="custom-dropdown-trigger"
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
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const CustomDatePicker = ({ value, displayValue, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(1996);
  const [viewMonth, setViewMonth] = useState(4);
  const [viewMode, setViewMode] = useState("day");
  const pickerRef = useRef(null);
  const yearsContainerRef = useRef(null);

  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day) => {
    const formattedDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const displayStr = `${day} ${MONTH_NAMES[viewMonth].substring(0, 3)} ${viewYear}`;
    onChange(formattedDate, displayStr);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("", "");
    setIsOpen(false);
  };

  const years = Array.from({ length: 55 }, (_, i) => 1960 + i);

  return (
    <div className={`date-input-wrap ${isOpen ? "is-open" : ""}`} ref={pickerRef} style={{ position: "relative" }}>
      <input
        className="date-display-input"
        type="text"
        placeholder="Select date of birth"
        readOnly
        required
        value={displayValue || ""}
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: "pointer" }}
      />
      <button
        className="date-picker-btn"
        type="button"
        aria-label="Open date picker"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4v4" />
          <path d="M17 4v4" />
          <rect x="4" y="6.5" width="16" height="13" rx="3" />
          <path d="M4 10h16" />
          <path d="M8 13h3" />
        </svg>
      </button>

      {isOpen && (
        <section
          className="date-picker-panel"
          style={{
            display: "block",
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 10050
          }}
        >
          <div className="date-picker-header">
            <div className="date-picker-header-copy">
              <span className="date-picker-label">Choose Date</span>
              <button
                className="date-picker-title"
                type="button"
                onClick={() => setViewMode(viewMode === "day" ? "year" : "day")}
              >
                <strong>{MONTH_NAMES[viewMonth]} {viewYear}</strong>
                <span>{viewMode === "day" ? "Choose Year" : "Choose Day"}</span>
              </button>
            </div>
            <div className="date-picker-nav">
              <button type="button" aria-label="Previous month" onClick={handlePrevMonth}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m14 6-6 6 6 6" />
                </svg>
              </button>
              <button type="button" aria-label="Next month" onClick={handleNextMonth}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m10 6 6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>

          {viewMode === "day" ? (
            <>
              <div className="date-picker-weekdays" aria-hidden="true">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>
              <div className="date-picker-grid">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <span key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isSelected =
                    value === `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  return (
                    <button
                      key={`day-${day}`}
                      type="button"
                      className={`date-picker-day ${isSelected ? "is-selected" : ""}`}
                      onClick={() => handleSelectDay(day)}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="date-picker-years" ref={yearsContainerRef} style={{ maxHeight: "180px", overflowY: "auto" }}>
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  className={`date-picker-year ${y === viewYear ? "is-selected" : ""}`}
                  onClick={() => {
                    setViewYear(y);
                    setViewMode("day");
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          <div className="date-picker-actions">
            <button type="button" onClick={handleClear}>Clear</button>
            <button type="button" onClick={() => setIsOpen(false)}>Done</button>
          </div>
        </section>
      )}
    </div>
  );
};

// ─────────────────────────────────────────
// PROFILE DRAWER COMPONENT
// ─────────────────────────────────────────

const StaffProfileDrawer = ({ staff, isOpen, onClose }) => {
  if (!staff) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[540px] bg-white shadow-2xl z-[101] overflow-y-auto"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Employee Dossier
                </span>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  aria-label="Close drawer"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Profile Card Header with dotted boundary */}
              <div className="relative rounded-2xl border-2 border-dotted border-slate-200/90 bg-slate-50/60 p-5 mb-8 overflow-hidden">
                <div 
                  className="absolute inset-0 opacity-[0.35] pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
                    backgroundSize: "16px 16px"
                  }}
                />
                <div className="relative z-10 flex items-start gap-4">
                  <img
                    src={staff.image || getInitialsAvatar(staff.name)}
                    alt={staff.name}
                    className="w-18 h-18 rounded-2xl bg-white object-cover shadow-sm ring-1 ring-slate-200/90"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-slate-900 truncate">{staff.name}</h2>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                        {staff.status}
                      </span>
                    </div>
                    <p className="text-indigo-600 font-bold text-xs mt-0.5">{staff.role}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                        <Shield size={14} /> {staff.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                        <Building size={14} /> {staff.department}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                        <MapPin size={14} /> {staff.branch}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Email Address</p>
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                    <Mail size={13} className="text-slate-400 shrink-0" /> {staff.email || "Not specified"}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Phone Number</p>
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Phone size={13} className="text-slate-400 shrink-0" /> {staff.phone}
                  </p>
                </div>
              </div>

              {/* Compensation & Contract with Dotted Border */}
              <section className="mb-6 p-4.5 rounded-2xl border-2 border-dotted border-slate-300 bg-gradient-to-br from-white to-slate-50/70 relative overflow-hidden">
                <div 
                  className="absolute inset-0 opacity-[0.25] pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
                    backgroundSize: "16px 16px"
                  }}
                />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <IndianRupee size={15} className="text-emerald-600" /> Compensation &amp; Contract
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                      {staff.employmentType}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Base Salary</span>
                      <p className="text-lg font-black text-slate-900">
                        ₹{Number(staff.baseSalary || 0).toLocaleString("en-IN")}{" "}
                        <span className="text-[11px] font-bold text-slate-400">/{staff.salaryFrequency || "mo"}</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Bonuses &amp; Incentives</span>
                      <p className="text-xs font-bold text-slate-800 mt-1">
                        {staff.bonusAmount ? `+ ₹${Number(staff.bonusAmount).toLocaleString("en-IN")}` : "No bonus configured"}
                      </p>
                      {staff.bonusType && (
                        <p className="text-[10.5px] text-slate-500 font-medium truncate">{staff.bonusType}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs font-medium text-slate-600">
                    <span>Contract Terms: <strong className="text-slate-900">{staff.contractDuration}</strong></span>
                    <span>Joined: <strong className="text-slate-900">{staff.joiningDate || "Active"}</strong></span>
                  </div>
                </div>
              </section>

              {/* Shift & Work Timing */}
              <section className="mb-6">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Clock size={15} className="text-indigo-600" /> Work Timing &amp; Schedule
                </h4>
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Designated Shift</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{staff.shift}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Roster Days</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{staff.workingDays || "Mon - Sat"}</p>
                  </div>
                </div>
              </section>

              {/* Granted RBAC Capabilities */}
              <section className="mb-6">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Key size={15} className="text-violet-600" /> System Permissions &amp; Roles
                </h4>
                <div className="space-y-1.5">
                  {PERMISSIONS.map((p) => {
                    const hasP = staff.permissions && staff.permissions.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                          hasP ? "bg-indigo-50/50 border-indigo-100 text-indigo-950 font-semibold" : "bg-white border-slate-100 text-slate-400 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${hasP ? "bg-indigo-600" : "bg-slate-300"}`} />
                          <span>{p.label}</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {hasP ? "Authorized" : "Restricted"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Emergency Contact */}
              {staff.emergencyContact && (
                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 mb-8">
                  <HeartPulse size={16} className="text-amber-600 shrink-0" />
                  <span>Emergency: <strong>{staff.emergencyContact}</strong></span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 sticky bottom-0 bg-white pb-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────
// ADD STAFF MODAL (5-STEP WIZARD)
// ─────────────────────────────────────────

const AddStaffModal = ({ isOpen, onClose, onStaffAdded, totalStaffCount = 0 }) => {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [alertMessage, setAlertMessage] = useState("");
  const [isPhotoDragging, setIsPhotoDragging] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [showCameraNote, setShowCameraNote] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    alternatePhone: "",
    email: "",
    gender: "",
    dob: "",
    dobDisplay: "",
    bloodGroup: "",
    address: "",
    role: "Front Desk & Reception",
    department: "Operations",
    branch: "Main Branch",
    shift: "06:00 - 14:00 (Morning Shift)",
    workingDays: "Mon - Sat",
    employmentType: "Full-Time Staff",
    baseSalary: "",
    salaryFrequency: "Monthly",
    bonusType: "Performance & Punctuality Incentive",
    bonusAmount: "",
    contractDuration: "Permanent / Open-Ended",
    permissions: ["ManageMembers", "ManageOwnProfile"],
    emergencyContact: "",
    status: "active"
  });

  const photoInputRef = useRef(null);
  const aadhaarInputRef = useRef(null);
  const resumeInputRef = useRef(null);

  const [documents, setDocuments] = useState({
    aadhaar: null,
    resume: null
  });

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setCurrentStep(1);
      setErrors({});
      setAlertMessage("");
      setShowCameraNote(false);

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
  }, [isOpen]);

  if (!mounted && !isOpen) return null;

  const handleClose = () => {
    document.body.classList.remove("member-form-open");
    document.body.style.overflow = "";
    setTimeout(() => {
      onClose();
      setCurrentStep(1);
    }, 600);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "role") {
        const foundRole = STAFF_ROLES.find(r => r.label === value);
        if (foundRole) {
          next.department = foundRole.department;
          next.permissions = [...foundRole.permissions];
        }
      }
      return next;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const togglePermission = (permId) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permId);
      const updated = exists
        ? prev.permissions.filter((p) => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: updated };
    });
  };

  const processPhotoFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processPhotoFile(file);
  };

  const handlePhotoDrop = (e) => {
    e.preventDefault();
    setIsPhotoDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processPhotoFile(file);
  };

  const handleDocUpload = (type, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === "application/pdf";
    const preview = isPdf ? null : URL.createObjectURL(file);
    const size = (file.size / 1024).toFixed(1) + " KB";
    setDocuments((prev) => ({
      ...prev,
      [type]: { name: file.name, size, isPdf, preview }
    }));
  };

  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      if (!formData.fullName.trim()) errs.fullName = "Please enter staff member's full name.";
      if (!formData.phone.trim()) {
        errs.phone = "Phone number is required.";
      } else if (!/^\+?[0-9\s-]{10,14}$/.test(formData.phone.trim())) {
        errs.phone = "Please enter a valid phone number (10+ digits).";
      }
      if (!formData.dob) errs.dob = "Please select date of birth.";
      if (!formData.gender) errs.gender = "Please select gender.";
      if (!formData.address.trim()) errs.address = "Please enter residential address.";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setAlertMessage("Please complete all mandatory fields marked with an asterisk (*).");
      return false;
    }
    setAlertMessage("");
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep(1)) return;
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setAlertMessage("");
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }

    const cleanName = formData.fullName.trim();
    const newStaff = {
      id: `EMP-${200 + totalStaffCount + 1}`,
      name: cleanName,
      role: formData.role,
      department: formData.department,
      branch: formData.branch,
      shift: formData.shift,
      workingDays: formData.workingDays,
      status: formData.status,
      phone: formData.phone.trim(),
      alternatePhone: formData.alternatePhone.trim(),
      email: formData.email.trim(),
      gender: formData.gender,
      dob: formData.dob,
      bloodGroup: formData.bloodGroup,
      address: formData.address.trim(),
      employmentType: formData.employmentType,
      baseSalary: Number(formData.baseSalary) || 25000,
      salaryFrequency: formData.salaryFrequency,
      bonusType: formData.bonusType,
      bonusAmount: Number(formData.bonusAmount) || 0,
      contractDuration: formData.contractDuration,
      joiningDate: new Date().toISOString().split("T")[0],
      permissions: formData.permissions.length > 0 ? formData.permissions : ["ManageOwnProfile"],
      attendanceRate: 100,
      rating: 5.0,
      emergencyContact: formData.emergencyContact || "Not recorded",
      image: photoPreview || getInitialsAvatar(cleanName)
    };

    onStaffAdded(newStaff);
    handleClose();
  };

  const baseSalaryNum = Number(formData.baseSalary) || 0;
  const bonusNum = Number(formData.bonusAmount) || 0;
  const totalMonthlyCompensation = baseSalaryNum + bonusNum;

  return createPortal(
    <>
      <div className="member-form-backdrop" onClick={handleClose} />

      <section
        className={`member-form-modal ${currentStep > 1 ? `is-page-${currentStep}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-form-title"
        aria-describedby="staff-form-copy"
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
          {/* PAGE 1: REGISTRATION ENGINE */}
          <div className="member-form-page" data-member-form-page="1">
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">New Registration</p>
                <h2 id="staff-form-title">Add New Staff</h2>
              </div>
            </div>
            <p id="staff-form-copy" className="member-form-copy">
              Start a clean new staff profile with all key employee information captured in one focused flow.
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
                  <div className="plans-tags-group">
                    <span className="plans-tag-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Personal details
                    </span>
                    <span className="plans-tag-divider">•</span>
                    <span className="plans-tag-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      Role &amp; shift timings
                    </span>
                    <span className="plans-tag-divider">•</span>
                    <span className="plans-tag-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      Address
                    </span>
                  </div>
                </div>

                <div className="registration-engine-grid">
                  <form className="member-form-grid registration-form-grid" noValidate onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                    {/* Row 1: Primary Identity & Contact */}
                    <label className="member-field" data-field-label="Full Name">
                      <span>Full Legal Name <em>*</em></span>
                      <input
                        type="text"
                        placeholder="Enter staff legal name"
                        value={formData.fullName}
                        onChange={(e) => handleChange("fullName", e.target.value)}
                        required
                        style={{
                          borderColor: errors.fullName ? "#ef4444" : undefined,
                          backgroundColor: errors.fullName ? "#fff5f5" : undefined
                        }}
                      />
                      {errors.fullName && <small className="member-field-error" style={{ display: "block", color: "#e11d48" }}>{errors.fullName}</small>}
                    </label>

                    <label className="member-field" data-field-label="Contact Number">
                      <span>Contact Number <em>*</em></span>
                      <input
                        type="tel"
                        placeholder="Enter primary contact"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        required
                        style={{
                          borderColor: errors.phone ? "#ef4444" : undefined,
                          backgroundColor: errors.phone ? "#fff5f5" : undefined
                        }}
                      />
                      {errors.phone && <small className="member-field-error" style={{ display: "block", color: "#e11d48" }}>{errors.phone}</small>}
                    </label>

                    <label className="member-field" data-field-label="Official Email">
                      <span>Email Address</span>
                      <input
                        type="email"
                        placeholder="Enter official or personal email"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                      />
                    </label>

                    {/* Row 2: Secondary Contact & Demographics */}
                    <label className="member-field" data-field-label="Date of Birth">
                      <span>Date of Birth <em>*</em></span>
                      <CustomDatePicker
                        value={formData.dob}
                        displayValue={formData.dobDisplay}
                        onChange={(val, disp) => {
                          handleChange("dob", val);
                          handleChange("dobDisplay", disp);
                        }}
                      />
                      {errors.dob && <small className="member-field-error" style={{ display: "block", color: "#e11d48" }}>{errors.dob}</small>}
                    </label>

                    <div className="member-field" data-field-label="Gender">
                      <span>Gender <em>*</em></span>
                      <CustomSelect
                        value={formData.gender}
                        onChange={(val) => handleChange("gender", val)}
                        placeholder="Select gender"
                        options={["Male", "Female", "Other"]}
                        grid="grid-3"
                      />
                      {errors.gender && <small className="member-field-error" style={{ display: "block", color: "#e11d48" }}>{errors.gender}</small>}
                    </div>

                    <div className="member-field" data-field-label="Blood Group">
                      <span>Blood Group</span>
                      <CustomSelect
                        value={formData.bloodGroup}
                        onChange={(val) => handleChange("bloodGroup", val)}
                        placeholder="Select Blood Group (Optional)"
                        options={["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]}
                        grid="grid-2"
                      />
                    </div>

                    {/* Row 3: Residential Address (Full Width) */}
                    <label className="member-field member-field-span-3" data-field-label="Address">
                      <span>Address <em>*</em></span>
                      <textarea
                        rows={1}
                        placeholder="Enter complete residential address"
                        value={formData.address}
                        onChange={(e) => handleChange("address", e.target.value)}
                        required
                        style={{
                          resize: "none",
                          borderColor: errors.address ? "#ef4444" : undefined,
                          backgroundColor: errors.address ? "#fff5f5" : undefined
                        }}
                      />
                      {errors.address && <small className="member-field-error" style={{ display: "block", color: "#e11d48" }}>{errors.address}</small>}
                    </label>

                    {/* Row 4: Emergency Contact */}
                    <label className="member-field member-field-span-3" data-field-label="Emergency Contact">
                      <span>Emergency Contact Person &amp; Phone</span>
                      <input
                        type="text"
                        placeholder="e.g. Sangeetha (Spouse) • +91 98888 77665"
                        value={formData.emergencyContact}
                        onChange={(e) => handleChange("emergencyContact", e.target.value)}
                      />
                    </label>
                  </form>
                </div>

                {/* Registration Card Integrated Footer */}
                <div className="registration-card-integrated-footer">
                  <div className="registration-footnote-item">
                    <span className="registration-footnote-star">*</span>
                    <span className="registration-footnote-text">Fields with an asterisk are required. Documents and shift timings can be configured in subsequent steps.</span>
                  </div>

                  <label className="registration-whatsapp-consent-toggle" htmlFor="staff-whatsapp-consent">
                    <input
                      type="checkbox"
                      id="staff-whatsapp-consent"
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
                      <span className="consent-headline">WhatsApp notifications &amp; updates</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* PAGE 2: IDENTITY CAPTURE */}
          <div className="member-form-page" data-member-form-page="2">
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">Identity Capture</p>
                <h2 id="photo-upload-title">Capture Staff Portrait</h2>
              </div>
            </div>
            <p className="member-form-copy">
              Please upload a clear profile photo of the staff member for security badge identification and front-desk roster.
            </p>

            <div className="plans-empty-state-card identity-engine-card">
              <div className="plans-empty-grid-pattern"></div>
              <div className="plans-empty-content-wrap">
                <div className="plans-empty-topbar">
                  <div className="plans-status-pill">
                    <span className="plans-status-dot"></span>
                    <span className="plans-status-sub">{photoPreview ? "Portrait Attached" : "Awaiting Portrait"}</span>
                  </div>
                  <div className="plans-tags-group">
                    <span className="plans-tag-item">
                      <Shield size={13} strokeWidth={2.2} className="inline mr-1 text-indigo-600" />
                      Verified Staff Badge
                    </span>
                    <span className="plans-tag-divider">•</span>
                    <span className="plans-tag-item">
                      <Lock size={13} strokeWidth={2.2} className="inline mr-1 text-emerald-600" />
                      Encrypted Local Storage
                    </span>
                  </div>
                </div>

                <div className="identity-engine-grid">
                  <div className="identity-engine-left">
                    <div className="photo-capture-container">
                      <div
                        className={`photo-preview-circle ${photoPreview ? "has-photo" : ""} ${isPhotoDragging ? "ring-4 ring-indigo-500 scale-105" : ""}`}
                        onClick={() => photoInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsPhotoDragging(true); }}
                        onDragLeave={() => setIsPhotoDragging(false)}
                        onDrop={handlePhotoDrop}
                        title="Click or drag a photo here"
                      >
                        {photoPreview ? (
                          <img src={photoPreview} alt="Staff preview" />
                        ) : formData.fullName.trim() ? (
                          <div className="photo-placeholder-icon">
                            <img
                              src={getInitialsAvatar(formData.fullName.trim())}
                              alt="Avatar"
                              className="w-20 h-20 rounded-2xl mb-1 opacity-90 shadow-sm"
                            />
                            <span>Upload Photo</span>
                            <small>Click to browse files</small>
                          </div>
                        ) : (
                          <div className="photo-placeholder-icon">
                            <span className="photo-placeholder-glyph" aria-hidden="true">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.5 4h-5L8 6H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3z" />
                                <circle cx="12" cy="13" r="3.5" />
                              </svg>
                            </span>
                            <span>Upload Photo</span>
                            <small>Click to browse files</small>
                          </div>
                        )}
                        <span className="photo-upload-badge" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 16V4" />
                            <path d="m7 9 5-5 5 5" />
                            <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
                          </svg>
                        </span>
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          hidden
                        />
                      </div>
                      <div className="photo-capture-meta">
                        <div className="photo-capture-tips">
                          <span className="photo-tip">
                            <User size={12} strokeWidth={2.2} />
                            Front-facing
                          </span>
                          <span className="photo-tip">
                            <FileText size={12} strokeWidth={2.2} />
                            JPG or PNG
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="identity-engine-right">
                    <div className="identity-engine-info">
                      <h3 className="plans-empty-title">Add a clear staff portrait</h3>
                      <p className="plans-empty-desc">
                        Upload a front-facing photo for employee identification, biometric entry, and security badge generation. The portrait is stored with the staff profile and can be replaced before finishing.
                      </p>
                    </div>
                    <div className="identity-engine-actions">
                      <button
                        type="button"
                        className="btn-plan-create cursor-pointer"
                        onClick={() => photoInputRef.current?.click()}
                      >
                        <Upload size={14} strokeWidth={2.4} />
                        <span>Upload Photo</span>
                      </button>
                      <button
                        type="button"
                        className="btn-use-camera cursor-pointer"
                        onClick={() => setShowCameraNote((prev) => !prev)}
                      >
                        <Camera size={14} strokeWidth={2.2} />
                        <span>Use Camera</span>
                      </button>
                      {photoPreview && (
                        <button
                          type="button"
                          className="btn-change-photo is-visible cursor-pointer"
                          onClick={() => photoInputRef.current?.click()}
                        >
                          <span>Change Photo</span>
                        </button>
                      )}
                    </div>

                    {showCameraNote && (
                      <div className="camera-unavailable-note" style={{ display: "flex" }}>
                        <span className="camera-unavailable-icon" aria-hidden="true">
                          <Camera size={16} />
                        </span>
                        <div className="camera-unavailable-copy">
                          <strong>Use Camera is available only on mobile</strong>
                          <p>
                            Camera capture works exclusively in the GYMDECK mobile app. Install GYMDECK from the Google Play Store or Apple App Store to take or update staff photos with your device camera.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="camera-unavailable-close cursor-pointer"
                          onClick={() => setShowCameraNote(false)}
                          aria-label="Dismiss message"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    <div className="identity-engine-specs">
                      <div className="plans-spec-card">
                        <div className="plans-spec-icon-wrap is-emerald">
                          <CheckCircle size={15} strokeWidth={2.4} />
                        </div>
                        <div className="plans-spec-text">
                          <span className="plans-spec-title">Identity Verification</span>
                          <span className="plans-spec-sub">Portrait is linked to staff badge and duty log</span>
                        </div>
                      </div>
                      <div className="plans-spec-card">
                        <div className="plans-spec-icon-wrap is-indigo">
                          <Lock size={15} strokeWidth={2.4} />
                        </div>
                        <div className="plans-spec-text">
                          <span className="plans-spec-title">Encrypted Local Storage</span>
                          <span className="plans-spec-sub">Saved with the employee record in GymDeck's local store</span>
                        </div>
                      </div>
                      <div className="plans-spec-card">
                        <div className="plans-spec-icon-wrap is-blue">
                          <Award size={15} strokeWidth={2.4} />
                        </div>
                        <div className="plans-spec-text">
                          <span className="plans-spec-title">Staff Badge Ready</span>
                          <span className="plans-spec-sub">Auto-cropped portrait for security badge and duty roster</span>
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
                <strong>Photo guidelines &amp; privacy</strong>
                <p>
                  Use a clear, front-facing photo with even lighting and no filters. The image is used only for identification and staff badge generation, and is stored with the employee's profile in GymDeck's local data store. You can replace or remove it at any time before finishing.
                </p>
              </div>
            </div>
          </div>

          {/* PAGE 3: DOCUMENT UPLOAD */}
          <div className="member-form-page" data-member-form-page="3">
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">Document Upload</p>
                <h2 id="doc-upload-title">Upload Staff Documents &amp; KYC</h2>
              </div>
            </div>
            <p className="member-form-copy">
              Attach official identity proof and professional CV / resume for HR record keeping and compliance.
            </p>

            <div className="doc-upload-grid">
              {/* Aadhaar Card */}
              <div className="doc-upload-card" data-doc-type="aadhaar">
                <div className="doc-upload-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <circle cx="8" cy="11" r="2" />
                    <path d="M5.5 16c.4-1.4 1.4-2 2.5-2s2.1.6 2.5 2" />
                    <path d="M14 10h5M14 13h5M14 16h3" />
                  </svg>
                </div>
                <div className="doc-upload-card-content">
                  <strong>Aadhaar / National ID Proof <em>*</em></strong>
                  <span>Government identity verification document (front &amp; back)</span>
                  <div className="doc-upload-card-actions">
                    <input
                      ref={aadhaarInputRef}
                      className="doc-upload-input"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                      onChange={(e) => handleDocUpload("aadhaar", e)}
                      hidden
                    />
                    <button
                      className="doc-upload-trigger cursor-pointer"
                      type="button"
                      onClick={() => aadhaarInputRef.current?.click()}
                    >
                      <svg className="doc-upload-trigger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 16V4" />
                        <path d="m7 9 5-5 5 5" />
                        <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
                      </svg>
                      Upload
                    </button>
                    <span className="doc-upload-meta">
                      {documents.aadhaar ? `${documents.aadhaar.name} (${documents.aadhaar.size})` : "No file selected"}
                    </span>
                    {documents.aadhaar && (
                      <div className="doc-upload-preview">
                        {documents.aadhaar.isPdf ? (
                          <div className="doc-upload-preview-pdf">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="doc-pdf-icon-svg">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            <span className="doc-pdf-label-tag">PDF</span>
                          </div>
                        ) : (
                          <img className="doc-upload-preview-image" src={documents.aadhaar.preview} alt="Aadhaar" />
                        )}
                        <button
                          className="doc-upload-remove cursor-pointer"
                          type="button"
                          aria-label="Remove"
                          onClick={() => setDocuments((prev) => ({ ...prev, aadhaar: null }))}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M6 6 18 18" />
                            <path d="M18 6 6 18" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Resume / Experience Certificate */}
              <div className="doc-upload-card" data-doc-type="resume">
                <div className="doc-upload-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="doc-upload-card-content">
                  <strong>Employee Resume / Experience Certificate</strong>
                  <span>Prior employment credentials &amp; certifications</span>
                  <div className="doc-upload-card-actions">
                    <input
                      ref={resumeInputRef}
                      className="doc-upload-input"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                      onChange={(e) => handleDocUpload("resume", e)}
                      hidden
                    />
                    <button
                      className="doc-upload-trigger cursor-pointer"
                      type="button"
                      onClick={() => resumeInputRef.current?.click()}
                    >
                      <svg className="doc-upload-trigger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 16V4" />
                        <path d="m7 9 5-5 5 5" />
                        <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
                      </svg>
                      Upload
                    </button>
                    <span className="doc-upload-meta">
                      {documents.resume ? `${documents.resume.name} (${documents.resume.size})` : "No file selected"}
                    </span>
                    {documents.resume && (
                      <div className="doc-upload-preview">
                        {documents.resume.isPdf ? (
                          <div className="doc-upload-preview-pdf">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="doc-pdf-icon-svg">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            <span className="doc-pdf-label-tag">PDF</span>
                          </div>
                        ) : (
                          <img className="doc-upload-preview-image" src={documents.resume.preview} alt="Resume" />
                        )}
                        <button
                          className="doc-upload-remove cursor-pointer"
                          type="button"
                          aria-label="Remove"
                          onClick={() => setDocuments((prev) => ({ ...prev, resume: null }))}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M6 6 18 18" />
                            <path d="M18 6 6 18" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="doc-upload-disclaimer" role="note">
              <div className="doc-upload-disclaimer-icon" aria-hidden="true">
                <Shield size={18} strokeWidth={2} />
              </div>
              <div className="doc-upload-disclaimer-copy">
                <strong>KYC &amp; privacy compliance</strong>
                <p>
                  Employee identity documents are stored securely with strict administrative access control. GYMDECK complies with employee data privacy protocols.
                </p>
              </div>
            </div>
          </div>

          {/* PAGE 4: ROLE ASSIGNMENT & SHIFT TIMINGS */}
          <div className="member-form-page" data-member-form-page="4">
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">Designation &amp; Shift Timings</p>
                <h2 id="role-shift-title">Designated Role &amp; Work Shift</h2>
              </div>
            </div>
            <p className="member-form-copy">
              Assign staff designation, assigned gym branch, floor duty shift, and system access permissions.
            </p>

            <div className="plans-empty-state-card registration-engine-card">
              <div className="plans-empty-grid-pattern"></div>
              <div className="plans-empty-content-wrap">
                <div className="plans-empty-topbar">
                  <div className="plans-status-pill">
                    <span className="plans-status-dot"></span>
                    <span className="plans-status-sub">{formData.role}</span>
                  </div>
                  <div className="plans-tags-group">
                    <span className="plans-tag-item">
                      <Briefcase size={13} strokeWidth={2.2} className="inline mr-1 text-indigo-600" />
                      {formData.department}
                    </span>
                    <span className="plans-tag-divider">•</span>
                    <span className="plans-tag-item">
                      <MapPin size={13} strokeWidth={2.2} className="inline mr-1 text-emerald-600" />
                      {formData.branch}
                    </span>
                    <span className="plans-tag-divider">•</span>
                    <span className="plans-tag-item">
                      <Clock size={13} strokeWidth={2.2} className="inline mr-1 text-blue-600" />
                      {formData.workingDays}
                    </span>
                  </div>
                </div>

                <div className="registration-engine-grid">
                  <div className="member-form-grid registration-form-grid">
                    <div className="member-field" data-field-label="Designated Role">
                      <span>Designated Role / Title <em>*</em></span>
                      <CustomSelect
                        value={formData.role}
                        onChange={(val) => handleChange("role", val)}
                        options={ROLE_OPTIONS}
                      />
                    </div>

                    <div className="member-field" data-field-label="Department">
                      <span>Department</span>
                      <CustomSelect
                        value={formData.department}
                        onChange={(val) => handleChange("department", val)}
                        options={DEPARTMENTS.filter((d) => d !== "All Departments")}
                      />
                    </div>

                    <div className="member-field" data-field-label="Gym Branch">
                      <span>Gym Facility Branch <em>*</em></span>
                      <CustomSelect
                        value={formData.branch}
                        onChange={(val) => handleChange("branch", val)}
                        options={BRANCHES}
                      />
                    </div>

                    <div className="member-field" data-field-label="Working Days">
                      <span>Weekly Working Days <em>*</em></span>
                      <CustomSelect
                        value={formData.workingDays}
                        onChange={(val) => handleChange("workingDays", val)}
                        options={["Mon - Sat", "Mon - Fri", "Tue - Sun", "Rotating 5 Days", "Weekend Only"]}
                      />
                    </div>

                    <div className="member-field member-field-span-2" data-field-label="Work Shift">
                      <span>Designated Work Shift <em>*</em></span>
                      <CustomSelect
                        value={formData.shift}
                        onChange={(val) => handleChange("shift", val)}
                        options={SHIFT_SCHEDULES}
                      />
                    </div>

                    {/* RBAC PERMISSIONS SELECTION */}
                    <div className="member-field member-field-span-3 member-field-wide" data-field-label="Permissions">
                      <span className="flex items-center justify-between mb-2">
                        <span>Desktop System Permissions Granted</span>
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full lowercase first-letter:uppercase">
                          {formData.permissions.length} capabilities active
                        </span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {PERMISSIONS.map((perm) => {
                          const isGranted = formData.permissions.includes(perm.id);
                          return (
                            <div
                              key={perm.id}
                              onClick={() => togglePermission(perm.id)}
                              className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                                isGranted
                                  ? "bg-indigo-50/70 border-indigo-300 text-indigo-950 font-bold shadow-2xs"
                                  : "bg-white border-dotted border-slate-300 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="text-xs truncate">{perm.label}</p>
                                <p className="text-[10px] text-slate-400 font-medium truncate">{perm.description}</p>
                              </div>
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  isGranted ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                                }`}
                              >
                                {isGranted && <Check size={11} strokeWidth={3} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PAGE 5: SALARIES, DURATION & BONUSES */}
          <div className="member-form-page" data-member-form-page="5">
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">Compensation &amp; Terms</p>
                <h2 id="compensation-title">Salaries, Duration &amp; Bonuses</h2>
              </div>
            </div>
            <p className="member-form-copy">
              Structure base salary, pay frequency, contract duration, and performance bonuses.
            </p>

            <div className="plans-empty-state-card registration-engine-card">
              <div className="plans-empty-grid-pattern"></div>
              <div className="plans-empty-content-wrap">
                <div className="plans-empty-topbar">
                  <div className="plans-status-pill">
                    <span className="plans-status-dot"></span>
                    <span className="plans-status-sub">Compensation Engine Active</span>
                  </div>
                  <div className="plans-tags-group">
                    <span className="plans-tag-item">
                      <CheckCircle2 size={13} strokeWidth={2.2} className="inline mr-1 text-emerald-600" />
                      Fixed Pay
                    </span>
                    <span className="plans-tag-divider">•</span>
                    <span className="plans-tag-item">
                      <Sparkles size={13} strokeWidth={2.2} className="inline mr-1 text-indigo-600" />
                      Performance Bonus
                    </span>
                    <span className="plans-tag-divider">•</span>
                    <span className="plans-tag-item">
                      <IndianRupee size={13} strokeWidth={2.2} className="inline mr-1 text-amber-600" />
                      INR Currency
                    </span>
                  </div>
                </div>

                <div className="registration-engine-grid">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Employment Agreement Types */}
                    <div className="lg:col-span-6 flex flex-col gap-2.5">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-0.5">
                        Employment Agreement Mode
                      </span>
                      {[
                        {
                          id: "Full-Time Staff",
                          title: "Full-Time Employee",
                          desc: "Fixed monthly salary, standard operational shifts, and company benefits."
                        },
                        {
                          id: "Consultant / Part-Time",
                          title: "Consultant / Part-Time",
                          desc: "Hourly/daily retainer with flexible clinic or specialized shift hours."
                        },
                        {
                          id: "Contract Staff",
                          title: "Fixed-Term Contract Staff",
                          desc: "Defined 6-month or 12-month tenure with milestone renewal clauses."
                        }
                      ].map((mode) => {
                        const isActive = formData.employmentType === mode.id;
                        return (
                          <div
                            key={mode.id}
                            onClick={() => handleChange("employmentType", mode.id)}
                            className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isActive
                                ? "border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/10"
                                : "border-dotted border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50/70"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                  isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                <Briefcase size={16} strokeWidth={2.2} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold leading-snug truncate">{mode.title}</h4>
                                <p className={`text-[10.5px] mt-0.5 leading-relaxed line-clamp-1 ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                                  {mode.desc}
                                </p>
                              </div>
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                isActive ? "border-emerald-400 bg-emerald-500 text-white" : "border-slate-300"
                              }`}
                            >
                              {isActive && <Check size={10} strokeWidth={3.5} />}
                            </div>
                          </div>
                        );
                      })}

                      <div className="mt-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                          Contract Duration / Tenure
                        </span>
                        <CustomSelect
                          value={formData.contractDuration}
                          onChange={(val) => handleChange("contractDuration", val)}
                          options={[
                            "Permanent / Open-Ended",
                            "1 Year Fixed Contract (Renewable)",
                            "6 Months Probation Period",
                            "3 Months Seasonal Contract",
                            "Consultancy Service Agreement"
                          ]}
                        />
                      </div>
                    </div>

                    {/* Right Column: Salary, Pay Period & Bonuses */}
                    <div className="lg:col-span-6 flex flex-col gap-3">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-0.5">
                        Compensation Package
                      </span>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="member-field">
                          <span>Base Salary (₹ INR) <em>*</em></span>
                          <div className="relative mt-1">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                            <input
                              type="number"
                              placeholder="e.g. 35000"
                              value={formData.baseSalary}
                              onChange={(e) => handleChange("baseSalary", e.target.value)}
                              className="!pl-8 !min-h-[42px] !rounded-xl"
                              min="0"
                            />
                          </div>
                        </label>

                        <div className="member-field">
                          <span>Pay Frequency</span>
                          <div className="mt-1">
                            <CustomSelect
                              value={formData.salaryFrequency}
                              onChange={(val) => handleChange("salaryFrequency", val)}
                              options={["Monthly", "Bi-Weekly", "Weekly", "Per Day / Shift"]}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="member-field">
                          <span>Target Bonus (₹)</span>
                          <div className="relative mt-1">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                            <input
                              type="number"
                              placeholder="e.g. 5000"
                              value={formData.bonusAmount}
                              onChange={(e) => handleChange("bonusAmount", e.target.value)}
                              className="!pl-8 !min-h-[42px] !rounded-xl"
                              min="0"
                            />
                          </div>
                        </label>

                        <label className="member-field">
                          <span>Bonus Criterion / KPI</span>
                          <input
                            type="text"
                            placeholder="e.g. Punctuality & Targets"
                            value={formData.bonusType}
                            onChange={(e) => handleChange("bonusType", e.target.value)}
                            className="!min-h-[42px] !rounded-xl mt-1"
                          />
                        </label>
                      </div>

                      {/* Projected Compensation Summary Card with Dotted Theme */}
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
                              <span className="text-xs font-bold text-slate-700">Estimated Total Monthly CTC</span>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                              {formData.employmentType}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-900">
                                {formData.fullName.trim() || "Employee"} • {formData.role}
                              </p>
                              <p className="text-[10.5px] text-slate-500 mt-0.5">
                                Base (₹{baseSalaryNum.toLocaleString("en-IN")}) + Bonus (₹{bonusNum.toLocaleString("en-IN")})
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-black text-slate-900 tracking-tight">
                                ₹{totalMonthlyCompensation.toLocaleString("en-IN")}
                              </span>
                              <span className="text-xs font-bold text-slate-400 ml-1">/mo</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
            <button className="dialog-btn dialog-btn-danger cursor-pointer" type="button" onClick={handleNext}>
              <span>NEXT</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="btn-arrow-icon">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="member-form-page-actions" data-for-page="4">
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

          <div className="member-form-page-actions" data-for-page="5">
            <button className="dialog-btn dialog-btn-muted cursor-pointer" type="button" onClick={handleBack}>
              ← Back
            </button>
            <button className="dialog-btn dialog-btn-danger cursor-pointer" type="button" onClick={handleSubmit}>
              Save &amp; Register Staff
            </button>
          </div>
        </div>
      </section>
    </>,
    document.body
  );
};

// ─────────────────────────────────────────
// MAIN STAFF ROLES PAGE COMPONENT
// ─────────────────────────────────────────

export default function StaffRoles() {
  const [staffList, setStaffList] = useState(() => {
    try {
      const saved = localStorage.getItem("gymdeck_staff");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Clean legacy mock staff IDs if present
          const mockIds = new Set(["EMP-201", "EMP-202", "EMP-203", "EMP-204"]);
          const realStaff = parsed.filter(s => s && s.id && !mockIds.has(s.id));
          if (realStaff.length !== parsed.length) {
            localStorage.setItem("gymdeck_staff", JSON.stringify(realStaff));
          }
          return realStaff;
        }
      }
    } catch (e) {
      console.warn("Failed to read gymdeck_staff from localStorage:", e);
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [shiftFilter, setShiftFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest"); // "newest", "name", "salary-desc", "salary-asc"

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Sync state changes with localStorage
  useEffect(() => {
    try {
      localStorage.setItem("gymdeck_staff", JSON.stringify(staffList));
    } catch (e) {
      console.warn("Failed to persist staff list:", e);
    }
  }, [staffList]);

  const handleStaffAdded = (newStaff) => {
    setStaffList((prev) => [newStaff, ...prev]);
    setToast({
      title: "Staff Member Registered",
      message: `${newStaff.name} has been enrolled as ${newStaff.role} in ${newStaff.department}.`
    });
    setTimeout(() => setToast(null), 4000);
  };

  const handleStaffClick = (staff) => {
    setSelectedStaff(staff);
    setIsDrawerOpen(true);
  };

  // KPI Computations
  const totalStaff = staffList.length;
  const activeStaffCount = staffList.filter(s => s.status === "active").length;
  const totalMonthlyPayroll = useMemo(() => {
    return staffList.reduce((acc, s) => acc + (Number(s.baseSalary) || 0) + (Number(s.bonusAmount) || 0), 0);
  }, [staffList]);

  const avgAttendance = useMemo(() => {
    if (staffList.length === 0) return 0;
    const sum = staffList.reduce((acc, s) => acc + (Number(s.attendanceRate) || 100), 0);
    return Math.round(sum / staffList.length);
  }, [staffList]);

  // Filtering & Sorting Logic
  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = staffList.filter((s) => {
      if (q) {
        const matchName = s.name.toLowerCase().includes(q);
        const matchRole = s.role.toLowerCase().includes(q);
        const matchId = s.id.toLowerCase().includes(q);
        const matchPhone = s.phone.toLowerCase().includes(q);
        const matchDept = s.department.toLowerCase().includes(q);
        if (!matchName && !matchRole && !matchId && !matchPhone && !matchDept) {
          return false;
        }
      }
      if (departmentFilter !== "All" && departmentFilter !== "All Departments" && s.department !== departmentFilter) {
        return false;
      }
      if (roleFilter !== "All" && s.role !== roleFilter) {
        return false;
      }
      if (shiftFilter !== "All" && !s.shift.includes(shiftFilter.split(" ")[0])) {
        return false;
      }
      if (statusFilter !== "All" && s.status !== statusFilter.toLowerCase()) {
        return false;
      }
      return true;
    });

    // Sort result
    if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "salary-desc") {
      result.sort((a, b) => (Number(b.baseSalary) || 0) - (Number(a.baseSalary) || 0));
    } else if (sortBy === "salary-asc") {
      result.sort((a, b) => (Number(a.baseSalary) || 0) - (Number(b.baseSalary) || 0));
    }
    return result;
  }, [staffList, searchQuery, departmentFilter, roleFilter, shiftFilter, statusFilter, sortBy]);

  const resetFilters = () => {
    setSearchQuery("");
    setDepartmentFilter("All");
    setRoleFilter("All");
    setShiftFilter("All");
    setStatusFilter("All");
    setSortBy("newest");
  };

  const isAnyFilterActive =
    searchQuery.trim() !== "" ||
    (departmentFilter !== "All" && departmentFilter !== "All Departments") ||
    roleFilter !== "All" ||
    shiftFilter !== "All" ||
    statusFilter !== "All" ||
    sortBy !== "newest";

  // Filter Dropdown options
  const departmentOptions = [
    { label: "All Departments", value: "All", count: totalStaff },
    { label: "Operations", value: "Operations", count: staffList.filter(s => s.department === "Operations").length },
    { label: "Finance", value: "Finance", count: staffList.filter(s => s.department === "Finance").length },
    { label: "Management", value: "Management", count: staffList.filter(s => s.department === "Management").length },
    { label: "Wellness & Health", value: "Wellness & Health", count: staffList.filter(s => s.department === "Wellness & Health").length },
    { label: "Facilities", value: "Facilities", count: staffList.filter(s => s.department === "Facilities").length }
  ];

  const roleDropdownOptions = [
    { label: "All Designated Roles", value: "All", count: totalStaff },
    ...STAFF_ROLES.map(r => ({
      label: r.label,
      value: r.label,
      count: staffList.filter(s => s.role === r.label).length,
      color: r.color
    }))
  ];

  const statusDropdownOptions = [
    { label: "All Statuses", value: "All", count: totalStaff },
    { label: "Active On-Duty", value: "active", count: activeStaffCount, color: "bg-emerald-500" },
    { label: "On Leave", value: "leave", count: staffList.filter(s => s.status === "leave").length, color: "bg-rose-500" }
  ];

  const sortOptions = [
    { label: "Recently Enrolled", value: "newest" },
    { label: "Name (A to Z)", value: "name" },
    { label: "Salary: High to Low", value: "salary-desc" },
    { label: "Salary: Low to High", value: "salary-asc" }
  ];

  return (
    <div className="all-trainers-shell font-sans text-slate-950">
      {/* ─────────────────────────────────────────
          PAGE HEADER
          ───────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3 relative z-20">
        <div>
          <nav className="flex items-center text-sm font-medium text-slate-500">
            <span>Trainers &amp; Staff</span>
            <ChevronRight size={16} className="text-slate-300 mx-2" />
            <span className="text-slate-900 font-bold">Staff Roles &amp; Workforce</span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center w-80 lg:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
              <Search size={16} strokeWidth={2.2} />
            </div>
            <input
              type="text"
              placeholder="Search staff by name, role, department or phone..."
              className="w-full pl-10 pr-14 h-10 bg-slate-100/90 hover:bg-slate-100 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all outline-none leading-normal shadow-2xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none gap-0.5">
              <kbd className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs leading-none">⌘</kbd>
              <kbd className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs leading-none">K</kbd>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddStaffOpen(true)}
            className="add-member-btn cursor-pointer h-10 flex items-center gap-2"
            aria-label="Add new staff member"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Staff</span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────
          PAGE TITLE SECTION
          ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-2 relative z-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Staff Roles &amp; Workforce</h1>
          <p className="text-slate-500 text-xs font-semibold mt-2 max-w-2xl">
            Manage administrative personnel, front desk receptionists, accountants, wellness coaches, work timings, salaries, and system permission roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border-2 border-dotted border-slate-300 shadow-2xs">
            Workforce: <strong className="text-indigo-600 font-bold">{totalStaff}</strong> Enrolled Personnel
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────
          KPI STRIP (DOTTED CARDS CONCEPT)
          ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 mb-2 relative z-10 w-full min-w-0">
        <StatCard
          label="Total Staff"
          value={totalStaff.toString()}
          hint={totalStaff === 0 ? "0 enrolled staff" : `${activeStaffCount} active on duty roster`}
          icon={Users}
          tone="indigo"
        />
        <StatCard
          label="Monthly Payroll (CTC)"
          value={totalMonthlyPayroll === 0 ? "₹0" : `₹${(totalMonthlyPayroll / 1000).toFixed(1)}K`}
          hint={totalStaff === 0 ? "No active payroll" : `Sum across ${totalStaff} employees`}
          icon={IndianRupee}
          tone="emerald"
        />
        <StatCard
          label="Shift Coverage"
          value={totalStaff === 0 ? "0%" : "100%"}
          hint={totalStaff === 0 ? "Awaiting shift assignments" : "Morning, General & Closing shifts covered"}
          icon={CalendarClock}
          tone="blue"
        />
        <StatCard
          label="Avg Attendance"
          value={totalStaff === 0 ? "0%" : `${avgAttendance}%`}
          hint={totalStaff === 0 ? "No attendance data" : "Punctuality & shift check-in score"}
          icon={CheckCircle2}
          tone="amber"
        />
      </div>

      {/* ─────────────────────────────────────────
          WORKSPACE AREA (TABLE & FILTERS)
          ───────────────────────────────────────── */}
      <div className="all-trainers-workspace">
        <div className="all-trainers-workspace-sticky-header">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs uppercase tracking-wider mr-1 select-none">
              <Filter size={14} className="text-slate-400" />
              <span>Filters</span>
            </div>

            <div className="h-5 w-px bg-slate-200 hidden sm:block mx-0.5" />

            <CustomDropdown
              label="Department"
              value={departmentFilter}
              options={departmentOptions}
              onChange={setDepartmentFilter}
              icon={Building}
            />

            <CustomDropdown
              label="Designated Role"
              value={roleFilter}
              options={roleDropdownOptions}
              onChange={setRoleFilter}
              icon={Briefcase}
            />

            <CustomDropdown
              label="Operational Status"
              value={statusFilter}
              options={statusDropdownOptions}
              onChange={setStatusFilter}
              icon={Activity}
            />

            <CustomDropdown
              label="Sort By"
              value={sortBy}
              options={sortOptions}
              onChange={setSortBy}
              icon={ArrowUpDown}
            />

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer border border-rose-200/80 shadow-2xs"
                title="Reset all filters"
              >
                <X size={13} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/70">
              Showing <strong className="text-slate-900 font-black">{filteredStaff.length}</strong> of {totalStaff} Employees
            </span>
          </div>
        </div>

        {/* TABLE SECTION / EMPTY STATE (DOTTED CARDS DESIGN) */}
        <section className="w-full">
          {filteredStaff.length === 0 ? (
            <div className="relative rounded-3xl border-2 border-dotted border-slate-300 hover:border-indigo-400/80 bg-slate-50/60 p-10 sm:p-14 text-center transition-all overflow-hidden">
              <div 
                className="absolute inset-0 opacity-[0.4] pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
                  backgroundSize: "18px 18px"
                }}
              />
              <div className="relative z-10 max-w-md mx-auto">
                <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Users size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  {staffList.length === 0 ? "No staff personnel enrolled yet" : "No staff match your criteria"}
                </h3>
                <p className="text-xs text-slate-500 mx-auto mt-1 mb-6 leading-relaxed">
                  {staffList.length === 0
                    ? "Get started by adding your receptionists, managers, accountants, and support staff with designated work timings and salaries."
                    : "Try clearing filters or search keywords to view the complete workforce roster."}
                </p>
                <div className="flex items-center justify-center gap-3">
                  {isAnyFilterActive && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAddStaffOpen(true)}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Add Staff
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs w-full">
              {/* Table Meta Bar */}
              <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">Workforce Roster</h2>
                  <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                    {filteredStaff.length} {filteredStaff.length === 1 ? 'employee' : 'employees'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  Click any staff row to open full employment details &amp; permissions
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 select-none">
                    <tr>
                      <th className="py-3.5 px-5 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider w-[24%]">
                        Staff Member
                      </th>
                      <th className="py-3.5 px-4 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider w-[20%]">
                        Designated Role &amp; Dept
                      </th>
                      <th className="py-3.5 px-4 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider w-[18%]">
                        Work Timings &amp; Shift
                      </th>
                      <th className="py-3.5 px-4 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider w-[16%]">
                        Salary &amp; Bonuses
                      </th>
                      <th className="py-3.5 px-4 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider w-[12%]">
                        Status
                      </th>
                      <th className="py-3.5 px-5 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider text-right w-[10%]">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-900">
                    {filteredStaff.map((staff) => {
                      const foundRole = STAFF_ROLES.find(r => r.label === staff.role);
                      const badgeClass = foundRole ? foundRole.badge : "bg-slate-100 text-slate-700 border-slate-200";

                      return (
                        <tr
                          key={staff.id}
                          className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                          onClick={() => handleStaffClick(staff)}
                        >
                          {/* Column 1: Staff Member Identity */}
                          <td className="py-4 px-5 align-middle">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="relative shrink-0">
                                <img
                                  src={staff.image || getInitialsAvatar(staff.name)}
                                  alt={staff.name}
                                  className="w-11 h-11 rounded-xl bg-slate-100 object-cover ring-1 ring-slate-200/80 shadow-2xs group-hover:ring-indigo-300 transition-all"
                                />
                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white bg-emerald-500" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors truncate">
                                  {staff.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 tracking-wider">
                                    {staff.id}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-medium truncate">
                                    {staff.phone}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Role & Department */}
                          <td className="py-4 px-4 align-middle">
                            <span className={`inline-flex items-center text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border truncate max-w-full ${badgeClass}`}>
                              {staff.role}
                            </span>
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1 truncate">
                                <Building size={11} className="text-slate-400 shrink-0" />
                                {staff.department}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-1 text-slate-400 truncate">
                                <MapPin size={11} className="text-slate-400 shrink-0" />
                                {staff.branch}
                              </span>
                            </div>
                          </td>

                          {/* Column 3: Work Timings & Shift */}
                          <td className="py-4 px-4 align-middle">
                            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Clock size={12} className="text-indigo-600 shrink-0" />
                              <span className="truncate">{staff.shift.split("(")[0].trim()}</span>
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                              <Calendar size={11} className="text-slate-400 shrink-0" />
                              <span>{staff.workingDays || "Mon - Sat"}</span>
                            </p>
                          </td>

                          {/* Column 4: Salary & Bonuses */}
                          <td className="py-4 px-4 align-middle">
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-black text-slate-900 tracking-tight">
                                ₹{Number(staff.baseSalary || 0).toLocaleString("en-IN")}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">/{staff.salaryFrequency || "mo"}</span>
                            </div>
                            {staff.bonusAmount > 0 ? (
                              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mt-1">
                                <span>+ ₹{Number(staff.bonusAmount).toLocaleString("en-IN")} bonus</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium mt-1 block">Fixed Base Pay</span>
                            )}
                          </td>

                          {/* Column 5: Status & Tenure */}
                          <td className="py-4 px-4 align-middle">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs bg-emerald-50 text-emerald-700 border-emerald-200/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                            <p className="text-[10.5px] text-slate-400 font-medium mt-1 truncate" title={staff.contractDuration}>
                              {staff.contractDuration}
                            </p>
                          </td>

                          {/* Column 6: Action */}
                          <td className="py-4 px-5 align-middle text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStaffClick(staff);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-indigo-600 hover:text-white border border-slate-200/80 hover:border-indigo-600 rounded-xl transition-all shadow-2xs cursor-pointer group/btn ml-auto active:scale-95"
                            >
                              <span>Dossier</span>
                              <ChevronRight size={13} className="text-slate-400 group-hover/btn:text-white group-hover/btn:translate-x-0.5 transition-transform" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      <StaffProfileDrawer
        staff={selectedStaff}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      <AddStaffModal
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        onStaffAdded={handleStaffAdded}
        totalStaffCount={staffList.length}
      />

      {createPortal(
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-8 right-8 z-[10050] flex items-center gap-3.5 px-5 py-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 max-w-md pointer-events-auto"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white leading-tight">{toast.title}</p>
                <p className="text-xs text-slate-300 font-medium mt-0.5 truncate">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Dismiss toast"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <BrandFooter />
    </div>
  );
}

// ─────────────────────────────────────────
// MOUNT FUNCTION
// ─────────────────────────────────────────

export const mountStaffRoles = () => {
  const container = document.querySelector('[data-stage="staff-roles"]');
  if (!container) {
    console.error("GymDeck: StaffRoles container not found!");
    return null;
  }

  try {
    const root = createRoot(container);
    root.render(<StaffRoles />);
    return root;
  } catch (err) {
    console.error("GymDeck: Critical mount failure in StaffRoles:", err);
    return null;
  }
};
