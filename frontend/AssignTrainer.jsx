import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Dumbbell,
  UserCheck,
  Award,
  RefreshCw,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  CheckCircle2,
  Calendar,
  Layers,
  Clock,
  Sparkles,
  ArrowUpRight,
  FileText,
  UserPlus,
  CalendarClock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR RESOLVER HELPERS (0% MOCK DATA, STRICT SYSTEM SVG FALLBACK)
// ─────────────────────────────────────────────────────────────────────────────

const getInitialsAvatar = (name = "Member", gender = "male") => {
  const cleanName = (name || "Member").trim();
  const initials = cleanName
    .split(/\s+/)
    .slice(0, 2)
    .map(p => (p && p[0] ? p[0].toUpperCase() : ""))
    .join("") || "M";
  const bg = (gender || "").toLowerCase() === "female" ? "%23ec4899" : "%234f46e5";
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><text x="50" y="55" font-size="38" font-family="system-ui,sans-serif" font-weight="800" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
};

const resolvePhoto = (photoPath, name, gender) => {
  if (photoPath && typeof photoPath === "string" && photoPath.length > 5) {
    return photoPath;
  }
  if (window.getDefaultAvatar) {
    try {
      const defaultSvg = window.getDefaultAvatar(gender || "male", name || "Member");
      if (defaultSvg) return defaultSvg;
    } catch (e) {}
  }
  return getInitialsAvatar(name, gender);
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ASSIGN TRAINER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const AssignTrainer = () => {
  // Real DB state
  const [members, setMembers] = useState([]);
  const [totalActiveMembersCount, setTotalActiveMembersCount] = useState(0);
  const [trainers, setTrainers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [assignmentsMap, setAssignmentsMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Assignment Modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedMemberForAssign, setSelectedMemberForAssign] = useState(null);
  const [formTrainerId, setFormTrainerId] = useState("");
  const [formPackageName, setFormPackageName] = useState("");
  const [formSessionCount, setFormSessionCount] = useState(24);
  const [formSlot, setFormSlot] = useState("");
  const [formDays, setFormDays] = useState("");
  const [formStartDate, setFormStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formNotes, setFormNotes] = useState("");

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // FETCH REAL DATA FROM TAURI SQLite DB & LOCALSTORAGE
  // ───────────────────────────────────────────────────────────────────────────
  const fetchRealData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch real members from Tauri SQLite database
      let dbMembers = [];
      if (window.__TAURI__?.core?.invoke) {
        dbMembers = await window.__TAURI__.core.invoke("get_members_command", { limit: 10000, offset: 0 }).catch(() => []);
      }

      // Fallback: check window.cachedMembers or localStorage if Tauri returned empty
      if (!dbMembers || dbMembers.length === 0) {
        if (window.cachedMembers && window.cachedMembers.length > 0) {
          dbMembers = window.cachedMembers;
        } else {
          try {
            const rawStored = localStorage.getItem("gymdeck_members");
            if (rawStored) {
              const parsed = JSON.parse(rawStored);
              if (Array.isArray(parsed)) dbMembers = parsed;
            }
          } catch (e) {}
        }
      }

      // Check soft-deleted members
      let deletedIds = new Set();
      try {
        const rawDeleted = localStorage.getItem("gymdeck_deleted_members") || localStorage.getItem("gymdeck_member_deleted_ids");
        if (rawDeleted) {
          const parsedDel = JSON.parse(rawDeleted);
          if (Array.isArray(parsedDel)) deletedIds = new Set(parsedDel.map(String));
        }
      } catch (e) {}

      // 2. Fetch real plans from Tauri SQLite database
      let dbPlans = [];
      if (window.__TAURI__?.core?.invoke) {
        dbPlans = await window.__TAURI__.core.invoke("get_plans_command").catch(() => []);
      }
      setPlans(dbPlans || []);

      const plansMap = {};
      if (Array.isArray(dbPlans)) {
        dbPlans.forEach(p => {
          if (p && p.id) plansMap[p.id] = p;
        });
      }

      // 3. Fetch real trainers from localStorage
      let realTrainers = [];
      try {
        const savedTrainers = localStorage.getItem("gymdeck_trainers");
        if (savedTrainers) {
          const parsed = JSON.parse(savedTrainers);
          if (Array.isArray(parsed)) {
            // Purge any legacy mock IDs
            const mockIds = new Set(["TR-101", "TR-102", "TR-103", "TR-104", "TR-105"]);
            realTrainers = parsed.filter(t => t && t.id && !mockIds.has(t.id));
          }
        }
      } catch (e) {
        console.warn("GymDeck: Error loading real trainers", e);
      }
      setTrainers(realTrainers);

      // 4. Fetch persistent PT assignments from localStorage
      let savedAssignments = {};
      try {
        const storedAssignments = localStorage.getItem("gymdeck_pt_assignments");
        if (storedAssignments) {
          savedAssignments = JSON.parse(storedAssignments) || {};
        }
      } catch (e) {
        console.warn("GymDeck: Error loading PT assignments", e);
      }
      setAssignmentsMap(savedAssignments);

      // Track total active members count
      let activeCount = 0;

      // 5. Filter for ONLY active members who do NOT have a PT package already
      const eligibleMembers = [];

      (dbMembers || []).forEach(m => {
        if (!m) return;
        const memberIdStr = m.id ? m.id.toString() : (m.rawId ? m.rawId.toString() : "");
        if (memberIdStr && deletedIds.has(memberIdStr)) return;

        // Check active status: only active members are displayed
        const rawStatus = (m.membership_status || m.status || "ACTIVE").toUpperCase();
        if (
          rawStatus === "CANCELLED" ||
          rawStatus === "DELETED" ||
          rawStatus === "TERMINATED" ||
          rawStatus === "EXPIRED" ||
          rawStatus === "INACTIVE"
        ) {
          return;
        }

        // Check expiration date
        const expiryVal = m.expiry_date || m.expires_at || m.expiry;
        if (expiryVal) {
          const expTime = new Date(expiryVal).getTime();
          if (!isNaN(expTime) && expTime < Date.now()) {
            return;
          }
        }

        activeCount++;

        // Check if member already has a PT package or assigned trainer
        const planObj = plansMap[m.membership_plan_id || m.plan_id] || {};
        const planName = planObj.name || planObj.plan_name || m.plan || m.plan_name || "General Membership";
        const hasAssignment = Boolean(savedAssignments[memberIdStr]);
        const isPtPlan =
          planName.toLowerCase().includes("personal") ||
          planName.toLowerCase().includes("pt ") ||
          planName.toLowerCase().includes("trainer") ||
          Boolean(m.is_pt) ||
          Boolean(m.pt_package);

        // Members are displayed because they do not have a PT package already
        if (!isPtPlan && !hasAssignment) {
          eligibleMembers.push({
            id: memberIdStr,
            rawId: m.id,
            memberCode: m.member_code || `GD-${m.id}`,
            name: m.full_name || m.name || "Member",
            phone: m.phone || m.contact_number || "—",
            email: m.email || "—",
            gender: m.gender || "male",
            photo: m.profile_photo_path || m.photo || null,
            status: "ACTIVE",
            planId: m.membership_plan_id || m.plan_id,
            planName: planName,
            joinedDate: m.joined_at || m.joining_date || m.created_at || null,
            expiryDate: expiryVal || null
          });
        }
      });

      setMembers(eligibleMembers);
      setTotalActiveMembersCount(activeCount);
    } catch (err) {
      console.error("GymDeck: Error loading members for Assign Trainer:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRealData();
  }, [fetchRealData]);

  // Open Assign Trainer Modal for a specific member
  const handleOpenAssignModal = (member) => {
    setSelectedMemberForAssign(member);
    setFormTrainerId(trainers[0]?.id || "");
    const availablePtPlans = plans.filter(p => {
      const n = (p.name || p.plan_name || "").toLowerCase();
      return n.includes("personal") || n.includes("pt") || Boolean(p.is_pt);
    });
    setFormPackageName(availablePtPlans[0]?.name || "Personal Training (24 Sessions)");
    setFormSessionCount(24);
    setFormSlot("");
    setFormDays("");
    setFormStartDate(new Date().toISOString().split("T")[0]);
    setFormNotes("");
    setIsAssignModalOpen(true);
  };

  // Smooth navigation to All Trainers page to register a trainer
  const handleNavigateToTrainers = () => {
    setIsAssignModalOpen(false);
    if (typeof window.setActiveView === "function") {
      window.setActiveView("trainers");
    } else {
      const link = document.querySelector('[data-view="trainers"]');
      if (link) {
        link.click();
      }
    }
  };

  // Format joined date for modal display
  const formattedJoinedDate = useMemo(() => {
    if (!selectedMemberForAssign?.joinedDate) return "Active Member";
    try {
      const d = new Date(selectedMemberForAssign.joinedDate);
      if (isNaN(d.getTime())) return "Active Member";
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) {
      return "Active Member";
    }
  }, [selectedMemberForAssign]);

  // ───────────────────────────────────────────────────────────────────────────
  // CONFIRM ASSIGNMENT ACTION (PERSISTS TO LOCALSTORAGE & STATE)
  // ───────────────────────────────────────────────────────────────────────────
  const handleSaveAssignment = () => {
    if (!selectedMemberForAssign) return;

    // Find selected trainer
    const trainerObj = trainers.find(t => t.id === formTrainerId);
    const trainerName = trainerObj ? trainerObj.name : "Assigned Trainer";
    const trainerSpec = trainerObj ? (trainerObj.specialization || "Fitness Coach") : "Trainer";

    const assignmentData = {
      memberId: selectedMemberForAssign.id,
      memberName: selectedMemberForAssign.name,
      trainerId: formTrainerId || `TR-${Date.now()}`,
      trainerName: trainerName,
      trainerSpecialization: trainerSpec,
      packageName: formPackageName || "Personal Training",
      totalSessions: Number(formSessionCount) || 24,
      sessionsCompleted: 0,
      slot: formSlot || "Flexible",
      days: formDays || "Flexible",
      startDate: formStartDate,
      notes: formNotes,
      status: "assigned",
      assignedAt: new Date().toISOString(),
      assignedDateStr: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    };

    // Update assignments map in state & localStorage
    setAssignmentsMap(prev => {
      const updated = {
        ...prev,
        [selectedMemberForAssign.id]: assignmentData
      };
      try {
        localStorage.setItem("gymdeck_pt_assignments", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save assignment:", e);
      }
      return updated;
    });

    // Remove the assigned member from this unassigned directory
    setMembers(prev => prev.filter(m => m.id !== selectedMemberForAssign.id));

    showToast(`✓ Assigned ${trainerName} to ${selectedMemberForAssign.name}`);
    setIsAssignModalOpen(false);
    setSelectedMemberForAssign(null);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // FILTERING & PAGINATION (STATIC CLEAN TABLE VIEW)
  // ───────────────────────────────────────────────────────────────────────────
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();

    return members.filter(m => {
      const planStr = (m.planName || "").toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.memberCode.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        planStr.includes(q)
      );
    });
  }, [members, searchQuery]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  return (
    <div className="assign-trainer-shell font-sans text-slate-900 selection:bg-indigo-100 pb-12">
      
      {/* ─────────────────────────────────────────────────────────────────────────
          1. TOP BREADCRUMB & CONTEXT HEADER
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/90">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            <span>Trainers &amp; Staff</span>
            <ChevronRight size={13} className="text-slate-300" />
            <span className="text-indigo-600 font-black">Assign Trainer</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
            Assign Personal Trainer
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Assign dedicated personal coaches and training packages to active gym members.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchRealData}
            className="h-9 px-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Reload genuine member records"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin text-indigo-600" : ""} />
            <span>Sync DB</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (members.length > 0) {
                handleOpenAssignModal(members[0]);
              }
            }}
            disabled={members.length === 0}
            className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <Plus size={14} strokeWidth={2.6} />
            <span>New Assignment</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          2. DYNAMIC REAL METRIC STRIP (100% REAL DATA FROM DATABASE)
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 my-4">
        {/* Card 1: Active Members Pending PT */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Available to Assign
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">{members.length}</span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60 font-mono">
                Active
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-1">
              Active members without a PT package
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Users size={20} strokeWidth={2.4} />
          </div>
        </div>

        {/* Card 2: Total Active Members */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Total Active Members
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">{totalActiveMembersCount}</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 font-mono">
                Gym Roster
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-1">
              Current enrolled active members
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck size={20} strokeWidth={2.4} />
          </div>
        </div>

        {/* Card 3: Active PT Assignments */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Active PT Assignments
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">{Object.keys(assignmentsMap).length}</span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 font-mono">
                Assigned
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-1">
              Members paired with trainers
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Dumbbell size={20} strokeWidth={2.4} />
          </div>
        </div>

        {/* Card 4: Registered Floor Coaches */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Trainer Roster
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">{trainers.length}</span>
              <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                Coaches
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-1">
              Trainers ready for client allocation
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
            <Award size={20} strokeWidth={2.4} />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          3. SEARCH TOOLBAR (PERFECTLY ALIGNED SEARCH BAR - NO DROPDOWN)
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs flex items-center justify-between gap-3 mb-4">
        {/* Search Bar with perfectly aligned icon */}
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
            <Search size={16} strokeWidth={2.2} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search active members by name, ID, phone number, or plan..."
            className="w-full pl-10 pr-10 h-10 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 outline-none transition-all leading-normal"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Live Members Count Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 shrink-0 text-xs font-bold text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{filteredMembers.length} {filteredMembers.length === 1 ? "Member Available" : "Members Available"}</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          4. CLEAN TABLE VIEW
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        
        {/* Table Header Strip */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">
              Showing {paginatedMembers.length} of {filteredMembers.length} active members
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Active Members Pending PT Assignment
          </span>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed min-w-[760px]">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500 select-none">
                {/* Column 1: Member Identity */}
                <th className="w-[32%] py-3.5 px-5">
                  Member Identity
                </th>

                {/* Column 2: Contact Info */}
                <th className="w-[23%] py-3.5 px-4">
                  Contact Details
                </th>

                {/* Column 3: Membership Plan */}
                <th className="w-[23%] py-3.5 px-4">
                  Membership Plan
                </th>

                {/* Column 4: Actions */}
                <th className="w-[22%] min-w-[170px] py-3.5 px-5 text-right whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-2" />
                    <span className="text-xs font-bold text-slate-700 block">Loading genuine database records...</span>
                  </td>
                </tr>
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center bg-slate-50/40">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                      <Users size={22} />
                    </div>
                    <h3 className="text-sm font-black text-slate-900">
                      {members.length === 0
                        ? "All Active Members Have Been Assigned Trainers"
                        : "No Members Match Current Filters"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {members.length === 0
                        ? "Every registered active member either has an assigned coach or is enrolled in a personal training package."
                        : "Try adjusting your search query."}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="mt-3 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-2xs hover:bg-indigo-700 transition-all cursor-pointer"
                      >
                        Clear Search Filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedMembers.map(member => {
                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Cell 1: Member Identity (MEMBER ID positioned below member name) */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Photo Avatar */}
                          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-200/90 bg-slate-100 shadow-2xs relative">
                            <img
                              src={resolvePhoto(member.photo, member.name, member.gender)}
                              alt={member.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = getInitialsAvatar(member.name, member.gender);
                              }}
                            />
                          </div>

                          {/* Name & ID */}
                          <div className="min-w-0 flex flex-col items-start justify-center">
                            <span className="font-extrabold text-slate-900 text-xs truncate block leading-tight">
                              {member.name}
                            </span>
                            <span className="font-mono text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-1">
                              {member.memberCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cell 2: Contact Info */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Phone size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate">{member.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-sans text-[10px] text-slate-400 truncate mt-0.5">
                          <Mail size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      </td>

                      {/* Cell 3: Current Membership Plan */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Dumbbell size={12} className="text-indigo-600 shrink-0" />
                          <span className="font-bold text-slate-800 text-xs truncate">
                            {member.planName}
                          </span>
                        </div>
                        {member.joinedDate && (
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                            Joined: {new Date(member.joinedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </td>

                      {/* Cell 4: Actions (Button text strictly in one line) */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(member)}
                          className="h-8 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-sm whitespace-nowrap shrink-0"
                        >
                          <Plus size={12} strokeWidth={2.6} />
                          <span className="whitespace-nowrap">Assign Trainer</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Page {currentPage} of {totalPages} ({filteredMembers.length} records)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-bold"
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-bold"
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          5. REDESIGNED PROFESSIONAL ASSIGN PERSONAL TRAINER MODAL
             - Overlays entire screen including sidebar via createPortal
             - Exact visual identity card from screenshot (no member dropdown)
             - Direct "Register Trainer" link with navigation to all trainers
             - Professional wider container (max-w-2xl) and structured sections
      ───────────────────────────────────────────────────────────────────────── */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isAssignModalOpen && selectedMemberForAssign && (
            <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4">
              {/* Dark blurry backdrop covering entire viewport including side navbar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                onClick={() => setIsAssignModalOpen(false)}
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
                style={{ willChange: "opacity" }}
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 14 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl z-10 overflow-hidden max-h-[92vh] flex flex-col"
              >
                {/* ── CARD HEADER: EXACT VISUAL AS REQUESTED FROM SCREENSHOT ── */}
                <div className="p-6 pb-5 bg-white border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    {/* Member Profile Avatar & Identification */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-slate-200/90 bg-slate-100 shadow-2xs relative">
                        <img
                          src={resolvePhoto(selectedMemberForAssign.photo, selectedMemberForAssign.name, selectedMemberForAssign.gender)}
                          alt={selectedMemberForAssign.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getInitialsAvatar(selectedMemberForAssign.name, selectedMemberForAssign.gender);
                          }}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg font-black text-slate-900 leading-tight capitalize truncate">
                            {selectedMemberForAssign.name}
                          </h2>
                          <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {selectedMemberForAssign.memberCode}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                            ACTIVE MEMBER
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-slate-500 text-xs">
                          <span className="font-medium text-slate-600">
                            Member ID: <span className="font-mono font-bold text-slate-900">{selectedMemberForAssign.memberCode}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Top-Right Close Button */}
                    <button
                      type="button"
                      onClick={() => setIsAssignModalOpen(false)}
                      className="w-8 h-8 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs group"
                      title="Close modal"
                      aria-label="Close modal"
                    >
                      <X size={16} strokeWidth={2.4} className="group-hover:scale-110 transition-transform" />
                    </button>
                  </div>

                  {/* Structured 3-Column Metadata Row (Matching Screenshot) */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Item 1: Phone */}
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 shrink-0 shadow-2xs">
                        <Phone size={13} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">Phone</span>
                        <span className="text-xs font-bold text-slate-800 truncate block font-mono">{selectedMemberForAssign.phone || "—"}</span>
                      </div>
                    </div>

                    {/* Item 2: Current Membership Plan */}
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 shrink-0 shadow-2xs">
                        <Layers size={13} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">Current Plan</span>
                        <span className="text-xs font-bold text-slate-800 truncate block">{selectedMemberForAssign.planName || "General Membership"}</span>
                      </div>
                    </div>

                    {/* Item 3: Joining Date */}
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-indigo-50/50 border border-indigo-100/80">
                      <div className="w-7 h-7 rounded-lg bg-white border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                        <Calendar size={13} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 block leading-tight">Member Since</span>
                        <span className="text-xs font-bold text-indigo-900 truncate block">{formattedJoinedDate}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── FORM BODY: PROFESSIONAL, CLEAN & LOGICALLY ALIGNED ── */}
                <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar text-xs">
                  
                  {/* Field 1: Certified Trainer Selection + Register Trainer Button */}
                  <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <UserCheck size={14} className="text-indigo-600" />
                        <span>Select Certified Trainer *</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleNavigateToTrainers}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1 transition-colors group"
                        title="Navigate to All Trainers page to register a coach"
                      >
                        <UserPlus size={13} className="text-indigo-600" />
                        <span>Register New Trainer</span>
                        <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </button>
                    </div>

                    {trainers.length === 0 ? (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs font-medium flex items-center justify-between">
                        <span>No trainers registered in your roster yet.</span>
                        <button
                          type="button"
                          onClick={handleNavigateToTrainers}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 transition-colors cursor-pointer"
                        >
                          Go to All Trainers
                        </button>
                      </div>
                    ) : (
                      <select
                        value={formTrainerId}
                        onChange={(e) => setFormTrainerId(e.target.value)}
                        className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all cursor-pointer text-xs"
                      >
                        <option value="">-- Choose Coach from Roster --</option>
                        {trainers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} • {t.specialization || "Floor Coach"}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Field 2: PT Package Name & Allocated Sessions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-indigo-600" />
                        <span>Personal Training Package</span>
                      </label>
                      <input
                        type="text"
                        value={formPackageName}
                        onChange={(e) => setFormPackageName(e.target.value)}
                        placeholder="e.g. 1-on-1 Personal Training"
                        className="w-full h-11 px-3.5 bg-slate-50/70 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1.5">
                        <Clock size={13} className="text-indigo-600" />
                        <span>Total Allocated Sessions</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={formSessionCount}
                        onChange={(e) => setFormSessionCount(e.target.value)}
                        className="w-full h-11 px-3.5 bg-slate-50/70 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all text-xs"
                      />
                    </div>
                  </div>

                  {/* Field 3: Timing, Weekly Schedule & Start Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1.5">
                        <Clock size={12} className="text-slate-400" />
                        <span>Session Timing</span>
                      </label>
                      <input
                        type="text"
                        value={formSlot}
                        onChange={(e) => setFormSlot(e.target.value)}
                        placeholder="e.g. 07:00 AM - 08:00 AM"
                        className="w-full h-11 px-3 bg-slate-50/70 border border-slate-200 rounded-xl font-mono text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1.5">
                        <CalendarClock size={12} className="text-slate-400" />
                        <span>Weekly Schedule</span>
                      </label>
                      <input
                        type="text"
                        value={formDays}
                        onChange={(e) => setFormDays(e.target.value)}
                        placeholder="e.g. Mon, Wed, Fri"
                        className="w-full h-11 px-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        <span>Start Date</span>
                      </label>
                      <input
                        type="date"
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        className="w-full h-11 px-3 bg-slate-50/70 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all text-xs"
                      />
                    </div>
                  </div>

                  {/* Field 4: Coach Briefing & Member Goals */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1.5">
                      <FileText size={13} className="text-slate-400" />
                      <span>Coach Briefing &amp; Member Goals (Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Enter specific fitness targets, medical considerations, dietary preferences, or coach briefing notes..."
                      className="w-full p-3 bg-slate-50/70 border border-slate-200 rounded-xl font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all resize-none text-xs"
                    />
                  </div>
                </div>

                {/* ── MODAL FOOTER ── */}
                <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                    Assignment links member directly to selected floor trainer
                  </span>
                  <div className="flex items-center gap-2.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => setIsAssignModalOpen(false)}
                      className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAssignment}
                      disabled={!formTrainerId}
                      className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Check size={14} strokeWidth={2.6} />
                      <span>Confirm Assignment</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          6. FLOATING TOAST FEEDBACK
      ───────────────────────────────────────────────────────────────────────── */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              className="fixed bottom-6 right-6 z-[10060] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold pointer-events-auto"
            >
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" strokeWidth={2.4} />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};

export const mountAssignTrainer = () => {
  const container = document.querySelector('[data-stage="assign-trainer"]');
  if (!container) return null;
  const root = createRoot(container);
  root.render(<><AssignTrainer /><BrandFooter /></>);
  return root;
};

export default AssignTrainer;
