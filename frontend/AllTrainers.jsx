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
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────
// CONSTANTS & MOCK DATA
// ─────────────────────────────────────────

const SPECIALIZATIONS = [
  "Strength", "Cardio", "CrossFit", "Yoga", "Rehabilitation", "Nutrition"
];

const TRAINER_TYPES = [
  "Personal Trainer", "Group Instructor", "Nutritionist", "Yoga Coach"
];

const BRANCHES = ["Main Branch", "Downtown", "North Gym", "East Side"];

const MOCK_TRAINERS = [
  {
    id: "TR-101",
    name: "Ankit Kumar",
    specialization: "Strength & Conditioning",
    type: "Personal Trainer",
    branch: "Main Branch",
    experience: "Senior",
    status: "active", // active, busy, off-shift, leave
    availability: "Available Now",
    rating: 4.9,
    activeClients: 12,
    sessionsToday: 5,
    attendanceRate: 98,
    revenue: 85000,
    email: "ankit.k@gymdeck.com",
    phone: "+91 98765 43210",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ankit",
    certifications: ["NSCA-CPT", "Precision Nutrition Level 1"],
    shift: "06:00 - 14:00"
  },
  {
    id: "TR-102",
    name: "Sneha Patel",
    specialization: "Yoga & Mindfulness",
    type: "Yoga Coach",
    branch: "Downtown",
    experience: "Mid-Level",
    status: "busy",
    availability: "In Session",
    rating: 4.8,
    activeClients: 8,
    sessionsToday: 3,
    attendanceRate: 95,
    revenue: 42000,
    email: "sneha.p@gymdeck.com",
    phone: "+91 98111 22233",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha",
    certifications: ["RYT 500", "Holistic Nutrition Specialist"],
    shift: "07:30 - 15:30"
  },
  {
    id: "TR-103",
    name: "Manav Rao",
    specialization: "CrossFit & HIIT",
    type: "Group Instructor",
    branch: "Main Branch",
    experience: "Senior",
    status: "active",
    availability: "Available Now",
    rating: 4.7,
    activeClients: 15,
    sessionsToday: 6,
    attendanceRate: 92,
    revenue: 96000,
    email: "manav.r@gymdeck.com",
    phone: "+91 99000 12345",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Manav",
    certifications: ["CrossFit Level 2", "Olympic Weightlifting"],
    shift: "13:00 - 21:00"
  },
  {
    id: "TR-104",
    name: "Vikram Shah",
    specialization: "Rehabilitation",
    type: "Personal Trainer",
    branch: "North Gym",
    experience: "Senior",
    status: "off-shift",
    availability: "Off Duty",
    rating: 4.9,
    activeClients: 6,
    sessionsToday: 0,
    attendanceRate: 100,
    revenue: 55000,
    email: "vikram.s@gymdeck.com",
    phone: "+91 98450 67890",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram",
    certifications: ["DPT", "NASM-CES"],
    shift: "09:00 - 17:00"
  },
  {
    id: "TR-105",
    name: "Priya Nair",
    specialization: "Nutrition & Fat Loss",
    type: "Nutritionist",
    branch: "East Side",
    experience: "Mid-Level",
    status: "leave",
    availability: "On Leave",
    rating: 4.6,
    activeClients: 22,
    sessionsToday: 0,
    attendanceRate: 88,
    revenue: 38000,
    email: "priya.n@gymdeck.com",
    phone: "+91 91234 56789",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
    certifications: ["Certified Sports Nutritionist", "NASM-CPT"],
    shift: "10:00 - 18:00"
  }
];

// ─────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────

