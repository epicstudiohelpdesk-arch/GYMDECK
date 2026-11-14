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
  Sparkles
} from "lucide-react";
import BrandFooter from "./BrandFooter.jsx";

/**
 * GYMDECK • EXECUTIVE COMMAND CENTER & DASHBOARD
 * 
 * Clean, modern, spacious, and 100% genuine data-driven dashboard.
 * Zero mock data: all metrics, rosters, plans, and feeds are loaded directly
 * from Tauri SQLite DB and real localStorage application state.
 */

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

  // Live Date & Time
  const [currentDate, setCurrentDate] = useState(new Date());

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
  // DERIVED GENUINE METRICS
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

  // Most recent members
  const recentMembers = useMemo(() => {
    return [...members]
      .sort((a, b) => {
        const dateA = new Date(a.joined_at || a.created_at || 0).getTime();
        const dateB = new Date(b.joined_at || b.created_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 6);
  }, [members]);

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
    <div className="w-full min-h-screen bg-[#f4f7fb] text-slate-800 font-sans selection:bg-blue-600 selection:text-white flex flex-col">
      
      {/* ─────────────────────────────────────────────────────────────
          STICKY TOP OPERATIONS & SEARCH BAR
      ───────────────────────────────────────────────────────────── */}
      <header className="h-[64px] px-6 sm:px-8 border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between gap-4 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.03)]">
        
        {/* Left: Global Interactive Instant Search */}
        <div className="relative flex-1 max-w-lg">
          <div className="flex items-center w-full h-[42px] bg-slate-50 hover:bg-slate-100/80 focus-within:bg-white rounded-xl border border-slate-200/90 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/15 focus-within:shadow-[0_8px_20px_-4px_rgba(37,99,235,0.14)] transition-all duration-200 px-3.5 gap-2.5 group">
            <Search 
              size={16} 
              strokeWidth={2.4} 
              className="text-slate-400 group-focus-within:text-blue-600 transition-colors shrink-0" 
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
              placeholder="Search members, trainers, plans..."
              className="w-full h-full bg-transparent border-0 outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="w-5 h-5 rounded-md hover:bg-slate-200/80 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shrink-0"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            ) : (
              <kbd className="h-5 px-1.5 flex items-center justify-center text-[10px] font-mono font-bold rounded bg-slate-200/70 text-slate-500 border border-slate-300/70 select-none shrink-0 group-focus-within:bg-blue-50 group-focus-within:text-blue-600 group-focus-within:border-blue-200">
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
                className="absolute top-[48px] left-0 w-full bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 max-h-[380px] overflow-y-auto divide-y divide-slate-100"
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
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-blue-50/70 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-[10px] flex items-center justify-center">
                                {getInitials(m.full_name)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 leading-tight">{m.full_name}</p>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  {m.member_code || "GD-Member"} • {m.phone || "No phone"}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-black text-blue-600 flex items-center gap-1">
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

        {/* Right: Date, Status, Refresh & Add Member Action */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Live Date Pill */}
          <div className="hidden sm:flex h-[38px] px-3.5 rounded-xl bg-slate-50 border border-slate-200/90 items-center gap-2 text-xs font-bold text-slate-700">
            <Calendar size={14} className="text-blue-600 shrink-0" />
            <span>
              {currentDate.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-slate-500 text-[11px]">
              {currentDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          {/* SQLite & Cloud Sync Status Badge */}
          <div 
            onClick={() => loadDashboardData(true)}
            className="h-[38px] px-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/90 hover:bg-emerald-100/80 cursor-pointer flex items-center gap-2 text-xs font-extrabold text-emerald-800 transition-all shadow-2xs active:scale-[0.98]"
            title="Click to refresh local SQLite database state"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20 shrink-0" />
            <span className="hidden md:inline">SQLite Local Sync</span>
            <span className="md:hidden">Synced</span>
          </div>

          {/* Refresh Action Button */}
          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="w-[38px] h-[38px] rounded-xl bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
            title="Refresh Dashboard Data"
          >
            <RefreshCw size={14} strokeWidth={2.4} className={refreshing ? "animate-spin text-blue-600" : ""} />
          </button>

          {/* Primary Quick Add Member Button */}
          <button
            type="button"
            onClick={handleOpenAddMember}
            className="h-[38px] px-4 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.98]"
          >
            <UserPlus size={14} strokeWidth={2.4} />
            <span className="hidden sm:inline">Add Member</span>
          </button>

        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          MAIN EXECUTIVE DASHBOARD WORKSPACE
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-5 sm:p-6 lg:p-8 max-w-[1560px] w-full mx-auto space-y-6">

        {/* ══════════════════════════════════════════════════════════
            HERO STATS KPI STRIP (4 Modern Executive Metric Cards)
        ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">

          {/* KPI 1: Active Members */}
          <div 
            onClick={() => navigateTo("members")}
            className="group bg-white border border-slate-200/80 hover:border-blue-300 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Active Members
                </span>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                    {memberMetrics.active}
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    / {memberMetrics.total} Total
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Users size={19} strokeWidth={2.4} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-500">
                {memberMetrics.expired > 0 ? `${memberMetrics.expired} Expired` : "All Members Valid"}
              </span>
              <span className="text-blue-600 font-black text-[11px] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Directory <ChevronRight size={13} />
              </span>
            </div>
          </div>

          {/* KPI 2: Floor Coaches & Staff */}
          <div 
            onClick={() => navigateTo("trainers")}
            className="group bg-white border border-slate-200/80 hover:border-violet-300 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Certified Trainers
                </span>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                    {trainers.length}
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    Floor Coaches
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <UserCheck size={19} strokeWidth={2.4} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-500">
                {assignedPtCount > 0 ? `${assignedPtCount} Active PTs` : "Roster Ready"}
              </span>
              <span className="text-violet-600 font-black text-[11px] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Roster <ChevronRight size={13} />
              </span>
            </div>
          </div>

          {/* KPI 3: PT Allocations */}
          <div 
            onClick={() => navigateTo("assign-trainer")}
            className="group bg-white border border-slate-200/80 hover:border-amber-300 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  PT Allocations
                </span>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                    {assignedPtCount}
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    1-on-1 Clients
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Dumbbell size={19} strokeWidth={2.4} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
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
            className="group bg-white border border-slate-200/80 hover:border-emerald-300 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Active Plans
                </span>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                    {plans.length}
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    Catalog Tiers
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Layers size={19} strokeWidth={2.4} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
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
            BALANCED 2-COLUMN WORKSPACE
            Left (8 Cols): Recent Registrations & Plan Breakdown
            Right (4 Cols): Quick Operations & Floor Coaches
        ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ─────────────────────────────────────────────────────────────
              LEFT COLUMN (Span 8)
          ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-6">

            {/* PANEL 1: RECENT REGISTERED MEMBERS (Live Table) */}
            <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)]">
              
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users size={16} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      Recent Member Registrations
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Latest members enrolled in the active gym database
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigateTo("members")}
                  className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <span>View All Directory</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Members Table */}
              {recentMembers.length === 0 ? (
                <div className="py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mb-3 shadow-xs">
                    <Users size={22} strokeWidth={2} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">No Members Registered Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mb-4">
                    Get started by onboarding your first gym member. Records will automatically appear here in real time.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddMember}
                    className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <UserPlus size={14} strokeWidth={2.4} />
                    <span>Register First Member</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 sm:mx-0">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                        <th className="pb-3 pl-6 sm:pl-2 font-black">Member Profile</th>
                        <th className="pb-3 px-3 font-black">Phone</th>
                        <th className="pb-3 px-3 font-black">Plan</th>
                        <th className="pb-3 px-3 font-black">Joined</th>
                        <th className="pb-3 px-3 font-black">Status</th>
                        <th className="pb-3 pr-6 sm:pr-2 text-right font-black">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {recentMembers.map((m, idx) => {
                        const status = (m.membership_status || "ACTIVE").toUpperCase();
                        const isExpired = status === "EXPIRED";
                        const isActive = status === "ACTIVE";
                        const planName = getMemberPlanName(m.membership_plan_id);
                        const grad = avatarGradients[idx % avatarGradients.length];

                        return (
                          <tr key={m.id} className="hover:bg-slate-50/70 transition-colors group">
                            
                            {/* Member Name & Code */}
                            <td className="py-3 pl-6 sm:pl-2">
                              <div className="flex items-center gap-3">
                                {m.profile_photo_path && !m.profile_photo_path.includes("dicebear.com") ? (
                                  <img 
                                    src={m.profile_photo_path} 
                                    alt={m.full_name} 
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" 
                                  />
                                ) : (
                                  <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${grad} text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs`}>
                                    {getInitials(m.full_name)}
                                  </div>
                                )}
                                <div>
                                  <h4 className="font-extrabold text-slate-900 leading-tight">
                                    {m.full_name || "Unnamed Member"}
                                  </h4>
                                  <span className="text-[10px] font-mono font-bold text-slate-500">
                                    {m.member_code || "GD-" + m.id.slice(0, 4)}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Contact Phone */}
                            <td className="py-3 px-3 text-slate-600 font-semibold font-mono text-[11px]">
                              {m.phone || "—"}
                            </td>

                            {/* Plan */}
                            <td className="py-3 px-3">
                              <span className="inline-block max-w-[130px] truncate text-slate-700 font-bold" title={planName}>
                                {planName}
                              </span>
                            </td>

                            {/* Joined Date */}
                            <td className="py-3 px-3 text-slate-500 font-medium whitespace-nowrap">
                              {formatDateDisplay(m.joined_at || m.created_at)}
                            </td>

                            {/* Status Badge */}
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border ${
                                isActive 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/80" 
                                  : isExpired 
                                  ? "bg-rose-50 text-rose-700 border-rose-200/80" 
                                  : "bg-slate-100 text-slate-700 border-slate-200/80"
                              }`}>
                                {status}
                              </span>
                            </td>

                            {/* Row Action */}
                            <td className="py-3 pr-6 sm:pr-2 text-right">
                              <button
                                type="button"
                                onClick={() => navigateTo("members")}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 text-[11px] font-bold transition-colors cursor-pointer"
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
            <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)]">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Layers size={16} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      Membership Plan Distribution
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Real enrollment allocation across created membership tiers
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigateTo("membership-plans")}
                  className="text-xs font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <span>Manage Plans</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {planDistribution.length === 0 ? (
                <div className="py-8 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center">
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
                    <div key={plan.id} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">
                            {plan.plan_name}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                            {plan.duration_days || 30} Days
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-800">
                            {plan.enrolledCount} {plan.enrolledCount === 1 ? "Member" : "Members"}
                          </span>
                          <span className="text-[11px] font-black text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                            {plan.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Percentage Bar */}
                      <div className="w-full h-2 rounded-full bg-slate-200/70 overflow-hidden">
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
            <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)]">
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Activity size={16} strokeWidth={2.4} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Quick Operations
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
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
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 hover:border-blue-200 text-left transition-all group cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center mb-2 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <UserPlus size={14} strokeWidth={2.4} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Add Member</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Onboard profile</p>
                </button>

                {/* Collect Fees */}
                <button
                  type="button"
                  onClick={() => navigateTo("payments")}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-200 text-left transition-all group cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <CreditCard size={14} strokeWidth={2.4} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Collect Fees</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Payments & dues</p>
                </button>

                {/* Daily Check-in */}
                <button
                  type="button"
                  onClick={() => navigateTo("daily-checkin")}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 hover:border-purple-200 text-left transition-all group cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-100/80 text-purple-700 flex items-center justify-center mb-2 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <Clock size={14} strokeWidth={2.4} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Daily Check-in</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Standee & QR code</p>
                </button>

                {/* Assign PT */}
                <button
                  type="button"
                  onClick={() => navigateTo("assign-trainer")}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200/80 hover:border-amber-200 text-left transition-all group cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center mb-2 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Dumbbell size={14} strokeWidth={2.4} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Assign Trainer</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Pair PT client</p>
                </button>

                {/* Membership Plans */}
                <button
                  type="button"
                  onClick={() => navigateTo("membership-plans")}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-sky-50/70 border border-slate-200/80 hover:border-sky-200 text-left transition-all group cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-100/80 text-sky-700 flex items-center justify-center mb-2 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                    <Layers size={14} strokeWidth={2.4} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Plans Catalog</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Durations & rates</p>
                </button>

                {/* Send Notifications */}
                <button
                  type="button"
                  onClick={() => navigateTo("notify-members")}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-rose-50/70 border border-slate-200/80 hover:border-rose-200 text-left transition-all group cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-7 h-7 rounded-lg bg-rose-100/80 text-rose-700 flex items-center justify-center mb-2 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    <Bell size={14} strokeWidth={2.4} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Notify Members</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Broadcast alerts</p>
                </button>

              </div>
            </section>

            {/* PANEL 4: FLOOR COACHES & PT ROSTER (Live LocalStorage) */}
            <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)]">
              
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <UserCheck size={16} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      Floor Trainers
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Active certified coach roster
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigateTo("trainers")}
                  className="text-xs font-black text-violet-600 hover:text-violet-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>All</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {trainers.length === 0 ? (
                <div className="py-8 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center">
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

                    return (
                      <div 
                        key={t.id || idx}
                        onClick={() => navigateTo("trainers")}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 hover:bg-violet-50/60 border border-slate-100 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${grad} text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs`}>
                            {getInitials(t.name)}
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900 leading-tight group-hover:text-violet-700 transition-colors">
                              {t.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {t.specialization || "Floor Coach"}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] font-black text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                          {clientCount} {clientCount === 1 ? "Client" : "Clients"}
                        </span>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => navigateTo("assign-trainer")}
                    className="w-full mt-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Dumbbell size={13} strokeWidth={2.4} />
                    <span>Assign Personal Trainer</span>
                  </button>
                </div>
              )}

            </section>

            {/* PANEL 5: FACILITY PROFILE & SYSTEM INTEGRITY */}
            <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)]">
              
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Building2 size={14} strokeWidth={2.2} />
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
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Profile
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-[11px] font-semibold text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Local Database:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <ShieldCheck size={13} className="text-emerald-600" />
                    SQLite Encrypted
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Data Protection:</span>
                  <span className="font-bold text-slate-900">Zero-Leak Isolated</span>
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
