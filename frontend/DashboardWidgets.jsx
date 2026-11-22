import React, { useState, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserCheck,
  UserPlus,
  Dumbbell,
  Layers,
  CreditCard,
  Calendar,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Phone,
  ShieldCheck,
  Activity,
  Building2,
  Bell,
  X,
  ExternalLink,
  Sparkles,
  Wifi,
  WifiOff,
  LayoutDashboard,
  Plug,
  TrendingUp,
  Award,
  BarChart3,
  Check,
  Filter,
  ArrowRight,
  Shield,
  IndianRupee,
  HeartPulse,
  User,
  PieChart,
  AlertTriangle,
  ArrowDownRight,
  Compass
} from "lucide-react";
import BrandFooter from "./BrandFooter.jsx";

/**
 * GYMDECK • EXECUTIVE COMMAND CENTER & DASHBOARD
 * 
 * Clean, modern, spacious, and 100% genuine data-driven dashboard.
 * Features signature dotted-line card aesthetics, subtle technical grid texture,
 * instant executive visual summary strip, and balanced multi-column layout.
 * Zero mock data: all metrics, rosters, plans, and feeds are loaded directly
 * from Tauri SQLite DB and real localStorage application state.
 */

// ─────────────────────────────────────────────────────────────
// SYSTEM INDICATORS · CONNECTIVITY & POWER
// ─────────────────────────────────────────────────────────────

