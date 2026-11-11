import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import {
  Users,
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
  MessageSquare,
  Calendar,
  BarChart3,
  Download,
  ExternalLink,
  Shield,
  Star,
  MapPin,
  Mail,
  Phone,
  ArrowUpRight,
  Zap,
  Briefcase,
  Award,
  BookOpen,
  PieChart,
  UserPlus,
  UserCheck,
  X,
  FileText,
  Camera,
  ArrowRight,
  Check,
  Sparkles,
  ChevronDown,
  Dumbbell,
  CalendarClock,
  IndianRupee
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────

const SPECIALIZATIONS = [
  "Strength", "Cardio", "CrossFit", "Yoga", "Rehabilitation", "Nutrition"
];

const TRAINER_TYPES = [
  "Personal Trainer", "Group Instructor", "Nutritionist", "Yoga Coach"
];

const BRANCHES = ["Main Branch", "Downtown", "North Gym", "East Side"];

// ─────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────

const KPICard = ({ label, value, trend, icon: Icon, tone, iconFill }) => {
  const tones = {
    indigo: {
      icon: "text-indigo-600 bg-indigo-50 border-indigo-100",
      trend: "text-emerald-700 bg-emerald-50 border-emerald-100/80"
    },
    emerald: {
      icon: "text-emerald-600 bg-emerald-50 border-emerald-100",
      trend: "text-emerald-700 bg-emerald-50 border-emerald-100/80"
    },
    blue: {
      icon: "text-blue-600 bg-blue-50 border-blue-100",
      trend: "text-blue-700 bg-blue-50 border-blue-100/80"
    },
    amber: {
      icon: "text-amber-600 bg-amber-50 border-amber-100",
      trend: "text-amber-700 bg-amber-50 border-amber-100/80"
    },
    rose: {
      icon: "text-rose-600 bg-rose-50 border-rose-100",
      trend: "text-rose-700 bg-rose-50 border-rose-100/80"
    }
  };

  const currentTone = tones[tone] || tones.indigo;

  return (
    <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-sm transition-all duration-200 flex flex-col justify-between gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${currentTone.icon}`}>
          <Icon size={15} strokeWidth={2.2} className={iconFill ? "fill-amber-400 text-amber-500" : ""} />
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2 pt-0.5">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
          {value}
        </h3>
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${currentTone.trend}`}>
            {trend}
          </span>
        )}
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
    ? (typeof selectedOption === "string" ? selectedOption : selectedOption.label)
    : label;

  const isSelected = value && value !== "All" && value !== "All Groups" && value !== "All Branches" && value !== "All Specializations" && value !== "All Experience";

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

const TrainerCard = ({ trainer, onClick }) => {
  const statusColors = {
    active: { label: "Active", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    busy: { label: "Busy", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 border-amber-100" },
    "off-shift": { label: "Off Duty", dot: "bg-slate-400", pill: "bg-slate-50 text-slate-600 border-slate-200" },
    leave: { label: "On Leave", dot: "bg-rose-500", pill: "bg-rose-50 text-rose-700 border-rose-100" }
  };

  const statusInfo = statusColors[trainer.status] || statusColors.active;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all duration-200 group cursor-pointer flex flex-col justify-between"
      onClick={() => onClick(trainer)}
    >
      <div>
        <div className="flex items-start justify-between mb-3.5">
          <div className="relative">
            <img src={trainer.image} alt={trainer.name} className="w-14 h-14 rounded-xl bg-slate-100 object-cover border border-slate-100 shadow-xs" />
            <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${statusInfo.dot}`} />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.pill}`}>
              {statusInfo.label}
            </span>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick(trainer);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="More options"
            >
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
              {trainer.name}
            </h4>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 uppercase">
              {trainer.id}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">{trainer.specialization}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
              {trainer.experience}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin size={11} className="text-slate-400" /> {trainer.branch}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">PT Clients</p>
            <p className="text-sm font-black text-slate-800 mt-0.5">{trainer.activeClients}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sessions Today</p>
            <p className="text-sm font-black text-slate-800 mt-0.5">{trainer.sessionsToday}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Attendance</p>
            <p className="text-sm font-black text-slate-800 mt-0.5">{trainer.attendanceRate}%</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Rating</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              <span className="text-sm font-black text-slate-800">{trainer.rating}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick(trainer);
          }}
          className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all cursor-pointer text-center"
        >
          View Profile
        </button>
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick(trainer);
          }}
          className="p-2 text-slate-500 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all cursor-pointer"
          title="Message trainer"
        >
          <MessageSquare size={15} />
        </button>
      </div>
    </motion.div>
  );
};