const KPICard = ({ label, value, trend, icon: Icon, tone }) => {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100"
  };

  return (
    <div className={`p-5 rounded-2xl border ${tones[tone]} flex flex-col gap-3 transition-all hover:shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg bg-white/60`}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/60`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-medium opacity-80 uppercase tracking-wider">{label}</p>
        <h3 className="text-2xl font-bold mt-1">{value}</h3>
      </div>
    </div>
  );
};

const TrainerCard = ({ trainer, onClick }) => {
  const statusColors = {
    active: "bg-emerald-500",
    busy: "bg-amber-500",
    "off-shift": "bg-slate-400",
    leave: "bg-rose-500"
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all group cursor-pointer"
      onClick={() => onClick(trainer)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="relative">
          <img src={trainer.image} alt={trainer.name} className="w-16 h-16 rounded-xl bg-slate-100 object-cover" />
          <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${statusColors[trainer.status]}`} />
        </div>
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
          <MoreVertical size={20} />
        </button>
      </div>

      <div className="mb-4">
        <h4 className="text-lg font-bold text-slate-900 leading-tight">{trainer.name}</h4>
        <p className="text-sm text-slate-500 font-medium">{trainer.specialization}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
            {trainer.experience}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin size={12} /> {trainer.branch}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 pt-4 border-t border-slate-50">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">PT Clients</p>
          <p className="text-sm font-bold text-slate-800">{trainer.activeClients}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Sessions Today</p>
          <p className="text-sm font-bold text-slate-800">{trainer.sessionsToday}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Attendance</p>
          <p className="text-sm font-bold text-slate-800">{trainer.attendanceRate}%</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Rating</p>
          <div className="flex items-center gap-1">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold text-slate-800">{trainer.rating}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
          View Profile
        </button>
        <button className="p-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
          <MessageSquare size={16} />
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
                  <Award size={16} /> Expertise & Certifications
                </h4>
                <div className="flex flex-wrap gap-2">
                  {trainer.certifications.map((cert, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg border border-slate-100 bg-white text-xs font-bold text-slate-700 flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-emerald-500" /> {cert}
                    </span>
                  ))}
                </div>
              </section>

              <section className="mb-10">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Clock size={16} /> Shift & Schedule
                </h4>
                <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Standard Shift</p>
                      <p className="text-base font-bold text-slate-800 mt-1">{trainer.shift}</p>
                    </div>
                    <button className="text-xs font-bold text-indigo-600 hover:underline">Edit Shift</button>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-3">Today's Remaining Sessions</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">RV</div>
                          <div>
                            <p className="text-xs font-bold">Rohan Verma</p>
                            <p className="text-[10px] text-slate-400">Strength Training • 17:30</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Upcoming</span>
                      </div>
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
                    <p className="text-2xl font-bold text-slate-900">{trainer.activeClients}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Total Members</p>
                  </div>
                  <div className="text-center border-x border-slate-100">
                    <p className="text-2xl font-bold text-slate-900">₹{trainer.revenue / 1000}K</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Revenue (MTD)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{trainer.attendanceRate}%</p>
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