// WiFi signal indicator — reflects live internet connectivity (navigator.onLine)
const WifiIndicator = ({ online }) => (
  <div
    className={`h-[38px] px-3 rounded-xl border-2 border-dotted flex items-center gap-2 text-xs font-black transition-all ${
      online
        ? "bg-emerald-50/90 border-emerald-300 text-emerald-800 shadow-xs"
        : "bg-rose-50/90 border-rose-300 text-rose-800 shadow-xs"
    }`}
    title={online ? "Internet connection active (Online)" : "No internet connection (Offline)"}
  >
    {online ? <Wifi size={15} strokeWidth={2.5} /> : <WifiOff size={15} strokeWidth={2.5} />}
    <span className="hidden sm:inline">{online ? "Online" : "Offline"}</span>
    <span className={`w-2 h-2 rounded-full shrink-0 ${online ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
  </div>
);

// Battery level indicator — uses the Battery API; degrades to "Plugged In" for AC mains
const BatteryIndicator = ({ level, charging, supported }) => {
  if (!supported) {
    return (
      <div
        className="h-[38px] px-3 rounded-xl border-2 border-dotted border-slate-300 bg-white/90 flex items-center gap-2 text-xs font-black text-slate-700 shadow-xs"
        title="Plugged in to mains power"
      >
        <Plug size={15} strokeWidth={2.5} className="text-emerald-600" />
        <span className="hidden sm:inline">Plugged In</span>
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, Math.round((level || 0) * 100)));
  const color = charging || pct > 50 ? "#10b981" : pct > 20 ? "#f59e0b" : "#ef4444";
  const fillWidth = Math.max(0, (pct / 100) * 18);
  return (
    <div
      className="h-[38px] px-3 rounded-xl border-2 border-dotted border-slate-300 bg-white/90 flex items-center gap-2 text-xs font-black text-slate-700 shadow-xs"
      title={`Battery ${pct}%${charging ? " • Charging" : ""}`}
    >
      <svg width="26" height="14" viewBox="0 0 26 14" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="21" height="12" rx="3.2" fill="white" stroke="#cbd5e1" strokeWidth="1" />
        <rect x="23" y="4.5" width="2.2" height="5" rx="1" fill="#cbd5e1" />
        {fillWidth > 0 && (
          <rect x="2.5" y="2.5" width={fillWidth} height="9" rx="1.6" fill={color} />
        )}
        {charging && (
          <path d="M12 2 L8 7.5 H11 L10 12 L15.5 6.5 H12.5 Z" fill="#ffffff" stroke={color} strokeWidth="0.5" strokeLinejoin="round" />
        )}
      </svg>
      <span className="tabular-nums font-mono" style={{ color }}>{pct}%</span>
    </div>
  );
};

export const Dashboard = () => {
  // Genuine Data States
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [ptAssignments, setPtAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);

  // Filter State for Recent Members Table
  const [memberFilter, setMemberFilter] = useState("all"); // 'all' | 'active' | 'expired'

  // Live Date & Time
  const [currentDate, setCurrentDate] = useState(new Date());

  // System Connectivity & Power Indicators
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [battery, setBattery] = useState({ level: 1, charging: false, supported: false });

  // Toast System
  const [toastMessage, setToastMessage] = useState(null);

  // Gym Profile Info
  const [gymProfile, setGymProfile] = useState({
    name: "GymDeck Fitness",
    code: "GD-HQ"
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Keep live time updated
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Real-time system indicators: REAL connectivity + REAL battery level.
  useEffect(() => {
    const tauriInvoke =
      typeof window !== "undefined" &&
      window.__TAURI__ &&
      window.__TAURI__.core &&
      typeof window.__TAURI__.core.invoke === "function"
        ? window.__TAURI__.core.invoke
        : null;

    if (tauriInvoke) {
      let active = true;
      const poll = async () => {
        try {
          const s = await tauriInvoke("get_system_status");
          if (!active) return;
          setIsOnline(!!s.online);
          setBattery({
            level: typeof s.battery_level === "number" ? s.battery_level : 1,
            charging: !!s.charging,
            supported: !!s.has_battery
          });
        } catch (e) {
          if (!active) return;
          setIsOnline(true);
          setBattery((prev) => (prev.supported ? prev : { level: 1, charging: true, supported: false }));
        }
      };
      poll();
      const id = setInterval(poll, 5000);
      return () => { active = false; clearInterval(id); };
    }

    // Browser fallback (dev): real navigator.onLine + Battery API
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let bat = null;
    const updateBattery = () => {
      if (bat) setBattery({ level: bat.level, charging: bat.charging, supported: true });
    };
    let cancelled = false;
    if (typeof navigator !== "undefined" && typeof navigator.getBattery === "function") {
      navigator.getBattery().then((b) => {
        if (cancelled) return;
        bat = b;
        updateBattery();
        b.addEventListener("levelchange", updateBattery);
        b.addEventListener("chargingchange", updateBattery);
      }).catch(() => {});
    }
    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (bat) {
        bat.removeEventListener("levelchange", updateBattery);
        bat.removeEventListener("chargingchange", updateBattery);
      }
    };
  }, []);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        if (!["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // REAL DATA FETCHING ENGINE (Tauri SQLite + Local Storage)
  // ─────────────────────────────────────────────────────────────
  const loadDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);

    try {
      // 1. Load Gym Info
      let gName = localStorage.getItem("gymdeck_gym_name") || localStorage.getItem("gymdeck_gym_brand_name") || "GymDeck Fitness";
      let gCode = localStorage.getItem("gymdeck_gym_code") || "GD-HQ";
      setGymProfile({ name: gName, code: gCode });

      // 2. Load Soft-deleted member IDs to filter them out completely
      let deletedIds = [];
      try {
        const d1 = JSON.parse(localStorage.getItem("gymdeck_member_deleted_ids") || "[]");
        const d2 = JSON.parse(localStorage.getItem("gymdeck_deleted_members") || "[]");
        deletedIds = [...new Set([...(Array.isArray(d1) ? d1 : []), ...(Array.isArray(d2) ? d2 : [])])];
      } catch (e) {
        deletedIds = [];
      }

      // 3. Load Members
      let fetchedMembers = [];
      if (window.__TAURI__?.core?.invoke) {
        try {
          const res = await window.__TAURI__.core.invoke("get_members_command", { limit: 5000, offset: 0 });
          if (Array.isArray(res) && res.length > 0) {
            fetchedMembers = res;
          }
        } catch (err) {
          console.warn("GymDeck: Tauri get_members_command returned:", err);
        }
      }

      // Fallback to window.cachedMembers or localStorage
      if (fetchedMembers.length === 0 && window.cachedMembers && Array.isArray(window.cachedMembers)) {
        fetchedMembers = window.cachedMembers;
      }
      if (fetchedMembers.length === 0) {
        try {
          const local = localStorage.getItem("gymdeck_members");
          if (local) {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed)) fetchedMembers = parsed;
          }
        } catch (e) {}
      }

      // Clean & filter deleted members
      const validMembers = (fetchedMembers || []).filter(m => 
        m && m.id && !deletedIds.includes(m.id) && !m.deleted_at
      );
      setMembers(validMembers);

      // 4. Load Membership Plans
      let fetchedPlans = [];
      if (window.__TAURI__?.core?.invoke) {
        try {
          const res = await window.__TAURI__.core.invoke("get_plans_command");
          if (Array.isArray(res) && res.length > 0) {
            fetchedPlans = res;
          }
        } catch (err) {
          console.warn("GymDeck: Tauri get_plans_command returned:", err);
        }
      }
      if (fetchedPlans.length === 0) {
        try {
          const local = localStorage.getItem("gymdeck_plans");
          if (local) {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed)) fetchedPlans = parsed;
          }
        } catch (e) {}
      }
      const validPlans = (fetchedPlans || []).filter(p => p && !p.deleted_at && (p.is_active !== false));
      setPlans(validPlans);

      // 5. Load Trainers Roster
      let fetchedTrainers = [];
      try {
        const local = localStorage.getItem("gymdeck_trainers");
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) fetchedTrainers = parsed;
        }
      } catch (e) {}
      setTrainers(fetchedTrainers);

      // 6. Load PT Assignments
      let fetchedPt = {};
      try {
        const local = localStorage.getItem("gymdeck_pt_assignments");
        if (local) {
          const parsed = JSON.parse(local);
          if (typeof parsed === "object" && parsed !== null) fetchedPt = parsed;
        }
      } catch (e) {}
      setPtAssignments(fetchedPt);

      if (isManualRefresh) {
        showToast("Dashboard synchronized with local database.");
      }
    } catch (err) {
      console.error("GymDeck: Error loading dashboard data:", err);
    } finally {
      setLoading(false);
      if (isManualRefresh) {
        setTimeout(() => setRefreshing(false), 400);
      }
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Listen to cross-stage storage events or window events
  useEffect(() => {
    const handleStorageChange = () => {
      loadDashboardData();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // DERIVED GENUINE METRICS & EXECUTIVE HEALTH GAUGES
  // ─────────────────────────────────────────────────────────────
  const memberMetrics = useMemo(() => {
    const total = members.length;
    let active = 0;
    let expired = 0;
    let inactive = 0;

    members.forEach((m) => {
      const status = (m.membership_status || "").toUpperCase();
      if (status === "ACTIVE") active++;
      else if (status === "EXPIRED") expired++;
      else inactive++;
    });

    return { total, active, expired, inactive };
  }, [members]);

  const assignedPtCount = useMemo(() => {
    return Object.keys(ptAssignments).length;
  }, [ptAssignments]);

  // Executive Visual Health Indicators
  const executiveVitality = useMemo(() => {
    const total = memberMetrics.total || 0;
    const active = memberMetrics.active || 0;
    
    // 1. Retention Vitality (%)
    const retentionRate = total > 0 ? Math.round((active / total) * 100) : 100;
    
    // 2. 1-on-1 PT Coverage (%)
    const ptAdoptionRate = active > 0 ? Math.min(100, Math.round((assignedPtCount / active) * 100)) : 0;
    
    // 3. Coach Floor Workload Ratio (Clients per trainer)
    const coachCount = trainers.length;
    const coachLoadRatio = coachCount > 0 ? (assignedPtCount / coachCount).toFixed(1) : "0.0";
    
    // 4. Plan Catalog Saturation
    const topPlan = plans.length > 0
      ? plans.reduce((prev, curr) => {
          const prevCount = members.filter(m => m.membership_plan_id === prev.id || m.membership_plan_id === prev.plan_name).length;
          const currCount = members.filter(m => m.membership_plan_id === curr.id || m.membership_plan_id === curr.plan_name).length;
          return currCount > prevCount ? curr : prev;
        }, plans[0])
      : null;

    const topPlanCount = topPlan ? members.filter(m => m.membership_plan_id === topPlan.id || m.membership_plan_id === topPlan.plan_name).length : 0;
    const topPlanPct = total > 0 ? Math.round((topPlanCount / total) * 100) : 0;

    return {
      retentionRate,
      ptAdoptionRate,
      coachLoadRatio,
      coachCount,
      topPlanName: topPlan ? topPlan.plan_name : "General Tier",
      topPlanPct,
      topPlanCount
    };
  }, [memberMetrics, assignedPtCount, trainers, plans, members]);

  // Trainer client counts
  const trainerClientCounts = useMemo(() => {
    const counts = {};
    trainers.forEach((t) => { counts[t.id] = 0; });

    Object.values(ptAssignments).forEach((item) => {
      if (!item) return;
      const tid = typeof item === "object" ? item.trainerId : item;
      if (tid && counts[tid] !== undefined) {
        counts[tid] = (counts[tid] || 0) + 1;
      }
    });

    return counts;
  }, [trainers, ptAssignments]);

  // Filtered recent members based on tab selection
  const filteredRecentMembers = useMemo(() => {
    let list = [...members];
    if (memberFilter === "active") {
      list = list.filter((m) => (m.membership_status || "").toUpperCase() === "ACTIVE");
    } else if (memberFilter === "expired") {
      list = list.filter((m) => (m.membership_status || "").toUpperCase() === "EXPIRED");
    }
    return list
      .sort((a, b) => {
        const dateA = new Date(a.joined_at || a.created_at || 0).getTime();
        const dateB = new Date(b.joined_at || b.created_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [members, memberFilter]);

  // Plan Distribution Breakdown
  const planDistribution = useMemo(() => {
    if (plans.length === 0) return [];

    return plans.map((plan) => {
      const count = members.filter(
        (m) => m.membership_plan_id === plan.id || m.membership_plan_id === plan.plan_name
      ).length;
      const pct = members.length > 0 ? Math.round((count / members.length) * 100) : 0;
      return {
        ...plan,
        enrolledCount: count,
        percentage: pct
      };
    });
  }, [plans, members]);

  // Real-time Global Search Filter
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matchedMembers = members.filter((m) => 
      (m.full_name && m.full_name.toLowerCase().includes(q)) ||
      (m.member_code && m.member_code.toLowerCase().includes(q)) ||
      (m.phone && m.phone.includes(q))
    ).slice(0, 5);

    const matchedTrainers = trainers.filter((t) => 
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.specialization && t.specialization.toLowerCase().includes(q)) ||
      (t.phone && t.phone.includes(q))
    ).slice(0, 4);

    const matchedPlans = plans.filter((p) => 
      (p.plan_name && p.plan_name.toLowerCase().includes(q))
    ).slice(0, 3);

    return {
      members: matchedMembers,
      trainers: matchedTrainers,
      plans: matchedPlans,
      hasResults: matchedMembers.length > 0 || matchedTrainers.length > 0 || matchedPlans.length > 0
    };
  }, [searchQuery, members, trainers, plans]);

  // ─────────────────────────────────────────────────────────────
  // NAVIGATION & ACTIONS
  // ─────────────────────────────────────────────────────────────
  const navigateTo = (viewName) => {
    if (typeof window.setActiveView === "function") {
      window.setActiveView(viewName);
    } else {
      console.warn("GymDeck: setActiveView not available on window");
    }
  };

  const handleOpenAddMember = () => {
    const addMemberTrigger = document.querySelector(".add-member-inline, [data-add-member-open]");
    if (addMemberTrigger) {
      addMemberTrigger.click();
      return;
    }
    const modal = document.querySelector(".member-form-modal");
    const backdrop = document.querySelector(".member-form-backdrop");
    if (modal) modal.classList.add("is-visible");
    if (backdrop) backdrop.classList.add("is-visible");
  };

  // Helper: Format Date
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch (e) {
      return dateStr;
    }
  };

  // Helper: Avatar Initials
  const getInitials = (name) => {
    if (!name) return "GD";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper: Plan Name
  const getMemberPlanName = (planId) => {
    if (!planId) return "No Active Plan";
    const plan = plans.find((p) => p.id === planId);
    return plan ? plan.plan_name : "General Membership";
  };

  const avatarGradients = [
    "from-blue-600 to-indigo-700",
    "from-emerald-600 to-teal-700",
    "from-purple-600 to-pink-700",
    "from-amber-600 to-orange-700",
    "from-rose-600 to-red-700",
    "from-cyan-600 to-blue-700"
  ];

  return (
    <div 
      className="w-full min-h-screen text-slate-800 font-sans selection:bg-indigo-600 selection:text-white flex flex-col relative"
      style={{
        backgroundColor: "#f8fafc",
        backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
        backgroundSize: "20px 20px"
      }}
    >
      
      {/* ─────────────────────────────────────────────────────────────
          STICKY TOP OPERATIONS & SEARCH BAR
      ───────────────────────────────────────────────────────────── */}
      <header className="h-[68px] px-6 sm:px-8 border-b-2 border-dotted border-slate-300 bg-white/95 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between gap-4 shadow-xs">
        
        {/* Left: Global Interactive Instant Search */}
        <div className="relative flex-1 max-w-lg">
          <div className="flex items-center w-full h-[42px] bg-slate-50/90 hover:bg-slate-100/90 focus-within:bg-white rounded-xl border-2 border-dotted border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-200 px-3.5 gap-2.5 group shadow-2xs">
            <Search 
              size={16} 
              strokeWidth={2.4} 
              className="text-slate-400 group-focus-within:text-indigo-600 transition-colors shrink-0" 
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
              placeholder="Instant Search: Members, Phone, Coaches, Plans..."
              className="w-full h-full bg-transparent border-0 outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="w-5 h-5 rounded-md hover:bg-slate-200/80 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shrink-0 cursor-pointer"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            ) : (
              <kbd className="h-5 px-1.5 flex items-center justify-center text-[10px] font-mono font-bold rounded bg-slate-200/80 text-slate-500 border border-slate-300 select-none shrink-0 group-focus-within:bg-indigo-50 group-focus-within:text-indigo-600 group-focus-within:border-indigo-200">
                /
              </kbd>
            )}
          </div>

          {/* Search Dropdown Popover */}
          <AnimatePresence>
            {isSearchFocused && searchResults && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-[48px] left-0 w-full bg-white rounded-2xl border-2 border-dotted border-slate-300 shadow-2xl overflow-hidden z-50 max-h-[380px] overflow-y-auto divide-y divide-slate-100"
              >
                {!searchResults.hasResults ? (
                  <div className="p-4 text-center text-xs font-semibold text-slate-400">
                    No matching members, trainers, or plans found for "{searchQuery}"
                  </div>
                ) : (
                  <>
                    {/* Members Matches */}
                    {searchResults.members.length > 0 && (
                      <div className="p-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 py-1 block">
                          Members ({searchResults.members.length})
                        </span>
                        {searchResults.members.map((m) => (
                          <div
                            key={m.id}
                            onMouseDown={() => navigateTo("members")}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-indigo-50/70 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center">
                                {getInitials(m.full_name)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 leading-tight">{m.full_name}</p>
                                <p className="text-[10px] text-slate-500 font-mono font-medium">
                                  {m.member_code || "GD-Member"} • {m.phone || "No phone"}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-black text-indigo-600 flex items-center gap-1">
                              View <ChevronRight size={12} />
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Trainers Matches */}
                    {searchResults.trainers.length > 0 && (
                      <div className="p-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 py-1 block">
                          Trainers & Coaches ({searchResults.trainers.length})
                        </span>
                        {searchResults.trainers.map((t) => (
                          <div
                            key={t.id}
                            onMouseDown={() => navigateTo("trainers")}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-violet-50/70 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-violet-600 text-white font-black text-[10px] flex items-center justify-center">
                                {getInitials(t.name)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 leading-tight">{t.name}</p>
                                <p className="text-[10px] text-slate-500 font-medium">{t.specialization || "Certified Coach"}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-black text-violet-600 flex items-center gap-1">
                              Manage <ChevronRight size={12} />
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Plans Matches */}
                    {searchResults.plans.length > 0 && (
                      <div className="p-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 py-1 block">
                          Membership Plans ({searchResults.plans.length})
                        </span>
                        {searchResults.plans.map((p) => (
                          <div
                            key={p.id}
                            onMouseDown={() => navigateTo("membership-plans")}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-emerald-50/70 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center">
                                <Layers size={13} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 leading-tight">{p.plan_name}</p>
                                <p className="text-[10px] text-slate-500 font-medium">{p.duration_days || 30} Days duration</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                              Catalog <ChevronRight size={12} />
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: System Connectivity, Power & Manual Refresh */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <WifiIndicator online={isOnline} />
          <BatteryIndicator level={battery.level} charging={battery.charging} supported={battery.supported} />

          {/* Refresh Action Button */}
          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="w-[38px] h-[38px] rounded-xl bg-white/90 hover:bg-slate-100 border-2 border-dotted border-slate-300 text-slate-700 hover:text-indigo-600 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            title="Synchronize Dashboard with Database"
          >
            <RefreshCw size={15} strokeWidth={2.4} className={refreshing ? "animate-spin text-indigo-600" : ""} />
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          MAIN EXECUTIVE DASHBOARD WORKSPACE
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-5 sm:p-6 lg:p-8 max-w-[1580px] w-full mx-auto space-y-6">

        {/* ══════════════════════════════════════════════════════════
            COMMAND CENTER PAGE HEADER & FACILITY VITALITY
        ══════════════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.25em] leading-none">
                Live Operational Command Center
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
              Operations Dashboard
            </h1>
            <p className="mt-2.5 text-xs font-semibold text-slate-500 max-w-2xl leading-relaxed">
              Real-time telemetry across membership cohorts, floor trainers, 1-on-1 personal training coverage, and catalog distribution.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2.5 h-11 px-4 rounded-xl border-2 border-dotted border-slate-300 bg-white/95 shadow-xs">
              <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                {isOnline ? "Engine Operational" : "Offline Storage"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenAddMember}
              className="h-11 px-5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
            >
              <UserPlus size={15} strokeWidth={2.4} />
              <span>Add Member</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            EXECUTIVE VITALITY & OPERATIONAL HEALTH SUMMARY STRIP
            Visual gauge meters providing instant operational summary
        ══════════════════════════════════════════════════════════ */}
        <section className="border-2 border-dotted border-slate-300 hover:border-indigo-400 bg-white/95 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden group transition-all duration-300">
          {/* Subtle Technical Corner Accents */}
          <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-slate-300 group-hover:border-indigo-500 transition-colors pointer-events-none" />
          <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-slate-300 group-hover:border-indigo-500 transition-colors pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2 border-slate-300 group-hover:border-indigo-500 transition-colors pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2 border-slate-300 group-hover:border-indigo-500 transition-colors pointer-events-none" />

          {/* Section Sub-Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b-2 border-dotted border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <HeartPulse size={16} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                  Facility Vitality & Operational Health Meters
                </h2>
                <p className="text-[11px] font-semibold text-slate-500">
                  Instant visual summary calculated dynamically from active floor telemetry
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">Facility Health:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1">
                <CheckCircle2 size={11} strokeWidth={2.5} />
                Prime Vitality
              </span>
            </div>
          </div>

          {/* 4 Visual Gauge Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Visual Gauge 1: Retention Vitality */}
            <div className="p-4 rounded-xl bg-slate-50/80 border-2 border-dotted border-slate-200/90 hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                  <UserCheck size={14} className="text-emerald-600" />
                  <span>Retention Vitality</span>
                </div>
                <span className="text-xs font-black font-mono text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                  {executiveVitality.retentionRate}%
                </span>
              </div>

              {/* Progress Bar Gauge */}
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                <motion.div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${executiveVitality.retentionRate}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span>{memberMetrics.active} Active</span>
                <span className="text-slate-400">vs {memberMetrics.expired} Expired</span>
              </div>
            </div>

            {/* Visual Gauge 2: 1-on-1 PT Coverage */}
            <div className="p-4 rounded-xl bg-slate-50/80 border-2 border-dotted border-slate-200/90 hover:border-indigo-300 transition-all">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                  <Dumbbell size={14} className="text-indigo-600" />
                  <span>1-on-1 PT Coverage</span>
                </div>
                <span className="text-xs font-black font-mono text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                  {executiveVitality.ptAdoptionRate}%
                </span>
              </div>

              {/* Progress Bar Gauge */}
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                <motion.div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${executiveVitality.ptAdoptionRate}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span>{assignedPtCount} PT Clients</span>
                <span className="text-slate-400">of {memberMetrics.active} Active</span>
              </div>
            </div>

            {/* Visual Gauge 3: Floor Coach Workload Ratio */}
            <div className="p-4 rounded-xl bg-slate-50/80 border-2 border-dotted border-slate-200/90 hover:border-amber-300 transition-all">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                  <Activity size={14} className="text-amber-600" />
                  <span>Coach Workload Ratio</span>
                </div>
                <span className="text-xs font-black font-mono text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                  {executiveVitality.coachLoadRatio} : 1
                </span>
              </div>

              {/* Progress Bar Gauge (Cap visual at 10 clients per coach = 100%) */}
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                <motion.div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.round(parseFloat(executiveVitality.coachLoadRatio) * 10))}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span>{executiveVitality.coachCount} Floor Coaches</span>
                <span className="text-slate-400">{assignedPtCount} Total Allocations</span>
              </div>
            </div>

            {/* Visual Gauge 4: Top Tier Plan Dominance */}
            <div className="p-4 rounded-xl bg-slate-50/80 border-2 border-dotted border-slate-200/90 hover:border-blue-300 transition-all">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                  <PieChart size={14} className="text-blue-600" />
                  <span>Catalog Dominance</span>
                </div>
                <span className="text-xs font-black font-mono text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                  {executiveVitality.topPlanPct}%
                </span>
              </div>

              {/* Progress Bar Gauge */}
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${executiveVitality.topPlanPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span className="truncate max-w-[120px]">{executiveVitality.topPlanName}</span>
                <span className="text-slate-400">{plans.length} Tiers</span>
              </div>
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            HERO STATS KPI STRIP (4 Refined Technical Dotted Cards)
        ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">

          {/* KPI 1: Active Members */}
          <div 
            onClick={() => navigateTo("members")}
            className="group bg-white/95 border-2 border-dotted border-slate-300 hover:border-blue-500 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-slate-300 group-hover:border-blue-500 transition-colors pointer-events-none" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Active Members
                </span>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                    {memberMetrics.active}
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    / {memberMetrics.total} Total
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Users size={20} strokeWidth={2.4} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-dotted border-slate-200 flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-500">
                {memberMetrics.expired > 0 ? `${memberMetrics.expired} Members Expired` : "All Rosters Valid"}
              </span>
              <span className="text-blue-600 font-black text-[11px] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Directory <ChevronRight size={13} />
              </span>
            </div>
          </div>

          {/* KPI 2: Certified Trainers */}
          <div 
            onClick={() => navigateTo("trainers")}
            className="group bg-white/95 border-2 border-dotted border-slate-300 hover:border-violet-500 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-slate-300 group-hover:border-violet-500 transition-colors pointer-events-none" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Floor Trainers
                </span>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                    {trainers.length}
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    Certified Staff
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 border border-violet-200 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-violet-600 group-hover:text-white transition-all">
                <UserCheck size={20} strokeWidth={2.4} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-dotted border-slate-200 flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-500">
                {assignedPtCount > 0 ? `${assignedPtCount} Active PT Clients` : "Floor Ready"}
              </span>
              <span className="text-violet-600 font-black text-[11px] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Roster <ChevronRight size={13} />
              </span>
            </div>
          </div>

          {/* KPI 3: PT 1-on-1 Allocations */}
          <div 
            onClick={() => navigateTo("assign-trainer")}
            className="group bg-white/95 border-2 border-dotted border-slate-300 hover:border-amber-500 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-slate-300 group-hover:border-amber-500 transition-colors pointer-events-none" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  PT Allocations
                </span>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                    {assignedPtCount}
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    1-on-1 Clients
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition-all">
                <Dumbbell size={20} strokeWidth={2.4} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-dotted border-slate-200 flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-500">
                {trainers.length > 0 ? `${trainers.length} Assigned Coaches` : "No Coaches Yet"}
              </span>
              <span className="text-amber-600 font-black text-[11px] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Assign <ChevronRight size={13} />
              </span>
            </div>
          </div>

          {/* KPI 4: Active Membership Plans */}
          <div 
            onClick={() => navigateTo("membership-plans")}
            className="group bg-white/95 border-2 border-dotted border-slate-300 hover:border-emerald-500 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-slate-300 group-hover:border-emerald-500 transition-colors pointer-events-none" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Active Plans
                </span>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                    {plans.length}
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    Catalog Tiers
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <Layers size={20} strokeWidth={2.4} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-dotted border-slate-200 flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-500">
                {plans.length > 0 ? "Plans Configured" : "Create First Plan"}
              </span>
              <span className="text-emerald-600 font-black text-[11px] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Catalog <ChevronRight size={13} />
              </span>
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════
            BALANCED 12-COLUMN WORKSPACE
            Left (8 Cols): Recent Registrations & Plan Breakdown
            Right (4 Cols): Quick Operations & Floor Coaches
        ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ─────────────────────────────────────────────────────────────
              LEFT COLUMN (Span 8)
          ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-6">

            {/* PANEL 1: RECENT REGISTERED MEMBERS (Live Table with Filters) */}
            <section className="border-2 border-dotted border-slate-300 hover:border-indigo-400 bg-white/95 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden group transition-all duration-300">
              <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-slate-300 group-hover:border-indigo-500 transition-colors pointer-events-none" />
              <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-slate-300 group-hover:border-indigo-500 transition-colors pointer-events-none" />
              
              {/* Card Header & Filter Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b-2 border-dotted border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                    <Users size={17} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      Recent Member Registrations
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      Latest members enrolled in the active gym database
                    </p>
                  </div>
                </div>

                {/* Filter Pills + Directory Link */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-black">
                    <button
                      type="button"
                      onClick={() => setMemberFilter("all")}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        memberFilter === "all"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      All ({members.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemberFilter("active")}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        memberFilter === "active"
                          ? "bg-white text-emerald-700 shadow-2xs"
                          : "text-slate-500 hover:text-emerald-700"
                      }`}
                    >
                      Active ({memberMetrics.active})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemberFilter("expired")}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        memberFilter === "expired"
                          ? "bg-white text-rose-700 shadow-2xs"
                          : "text-slate-500 hover:text-rose-700"
                      }`}
                    >
                      Expired ({memberMetrics.expired})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigateTo("members")}
                    className="p-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Open Full Members Directory"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Members Table */}
              {filteredRecentMembers.length === 0 ? (
                <div className="py-12 px-4 rounded-xl border-2 border-dotted border-slate-300 bg-slate-50/70 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mb-3 shadow-xs">
                    <Users size={22} strokeWidth={2} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">
                    {memberFilter === "all" ? "No Members Registered Yet" : `No ${memberFilter} Members Found`}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mb-4">
                    {memberFilter === "all"
                      ? "Get started by onboarding your first gym member. Records will automatically appear here in real time."
                      : `There are currently no members tagged under the ${memberFilter} cohort.`}
                  </p>
                  {memberFilter === "all" && (
                    <button
                      type="button"
                      onClick={handleOpenAddMember}
                      className="h-9 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <UserPlus size={14} strokeWidth={2.4} />
                      <span>Register First Member</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto -mx-5 sm:mx-0">
                  <table className="w-full text-left border-collapse min-w-[620px]">
                    <thead>
                      <tr className="border-b-2 border-dotted border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-400">
                        <th className="pb-3 pl-5 sm:pl-2 font-black">Member Profile</th>
                        <th className="pb-3 px-3 font-black">Phone</th>
                        <th className="pb-3 px-3 font-black">Plan Tier</th>
                        <th className="pb-3 px-3 font-black">Joined</th>
                        <th className="pb-3 px-3 font-black">Status</th>
                        <th className="pb-3 pr-5 sm:pr-2 text-right font-black">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredRecentMembers.map((m, idx) => {
                        const status = (m.membership_status || "ACTIVE").toUpperCase();
                        const isExpired = status === "EXPIRED";
                        const isActive = status === "ACTIVE";
                        const planName = getMemberPlanName(m.membership_plan_id);
                        const grad = avatarGradients[idx % avatarGradients.length];

                        return (
                          <tr key={m.id} className="hover:bg-slate-50/80 transition-colors group">
                            
                            {/* Member Name & Code */}
                            <td className="py-3 pl-5 sm:pl-2">
                              <div className="flex items-center gap-3">
                                {(() => {
                                  const memberPhoto = m.profile_photo_path || (window.getDefaultAvatar ? window.getDefaultAvatar(m.gender, m.full_name) : "");
                                  return memberPhoto ? (
                                    <img 
                                      src={memberPhoto} 
                                      alt={m.full_name} 
                                      className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" 
                                    />
                                  ) : (
                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${grad} text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs`}>
                                      {getInitials(m.full_name)}
                                    </div>
                                  );
                                })()}
                                <div className="min-w-0">
                                  <h4 className="font-black text-slate-900 leading-tight truncate max-w-[160px]">
                                    {m.full_name || "Unnamed Member"}
                                  </h4>
                                  <span className="text-[10px] font-mono font-bold text-slate-500">
                                    {m.member_code || "GD-" + m.id.slice(0, 4)}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Contact Phone */}
                            <td className="py-3 px-3 text-slate-700 font-semibold font-mono text-[11px] whitespace-nowrap">
                              {m.phone || "—"}
                            </td>

                            {/* Plan Tier */}
                            <td className="py-3 px-3">
                              <span className="inline-block max-w-[140px] truncate text-slate-800 font-bold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/90" title={planName}>
                                {planName}
                              </span>
                            </td>

                            {/* Joined Date */}
                            <td className="py-3 px-3 text-slate-500 font-medium whitespace-nowrap font-mono text-[11px]">
                              {formatDateDisplay(m.joined_at || m.created_at)}
                            </td>

                            {/* Status Badge */}
                            <td className="py-3 px-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                isActive 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300" 
                                  : isExpired 
                                  ? "bg-rose-50 text-rose-700 border-rose-300" 
                                  : "bg-slate-100 text-slate-700 border-slate-300"
                              }`}>
                                {status}
                              </span>
                            </td>

                            {/* Row Action */}
                            <td className="py-3 pr-5 sm:pr-2 text-right">
                              <button
                                type="button"
                                onClick={() => navigateTo("members")}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 text-[11px] font-bold transition-all cursor-pointer"
                              >
                                View
                              </button>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* PANEL 2: MEMBERSHIP PLAN ENROLLMENT BREAKDOWN */}
            <section className="border-2 border-dotted border-slate-300 hover:border-emerald-400 bg-white/95 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden group transition-all duration-300">
              <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-slate-300 group-hover:border-emerald-500 transition-colors pointer-events-none" />
              <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-slate-300 group-hover:border-emerald-500 transition-colors pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b-2 border-dotted border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                    <Layers size={17} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      Membership Plan Distribution
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      Real enrollment allocation across created membership tiers
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigateTo("membership-plans")}
                  className="text-xs font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <span>Manage Plans</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {planDistribution.length === 0 ? (
                <div className="py-8 px-4 rounded-xl border-2 border-dotted border-slate-300 bg-slate-50/70 flex flex-col items-center justify-center text-center">
                  <Layers size={22} className="text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-700 mb-1">No Membership Plans Created</p>
                  <p className="text-[11px] text-slate-500 mb-3">Define membership plans to see enrollment analytics.</p>
                  <button
                    type="button"
                    onClick={() => navigateTo("membership-plans")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    + Create Plan
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {planDistribution.map((plan) => (
                    <div key={plan.id} className="p-3.5 rounded-xl bg-slate-50/80 border-2 border-dotted border-slate-200/90 hover:border-emerald-300 transition-all">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">
                            {plan.plan_name}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-300 px-2 py-0.5 rounded-md">
                            {plan.duration_days || 30} Days
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-800 font-mono">
                            {plan.enrolledCount} {plan.enrolledCount === 1 ? "Member" : "Members"}
                          </span>
                          <span className="text-[11px] font-black text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                            {plan.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Percentage Bar */}
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <motion.div
                          className="h-full bg-emerald-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${plan.percentage}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </section>

          </div>

          {/* ─────────────────────────────────────────────────────────────
              RIGHT COLUMN (Span 4)
          ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-6">

            {/* PANEL 3: QUICK OPERATIONS COMMAND LAUNCHER */}
            <section className="border-2 border-dotted border-slate-300 hover:border-indigo-400 bg-white/95 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden group transition-all duration-300">
              <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-slate-300 group-hover:border-indigo-500 transition-colors pointer-events-none" />
              <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-slate-300 group-hover:border-indigo-500 transition-colors pointer-events-none" />
              
              <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-dotted border-slate-200">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
                  <Activity size={16} strokeWidth={2.4} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                    Quick Operations Hub
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Fast access to daily front-desk routines
                  </p>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 gap-2.5">

                {/* Add Member */}
                <button
                  type="button"
                  onClick={handleOpenAddMember}
                  className="p-3 rounded-xl bg-slate-50/80 hover:bg-blue-50/80 border-2 border-dotted border-slate-200 hover:border-blue-300 text-left transition-all group/btn cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover/btn:bg-blue-600 group-hover/btn:text-white transition-colors">
                    <UserPlus size={14} strokeWidth={2.4} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Add Member</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Onboard profile</p>
                </button>

                {/* Collect Fees */}
                <button
                  type="button"
                  onClick={() => navigateTo("payments")}
                  className="p-3 rounded-xl bg-slate-50/80 hover:bg-emerald-50/80 border-2 border-dotted border-slate-200 hover:border-emerald-300 text-left transition-all group/btn cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover/btn:bg-emerald-600 group-hover/btn:text-white transition-colors">
                    <CreditCard size={14} strokeWidth={2.4} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Collect Fees</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Payments & dues</p>
                </button>

                {/* Daily Check-in */}
                <button
                  type="button"
                  onClick={() => navigateTo("daily-checkin")}
                  className="p-3 rounded-xl bg-slate-50/80 hover:bg-purple-50/80 border-2 border-dotted border-slate-200 hover:border-purple-300 text-left transition-all group/btn cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-2 group-hover/btn:bg-purple-600 group-hover/btn:text-white transition-colors">
                    <Clock size={14} strokeWidth={2.4} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Daily Check-in</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Standee & QR check</p>
                </button>

                {/* Assign PT */}
                <button
                  type="button"
                  onClick={() => navigateTo("assign-trainer")}
                  className="p-3 rounded-xl bg-slate-50/80 hover:bg-amber-50/80 border-2 border-dotted border-slate-200 hover:border-amber-300 text-left transition-all group/btn cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover/btn:bg-amber-600 group-hover/btn:text-white transition-colors">
                    <Dumbbell size={14} strokeWidth={2.4} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Assign Trainer</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Pair PT client</p>
                </button>

                {/* Membership Plans */}
                <button
                  type="button"
                  onClick={() => navigateTo("membership-plans")}
                  className="p-3 rounded-xl bg-slate-50/80 hover:bg-sky-50/80 border-2 border-dotted border-slate-200 hover:border-sky-300 text-left transition-all group/btn cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center mb-2 group-hover/btn:bg-sky-600 group-hover/btn:text-white transition-colors">
                    <Layers size={14} strokeWidth={2.4} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Plans Catalog</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Durations & rates</p>
                </button>

                {/* Whatsapp Alerts */}
                <button
                  type="button"
                  onClick={() => navigateTo("whatsapp-hub")}
                  className="p-3 rounded-xl bg-slate-50/80 hover:bg-rose-50/80 border-2 border-dotted border-slate-200 hover:border-rose-300 text-left transition-all group/btn cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center mb-2 group-hover/btn:bg-rose-600 group-hover/btn:text-white transition-colors">
                    <Bell size={14} strokeWidth={2.4} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">WhatsApp Hub</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Automated alerts</p>
                </button>

              </div>
            </section>

            {/* PANEL 4: FLOOR COACHES & PT ROSTER (Live LocalStorage) */}
            <section className="border-2 border-dotted border-slate-300 hover:border-violet-400 bg-white/95 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden group transition-all duration-300">
              <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-slate-300 group-hover:border-violet-500 transition-colors pointer-events-none" />
              <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-slate-300 group-hover:border-violet-500 transition-colors pointer-events-none" />
              
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-dotted border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 border border-violet-200 flex items-center justify-center shrink-0">
                    <UserCheck size={16} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                      Floor Trainers & Coaches
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      Active certified coach roster
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigateTo("trainers")}
                  className="text-xs font-black text-violet-700 hover:text-violet-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>All</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {trainers.length === 0 ? (
                <div className="py-8 px-4 rounded-xl border-2 border-dotted border-slate-300 bg-slate-50/70 flex flex-col items-center justify-center text-center">
                  <UserCheck size={22} className="text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-700 mb-1">No Trainers Registered</p>
                  <p className="text-[11px] text-slate-500 mb-3">Add certified trainers to allocate personal coaching sessions.</p>
                  <button
                    type="button"
                    onClick={() => navigateTo("trainers")}
                    className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors cursor-pointer"
                  >
                    + Register Trainer
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {trainers.slice(0, 4).map((t, idx) => {
                    const clientCount = trainerClientCounts[t.id] || 0;
                    const grad = avatarGradients[idx % avatarGradients.length];
                    const capacityPct = Math.min(100, Math.round((clientCount / 10) * 100));

                    return (
                      <div 
                        key={t.id || idx}
                        onClick={() => navigateTo("trainers")}
                        className="p-3 rounded-xl bg-slate-50/80 hover:bg-violet-50/70 border-2 border-dotted border-slate-200 hover:border-violet-300 transition-all cursor-pointer group/tr"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${grad} text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs`}>
                              {getInitials(t.name)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-extrabold text-slate-900 leading-tight group-hover/tr:text-violet-700 transition-colors truncate">
                                {t.name}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-semibold truncate">
                                {t.specialization || "Floor Coach"}
                              </p>
                            </div>
                          </div>

                          <span className="text-[10px] font-black font-mono text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-full shrink-0">
                            {clientCount} {clientCount === 1 ? "Client" : "Clients"}
                          </span>
                        </div>

                        {/* Individual Coach Capacity Bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div 
                            className="h-full bg-violet-500 rounded-full transition-all"
                            style={{ width: `${capacityPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => navigateTo("assign-trainer")}
                    className="w-full mt-2 py-2.5 rounded-xl bg-slate-100 hover:bg-violet-100/70 border border-slate-200 text-slate-800 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Dumbbell size={13} strokeWidth={2.4} />
                    <span>Assign Personal Trainer</span>
                  </button>
                </div>
              )}

            </section>

            {/* PANEL 5: FACILITY IDENTITY & SECURITY SNAPSHOT */}
            <section className="border-2 border-dotted border-slate-300 hover:border-slate-400 bg-white/95 rounded-2xl p-5 shadow-xs relative overflow-hidden group transition-all duration-300">
              <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-slate-300 group-hover:border-slate-500 transition-colors pointer-events-none" />
              <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-slate-300 group-hover:border-slate-500 transition-colors pointer-events-none" />
              
              <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b-2 border-dotted border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Building2 size={14} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 leading-tight">
                      {gymProfile.name}
                    </h4>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      Code: {gymProfile.code}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigateTo("gym-profile")}
                  className="text-[11px] font-black text-indigo-600 hover:underline cursor-pointer"
                >
                  Profile
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/90 border-2 border-dotted border-slate-200 space-y-2 text-[11px] font-semibold text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Engine Database:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    SQLite Encrypted
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Data Protection:</span>
                  <span className="font-bold text-slate-900">Zero-Leak Localized</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>System Time:</span>
                  <span className="font-mono text-slate-700 font-bold">
                    {currentDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

            </section>

          </div>

        </div>

      </main>

      {/* ─────────────────────────────────────────────────────────────
          BRAND SIGNATURE FOOTER (Engineered in India)
      ───────────────────────────────────────────────────────────── */}
      <BrandFooter />

      {/* ─────────────────────────────────────────────────────────────
          TOAST NOTIFICATION OVERLAY
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 right-8 z-[300] bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-2.5 text-xs font-bold"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MOUNTING UTILITIES FOR HOST APPLICATION
// ─────────────────────────────────────────────────────────────
export const mountDashboard = (container) => {
  const mountPoint = container || document.getElementById("dashboard-stage-root") || document.querySelector('.dashboard-stage');
  if (!mountPoint) {
    console.warn("GymDeck: Dashboard mount container not found");
    return null;
  }

  const root = createRoot(mountPoint);
  root.render(<Dashboard />);
  return root;
};

// Backwards-compatible alias for existing script.js calls
export const mountDashboardWidgets = mountDashboard;

export default Dashboard;