const ProfileDrawer = ({ trainer, isOpen, onClose }) => {
  if (!trainer) return null;

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
            className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-2xl z-[101] overflow-y-auto"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trainer Profile</span>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex items-start gap-6 mb-10">
                <img src={trainer.image} alt={trainer.name} className="w-24 h-24 rounded-2xl bg-slate-100 shadow-sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold text-slate-900">{trainer.name}</h2>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                  <p className="text-slate-500 font-medium mt-1">{trainer.specialization}</p>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Shield size={16} />
                      <span className="text-sm font-semibold">{trainer.id}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <MapPin size={16} />
                      <span className="text-sm font-semibold">{trainer.branch}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Contact Email</p>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Mail size={14} className="text-slate-400" /> {trainer.email}
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Phone Number</p>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" /> {trainer.phone}
                  </p>
                </div>
              </div>

              <section className="mb-10">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Award size={16} /> Expertise &amp; Certifications
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(trainer.certifications) && trainer.certifications.length > 0 ? (
                    trainer.certifications.map((cert, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg border border-slate-100 bg-white text-xs font-bold text-slate-700 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-emerald-500" /> {cert}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No certifications listed</span>
                  )}
                </div>
              </section>

              <section className="mb-10">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Clock size={16} /> Shift &amp; Schedule
                </h4>
                <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Standard Shift</p>
                      <p className="text-base font-bold text-slate-800 mt-1">{trainer.shift || "Not configured"}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-3">Today's Remaining Sessions</p>
                    <div className="space-y-3">
                      {Array.isArray(trainer.upcomingSessions) && trainer.upcomingSessions.length > 0 ? (
                        trainer.upcomingSessions.map((session, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                {session.clientName ? session.clientName.slice(0, 2).toUpperCase() : "PT"}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">{session.clientName}</p>
                                <p className="text-[10px] text-slate-400">{session.type || "Training"} • {session.time || "Scheduled"}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Upcoming</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 rounded-xl bg-white border border-slate-100 text-center">
                          <p className="text-xs text-slate-400 font-medium">No sessions scheduled for today</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-10">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <BarChart3 size={16} /> Performance Metrics
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{trainer.activeClients ?? 0}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Total Members</p>
                  </div>
                  <div className="text-center border-x border-slate-100">
                    <p className="text-2xl font-bold text-slate-900">
                      {Number(trainer.revenue || 0) >= 1000 
                        ? `₹${(Number(trainer.revenue) / 1000).toFixed(1)}K` 
                        : `₹${Number(trainer.revenue || 0)}`}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Revenue (MTD)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">
                      {trainer.attendanceRate != null ? `${trainer.attendanceRate}%` : "0%"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Punctuality</p>
                  </div>
                </div>
              </section>

              <div className="flex items-center gap-3 pt-4 sticky bottom-0 bg-white pb-8">
                <button className="flex-1 py-4 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                  Assign PT Client
                </button>
                <button className="flex-1 py-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all">
                  View Full Analytics
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
// CUSTOM SELECT COMPONENT (MATCHES MEMBER FORM CUSTOM DROPDOWNS)
// ─────────────────────────────────────────

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

// ─────────────────────────────────────────
// CUSTOM DATE PICKER (WITH AGE CALCULATION & YEAR PICKER)
// ─────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const CustomDatePicker = ({ value, displayValue, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(1995);
  const [viewMonth, setViewMonth] = useState(3); // April
  const [viewMode, setViewMode] = useState("day"); // 'day' or 'year'
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

  useEffect(() => {
    if (viewMode === "year" && yearsContainerRef.current) {
      const selectedYearBtn = yearsContainerRef.current.querySelector(".date-picker-year.is-selected");
      if (selectedYearBtn) {
        selectedYearBtn.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }, [viewMode]);

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
// ADD TRAINER MODAL COMPONENT (100% IDENTICAL UI/UX TO MEMBER FORM MODAL)
// ─────────────────────────────────────────

const AddTrainerModal = ({ isOpen, onClose, onTrainerAdded, totalTrainersCount = 0 }) => {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [customCert, setCustomCert] = useState("");
  const [errors, setErrors] = useState({});
  const [alertMessage, setAlertMessage] = useState("");
  const [isPhotoDragging, setIsPhotoDragging] = useState(false);
  const [dragDocType, setDragDocType] = useState(null);

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
    type: "Personal Trainer",
    specialization: "",
    branch: "Main Branch",
    experience: "Junior",
    shift: "",
    certifications: [],
    bio: "",
    baseSalary: "",
    commission: "",
    agreementType: "Full-Time Staff",
    status: "active"
  });

  const [documents, setDocuments] = useState({
    aadhaar: null,
    cert: null,
    resume: null,
    clearance: null
  });

  const photoInputRef = useRef(null);
  const aadhaarInputRef = useRef(null);
  const certInputRef = useRef(null);
  const resumeInputRef = useRef(null);
  const clearanceInputRef = useRef(null);

  // Sync mount and body.member-form-open for identical CSS bottom-drawer animation
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setCurrentStep(1);
      setErrors({});
      setAlertMessage("");

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

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Reset active page scroll on step change
  useEffect(() => {
    if (mounted) {
      const pageEl = document.querySelector(`.member-form-page[data-member-form-page="${currentStep}"]`);
      if (pageEl) {
        pageEl.scrollTop = 0;
      }
    }
  }, [currentStep, mounted]);

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
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Helper to calculate age from Date of Birth
  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  const calculatedAge = calculateAge(formData.dob);

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
    if (file) {
      processPhotoFile(file);
    }
  };

  const handlePhotoDrop = (e) => {
    e.preventDefault();
    setIsPhotoDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processPhotoFile(file);
    }
  };

  const processDocFile = (type, file) => {
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const sizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.round(file.size / 1024)} KB`;

    if (isPdf) {
      setDocuments((prev) => ({
        ...prev,
        [type]: {
          name: file.name,
          size: sizeStr,
          isPdf: true,
          preview: null
        }
      }));
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        setDocuments((prev) => ({
          ...prev,
          [type]: {
            name: file.name,
            size: sizeStr,
            isPdf: false,
            preview: event.target?.result
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocUpload = (type, e) => {
    const file = e.target.files?.[0];
    if (file) {
      processDocFile(type, file);
    }
  };

  const handleDocDrop = (type, e) => {
    e.preventDefault();
    setDragDocType(null);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processDocFile(type, file);
    }
  };

  const removeDoc = (type) => {
    setDocuments((prev) => ({ ...prev, [type]: null }));
  };

  const toggleCertification = (cert) => {
    setFormData((prev) => {
      const exists = prev.certifications.includes(cert);
      return {
        ...prev,
        certifications: exists
          ? prev.certifications.filter((c) => c !== cert)
          : [...prev.certifications, cert]
      };
    });
  };

  const addCustomCertification = () => {
    const trimmed = customCert.trim();
    if (trimmed && !formData.certifications.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        certifications: [...prev.certifications, trimmed]
      }));
      setCustomCert("");
    }
  };

  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
        errs.fullName = "Please enter the trainer's full name.";
      }
      if (!formData.phone.trim() || formData.phone.trim().length < 10) {
        errs.phone = "Please enter a valid 10-digit mobile number.";
      }
      if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
        errs.email = "Please enter a valid email address.";
      }
      if (!formData.dob) {
        errs.dob = "Please select the trainer's date of birth.";
      }
      if (!formData.gender) {
        errs.gender = "Please select the trainer's gender.";
      }
      if (!formData.address.trim()) {
        errs.address = "Please enter the complete residential address.";
      }
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
    if (currentStep === 1) {
      if (!validateStep(1)) return;
    }
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

    const newTrainer = {
      id: `TR-${100 + totalTrainersCount + 1}`,
      name: formData.fullName.trim(),
      specialization: formData.specialization,
      type: formData.type,
      branch: formData.branch,
      experience: formData.experience,
      status: formData.status,
      availability:
        formData.status === "active"
          ? "Available Now"
          : formData.status === "busy"
          ? "In Session"
          : "Off Duty",
      rating: 5.0,
      activeClients: 0,
      sessionsToday: 0,
      attendanceRate: 100,
      revenue: 0,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      alternatePhone: formData.alternatePhone.trim(),
      gender: formData.gender,
      dob: formData.dob,
      bloodGroup: formData.bloodGroup,
      address: formData.address.trim(),
      image:
        photoPreview ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.fullName.trim())}`,
      certifications:
        formData.certifications.length > 0 ? formData.certifications : ["Certified Trainer"],
      shift: formData.shift.split(" ")[0] || "06:00 - 14:00",
      salary: formData.baseSalary
        ? `₹${Number(formData.baseSalary).toLocaleString("en-IN")}`
        : "₹45,000",
      commission: formData.commission || "20%",
      agreementType: formData.agreementType,
      bio: formData.bio || "",
      joinedAt: new Date().toISOString()
    };

    onTrainerAdded(newTrainer);
    handleClose();
  };

  const currentDateStr = new Date().toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  // Financial projected calculations for Page 5
  const baseSalaryNum = Number(formData.baseSalary) || 0;
  const ptSessionRate = formData.commission.includes("%")
    ? (baseSalaryNum * (parseFloat(formData.commission) || 20)) / 100
    : (parseFloat(formData.commission.replace(/\D/g, "")) || 600) * 20;
  const totalProjected = baseSalaryNum + (isNaN(ptSessionRate) ? 0 : ptSessionRate);

  return createPortal(
    <>
      <style>{`
        .member-form-page::-webkit-scrollbar {
          width: 5px !important;
          display: block !important;
        }
        .member-form-page::-webkit-scrollbar-track {
          background: transparent !important;
        }
        .member-form-page::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.4) !important;
          border-radius: 9999px !important;
        }
        .member-form-page::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.7) !important;
        }
      `}</style>

      {/* Unified Modal Backdrop */}
      <div className="member-form-backdrop" onClick={handleClose} />

      {/* Unified Sliding Modal Sheet */}
      <section
        className={`member-form-modal ${currentStep > 1 ? `is-page-${currentStep}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trainer-form-title"
        aria-describedby="trainer-form-copy"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "88vh",
          maxHeight: "88vh",
          overflow: "hidden"
        }}
      >
        {/* Top Drawer Handle */}
        <div className="drawer-handle" />

        {/* Fixed Close Button at top-right of Modal */}
        <button
          className="member-modal-close-btn"
          type="button"
          aria-label="Close modal form"
          onClick={handleClose}
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Sliding Page Container (width: 500% with translateX 0%, -20%, -40%, -60%, -80%) */}
        <div 
          className="member-form-modal-container"
          style={{ height: "100%", display: "flex" }}
        >
          {/* ═══════════════════════════════════════
              PAGE 1: REGISTRATION FORM (PERSONAL DETAILS)
              ═══════════════════════════════════════ */}
          <div 
            className="member-form-page" 
            data-member-form-page="1"
            style={{ height: "100%", overflowY: "auto", paddingBottom: "140px", scrollbarWidth: "thin" }}
          >
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">STEP 1 • WORKFORCE ONBOARDING</p>
                <h2 id="trainer-form-title">Personal &amp; Contact Details</h2>
              </div>
            </div>
            <p id="trainer-form-copy" className="member-form-copy">
              Start a clean new staff profile with personal, contact, and identity information captured in one focused flow.
            </p>
            {alertMessage && (
              <p className="member-form-alert" style={{ display: "block" }}>
                {alertMessage}
              </p>
            )}

            <form className="member-form-grid" noValidate onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
              {/* Full Name */}
              <label className="member-field" data-field-label="Full Name">
                <span>Full Name <em>*</em></span>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  style={{
                    borderColor: errors.fullName ? "#ef4444" : undefined,
                    backgroundColor: errors.fullName ? "#fff5f5" : undefined
                  }}
                  required
                  autoFocus
                />
                {errors.fullName && <small className="member-field-error" style={{ display: "block", color: "#e11d48" }}>{errors.fullName}</small>}
              </label>

              {/* Contact Number */}
              <label className="member-field" data-field-label="Contact Number">
                <span>Primary Mobile Number <em>*</em></span>
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  style={{
                    borderColor: errors.phone ? "#ef4444" : undefined,
                    backgroundColor: errors.phone ? "#fff5f5" : undefined
                  }}
                  required
                />
                {errors.phone && <small className="member-field-error" style={{ display: "block", color: "#e11d48" }}>{errors.phone}</small>}
              </label>

              {/* Alternate Contact */}
              <label className="member-field" data-field-label="Alternate Contact">
                <span>Emergency Contact Number</span>
                <input
                  type="tel"
                  placeholder="Alternate mobile number"
                  value={formData.alternatePhone}
                  onChange={(e) => handleChange("alternatePhone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </label>

              {/* Email Address */}
              <label className="member-field" data-field-label="Email Address">
                <span>Work / Personal Email <em>*</em></span>
                <input
                  type="email"
                  placeholder="trainer@gymdeck.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  style={{
                    borderColor: errors.email ? "#ef4444" : undefined,
                    backgroundColor: errors.email ? "#fff5f5" : undefined
                  }}
                  required
                />
                {errors.email && <small className="member-field-error" style={{ display: "block", color: "#e11d48" }}>{errors.email}</small>}
              </label>

              {/* Date of Birth with Custom Date Picker & Calculated Age */}
              <label className="member-field" data-field-label="Date of Birth">
                <span className="flex items-center justify-between">
                  <span>Date of Birth <em>*</em></span>
                  {calculatedAge !== null && (
                    <strong className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      {calculatedAge} yrs old
                    </strong>
                  )}
                </span>
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

              {/* Gender with Custom Dropdown */}
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

              {/* Blood Group with Custom Dropdown */}
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

              {/* Address */}
              <label className="member-field member-field-span-2" data-field-label="Address">
                <span>Residential Address <em>*</em></span>
                <textarea
                  rows={1}
                  placeholder="Flat/House No., Street, City, State, PIN"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  required
                  style={{
                    minHeight: "48px",
                    resize: "none",
                    borderColor: errors.address ? "#ef4444" : undefined,
                    backgroundColor: errors.address ? "#fff5f5" : undefined
                  }}
                />
                {errors.address && <small className="member-field-error" style={{ display: "block", color: "#e11d48" }}>{errors.address}</small>}
              </label>

              <div className="member-form-disclaimer member-field-wide">
                <span><em>*</em> Fields marked with a red star are mandatory for HR records.</span>
              </div>
            </form>
          </div>

          {/* ═══════════════════════════════════════
              PAGE 2: PROFILE PHOTO UPLOAD (SPLIT STUDIO LAYOUT)
              ═══════════════════════════════════════ */}
          <div 
            className="member-form-page" 
            data-member-form-page="2"
            style={{ height: "100%", overflowY: "auto", paddingBottom: "140px", scrollbarWidth: "thin" }}
          >
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">STEP 2 • IDENTITY CAPTURE</p>
                <h2 id="photo-upload-title">Capture Trainer Portrait</h2>
              </div>
            </div>
            <p className="member-form-copy">
              Upload a clear portrait photo of the trainer for credentials verification, digital badge, and member booking card.
            </p>

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
                  <img src={photoPreview} alt="Trainer photo preview" />
                ) : formData.fullName.trim() ? (
                  <div className="photo-placeholder-icon">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.fullName.trim())}`}
                      alt="Avatar preview"
                      className="w-24 h-24 rounded-full mb-1 opacity-90 shadow-sm"
                    />
                    <span className="text-[10px] font-bold text-slate-500">Click or Drag Photo</span>
                  </div>
                ) : (
                  <div className="photo-placeholder-icon">
                    <Camera size={44} strokeWidth={1.8} className="text-slate-400" />
                    <span>Upload Photo</span>
                  </div>
                )}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  hidden
                />
              </div>

              <div className="photo-capture-meta">
                <p className="photo-capture-recommendation">Recommended: High quality JPG or PNG (Square 1:1, max 5MB)</p>
                {photoPreview ? (
                  <div className="flex items-center gap-2 justify-center mt-3">
                    <button
                      type="button"
                      className="btn-change-photo is-visible cursor-pointer"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <Camera size={14} />
                      <span>Change Photo</span>
                    </button>
                    <button
                      type="button"
                      className="btn-change-photo is-visible cursor-pointer text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                      onClick={() => setPhotoPreview(null)}
                    >
                      <X size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-change-photo is-visible cursor-pointer mt-2"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Plus size={14} />
                    <span>Browse Photo</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              PAGE 3: DOCUMENT UPLOAD CENTER
              ═══════════════════════════════════════ */}
          <div 
            className="member-form-page" 
            data-member-form-page="3"
            style={{ height: "100%", overflowY: "auto", paddingBottom: "140px", scrollbarWidth: "thin" }}
          >
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">STEP 3 • ACCREDITATION &amp; VERIFICATION</p>
                <h2 id="doc-upload-title">Upload Verification Documents</h2>
              </div>
            </div>
            <p className="member-form-copy">
              Attach national identity proof, coaching credentials, resume, and background verification to complete onboarding.
            </p>

            <div className="doc-upload-grid">
              {/* Aadhaar Card / ID Proof */}
              <div
                className="doc-upload-card transition-all"
                data-doc-type="aadhaar"
                onDragOver={(e) => { e.preventDefault(); setDragDocType("aadhaar"); }}
                onDragLeave={() => setDragDocType(null)}
                onDrop={(e) => handleDocDrop("aadhaar", e)}
                style={{
                  borderColor: dragDocType === "aadhaar" ? "#3b82f6" : undefined,
                  backgroundColor: dragDocType === "aadhaar" ? "#eff6ff" : undefined
                }}
              >
                <div className="doc-upload-card-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                  <Shield size={22} strokeWidth={1.8} />
                </div>
                <div className="doc-upload-card-content flex-1">
                  <strong>Aadhaar / National ID</strong>
                  <span>Government identity proof (front &amp; back)</span>
                  <div className="doc-upload-card-actions mt-3">
                    <input
                      ref={aadhaarInputRef}
                      className="doc-upload-input"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleDocUpload("aadhaar", e)}
                      hidden
                    />
                    <button
                      className="doc-upload-trigger"
                      type="button"
                      onClick={() => aadhaarInputRef.current?.click()}
                    >
                      <Plus size={14} strokeWidth={2.5} style={{ marginRight: "4px" }} />
                      Upload
                    </button>
                    <span className="doc-upload-meta">
                      {documents.aadhaar ? `${documents.aadhaar.name} (${documents.aadhaar.size})` : "No file selected"}
                    </span>
                    {documents.aadhaar && (
                      <div className="doc-upload-preview">
                        {documents.aadhaar.isPdf ? (
                          <div className="doc-upload-preview-pdf">
                            <FileText size={16} className="text-red-500" />
                            <span className="doc-pdf-label-tag">PDF</span>
                          </div>
                        ) : (
                          <img className="doc-upload-preview-image" src={documents.aadhaar.preview} alt="" />
                        )}
                        <button
                          className="doc-upload-remove"
                          type="button"
                          aria-label="Remove"
                          onClick={() => removeDoc("aadhaar")}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Fitness Certifications */}
              <div
                className="doc-upload-card transition-all"
                data-doc-type="cert"
                onDragOver={(e) => { e.preventDefault(); setDragDocType("cert"); }}
                onDragLeave={() => setDragDocType(null)}
                onDrop={(e) => handleDocDrop("cert", e)}
                style={{
                  borderColor: dragDocType === "cert" ? "#059669" : undefined,
                  backgroundColor: dragDocType === "cert" ? "#ecfdf5" : undefined
                }}
              >
                <div className="doc-upload-card-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
                  <Award size={22} strokeWidth={1.8} />
                </div>
                <div className="doc-upload-card-content flex-1">
                  <strong>Fitness Certification</strong>
                  <span>NSCA, NASM, ACE, or CrossFit certificate</span>
                  <div className="doc-upload-card-actions mt-3">
                    <input
                      ref={certInputRef}
                      className="doc-upload-input"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleDocUpload("cert", e)}
                      hidden
                    />
                    <button
                      className="doc-upload-trigger"
                      type="button"
                      onClick={() => certInputRef.current?.click()}
                    >
                      <Plus size={14} strokeWidth={2.5} style={{ marginRight: "4px" }} />
                      Upload
                    </button>
                    <span className="doc-upload-meta">
                      {documents.cert ? `${documents.cert.name} (${documents.cert.size})` : "No file selected"}
                    </span>
                    {documents.cert && (
                      <div className="doc-upload-preview">
                        {documents.cert.isPdf ? (
                          <div className="doc-upload-preview-pdf">
                            <FileText size={16} className="text-red-500" />
                            <span className="doc-pdf-label-tag">PDF</span>
                          </div>
                        ) : (
                          <img className="doc-upload-preview-image" src={documents.cert.preview} alt="" />
                        )}
                        <button
                          className="doc-upload-remove"
                          type="button"
                          aria-label="Remove"
                          onClick={() => removeDoc("cert")}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Trainer Resume / CV */}
              <div
                className="doc-upload-card transition-all"
                data-doc-type="resume"
                onDragOver={(e) => { e.preventDefault(); setDragDocType("resume"); }}
                onDragLeave={() => setDragDocType(null)}
                onDrop={(e) => handleDocDrop("resume", e)}
                style={{
                  borderColor: dragDocType === "resume" ? "#d97706" : undefined,
                  backgroundColor: dragDocType === "resume" ? "#fef3c7" : undefined
                }}
              >
                <div className="doc-upload-card-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
                  <FileText size={22} strokeWidth={1.8} />
                </div>
                <div className="doc-upload-card-content flex-1">
                  <strong>Trainer Resume / CV</strong>
                  <span>Coaching background, experience records &amp; bio</span>
                  <div className="doc-upload-card-actions mt-3">
                    <input
                      ref={resumeInputRef}
                      className="doc-upload-input"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleDocUpload("resume", e)}
                      hidden
                    />
                    <button
                      className="doc-upload-trigger"
                      type="button"
                      onClick={() => resumeInputRef.current?.click()}
                    >
                      <Plus size={14} strokeWidth={2.5} style={{ marginRight: "4px" }} />
                      Upload
                    </button>
                    <span className="doc-upload-meta">
                      {documents.resume ? `${documents.resume.name} (${documents.resume.size})` : "No file selected"}
                    </span>
                    {documents.resume && (
                      <div className="doc-upload-preview">
                        {documents.resume.isPdf ? (
                          <div className="doc-upload-preview-pdf">
                            <FileText size={16} className="text-red-500" />
                            <span className="doc-pdf-label-tag">PDF</span>
                          </div>
                        ) : (
                          <img className="doc-upload-preview-image" src={documents.resume.preview} alt="" />
                        )}
                        <button
                          className="doc-upload-remove"
                          type="button"
                          aria-label="Remove"
                          onClick={() => removeDoc("resume")}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Police Clearance / Background */}
              <div
                className="doc-upload-card doc-upload-card-others transition-all"
                data-doc-type="clearance"
                onDragOver={(e) => { e.preventDefault(); setDragDocType("clearance"); }}
                onDragLeave={() => setDragDocType(null)}
                onDrop={(e) => handleDocDrop("clearance", e)}
                style={{
                  borderColor: dragDocType === "clearance" ? "#64748b" : undefined,
                  backgroundColor: dragDocType === "clearance" ? "#f1f5f9" : undefined
                }}
              >
                <div className="doc-upload-card-icon" style={{ background: "#f1f5f9", color: "#64748b" }}>
                  <Shield size={22} strokeWidth={1.8} />
                </div>
                <div className="doc-upload-card-content flex-1">
                  <strong>Police Clearance / Medical</strong>
                  <span>Background check verification &amp; health certificate</span>
                  <div className="doc-upload-card-actions mt-3">
                    <input
                      ref={clearanceInputRef}
                      className="doc-upload-input"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleDocUpload("clearance", e)}
                      hidden
                    />
                    <button
                      className="doc-upload-trigger"
                      type="button"
                      onClick={() => clearanceInputRef.current?.click()}
                    >
                      <Plus size={14} strokeWidth={2.5} style={{ marginRight: "4px" }} />
                      Upload
                    </button>
                    <span className="doc-upload-meta">
                      {documents.clearance ? `${documents.clearance.name} (${documents.clearance.size})` : "No file selected"}
                    </span>
                    {documents.clearance && (
                      <div className="doc-upload-preview">
                        {documents.clearance.isPdf ? (
                          <div className="doc-upload-preview-pdf">
                            <FileText size={16} className="text-red-500" />
                            <span className="doc-pdf-label-tag">PDF</span>
                          </div>
                        ) : (
                          <img className="doc-upload-preview-image" src={documents.clearance.preview} alt="" />
                        )}
                        <button
                          className="doc-upload-remove"
                          type="button"
                          aria-label="Remove"
                          onClick={() => removeDoc("clearance")}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3 text-xs text-slate-500 font-medium">
              <Sparkles size={16} className="text-indigo-600 shrink-0" />
              <span>
                Supporting credentials can also be uploaded, verified, or updated anytime directly from the trainer's profile drawer.
              </span>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              PAGE 4: STAFF ALLOCATION & OPERATIONAL SHIFTS
              ═══════════════════════════════════════ */}
          <div 
            className="member-form-page" 
            data-member-form-page="4"
            style={{ height: "100%", overflowY: "auto", paddingBottom: "140px", scrollbarWidth: "thin" }}
          >
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">STEP 4 • ROLE &amp; SCHEDULE</p>
                <h2 id="plan-selection-title">Staff Allocation &amp; Shifts</h2>
              </div>
            </div>
            <p className="member-form-copy">
              Assign trainer specialization, coaching level, and weekly operational shift allocation.
            </p>

            <div className="member-form-grid" style={{ marginTop: "16px", gap: "16px 20px" }}>
              {/* Role */}
              <div className="member-field">
                <span>Staff Category / Role <em>*</em></span>
                <CustomSelect
                  value={formData.type}
                  onChange={(val) => handleChange("type", val)}
                  options={TRAINER_TYPES}
                />
              </div>

              {/* Specialization */}
              <div className="member-field">
                <span>Primary Specialization <em>*</em></span>
                <CustomSelect
                  value={formData.specialization}
                  onChange={(val) => handleChange("specialization", val)}
                  options={[
                    "Strength & Conditioning",
                    "CrossFit & HIIT",
                    "Yoga & Mindfulness",
                    "Rehabilitation & Mobility",
                    "Nutrition & Fat Loss",
                    "Boxing & Combat Fitness"
                  ]}
                />
              </div>

              {/* Experience Tier */}
              <div className="member-field">
                <span>Experience Level <em>*</em></span>
                <CustomSelect
                  value={formData.experience}
                  onChange={(val) => handleChange("experience", val)}
                  options={[
                    "Junior (< 2 years)",
                    "Mid-Level (2 - 5 years)",
                    "Senior (5 - 8 years)",
                    "Master Trainer (8+ years)"
                  ]}
                />
              </div>

              {/* Shift Schedule - spans 2 cols */}
              <div className="member-field member-field-span-2">
                <span>Operational Shift Schedule <em>*</em></span>
                <CustomSelect
                  value={formData.shift}
                  onChange={(val) => handleChange("shift", val)}
                  options={[
                    "06:00 - 14:00 (Morning Shift)",
                    "07:30 - 15:30 (Morning Peak)",
                    "10:00 - 18:00 (Day Shift)",
                    "13:00 - 21:00 (Evening Shift)",
                    "14:00 - 22:00 (Night Closing)",
                    "Flexible / Split Shift"
                  ]}
                />
              </div>

              {/* Bio & Philosophy - spans 1 col */}
              <label className="member-field">
                <span>Bio &amp; Philosophy</span>
                <textarea
                  rows={1}
                  placeholder="Coaching philosophy & background..."
                  value={formData.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  style={{ minHeight: "48px", resize: "none" }}
                />
              </label>

              {/* Certifications Badges Selection - spans all 3 cols */}
              <div className="member-field member-field-wide">
                <span className="flex items-center justify-between">
                  <span>Professional Certifications &amp; Accreditations</span>
                  <span className="text-[11px] font-bold text-slate-500">
                    {formData.certifications.length} selected
                  </span>
                </span>
                <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                  {[
                    "NSCA-CPT",
                    "NASM-CPT",
                    "ACE-CPT",
                    "CrossFit Level 2",
                    "RYT 500",
                    "Precision Nutrition",
                    "ISSA Certified",
                    "CPR / AED"
                  ].map((cert) => {
                    const isSelected = formData.certifications.includes(cert);
                    return (
                      <button
                        key={cert}
                        type="button"
                        onClick={() => toggleCertification(cert)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {isSelected ? <Check size={11} strokeWidth={3} /> : <Plus size={11} strokeWidth={2.5} />}
                        {cert}
                      </button>
                    );
                  })}
                </div>

                {/* Custom badge input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom certification..."
                    value={customCert}
                    onChange={(e) => setCustomCert(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomCertification();
                      }
                    }}
                    className="flex-1 !min-h-[38px] !rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={addCustomCertification}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              PAGE 5: COMPENSATION & CONTRACT AGREEMENT
              ═══════════════════════════════════════ */}
          <div 
            className="member-form-page" 
            data-member-form-page="5"
            style={{ height: "100%", overflowY: "auto", paddingBottom: "140px", scrollbarWidth: "thin" }}
          >
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">STEP 5 • CONTRACT &amp; COMPENSATION</p>
                <h2 id="payment-title">Agreement &amp; Compensation</h2>
              </div>
            </div>
            <p className="member-form-copy">
              Configure the employment contract terms and define the base compensation and session commission structure.
            </p>

            {/* 2-Column Professional Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5 items-start">
              {/* Left Column: Employment Agreement Modes (lg:col-span-6) */}
              <div className="lg:col-span-6 flex flex-col gap-2.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-0.5">
                  Agreement / Contract Type
                </span>
                {[
                  {
                    id: "Full-Time Staff",
                    title: "Full-Time Staff Agreement",
                    desc: "Dedicated roster with monthly fixed salary, scheduled floor shifts, and full gym benefits."
                  },
                  {
                    id: "Consultant / Part-Time",
                    title: "Consultant / Part-Time Agreement",
                    desc: "Flexible shift hours with hourly retainers and per-session compensation."
                  },
                  {
                    id: "Freelance Trainer",
                    title: "Freelance PT Agreement",
                    desc: "Independent personal coach with floor access privileges and client PT commissions."
                  }
                ].map((mode) => {
                  const isActive = formData.agreementType === mode.id;
                  return (
                    <div
                      key={mode.id}
                      onClick={() => handleChange("agreementType", mode.id)}
                      className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/10"
                          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/70"
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
              </div>

              {/* Right Column: Compensation Retainer & Estimated Payout (lg:col-span-6) */}
              <div className="lg:col-span-6 flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-0.5">
                  Compensation Structure
                </span>

                {/* Monthly Base Retainer */}
                <label className="member-field">
                  <span>Monthly Base Retainer (₹ INR)</span>
                  <div className="relative mt-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      placeholder="e.g. 45000"
                      value={formData.baseSalary}
                      onChange={(e) => handleChange("baseSalary", e.target.value)}
                      className="!pl-8 !min-h-[42px] !rounded-xl"
                      min="0"
                    />
                  </div>
                </label>

                {/* PT Commission */}
                <label className="member-field">
                  <span>PT Session Commission</span>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      placeholder="e.g. 20% or ₹600/session"
                      value={formData.commission}
                      onChange={(e) => handleChange("commission", e.target.value)}
                      className="!min-h-[42px] !rounded-xl"
                    />
                  </div>
                </label>

                {/* Estimated Payout Highlight Card */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-700">Estimated Monthly Compensation</span>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                      {formData.agreementType}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {formData.fullName.trim() || "Trainer"} • {formData.type}
                      </p>
                      <p className="text-[10.5px] text-slate-500 mt-0.5">
                        Retainer (₹{baseSalaryNum.toLocaleString("en-IN")}) + {formData.commission || "20%"} PT yield
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-slate-900 tracking-tight">
                        ₹{Math.round(totalProjected).toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-bold text-slate-400 ml-1">/mo</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            SHARED ACTION FOOTER CONTAINER (FIXED AT BOTTOM)
            ═══════════════════════════════════════ */}
        <div className="member-form-actions-footer">
          {/* Page 1 Actions */}
          <div className="member-form-page-actions" data-for-page="1" style={{ display: currentStep === 1 ? "flex" : undefined }}>
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

          {/* Page 2 Actions */}
          <div className="member-form-page-actions" data-for-page="2" style={{ display: currentStep === 2 ? "flex" : undefined }}>
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

          {/* Page 3 Actions */}
          <div className="member-form-page-actions" data-for-page="3" style={{ display: currentStep === 3 ? "flex" : undefined }}>
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

          {/* Page 4 Actions */}
          <div className="member-form-page-actions" data-for-page="4" style={{ display: currentStep === 4 ? "flex" : undefined }}>
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

          {/* Page 5 Actions */}
          <div className="member-form-page-actions" data-for-page="5" style={{ display: currentStep === 5 ? "flex" : undefined }}>
            <button className="dialog-btn dialog-btn-muted cursor-pointer" type="button" onClick={handleBack}>
              ← Back
            </button>
            <button className="dialog-btn dialog-btn-danger cursor-pointer" type="button" onClick={handleSubmit}>
              Save &amp; Finish
            </button>
          </div>
        </div>
      </section>
    </>,
    document.body
  );
};

export default function AllTrainers() {
  const [trainersList, setTrainersList] = useState(() => {
    try {
      const saved = localStorage.getItem("gymdeck_trainers");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Purge any legacy mock trainers
          const mockIds = new Set(["TR-101", "TR-102", "TR-103", "TR-104", "TR-105"]);
          const realTrainers = parsed.filter(t => t && t.id && !mockIds.has(t.id));
          if (realTrainers.length !== parsed.length) {
            localStorage.setItem("gymdeck_trainers", JSON.stringify(realTrainers));
          }
          return realTrainers;
        }
      }
    } catch (e) {
      console.warn("Failed to parse saved trainers:", e);
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [groupFilter, setGroupFilter] = useState("All");
  const [specializationFilter, setSpecializationFilter] = useState("All");
  const [experienceFilter, setExperienceFilter] = useState("All");

  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddTrainerOpen, setIsAddTrainerOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const resetFilters = () => {
    setStatusFilter("All");
    setGroupFilter("All");
    setSpecializationFilter("All");
    setExperienceFilter("All");
    setSearchQuery("");
  };

  const isAnyFilterActive = 
    statusFilter !== "All" || 
    groupFilter !== "All" || 
    specializationFilter !== "All" || 
    experienceFilter !== "All" || 
    searchQuery.trim().length > 0;

  const handleTrainerAdded = (newTrainer) => {
    const updated = [newTrainer, ...trainersList];
    setTrainersList(updated);
    try {
      localStorage.setItem("gymdeck_trainers", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to persist trainer:", e);
    }
    setToast({
      title: "Trainer Registered",
      message: `${newTrainer.name} was successfully registered and added to the roster.`
    });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const filteredTrainers = useMemo(() => {
    return trainersList.filter(t => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || 
        (t.name && t.name.toLowerCase().includes(q)) || 
        (t.specialization && t.specialization.toLowerCase().includes(q)) ||
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.type && t.type.toLowerCase().includes(q)) ||
        (t.branch && t.branch.toLowerCase().includes(q));

      let matchesStatus = true;
      if (statusFilter !== "All") {
        if (statusFilter.toLowerCase() === "leave" || statusFilter.toLowerCase() === "on leave") {
          matchesStatus = t.status === "leave";
        } else if (statusFilter.toLowerCase() === "off-shift" || statusFilter.toLowerCase() === "off duty") {
          matchesStatus = t.status === "off-shift";
        } else {
          matchesStatus = t.status.toLowerCase() === statusFilter.toLowerCase();
        }
      }

      let matchesGroup = true;
      if (groupFilter !== "All") {
        matchesGroup = t.type === groupFilter;
      }

      let matchesSpec = true;
      if (specializationFilter !== "All") {
        matchesSpec = t.specialization.toLowerCase().includes(specializationFilter.toLowerCase());
      }

      let matchesExp = true;
      if (experienceFilter !== "All") {
        matchesExp = t.experience.toLowerCase() === experienceFilter.toLowerCase();
      }

      return matchesSearch && matchesStatus && matchesGroup && matchesSpec && matchesExp;
    });
  }, [trainersList, searchQuery, statusFilter, groupFilter, specializationFilter, experienceFilter]);

  const totalTrainers = trainersList.length;
  const activeShiftCount = trainersList.filter(t => t.status === "active").length;
  const busyCount = trainersList.filter(t => t.status === "busy").length;
  const leaveCount = trainersList.filter(t => t.status === "leave").length;

  const totalSessionsToday = useMemo(() => {
    return trainersList.reduce((acc, t) => acc + (Number(t.sessionsToday) || 0), 0);
  }, [trainersList]);

  const totalRevenue = useMemo(() => {
    return trainersList.reduce((acc, t) => acc + (Number(t.revenue) || 0), 0);
  }, [trainersList]);

  const revenueTrainersCount = useMemo(() => {
    return trainersList.filter(t => (Number(t.revenue) || 0) > 0).length;
  }, [trainersList]);

  const formattedRevenue = useMemo(() => {
    if (totalRevenue === 0) return "₹0";
    if (totalRevenue >= 100000) return `₹${(totalRevenue / 100000).toFixed(1)}L`;
    if (totalRevenue >= 1000) return `₹${(totalRevenue / 1000).toFixed(1)}K`;
    return `₹${Number(totalRevenue).toLocaleString("en-IN")}`;
  }, [totalRevenue]);

  const ratedStaff = useMemo(() => {
    return trainersList.filter(t => Number(t.rating) > 0);
  }, [trainersList]);

  const avgRating = useMemo(() => {
    if (ratedStaff.length === 0) return "0.0";
    const sum = ratedStaff.reduce((acc, t) => acc + Number(t.rating), 0);
    return (sum / ratedStaff.length).toFixed(2);
  }, [ratedStaff]);

  const statusOptions = [
    { label: "All Statuses", value: "All", count: totalTrainers },
    { label: "Active", value: "active", count: activeShiftCount, color: "bg-emerald-500" },
    { label: "Busy", value: "busy", count: busyCount, color: "bg-amber-500" },
    { label: "On Leave", value: "leave", count: leaveCount, color: "bg-rose-500" }
  ];

  const staffGroupOptions = [
    { label: "All Staff Groups", value: "All", count: totalTrainers },
    { label: "Personal Trainers", value: "Personal Trainer", count: trainersList.filter(t => t.type === "Personal Trainer").length },
    { label: "Group Instructors", value: "Group Instructor", count: trainersList.filter(t => t.type === "Group Instructor").length },
    { label: "Nutritionists", value: "Nutritionist", count: trainersList.filter(t => t.type === "Nutritionist").length },
    { label: "Yoga Coaches", value: "Yoga Coach", count: trainersList.filter(t => t.type === "Yoga Coach").length }
  ];

  const specializationOptions = [
    { label: "All Specializations", value: "All" },
    ...SPECIALIZATIONS.map(s => ({ label: s, value: s }))
  ];

  const experienceOptions = [
    { label: "All Experience", value: "All" },
    { label: "Junior", value: "Junior" },
    { label: "Mid-Level", value: "Mid-Level" },
    { label: "Senior", value: "Senior" }
  ];

  const handleTrainerClick = (trainer) => {
    setSelectedTrainer(trainer);
    setIsDrawerOpen(true);
  };

  return (
    <div className="all-trainers-shell font-sans text-slate-950">
      {/* ─────────────────────────────────────────
          TOP UTILITY HEADER
          ───────────────────────────────────────── */}
      <header className="relative z-50 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <nav className="flex items-center text-sm font-medium text-slate-500">
            <span>Trainers &amp; Staff</span>
            <ChevronRight size={16} className="text-slate-300 mx-2" />
            <span className="text-slate-900 font-bold">All Trainers</span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center w-80 lg:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
              <Search size={16} strokeWidth={2.2} />
            </div>
            <input 
              type="text" 
              placeholder="Search trainer, specialization, PT clients..." 
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
            onClick={() => setIsAddTrainerOpen(true)}
            className="add-member-btn cursor-pointer h-10 flex items-center gap-2"
            aria-label="Add new trainer"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Add Trainer
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────
          PAGE TITLE SECTION
          ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-2 relative z-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">All Trainers</h1>
          <p className="text-slate-500 text-xs font-semibold mt-2 max-w-2xl">
            Manage trainers, PT staff, schedules, attendance, and operational performance across your fitness ecosystem.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
            Roster: <strong className="text-indigo-600 font-bold">{totalTrainers}</strong> Total Staff
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────
          KPI ANALYTICS STRIP
          ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 mb-2 relative z-10">
        <KPICard 
          label="Total Trainers" 
          value={totalTrainers.toString()} 
          icon={UserCheck} 
          tone="indigo" 
          trend={totalTrainers === 0 ? "0 registered" : `${totalTrainers} active staff`} 
        />
        <KPICard 
          label="Active PT Sessions" 
          value={totalSessionsToday.toString()} 
          icon={Dumbbell} 
          tone="emerald" 
          trend={totalSessionsToday === 0 ? "0 active now" : `${totalSessionsToday} scheduled today`} 
        />
        <KPICard 
          label="Trainers On Shift" 
          value={activeShiftCount.toString()} 
          icon={CalendarClock} 
          tone="blue" 
          trend={activeShiftCount === 0 ? "None on duty" : `${activeShiftCount} on duty now`} 
        />
        <KPICard 
          label="PT Revenue Today" 
          value={formattedRevenue} 
          icon={IndianRupee} 
          tone="amber" 
          trend={totalRevenue === 0 ? "₹0 logged today" : `From ${revenueTrainersCount} trainers`} 
        />
        <KPICard 
          label="Avg Rating" 
          value={avgRating} 
          icon={Star} 
          iconFill={avgRating !== "0.0"} 
          tone="rose" 
          trend={ratedStaff.length === 0 ? "No ratings yet" : `Based on ${ratedStaff.length} staff`} 
        />
      </div>

      <div className="all-trainers-workspace">
        {/* ─────────────────────────────────────────
            SEARCH + FILTER TOOLBAR
            ───────────────────────────────────────── */}
        <div className="all-trainers-workspace-sticky-header">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs uppercase tracking-wider mr-1 select-none">
              <Filter size={14} className="text-slate-400" />
              <span>Filters</span>
            </div>
            
            <div className="h-5 w-px bg-slate-200 hidden sm:block mx-0.5" />

            {/* Custom Dropdown: Operational Status */}
            <CustomDropdown
              label="Operational Status"
              value={statusFilter}
              options={statusOptions}
              onChange={setStatusFilter}
              icon={Activity}
            />

            {/* Custom Dropdown: Staff Groups */}
            <CustomDropdown
              label="Staff Groups"
              value={groupFilter}
              options={staffGroupOptions}
              onChange={setGroupFilter}
              icon={Users}
            />

            {/* Custom Dropdown: Specialization */}
            <CustomDropdown
              label="Specialization"
              value={specializationFilter}
              options={specializationOptions}
              onChange={setSpecializationFilter}
              icon={Award}
            />

            {/* Custom Dropdown: Experience */}
            <CustomDropdown
              label="Experience"
              value={experienceFilter}
              options={experienceOptions}
              onChange={setExperienceFilter}
              icon={Briefcase}
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
              Showing <strong className="text-slate-900 font-black">{filteredTrainers.length}</strong> of {totalTrainers} Trainers
            </span>
          </div>
        </div>

        {/* ─────────────────────────────────────────
            MAIN WORKSPACE (FULL WIDTH TABLE VIEW)
            ───────────────────────────────────────── */}
        <section className="w-full">
          {filteredTrainers.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
              <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Users size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {trainersList.length === 0 ? "No trainers registered yet" : "No trainers match your criteria"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
                {trainersList.length === 0
                  ? "Get started by registering your first trainer or coach to build your staff roster."
                  : "Try adjusting your filters or search keywords, or add a new trainer to your roster."}
              </p>
              <div className="flex items-center justify-center gap-3">
                {trainersList.length > 0 && isAnyFilterActive && (
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
                  onClick={() => setIsAddTrainerOpen(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Add Trainer
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs w-full">
              {/* Table Meta Bar */}
              <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">Trainer Roster</h2>
                  <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                    {filteredTrainers.length} {filteredTrainers.length === 1 ? 'trainer' : 'trainers'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  Click any row to open complete profile &amp; schedule
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80">
                    <tr>
                      <th className="py-3 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trainer</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Specialization &amp; Role</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Branch &amp; Shift</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clients &amp; Sessions</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attendance &amp; Rating</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTrainers.map((trainer) => {
                      const statusMap = {
                        active: { 
                          label: "Active", 
                          dot: "bg-emerald-500", 
                          pill: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
                          isPulse: true 
                        },
                        busy: { 
                          label: "Busy", 
                          dot: "bg-amber-500", 
                          pill: "bg-amber-50 text-amber-700 border-amber-200/80",
                          isPulse: false 
                        },
                        "off-shift": { 
                          label: "Off Duty", 
                          dot: "bg-slate-400", 
                          pill: "bg-slate-50 text-slate-600 border-slate-200/80",
                          isPulse: false 
                        },
                        leave: { 
                          label: "On Leave", 
                          dot: "bg-rose-500", 
                          pill: "bg-rose-50 text-rose-700 border-rose-200/80",
                          isPulse: false 
                        }
                      };
                      const sInfo = statusMap[trainer.status] || statusMap.active;

                      // Type badge styling
                      const typeStyles = {
                        "Personal Trainer": "bg-indigo-50 text-indigo-700 border-indigo-100",
                        "Yoga Coach": "bg-teal-50 text-teal-700 border-teal-100",
                        "Group Instructor": "bg-violet-50 text-violet-700 border-violet-100",
                        "Nutritionist": "bg-amber-50 text-amber-700 border-amber-100"
                      };
                      const typeBadgeClass = typeStyles[trainer.type] || "bg-slate-50 text-slate-700 border-slate-200";

                      // Experience badge styling
                      const expStyles = {
                        Senior: "bg-purple-50 text-purple-700 border-purple-200/60",
                        "Mid-Level": "bg-sky-50 text-sky-700 border-sky-200/60",
                        Junior: "bg-slate-100 text-slate-700 border-slate-200/60"
                      };
                      const expBadgeClass = expStyles[trainer.experience] || "bg-slate-100 text-slate-600 border-slate-200/60";

                      return (
                        <tr 
                          key={trainer.id} 
                          className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                          onClick={() => handleTrainerClick(trainer)}
                        >
                          {/* Trainer Info */}
                          <td className="py-4 px-5 align-middle">
                            <div className="flex items-center gap-3.5">
                              <div className="relative shrink-0">
                                <img 
                                  src={trainer.image} 
                                  alt={trainer.name} 
                                  className="w-11 h-11 rounded-xl bg-slate-100 object-cover ring-1 ring-slate-200/80 shadow-2xs group-hover:ring-indigo-300 transition-all" 
                                />
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${sInfo.dot}`} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                                  {trainer.name}
                                </p>
                                <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-200/60 tracking-wider inline-block mt-1">
                                  {trainer.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Specialization & Role */}
                          <td className="py-4 px-5 align-middle">
                            <p className="text-xs font-bold text-slate-800 leading-tight">{trainer.specialization}</p>
                            <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border mt-1.5 ${typeBadgeClass}`}>
                              {trainer.type || "Personal Trainer"}
                            </span>
                          </td>

                          {/* Branch & Shift */}
                          <td className="py-4 px-5 align-middle">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${expBadgeClass}`}>
                                {trainer.experience}
                              </span>
                              <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                                <MapPin size={11} className="text-slate-400 shrink-0" /> {trainer.branch}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-1.5">
                              <Clock size={11} className="text-slate-400 shrink-0" />
                              Shift: <span className="text-slate-600 font-semibold">{trainer.shift || "09:00 - 17:00"}</span>
                            </p>
                          </td>

                          {/* Clients & Sessions */}
                          <td className="py-4 px-5 align-middle">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-sm font-extrabold text-slate-900">{trainer.activeClients}</span>
                              <span className="text-xs font-medium text-slate-500">clients</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md mt-1">
                              <span className="font-bold text-indigo-600">{trainer.sessionsToday}</span>
                              <span>today</span>
                            </div>
                          </td>

                          {/* Attendance & Rating */}
                          <td className="py-4 px-5 align-middle">
                            <div className="flex items-center gap-1 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/70 text-amber-800 w-fit shadow-2xs">
                              <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
                              <span className="text-xs font-extrabold">{Number(trainer.rating).toFixed(1)}</span>
                              <span className="text-[10px] text-amber-600/80 font-medium">/ 5.0</span>
                            </div>
                            <div className="text-[11px] font-medium text-slate-500 flex items-center gap-2 mt-1.5">
                              <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0 border border-slate-200/50">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full transition-all" 
                                  style={{ width: `${Math.min(100, Math.max(0, trainer.attendanceRate))}%` }} 
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-700">{trainer.attendanceRate}%</span>
                              <span className="text-[10px] text-slate-400">att.</span>
                            </div>
                          </td>

                          {/* Operational Status */}
                          <td className="py-4 px-5 align-middle">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border shadow-2xs ${sInfo.pill}`}>
                              {sInfo.isPulse ? (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                              ) : (
                                <span className={`w-2 h-2 rounded-full ${sInfo.dot}`} />
                              )}
                              {sInfo.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 align-middle text-right">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTrainerClick(trainer);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-indigo-600 hover:text-white border border-slate-200/80 hover:border-indigo-600 rounded-xl transition-all shadow-2xs cursor-pointer group/btn ml-auto active:scale-95"
                            >
                              <span>View Profile</span>
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

      <ProfileDrawer 
        trainer={selectedTrainer} 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />

      {/* Add Trainer Modal (matching Add Member Modal Theme) */}
      <AddTrainerModal
        isOpen={isAddTrainerOpen}
        onClose={() => setIsAddTrainerOpen(false)}
        onTrainerAdded={handleTrainerAdded}
        totalTrainersCount={trainersList.length}
      />

      {/* Modern Feedback Toast Notification */}
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
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                aria-label="Dismiss toast"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// MOUNTING FUNCTION
// ─────────────────────────────────────────
export const mountAllTrainers = () => {
  const container = document.querySelector('[data-stage="trainers"]');
  if (!container) return null;
  
  const root = createRoot(container);
  root.render(<><AllTrainers /><BrandFooter /></>);
  return root;
};