const AddTrainerModal = ({ isOpen, onClose, onTrainerAdded, totalTrainersCount = 5 }) => {
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
    specialization: "Strength & Conditioning",
    branch: "Main Branch",
    experience: "Senior",
    shift: "06:00 - 14:00 (Morning Shift)",
    certifications: ["NSCA-CPT", "CPR / AED"],
    bio: "",
    baseSalary: "45000",
    commission: "20%",
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
      {/* Unified Modal Backdrop (identical CSS class & transition) */}
      <div className="member-form-backdrop" onClick={handleClose} />

      {/* Unified Sliding Modal Sheet */}
      <section
        className={`member-form-modal ${currentStep > 1 ? `is-page-${currentStep}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trainer-form-title"
        aria-describedby="trainer-form-copy"
      >
        {/* Drawer Handle */}
        <div className="drawer-handle" />

        {/* Fixed Close Button at top-right */}
        <button
          className="member-modal-close-btn"
          type="button"
          aria-label="Close modal form"
          onClick={handleClose}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Top Interactive Step Navigation Pills */}
        <div className="flex items-center justify-between px-10 pt-6 pb-2.5 border-b border-slate-100 bg-white/70 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none">
            {[
              { num: 1, label: "Personal Details" },
              { num: 2, label: "Profile Photo" },
              { num: 3, label: "Documents" },
              { num: 4, label: "Role & Shifts" },
              { num: 5, label: "Agreement & Pay" }
            ].map((s) => {
              const isActive = currentStep === s.num;
              const isCompleted = currentStep > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num <= currentStep || validateStep(currentStep)) {
                      setCurrentStep(s.num);
                    }
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : isCompleted
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100"
                      : "text-slate-400 hover:text-slate-700 hover:bg-slate-100/70"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isActive
                        ? "bg-white/20 text-white"
                        : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isCompleted ? <Check size={10} strokeWidth={3.5} /> : s.num}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
          <div className="text-right text-xs font-black text-slate-400 font-mono pl-3 shrink-0">
            Step {currentStep} of 5
          </div>
        </div>

        {/* Sliding Page Container (width: 500% with translateX 0%, -20%, -40%, -60%, -80%) */}
        <div className="member-form-modal-container">
          {/* ═══════════════════════════════════════
              PAGE 1: REGISTRATION FORM (PERSONAL DETAILS)
              ═══════════════════════════════════════ */}
          <div className="member-form-page" data-member-form-page="1">
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">WORKFORCE ONBOARDING</p>
                <h2 id="trainer-form-title">Add New Trainer</h2>
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
                  placeholder="Enter trainer's full name"
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
                <span>Contact Number <em>*</em></span>
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
                <span>Emergency Contact</span>
                <input
                  type="tel"
                  placeholder="Alternate phone number"
                  value={formData.alternatePhone}
                  onChange={(e) => handleChange("alternatePhone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </label>

              {/* Email Address */}
              <label className="member-field" data-field-label="Email Address">
                <span>Email Address <em>*</em></span>
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
                  placeholder="Enter complete residential address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  required
                  style={{
                    minHeight: "56px",
                    resize: "none",
                    borderColor: errors.address ? "#ef4444" : undefined,
                    backgroundColor: errors.address ? "#fff5f5" : undefined
                  }}
                />
                {errors.address && <small className="member-field-error" style={{ display: "block", color: "#e11d48" }}>{errors.address}</small>}
              </label>

              <div className="member-form-disclaimer member-field-wide">
                <span><em>*</em> Fields marked with a red star are mandatory.</span>
              </div>
            </form>
          </div>

          {/* ═══════════════════════════════════════
              PAGE 2: PROFILE PHOTO UPLOAD
              ═══════════════════════════════════════ */}
          <div className="member-form-page" data-member-form-page="2">
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">Identity Capture</p>
                <h2 id="photo-upload-title">Capture Trainer Photo</h2>
              </div>
            </div>
            <p className="member-form-copy">
              Please upload a clear portrait photo of the trainer for credentials verification, digital badge, and member booking card.
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
                    <svg viewBox="0 0 24 24">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
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
                <p className="photo-capture-recommendation">Recommended: High quality JPG or PNG (square portrait format)</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <button
                    type="button"
                    className={`btn-change-photo ${photoPreview ? "is-visible" : ""}`}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      style={{ width: "14px", height: "14px" }}
                    >
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span>Change Photo</span>
                  </button>
                  {photoPreview && (
                    <button
                      type="button"
                      className="btn-change-photo is-visible !text-rose-600 !border-rose-200 hover:!bg-rose-50"
                      onClick={() => setPhotoPreview(null)}
                    >
                      <X size={14} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              PAGE 3: DOCUMENT UPLOAD CENTER
              ═══════════════════════════════════════ */}
          <div className="member-form-page" data-member-form-page="3">
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">Document Center</p>
                <h2 id="doc-upload-title">Upload Trainer Documents</h2>
              </div>
            </div>
            <p className="member-form-copy">
              Trainer profile initiated. Add supporting accreditations and identity proof to complete staff verification.
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
                <div className="doc-upload-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M7 15h0M11 15h0M15 15h0M7 11h0M11 11h0M15 11h0" />
                  </svg>
                </div>
                <div className="doc-upload-card-content">
                  <strong>Aadhaar / National ID</strong>
                  <span>Government identity proof (front &amp; back)</span>
                  <div className="doc-upload-card-actions">
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
                      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: "14px", height: "14px", marginRight: "6px" }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
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
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="doc-pdf-icon-svg">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
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
                <div className="doc-upload-card-content">
                  <strong>Fitness Certification</strong>
                  <span>NSCA, NASM, ACE, or CrossFit certificate</span>
                  <div className="doc-upload-card-actions">
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
                      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: "14px", height: "14px", marginRight: "6px" }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Upload
                    </button>
                    <span className="doc-upload-meta">
                      {documents.cert ? `${documents.cert.name} (${documents.cert.size})` : "No file selected"}
                    </span>
                    {documents.cert && (
                      <div className="doc-upload-preview">
                        {documents.cert.isPdf ? (
                          <div className="doc-upload-preview-pdf">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="doc-pdf-icon-svg">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
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
                <div className="doc-upload-card-content">
                  <strong>Trainer Resume / CV</strong>
                  <span>Coaching background, experience records &amp; bio</span>
                  <div className="doc-upload-card-actions">
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
                      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: "14px", height: "14px", marginRight: "6px" }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
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
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="doc-pdf-icon-svg">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
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

              {/* Police Clearance / Medical Background */}
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
                <div className="doc-upload-card-icon">
                  <Shield size={22} strokeWidth={1.8} />
                </div>
                <div className="doc-upload-card-content">
                  <strong>Police Clearance / Medical</strong>
                  <span>Background check verification &amp; health certificate</span>
                  <div className="doc-upload-card-actions">
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
                      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: "14px", height: "14px", marginRight: "6px" }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Upload
                    </button>
                    <span className="doc-upload-meta">
                      {documents.clearance ? `${documents.clearance.name} (${documents.clearance.size})` : "No file selected"}
                    </span>
                    {documents.clearance && (
                      <div className="doc-upload-preview">
                        {documents.clearance.isPdf ? (
                          <div className="doc-upload-preview-pdf">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="doc-pdf-icon-svg">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
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

            <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3 text-xs text-slate-500 font-medium">
              <Sparkles size={16} className="text-indigo-600 shrink-0" />
              <span>
                Supporting credentials can also be uploaded, verified, or updated anytime directly from the trainer's profile drawer.
              </span>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              PAGE 4: STAFF ALLOCATION & OPERATIONAL SHIFTS
              ═══════════════════════════════════════ */}
          <div className="member-form-page" data-member-form-page="4">
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker">Role &amp; Schedule</p>
                <h2 id="plan-selection-title">Staff Allocation &amp; Shifts</h2>
              </div>
            </div>
            <p className="member-form-copy">
              Assign trainer specialization, facility branch, coaching level, and weekly operational shift allocation.
            </p>

            <div className="member-form-grid">
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

              {/* Branch */}
              <div className="member-field">
                <span>Assigned Facility / Branch <em>*</em></span>
                <CustomSelect
                  value={formData.branch}
                  onChange={(val) => handleChange("branch", val)}
                  options={BRANCHES}
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

              {/* Shift Schedule */}
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

              {/* Certifications Badges Selection */}
              <div className="member-field member-field-wide">
                <span className="flex items-center justify-between">
                  <span>Professional Certifications &amp; Accreditations</span>
                  <span className="text-[11px] font-bold text-slate-500">
                    {formData.certifications.length} selected
                  </span>
                </span>
                <p className="text-xs text-slate-500 font-medium mt-1 mb-3">
                  Select accreditations to display on the trainer's profile card and client booking radar:
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    "NSCA-CPT",
                    "NASM-CPT",
                    "ACE-CPT",
                    "CrossFit Level 2",
                    "RYT 500",
                    "Precision Nutrition Level 1",
                    "ISSA Certified",
                    "CPR / AED",
                    "Olympic Weightlifting",
                    "DPT"
                  ].map((cert) => {
                    const isSelected = formData.certifications.includes(cert);
                    return (
                      <button
                        key={cert}
                        type="button"
                        onClick={() => toggleCertification(cert)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {isSelected ? <Check size={13} strokeWidth={3} /> : <Plus size={13} strokeWidth={2.5} />}
                        {cert}
                      </button>
                    );
                  })}
                </div>

                {/* Custom badge input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom certification (e.g. Kettlebell Specialist)..."
                    value={customCert}
                    onChange={(e) => setCustomCert(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomCertification();
                      }
                    }}
                    className="flex-1 !min-h-[46px] !rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={addCustomCertification}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                  >
                    Add Badge
                  </button>
                </div>
              </div>

              {/* Bio & Philosophy */}
              <label className="member-field member-field-wide">
                <span>Professional Bio &amp; Coaching Philosophy</span>
                <textarea
                  rows={2}
                  placeholder="Highlight certifications background, coaching philosophy, and athletic milestones..."
                  value={formData.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  style={{ minHeight: "72px", resize: "none" }}
                />
              </label>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              PAGE 5: COMPENSATION & CONTRACT SUMMARY (CHECKOUT THEME)
              ═══════════════════════════════════════ */}
          <div className="member-form-page" data-member-form-page="5">
            <div className="member-form-top">
              <div>
                <p className="member-form-kicker-premium">Contract &amp; Compensation</p>
                <h2 id="payment-title" className="checkout-title-premium">Agreement Summary &amp; Pay</h2>
              </div>
            </div>
            <p className="member-form-copy-premium">
              Verify the trainer agreement details and record compensation structure to activate the profile.
            </p>

            <div className="payment-split-layout">
              {/* Left Column: Premium Ticket Receipt with Live Updates */}
              <div className="checkout-billing-section">
                <div className="premium-receipt-card">
                  <div className="receipt-header">
                    <div className="receipt-brand">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      <span>AGREEMENT SUMMARY</span>
                    </div>
                    <span className="receipt-status-badge">READY TO ONBOARD</span>
                  </div>

                  <div className="receipt-meta">
                    <span className="receipt-id">TX-GD-TR-{100 + totalTrainersCount + 1}</span>
                    <span className="receipt-date">{currentDateStr}</span>
                  </div>

                  <div className="receipt-divider" />

                  {/* Details */}
                  <div className="receipt-item-list">
                    <div className="receipt-item-row">
                      <div className="item-label-group">
                        <div className="item-icon-wrapper plan-glow">
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                          </svg>
                        </div>
                        <div className="item-text">
                          <span className="item-name">{formData.fullName.trim() || "New Trainer"}</span>
                          <span className="item-desc">{formData.type} • {formData.specialization}</span>
                        </div>
                      </div>
                      <span className="item-value badge-plan-premium">{formData.branch}</span>
                    </div>

                    <div className="receipt-item-row">
                      <div className="item-label-group">
                        <div className="item-icon-wrapper price-glow">
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <circle cx="12" cy="12" r="3" />
                            <path d="M18 8.01h.01M6 16.01h.01" />
                          </svg>
                        </div>
                        <div className="item-text">
                          <span className="item-name">Monthly Base Salary</span>
                          <span className="item-desc">Guaranteed monthly retainer</span>
                        </div>
                      </div>
                      <span className="item-value">₹{baseSalaryNum.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="receipt-item-row">
                      <div className="item-label-group">
                        <div className="item-icon-wrapper fee-glow">
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </div>
                        <div className="item-text">
                          <span className="item-name">PT Commission</span>
                          <span className="item-desc">Per-session incentive rate</span>
                        </div>
                      </div>
                      <span className="item-value">{formData.commission || "20%"}</span>
                    </div>

                    <div className="receipt-item-row">
                      <div className="item-label-group">
                        <div className="item-icon-wrapper plan-glow">
                          <Clock size={15} strokeWidth={2.5} />
                        </div>
                        <div className="item-text">
                          <span className="item-name">Shift Allocation</span>
                          <span className="item-desc">{formData.shift}</span>
                        </div>
                      </div>
                      <span className="item-value text-xs font-bold text-slate-500 uppercase">
                        {formData.agreementType.split(" ")[0]}
                      </span>
                    </div>
                  </div>

                  {/* Tear-off line */}
                  <div className="receipt-tear-line" />

                  {/* Total */}
                  <div className="receipt-total-section">
                    <div className="total-label-group">
                      <span className="total-label">Estimated Monthly Compensation</span>
                      <span className="total-subtext">Base retainer + estimated PT session yield</span>
                    </div>
                    <div className="total-value-wrapper">
                      <span className="receipt-total-value">
                        ₹{Math.round(totalProjected).toLocaleString("en-IN")}
                        <span className="text-xs font-bold opacity-60 ml-1">/mo</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Compensation & Agreement Mode Selection */}
              <div className="checkout-payment-section">
                <span className="payment-selection-title">Employment &amp; Agreement Terms</span>

                {/* Base Salary Input */}
                <div className="member-field mb-4">
                  <span>Monthly Base Retainer (₹ INR)</span>
                  <div className="relative mt-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      placeholder="e.g. 45000"
                      value={formData.baseSalary}
                      onChange={(e) => handleChange("baseSalary", e.target.value)}
                      className="!pl-9"
                      min="0"
                    />
                  </div>
                </div>

                {/* PT Commission Input */}
                <div className="member-field mb-4">
                  <span>PT Session Commission</span>
                  <input
                    type="text"
                    placeholder="e.g. 20% or ₹600/session"
                    value={formData.commission}
                    onChange={(e) => handleChange("commission", e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Agreement Mode Options */}
                <div className="payment-modes-stack">
                  {[
                    {
                      id: "Full-Time Staff",
                      title: "Full-Time Staff Agreement",
                      desc: "Dedicated roster with monthly salary and gym benefits"
                    },
                    {
                      id: "Consultant / Part-Time",
                      title: "Consultant / Part-Time Agreement",
                      desc: "Flexible shifts with hourly/session-based retainers"
                    },
                    {
                      id: "Freelance Trainer",
                      title: "Freelance PT Agreement",
                      desc: "Independent personal coach with floor access privileges"
                    }
                  ].map((mode) => {
                    const isActive = formData.agreementType === mode.id;
                    return (
                      <label
                        key={mode.id}
                        className={`payment-mode-option cursor-pointer ${isActive ? "active" : ""}`}
                        onClick={() => handleChange("agreementType", mode.id)}
                      >
                        <div className="payment-mode-left">
                          <div className={`payment-mode-icon-wrapper ${isActive ? "cash-icon" : ""}`}>
                            <Briefcase size={18} strokeWidth={2.5} />
                          </div>
                          <div className="payment-mode-details">
                            <span className="payment-mode-name">{mode.title}</span>
                            <span className="payment-mode-desc">{mode.desc}</span>
                          </div>
                        </div>
                        <div className="payment-mode-selector">
                          <div className={`custom-radio-indicator ${isActive ? "active" : ""}`} />
                        </div>
                      </label>
                    );
                  })}
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to parse saved trainers:", e);
    }
    return MOCK_TRAINERS;
  });

  const [viewMode, setViewMode] = useState("grid"); // grid or table
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddTrainerOpen, setIsAddTrainerOpen] = useState(false);
  const [toast, setToast] = useState(null);

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
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           t.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = activeFilter === "All" || t.status === activeFilter.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }, [trainersList, searchQuery, activeFilter]);

  const totalTrainers = trainersList.length;
  const activeShiftCount = trainersList.filter(t => t.status === "active").length;
  const busyCount = trainersList.filter(t => t.status === "busy").length;
  const leaveCount = trainersList.filter(t => t.status === "leave").length;

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
            <span>Trainers & Staff</span>
            <ChevronRight size={16} className="text-slate-300 mx-2" />
            <span className="text-slate-900 font-bold">All Trainers</span>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-96 group">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search trainer, specialization, PT clients..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">⌘</span>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">K</span>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setIsAddTrainerOpen(true)}
            className="add-member-btn cursor-pointer"
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
      <div className="flex items-end justify-between mb-2 relative z-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">All Trainers</h1>
          <p className="text-slate-500 text-xs font-semibold mt-2 max-w-2xl">
            Manage trainers, PT staff, schedules, attendance, and operational performance across your fitness ecosystem.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {["PT Analytics", "Shift Management", "Payroll Insights", "Performance"].map((pill) => (
            <button key={pill} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
              {pill}
            </button>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────
          KPI ANALYTICS STRIP
          ───────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-5 mb-2 relative z-10">
        <KPICard label="Total Trainers" value={totalTrainers.toString()} icon={Users} tone="indigo" trend={`+${totalTrainers - 5 > 0 ? totalTrainers - 5 : 2} this month`} />
        <KPICard label="Active PT Sessions" value="42" icon={Zap} tone="emerald" trend="8 active now" />
        <KPICard label="Trainers On Shift" value={activeShiftCount.toString()} icon={Clock} tone="blue" trend="Next shift: 14:00" />
        <KPICard label="PT Revenue Today" value="₹12.4K" icon={BarChart3} tone="amber" trend="15% above avg" />
        <KPICard label="Avg Rating" value="4.85" icon={Star} tone="rose" trend="Top 1% in sector" />
      </div>

      <div className="all-trainers-workspace">
        {/* ─────────────────────────────────────────
            SEARCH + FILTER TOOLBAR
            ───────────────────────────────────────── */}
        <div className="all-trainers-workspace-sticky-header">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filters</span>
            </div>
            
            <div className="h-6 w-px bg-slate-100" />

            <div className="flex items-center gap-3">
              <select className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
                <option>Specialization: All</option>
                {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
              </select>
              <select className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
                <option>Experience: All</option>
                <option>Junior</option>
                <option>Mid-Level</option>
                <option>Senior</option>
              </select>
              <select className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
                <option>Branch: All Branches</option>
                {BRANCHES.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg transition-all ${viewMode === "table" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────
            MAIN WORKSPACE
            ───────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* LEFT PANEL: QUICK FILTERS */}
          <aside className="col-span-2 space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Operational Status</p>
              {[
                { label: "All", count: totalTrainers, color: "bg-slate-500" },
                { label: "Active", count: activeShiftCount, color: "bg-emerald-500" },
                { label: "Busy", count: busyCount, color: "bg-amber-500" },
                { label: "On Leave", count: leaveCount, color: "bg-rose-500" }
              ].map((f) => (
                <button
                  key={f.label}
                  onClick={() => setActiveFilter(f.label)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${activeFilter === f.label ? "bg-white shadow-md border border-slate-100 ring-1 ring-slate-100" : "hover:bg-white/50 text-slate-500"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${f.color}`} />
                    <span className="text-sm font-bold">{f.label}</span>
                  </div>
                  <span className="text-xs font-bold opacity-40">{f.count}</span>
                </button>
              ))}
            </div>

            <div className="pt-6 border-t border-slate-200 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Staff Groups</p>
              {TRAINER_TYPES.map((type) => (
                <button key={type} className="w-full flex items-center justify-between p-3 rounded-xl text-slate-500 hover:bg-white/50 transition-all">
                  <span className="text-sm font-bold">{type}s</span>
                  <ChevronRight size={14} className="opacity-40" />
                </button>
              ))}
            </div>
          </aside>

          {/* CENTER: TRAINERS GRID / TABLE */}
          <section className="col-span-7">
            {viewMode === "grid" ? (
              filteredTrainers.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-sm">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Users size={28} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">No trainers found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
                    No staff member matches your current search or filter criteria. Add a new trainer or clear filters.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                      >
                        Clear Search
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
                <div className="grid grid-cols-2 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredTrainers.map((trainer) => (
                      <TrainerCard key={trainer.id} trainer={trainer} onClick={handleTrainerClick} />
                    ))}
                  </AnimatePresence>
                </div>
              )
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trainer</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Specialization</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workload</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrainers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center">
                          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                            <Users size={22} />
                          </div>
                          <p className="text-sm font-bold text-slate-700">No trainers found</p>
                          <p className="text-xs text-slate-400 mt-1 mb-4">Try adjusting your search query or filter options.</p>
                          <button
                            type="button"
                            onClick={() => setIsAddTrainerOpen(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm cursor-pointer"
                          >
                            <Plus size={14} /> Add Trainer
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredTrainers.map((trainer) => (
                        <tr 
                          key={trainer.id} 
                          className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                          onClick={() => handleTrainerClick(trainer)}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img src={trainer.image} alt="" className="w-10 h-10 rounded-lg bg-slate-100" />
                              <div>
                                <p className="text-sm font-bold text-slate-900 leading-none">{trainer.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{trainer.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm font-semibold text-slate-600">{trainer.specialization}</td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between w-24">
                                <span className="text-[10px] font-bold text-slate-400">Utilization</span>
                                <span className="text-[10px] font-bold text-slate-700">75%</span>
                              </div>
                              <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: "75%" }} />
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-xs font-bold text-slate-800">₹{trainer.revenue / 1000}K</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Revenue</p>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800">{trainer.rating}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Rating</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${trainer.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <span className="text-xs font-bold text-slate-700 capitalize">{trainer.status}</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* RIGHT PANEL: TRAINER INTELLIGENCE */}
          <aside className="col-span-3 space-y-6">
            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={18} className="text-indigo-200" />
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-100">AI Intelligence</span>
              </div>
              <h4 className="text-lg font-bold leading-tight mb-4">Trainer utilization increased 14% this week.</h4>
              <p className="text-sm text-indigo-100/80 leading-relaxed mb-6">
                3 trainers are nearing their overbooking threshold. Recommend redistributing 5 upcoming PT trials to Sneha.
              </p>
              <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/20">
                View Staff Recommendations
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Activity size={16} /> Live Staff Status
              </h4>
              <div className="space-y-4">
                {[
                  { name: "Ongoing PT Sessions", count: 8, trend: "+2" },
                  { name: "Available for Trials", count: 3, trend: "0" },
                  { name: "Shift Transitions (1h)", count: 2, trend: "-1" }
                ].map((s) => (
                  <div key={s.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{s.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Status: Stable</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900">{s.count}</p>
                      <span className="text-[10px] font-bold text-emerald-500">{s.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <TrendingUp size={16} /> Performance Snapshot
              </h4>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top Rated</span>
                    <span className="text-[10px] font-bold text-slate-900">Vikram Shah</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full">
                    <div className="h-full bg-rose-500" style={{ width: "98%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Highest Revenue</span>
                    <span className="text-[10px] font-bold text-slate-900">Manav Rao</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full">
                    <div className="h-full bg-emerald-500" style={{ width: "85%" }} />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* ─────────────────────────────────────────
            BOTTOM ANALYTICS & OPERATIONAL REPORTS
            ───────────────────────────────────────── */}
        <section className="mt-12 pt-12 border-t border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <PieChart size={24} className="text-indigo-600" /> Operational Workforce Analytics
            </h3>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                <Download size={14} /> Export Workforce Data
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                <Calendar size={14} /> View Shift Planner
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Revenue Leaderboard</p>
              <div className="space-y-4">
                {trainersList.slice(0, 3).map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-300">0{i+1}</span>
                    <img src={t.image} alt="" className="w-8 h-8 rounded-lg bg-slate-50" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-800">{t.name}</p>
                      <div className="w-full h-1 bg-slate-50 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${80 - i*15}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-900">₹{t.revenue / 1000}K</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Staff Utilization</p>
              <div className="h-32 flex items-end gap-2 px-2">
                {[45, 68, 82, 91, 74, 56, 42].map((h, i) => (
                  <div key={i} className="flex-1 bg-slate-100 rounded-t-lg relative group">
                    <div 
                      className="absolute bottom-0 w-full bg-indigo-500/20 group-hover:bg-indigo-500 rounded-t-lg transition-all duration-500"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-[10px] font-bold text-slate-400">Mon</span>
                <span className="text-[10px] font-bold text-slate-400">Sun</span>
              </div>
            </div>

            <div className="col-span-2 bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Staffing Insight</p>
                  <h3 className="text-2xl font-bold max-w-sm leading-tight">Your trainer utilization is optimized for the morning shift.</h3>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-3xl font-black">74%</p>
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Avg Occupancy</p>
                  </div>
                  <div className="h-10 w-px bg-white/10" />
                  <div>
                    <p className="text-3xl font-black">₹4.2L</p>
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Projected Commission</p>
                  </div>
                  <button className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-xl shadow-indigo-900/40">
                    Review Payroll
                  </button>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 blur-[80px] rounded-full -ml-10 -mb-10" />
            </div>
          </div>
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
