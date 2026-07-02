import React, { useState, useMemo, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import {
  Users,
  Search,
  RefreshCw,
  Download,
  Zap,
  Filter,
  MoreVertical,
  ChevronRight,
  TrendingUp,
  Clock,
  Activity,
  UserCheck,
  UserPlus,
  ArrowUpRight,
  MessageSquare,
  Calendar,
  BarChart3,
  X,
  FileText,
  AlertCircle,
  Mail,
  Phone,
  ArrowRight,
  Target,
  IndianRupee,
  Repeat,
  Award,
  ChevronDown,
  LayoutGrid,
  List,
  Sparkles,
  PieChart,
  ArrowUp,
  Trash2,
  ExternalLink,
  Eye,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_OPTIONS = ["All", "Expired", "Cancelled", "Terminated"];

const MOCK_PAST_MEMBERS = [
  {
    id: "MBR-0104",
    name: "Rohan Sharma",
    phone: "+91 98765 43210",
    email: "rohan.sharma@example.com",
    status: "Expired",
    inactiveDays: 14,
    recoveryValue: 1999,
    reason: "Plan Expired - Forgot to renew",
    image: "https://api.dicebear.com/7.x/adventurer/svg?seed=Rohan"
  },
  {
    id: "MBR-0238",
    name: "Priyanka Chopra",
    phone: "+91 99887 76655",
    email: "priyanka.c@gmail.com",
    status: "Cancelled",
    inactiveDays: 32,
    recoveryValue: 2499,
    reason: "Relocated to Hyderabad for work",
    image: "https://api.dicebear.com/7.x/adventurer/svg?seed=Priyanka"
  },
  {
    id: "MBR-0412",
    name: "Amit Patel",
    phone: "+91 91234 56789",
    email: "amit.patel@yahoo.com",
    status: "Terminated",
    inactiveDays: 65,
    recoveryValue: 3999,
    reason: "Repeated violation of gym safety policies",
    image: "https://api.dicebear.com/7.x/adventurer/svg?seed=Amit"
  },
  {
    id: "MBR-0519",
    name: "Sneha Reddy",
    phone: "+91 98888 77777",
    email: "sneha.reddy@outlook.com",
    status: "Expired",
    inactiveDays: 8,
    recoveryValue: 1999,
    reason: "Personal medical pause (knee injury)",
    image: "https://api.dicebear.com/7.x/adventurer/svg?seed=Sneha"
  },
  {
    id: "MBR-0683",
    name: "Arjun Kapoor",
    phone: "+91 97777 66666",
    email: "arjun.k@example.com",
    status: "Cancelled",
    inactiveDays: 45,
    recoveryValue: 2999,
    reason: "Subscription cost budget constraints",
    image: "https://api.dicebear.com/7.x/adventurer/svg?seed=Arjun"
  }
];

const MOCK_PLANS = [
  { id: "1", name: "Monthly Starter Pack", duration: "1 Month", price: 1999 },
  { id: "2", name: "Quarterly Transformation", duration: "3 Months", price: 4999 },
  { id: "3", name: "Premium Annual Elite", duration: "12 Months", price: 14999 }
];

const cn = (...classes) => classes.filter(Boolean).join(" ");

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const getInitialsAvatar = (name) => {
  const cleanName = name ? name.trim() : "Member";
  const initials = cleanName
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  
  // Hash the name to generate a stable, beautiful gradient background
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40) % 360;
  
  // Return an SVG data URI
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="grad-${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:hsl(${hue1}, 70%, 60%)" />
        <stop offset="100%" style="stop-color:hsl(${hue2}, 70%, 45%)" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad-${hash})" />
    <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="38" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;
  
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const normalizeMember = (m) => {
  let inactiveDays = 45;
  if (m.inactiveDays !== undefined) inactiveDays = m.inactiveDays;
  else if (m.daysSinceExpiry !== undefined) inactiveDays = m.daysSinceExpiry;
  else if (m.deleted_at) {
    inactiveDays = Math.max(0, Math.floor((new Date() - new Date(m.deleted_at)) / (1000 * 60 * 60 * 24)));
  }

  let recoveryValue = 1999;
  if (m.recoveryValue !== undefined) recoveryValue = m.recoveryValue;
  else if (m.potentialRevenue !== undefined) recoveryValue = m.potentialRevenue;

  let status = "Expired";
  if (m.status) status = m.status;
  else if (m.reactivationScore === "High") status = "Expired";
  else if (m.reactivationScore === "Medium") status = "Cancelled";
  else if (m.reactivationScore === "Low") status = "Terminated";

  let reason = m.reason || m.notes || "Subscription End";
  if (reason.startsWith("Reason: ")) {
    reason = reason.replace("Reason: ", "");
  }

  const name = m.full_name || m.name || "Unnamed Member";
  const photo = m.profile_photo_path || m.image;
  const image = (photo && !photo.includes("dicebear.com"))
    ? photo
    : getInitialsAvatar(name);

  return {
    id: m.id || m.member_code || `MBR-${Math.floor(1000 + Math.random() * 9000)}`,
    member_code: m.member_code || m.id || "N/A",
    name: name,
    phone: m.phone || "+91 99999 88888",
    email: m.email || "N/A",
    status: status,
    inactiveDays: inactiveDays,
    recoveryValue: recoveryValue,
    reason: reason,
    image: image
  };
};

const getInitialPastMembers = () => {
  try {
    const stored = localStorage.getItem("gymdeck_past_members");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.length > 0) {
        return parsed.map(normalizeMember);
      }
    }
    localStorage.setItem("gymdeck_past_members", JSON.stringify(MOCK_PAST_MEMBERS));
    return MOCK_PAST_MEMBERS.map(normalizeMember);
  } catch (e) { 
    return MOCK_PAST_MEMBERS.map(normalizeMember); 
  }
};

const showToast = (message) => {
  if (typeof window.showToast === "function") {
    window.showToast(message);
  } else {
    console.log("Toast:", message);
  }
};

// ─────────────────────────────────────────
// STAT TILE (Classy Light Command Style)
// ─────────────────────────────────────────
function StatTile({ label, value, subtext, tone = "slate", icon: Icon }) {
  const toneClass = {
    slate: "bg-white text-slate-900 border-slate-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
    blue: "bg-indigo-50 text-indigo-800 border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
  }[tone];

  const iconTone = {
    slate: "text-slate-500 bg-slate-100",
    amber: "text-amber-600 bg-amber-100 border border-amber-200/50",
    rose: "text-rose-600 bg-rose-100 border border-rose-200/50",
    blue: "text-indigo-600 bg-indigo-100 border border-indigo-200/50",
    emerald: "text-emerald-600 bg-emerald-100 border border-emerald-200/50",
  }[tone];

  return (
    <div className={cn("min-w-0 rounded-xl border p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all hover:border-slate-300", toneClass)}>
      <div className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
        <strong className="mt-1.5 block truncate text-2xl font-black leading-none tracking-tight text-slate-900">{value}</strong>
        {subtext && <span className="block mt-1 text-[11px] font-bold text-slate-400 truncate">{subtext}</span>}
      </div>
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", iconTone)}>
        <Icon size={18} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// METRIC PILL (Classy Light Dashboard Look)
// ─────────────────────────────────────────
function MetricPill({ label, value, detail = "", danger = false, success = false, warning = false }) {
  const colorClass = danger 
    ? "border-rose-200 bg-rose-50/50 text-rose-700" 
    : success 
    ? "border-emerald-200 bg-emerald-50/50 text-emerald-700" 
    : warning
    ? "border-amber-200 bg-amber-50/50 text-amber-700"
    : "border-slate-200 bg-slate-50/50 text-slate-850";

  return (
    <div className={cn("min-w-0 rounded-xl border p-3 flex flex-col justify-between h-full bg-white", colorClass)}>
      <span className="block truncate text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">{label}</span>
      <strong className="mt-1.5 block truncate text-base font-black leading-none">{value}</strong>
      {detail ? <small className="mt-1 block truncate text-[10px] font-bold text-slate-400 leading-none">{detail}</small> : null}
    </div>
  );
}

export default function PastMembers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [pastMembers, setPastMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("grid"); // "grid", "table", "analytics"
  const [selectedMember, setSelectedMember] = useState(null);
  const [reactivateMember, setReactivateMember] = useState(null);
  const [plans, setPlans] = useState(MOCK_PLANS);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [deleteConfirmMember, setDeleteConfirmMember] = useState(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [deleteConfirmBulk, setDeleteConfirmBulk] = useState(false);
  
  const RECORDS_PER_PAGE = 6;

  const fetchPastMembers = async () => {
    setIsLoading(true);
    if (window.__TAURI__) {
      try {
        const [membersFromDb, dbPlans] = await Promise.all([
          window.__TAURI__.core.invoke("get_past_members_command", { limit: 100, offset: 0 }),
          window.__TAURI__.core.invoke("get_plans_command")
        ]);

        const formattedMembers = membersFromDb.map(normalizeMember);
        setPastMembers(formattedMembers);
        
        if (dbPlans && dbPlans.length > 0) {
          setPlans(dbPlans.map(p => ({
            id: p.id,
            name: p.plan_name,
            duration: `${p.duration_days} Days`,
            price: p.price
          })));
        }
      } catch (err) { 
        console.error(err); 
        setPastMembers(getInitialPastMembers());
      } finally { 
        setIsLoading(false); 
      }
    } else {
      setPastMembers(getInitialPastMembers());
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPastMembers();
    const handleMemberTransfer = () => fetchPastMembers();
    window.addEventListener('gymdeck:member-transferred', handleMemberTransfer);
    return () => window.removeEventListener('gymdeck:member-transferred', handleMemberTransfer);
  }, []);

  // Disable body scroll when any modal or drawer is active
  useEffect(() => {
    const isOverlayActive = !!(selectedMember || reactivateMember || deleteConfirmMember || deleteConfirmBulk);
    if (isOverlayActive) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedMember, reactivateMember, deleteConfirmMember, deleteConfirmBulk]);

  const [isHeaderSticky, setIsHeaderSticky] = useState(false);

  useEffect(() => {
    const container = document.querySelector('.past-members-stage');
    if (!container) return;

    const handleScroll = () => {
      // 220px is approximately when the header and stats panel scroll out of view
      setIsHeaderSticky(container.scrollTop > 220);
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleViewPhoto = (e, member) => {
    e.stopPropagation();
    if (window.setDocumentModalContent && window.setDocumentModalState) {
      window.setDocumentModalContent({
        memberName: member.name,
        title: "Member's Photo",
        imageSrc: member.image,
        imageAlt: member.name
      });
      window.setDocumentModalState(true, e.currentTarget);
    } else {
      console.warn("GymDeck: Global document modal controller not found.");
    }
  };

  const filteredMembers = useMemo(() => {
    return pastMembers.filter(m => {
      const matchesSearch = 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phone.includes(searchQuery) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = activeStatus === "All" || m.status === activeStatus;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, activeStatus, pastMembers]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = pastMembers.length;
    const recoveryPipeline = pastMembers.reduce((sum, m) => sum + m.recoveryValue, 0);
    const winbackPipeline = pastMembers.filter(m => m.inactiveDays <= 30).length;
    const avgInactivity = total > 0 ? Math.round(pastMembers.reduce((sum, m) => sum + m.inactiveDays, 0) / total) : 0;
    
    return {
      total,
      recoveryPipeline,
      winbackPipeline,
      avgInactivity
    };
  }, [pastMembers]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredMembers.length / RECORDS_PER_PAGE);
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * RECORDS_PER_PAGE;
    return filteredMembers.slice(start, start + RECORDS_PER_PAGE);
  }, [filteredMembers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeStatus]);

  // Reactivation
  const handleReactivateSubmit = async () => {
    if (!reactivateMember) return;
    const plan = plans.find(p => p.id === selectedPlan) || plans[0];
    
    if (window.__TAURI__) {
      try {
        const stored = localStorage.getItem("gymdeck_past_members");
        if (stored) {
          const list = JSON.parse(stored);
          const updated = list.filter(m => m.id !== reactivateMember.id && m.member_code !== reactivateMember.id);
          localStorage.setItem("gymdeck_past_members", JSON.stringify(updated));
        }

        // 1. Purge old archived member record permanently from database
        await window.__TAURI__.core.invoke("permanent_delete_member_command", { memberId: reactivateMember.id });
        
        // Construct standard Rust-compatible member schema representation
        const rustMember = {
          id: crypto.randomUUID(),
          gym_id: "00000000-0000-0000-0000-000000000000", // Overwritten by backend
          member_code: reactivateMember.member_code || `GD-${Math.floor(1000 + Math.random() * 9000)}`,
          full_name: reactivateMember.name || "Unnamed Member",
          phone: reactivateMember.phone || "0000000000",
          alternate_phone: "",
          email: reactivateMember.email === "N/A" ? "" : reactivateMember.email,
          gender: "OTHER",
          blood_group: null,
          dob: "1995-01-01",
          address: "Reactivated",
          height: "175",
          weight: "70",
          membership_plan_id: plan.id,
          membership_status: "ACTIVE",
          joined_at: new Date().toISOString(),
          expires_at: null,
          profile_photo_path: reactivateMember.image || null,
          notes: `Reactivated with plan: ${plan.name}`,
          created_by_user_id: "00000000-0000-0000-0000-000000000000", // Overwritten by backend
          updated_by_user_id: "00000000-0000-0000-0000-000000000000", // Overwritten by backend
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          deleted_by_user_id: null
        };

        // 2. Create the new active member record using correct nested parameters
        await window.__TAURI__.core.invoke("create_member_command", {
          member: rustMember,
          documents: []
        });

        showToast(`${reactivateMember.name} successfully reactivated on ${plan.name}!`);
      } catch (err) {
        console.error("Tauri Reactivation failed:", err);
        showToast("Error reactivating member.");
      }
    } else {
      try {
        const stored = localStorage.getItem("gymdeck_past_members");
        const list = stored ? JSON.parse(stored) : [];
        const updated = list.filter(m => m.id !== reactivateMember.id);
        localStorage.setItem("gymdeck_past_members", JSON.stringify(updated));
        
        window.dispatchEvent(new CustomEvent('gymdeck:member-reactivated', {
          detail: { ...reactivateMember, planName: plan.name }
        }));
        
        showToast(`${reactivateMember.name} successfully reactivated offline!`);
      } catch (e) {
        console.error(e);
      }
    }
    
    setReactivateMember(null);
    setSelectedPlan("");
    fetchPastMembers();
  };

  // Delete/Purge Past Member record
  const handleDeleteMember = (member) => {
    setDeleteConfirmMember(member);
  };

  const confirmDeleteMember = async (member) => {
    try {
      if (window.__TAURI__) {
        // Purge member permanently from SQLCipher database
        await window.__TAURI__.core.invoke("permanent_delete_member_command", { memberId: member.id });
      }

      // Clear local storage past members (legacy/mock compatibility if any remains)
      const stored = localStorage.getItem("gymdeck_past_members");
      const list = stored ? JSON.parse(stored) : [];
      const updated = list.filter(m => m.id !== member.id && m.member_code !== member.id);
      localStorage.setItem("gymdeck_past_members", JSON.stringify(updated));

      // Trigger standard deletion event to sync active directory views
      const event = new CustomEvent("gymdeck-member-deleted", { detail: member.id });
      window.dispatchEvent(event);

      showToast(`Permanently deleted ${member.name} and all data from database.`);
      setDeleteConfirmMember(null);
      fetchPastMembers();
      
      if (selectedMember && selectedMember.id === member.id) {
        setSelectedMember(null);
      }
    } catch (e) {
      console.error("Permanent delete failed:", e);
      showToast(`Failed to permanently delete member: ${e}`);
    }
  };
  const handleToggleSelectMember = (id) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteTrigger = () => {
    if (selectedMemberIds.length > 0) {
      setDeleteConfirmBulk(true);
    }
  };

  const confirmBulkDeleteMembers = async () => {
    try {
      if (window.__TAURI__) {
        // Bulk delete members from SQLCipher database
        await window.__TAURI__.core.invoke("permanent_delete_members_command", { memberIds: selectedMemberIds });
      }

      // Also clean up local storage items if any remains
      const stored = localStorage.getItem("gymdeck_past_members");
      if (stored) {
        const list = JSON.parse(stored);
        const updated = list.filter(m => !selectedMemberIds.includes(m.id) && !selectedMemberIds.includes(m.member_code));
        localStorage.setItem("gymdeck_past_members", JSON.stringify(updated));
      }

      // Dispatch event for each deleted member to sync other views
      selectedMemberIds.forEach(id => {
        const event = new CustomEvent("gymdeck-member-deleted", { detail: id });
        window.dispatchEvent(event);
      });

      showToast(`Permanently deleted ${selectedMemberIds.length} members and their data.`);
      setSelectedMemberIds([]);
      setIsSelectionMode(false);
      setDeleteConfirmBulk(false);
      fetchPastMembers();
      
      if (selectedMember && selectedMemberIds.includes(selectedMember.id)) {
        setSelectedMember(null);
      }
    } catch (e) {
      console.error("Bulk deletion failed:", e);
      showToast(`Failed to permanently delete members: ${e}`);
    }
  };
  // Export Archive Ledger
  const handleExportArchive = () => {
    const headers = ["ID", "Name", "Phone", "Email", "Status", "Inactive Days", "Recovery Potential", "Offboarding Note"];
    const rows = pastMembers.map(m => [
      m.id,
      m.name,
      m.phone,
      m.email,
      m.status,
      `${m.inactiveDays} Days`,
      `INR ${m.recoveryValue}`,
      `"${m.reason}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GymDeck_Past_Members_Archive_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Archive ledger CSV exported successfully!");
  };

  // Sort cohort category colors
  const statusStyles = {
    Expired: "border-l-amber-500",
    Cancelled: "border-l-indigo-500",
    Terminated: "border-l-rose-500"
  };

  const statusBadgeStyles = {
    Expired: "bg-amber-50 border-amber-200 text-amber-700",
    Cancelled: "bg-indigo-50 border-indigo-200 text-indigo-700",
    Terminated: "bg-rose-50 border-rose-200 text-rose-700"
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 w-full font-sans select-none relative text-slate-700">
      
      {/* ─── CLASSY LIGHT COMMAND CENTER HEADER ─── */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 shadow-sm relative">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck size={16} className="text-indigo-600 animate-pulse" />
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.25em] leading-none">RETENTION COMMAND & PAST MEMBERS DIRECTORY</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Archived Members Directory</h1>
            <p className="mt-2.5 text-xs font-semibold text-slate-500 max-w-2xl leading-relaxed">
              Manage deactivated memberships, view offboarding timeline details, run recovery analytics, and initiate reactivation workflows.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <button 
              onClick={handleExportArchive}
              className="h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-700 hover:text-slate-950 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Download size={14} /> Export CSV
            </button>
            <button 
              onClick={() => {
                if (pastMembers.length > 0) {
                  setReactivateMember(pastMembers[0]);
                  setSelectedPlan(plans[0].id);
                } else {
                  showToast("No members archived.");
                }
              }}
              className="h-11 px-5 bg-slate-950 hover:bg-slate-850 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors flex items-center gap-2 shadow-md shadow-slate-950/10"
            >
              <Zap size={14} /> Reactivate Member
            </button>
          </div>
        </div>

        {/* ─── DYNAMIC STATISTICS PANEL ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          <StatTile 
            label="Total Archived" 
            value={stats.total} 
            subtext="Offboarded accounts" 
            tone="slate" 
            icon={Users} 
          />
          <StatTile 
            label="Recovery pipeline" 
            value={currencyFormatter.format(stats.recoveryPipeline)} 
            subtext="Potential win-back pipeline" 
            tone="emerald" 
            icon={IndianRupee} 
          />
          <StatTile 
            label="Reclaimable Cohorts" 
            value={stats.winbackPipeline} 
            subtext="Inactive <= 30 Days" 
            tone="blue" 
            icon={Target} 
          />
          <StatTile 
            label="Inactivity Duration" 
            value={`${stats.avgInactivity} Days`} 
            subtext="Average offboarding age" 
            tone="amber" 
            icon={Clock} 
          />
        </div>
      </header>

      {/* ─── MAIN RETENTION HUB CONTAINER ─── */}
      <main className="flex-1 p-8">
        
        {/* FILTERS & COMMAND BAR CARD */}
        <section 
          className={cn(
            "sticky top-0 z-20 mb-8 -mx-8 px-8 py-4 border-b border-slate-200/80 bg-white will-change-transform transition-shadow duration-300 ease-out animate-fadeIn",
            isHeaderSticky 
              ? "shadow-md"
              : "shadow-none"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Search Input Box */}
            <label className="relative block h-11 flex-1 min-w-[280px]" htmlFor="archived-search-main">
              <Search className="pointer-events-none absolute left-3.5 top-[14px] h-4 w-4 text-slate-400" aria-hidden="true" />
              <input 
                id="archived-search-main"
                type="text" 
                placeholder="Search archived members by name, ID, phone or email..." 
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-900 outline-none transition focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>

            {/* Filter Tabs */}
            <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-1" aria-label="Retention filters">
              <div className="flex h-9 items-center gap-1">
                <span className="flex shrink-0 items-center gap-1.5 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 font-sans">
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                  Filter
                </span>
                {STATUS_OPTIONS.map((opt) => {
                  const isActive = activeStatus === opt;
                  const count = opt === "All" 
                    ? pastMembers.length 
                    : pastMembers.filter(m => m.status === opt).length;
                  return (
                    <button
                      key={opt}
                      className={cn(
                        "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-4 text-xs font-black uppercase tracking-wider transition",
                        isActive
                          ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-500 hover:bg-white hover:text-slate-950"
                      )}
                      type="button"
                      onClick={() => setActiveStatus(opt)}
                    >
                      {opt}
                      <span className="rounded bg-slate-200/60 px-1.5 py-0.5 text-[9px] font-black text-slate-600 font-mono">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* View Mode & Count Status (with Selection Controls inline in the red marked space!) */}
            <div className="flex flex-wrap items-center justify-between gap-4 w-full border-t border-slate-100 pt-3.5 mt-3.5">
              {/* Left Side: View Mode & Count */}
              <div className="flex items-center gap-4 shrink-0">
                {isSelectionMode && selectedMemberIds.length > 0 && (
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none font-mono animate-pulse">
                    SELECTED: {selectedMemberIds.length}
                  </span>
                )}
                {!isSelectionMode && (
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none font-mono">
                    ARCHIVED MEMBERS: {filteredMembers.length}
                  </span>
                )}
                
                <div className="flex rounded-lg bg-slate-100 p-1 gap-1">
                  <button 
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "w-9 h-8 flex items-center justify-center rounded-md transition-all", 
                      viewMode === "grid" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-700"
                    )}
                    title="Grid View"
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button 
                    onClick={() => setViewMode("table")}
                    className={cn(
                      "w-9 h-8 flex items-center justify-center rounded-md transition-all", 
                      viewMode === "table" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-700"
                    )}
                    title="List View"
                  >
                    <List size={16} />
                  </button>
                  <button 
                    onClick={() => setViewMode("analytics")}
                    className={cn(
                      "w-9 h-8 flex items-center justify-center rounded-md transition-all", 
                      viewMode === "analytics" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-700"
                    )}
                    title="Retention Analytics"
                  >
                    <BarChart3 size={16} />
                  </button>
                </div>
              </div>

              {/* Right Side: Selection Action Buttons (This is inside the red marked ellipse space!) */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setSelectedMemberIds([]);
                  }}
                  className={cn(
                    "h-9 px-4 rounded-xl border text-xs font-black uppercase tracking-wider transition-colors shadow-sm",
                    isSelectionMode 
                      ? "bg-slate-950 border-slate-950 text-white hover:bg-slate-800" 
                      : "bg-white border-slate-200 text-slate-700 hover:text-slate-950 hover:border-slate-350"
                  )}
                >
                  {isSelectionMode ? "Cancel Select" : "Select"}
                </button>

                {isSelectionMode && (
                  <>
                    <button 
                      onClick={() => {
                        const paginatedIds = paginatedMembers.map(m => m.id);
                        const areAllOnPageSelected = paginatedIds.length > 0 && paginatedIds.every(id => selectedMemberIds.includes(id));
                        if (areAllOnPageSelected) {
                          setSelectedMemberIds(prev => prev.filter(id => !paginatedIds.includes(id)));
                        } else {
                          setSelectedMemberIds(prev => {
                            const next = [...prev];
                            paginatedIds.forEach(id => {
                              if (!next.includes(id)) next.push(id);
                            });
                            return next;
                          });
                        }
                      }}
                      className="h-9 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-950 hover:border-slate-350 text-xs font-black uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center"
                    >
                      {(() => {
                        const paginatedIds = paginatedMembers.map(m => m.id);
                        const areAllOnPageSelected = paginatedIds.length > 0 && paginatedIds.every(id => selectedMemberIds.includes(id));
                        return areAllOnPageSelected ? "Deselect All" : "Select All";
                      })()}
                    </button>
                    
                    <button 
                      disabled={selectedMemberIds.length === 0}
                      onClick={handleBulkDeleteTrigger}
                      className="h-9 w-9 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Delete Selected"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* ─── RENDER DECK CONTROLS ─── */}
        <AnimatePresence mode="wait">
          
          {/* LOADING LEDGER PROGRESS */}
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-32 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-2xl shadow-sm"
            >
              <RefreshCw size={36} className="text-indigo-600 animate-spin mb-4" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">Loading archived member directory...</p>
            </motion.div>
          ) : filteredMembers.length === 0 && viewMode !== "analytics" ? (
            
            /* EMPTY CONTROL STATE */
            <motion.div 
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-28 bg-white border border-slate-200 rounded-2xl shadow-sm text-center px-4"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-200">
                <Search size={24} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider">No Archived Members Recorded</h3>
              <p className="text-xs font-semibold text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                Clear active filters or modify search configurations to display archived member profiles.
              </p>
              <button 
                onClick={() => { setSearchQuery(""); setActiveStatus("All"); }}
                className="mt-6 px-5 py-3 bg-slate-950 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-slate-950/10 hover:bg-slate-800"
              >
                Clear Filters
              </button>
            </motion.div>
          ) : (
            
            /* DECK WORKSPACE PANELS */
            <>
              {/* 1. ARCHIVED MEMBERS GRID */}
              {viewMode === "grid" && (
                <motion.div 
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {paginatedMembers.map(member => (
                    <motion.article 
                      key={member.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -3, borderColor: "rgba(100, 116, 139, 0.4)", shadow: "0 20px 40px rgba(0,0,0,0.06)" }}
                      className={cn(
                        "rounded-2xl border bg-white border-slate-200 p-5 flex flex-col justify-between transition-all hover:shadow-lg",
                        statusStyles[member.status]
                      )}
                    >
                      <div>
                        {/* Member card layout */}
                        <div className="flex justify-between items-start gap-3 mb-4">
                          <div className="flex items-center gap-3.5 min-w-0">
                            {isSelectionMode && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSelectMember(member.id);
                                }}
                                className={cn(
                                  "w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all",
                                  selectedMemberIds.includes(member.id)
                                    ? "bg-slate-950 border-slate-950 text-white"
                                    : "bg-slate-50 border-slate-300 hover:border-slate-400"
                                )}
                              >
                                {selectedMemberIds.includes(member.id) && <Check size={12} className="stroke-[3]" />}
                              </button>
                            )}
                            <button 
                              type="button"
                              onClick={(e) => handleViewPhoto(e, member)}
                              className="bg-transparent border-0 p-0 block hover:scale-105 active:scale-95 transition-transform duration-150 shrink-0 cursor-pointer focus:outline-none outline-none"
                              title={`View ${member.name}'s photo`}
                            >
                              <img src={member.image} className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 object-cover" alt="" />
                            </button>
                            <div className="min-w-0">
                              <h3 className="text-sm font-black text-slate-900 leading-tight truncate">{member.name}</h3>
                              <p className="text-[9px] font-black text-slate-400 mt-1 tracking-wider uppercase font-mono">ID: {member.member_code || member.id}</p>
                            </div>
                          </div>
                          <span className={cn("px-2.5 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider leading-none shrink-0 font-mono shadow-sm", statusBadgeStyles[member.status])}>
                            {member.status}
                          </span>
                        </div>

                        {/* Offboarding feedback */}
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl mb-4">
                          <p className="text-xs font-semibold text-slate-500 leading-relaxed italic">
                            "{member.reason}"
                          </p>
                        </div>

                        {/* Metrics Pills panel */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <MetricPill 
                            label="Days Out"
                            value={`${member.inactiveDays} Days`}
                            danger={member.inactiveDays > 60}
                            warning={member.inactiveDays > 30 && member.inactiveDays <= 60}
                            success={member.inactiveDays <= 30}
                          />
                          <MetricPill 
                            label="Pipeline Potential"
                            value={currencyFormatter.format(member.recoveryValue)}
                            success={member.recoveryValue >= 2999}
                          />
                        </div>

                        {/* Win-back Progress Bar */}
                        <div className="mb-4 space-y-2">
                          <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">
                            <span>Win-Back Probability</span>
                            <span className={cn(
                              "font-black",
                              member.inactiveDays <= 30 ? "text-emerald-600" : member.inactiveDays <= 60 ? "text-amber-600" : "text-rose-600"
                            )}>
                              {member.inactiveDays <= 30 ? "High (~85%)" : member.inactiveDays <= 60 ? "Medium (~45%)" : "Low (~15%)"}
                            </span>
                          </div>
                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all",
                                member.inactiveDays <= 30 ? "bg-emerald-500" : member.inactiveDays <= 60 ? "bg-amber-500" : "bg-rose-500"
                              )} 
                              style={{ width: `${Math.max(5, Math.min(100, 100 - (member.inactiveDays * 0.9)))}%` }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card actions */}
                      <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <button 
                          onClick={() => { setReactivateMember(member); setSelectedPlan(plans[0].id); }}
                          className="h-9 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm"
                        >
                          Reactivate
                        </button>
                        <a 
                          href={`https://wa.me/${member.phone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(member.name)},%20we%20miss%20you%20at%20GymDeck!%20Check%20out%20our%20reactivation%20offers.`}
                          target="_blank" 
                          rel="noreferrer"
                          className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:border-emerald-500/50 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm"
                          title="Contact via WhatsApp"
                        >
                          <MessageSquare size={14} />
                        </a>
                        <a 
                          href={`tel:${member.phone}`}
                          className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:border-blue-500/50 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
                          title="Call Member"
                        >
                          <Phone size={14} />
                        </a>
                        <button 
                          onClick={() => setSelectedMember(member)}
                          className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-400 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-all shadow-sm ml-auto"
                        >
                          Details
                        </button>
                        <button 
                          onClick={() => handleDeleteMember(member)}
                          className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:border-rose-500/50 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-all shadow-sm"
                          title="Delete Archive Record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.article>
                  ))}
                </motion.div>
              )}

              {/* 2. CLASSY GLOW DATA TABLE */}
              {viewMode === "table" && (
                <motion.div 
                  key="table"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                          {isSelectionMode && (
                            <th className="px-4 py-4 w-[6%] text-center">
                              <span className="sr-only">Select</span>
                            </th>
                          )}
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] font-mono text-slate-500 w-[24%]">Member</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] font-mono text-slate-500 w-[18%]">Contact Info</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] font-mono text-slate-500 w-[28%]">Archived Status & Reason</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] font-mono text-slate-500 w-[14%]">Inactive Period</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] font-mono text-slate-500 w-[10%]">Recovery</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] font-mono text-slate-500 w-[10%] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {paginatedMembers.map(member => (
                          <tr key={member.id} className="hover:bg-slate-50/30 transition-colors group">
                            {isSelectionMode && (
                              <td className="px-4 py-4 text-center align-middle">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleSelectMember(member.id);
                                  }}
                                  className={cn(
                                    "w-5 h-5 rounded border mx-auto flex items-center justify-center shrink-0 transition-all shadow-sm",
                                    selectedMemberIds.includes(member.id)
                                      ? "bg-slate-950 border-slate-950 text-white"
                                      : "bg-slate-50 border-slate-300 hover:border-slate-400"
                                  )}
                                >
                                  {selectedMemberIds.includes(member.id) && <Check size={12} className="stroke-[3]" />}
                                </button>
                              </td>
                            )}
                            <td className="px-6 py-4.5 align-middle">
                              <div className="flex items-center gap-3.5">
                                <button 
                                  type="button"
                                  onClick={(e) => handleViewPhoto(e, member)}
                                  className="bg-transparent border-0 p-0 block hover:scale-105 active:scale-95 transition-transform duration-150 shrink-0 cursor-pointer focus:outline-none outline-none"
                                  title={`View ${member.name}'s photo`}
                                >
                                  <img src={member.image} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 object-cover" alt="" />
                                </button>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-900 truncate leading-tight">{member.name}</p>
                                  <p className="text-[9px] font-semibold text-slate-500 mt-1 bg-slate-100 px-1.5 py-0.5 rounded w-fit leading-none font-mono">ID: {member.member_code || member.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4.5 align-middle">
                              <div className="space-y-1.5 text-xs">
                                <div className="flex items-center gap-2 text-slate-750 font-bold font-mono">
                                  <Phone size={13} className="text-slate-450 shrink-0" />
                                  <span>{member.phone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 font-medium truncate max-w-[170px] font-mono">
                                  <Mail size={13} className="text-slate-405 shrink-0" />
                                  <span className="truncate">{member.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4.5 align-middle">
                              <div className="flex flex-col gap-2">
                                <span className={cn("px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider w-fit border leading-none font-mono", statusBadgeStyles[member.status])}>
                                  {member.status}
                                </span>
                                <p className="text-xs font-semibold text-slate-500 truncate max-w-[220px] italic">"{member.reason}"</p>
                              </div>
                            </td>
                            <td className="px-6 py-4.5 align-middle">
                              <div className="flex flex-col gap-1.5 justify-center">
                                <span className="text-xs font-bold text-slate-800 font-mono">{member.inactiveDays} Days</span>
                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      member.inactiveDays <= 30 ? "bg-emerald-500" : member.inactiveDays <= 60 ? "bg-amber-500" : "bg-rose-500"
                                    )} 
                                    style={{ width: `${Math.min((member.inactiveDays / 90) * 100, 100)}%` }} 
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4.5 align-middle">
                              <span className="text-sm font-extrabold text-slate-900 font-mono">
                                {currencyFormatter.format(member.recoveryValue)}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 align-middle text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => setSelectedMember(member)}
                                  title="View Member Details" 
                                  className="w-8.5 h-8.5 rounded-lg text-slate-450 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-all shrink-0"
                                >
                                  <Eye size={14} />
                                </button>
                                <button 
                                  onClick={() => { setReactivateMember(member); setSelectedPlan(plans[0].id); }}
                                  title="Reactivate Member" 
                                  className="w-8.5 h-8.5 rounded-lg text-slate-450 hover:text-indigo-650 hover:bg-indigo-50 flex items-center justify-center transition-all shrink-0"
                                >
                                  <RefreshCw size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteMember(member)}
                                  title="Delete Archive Record" 
                                  className="w-8.5 h-8.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 flex items-center justify-center transition-all shrink-0"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* 3. RETENTION DIAGNOSTICS ANALYTICS */}
              {viewMode === "analytics" && (
                <motion.div 
                  key="analytics"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                >
                  {/* Archived Cohort distribution */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2.5 font-mono">
                      <PieChart size={16} className="text-indigo-600" />Archived Cohort Distribution
                    </h3>
                    
                    <div className="space-y-6">
                      {[
                        { status: "Expired", label: "Plan Expired (Retention Pause)", count: pastMembers.filter(m => m.status === 'Expired').length, color: "bg-amber-500" },
                        { status: "Cancelled", label: "Cancellation Requests (Relocation/Med pauses)", count: pastMembers.filter(m => m.status === 'Cancelled').length, color: "bg-indigo-500" },
                        { status: "Terminated", label: "Gym Initiated Terminations", count: pastMembers.filter(m => m.status === 'Terminated').length, color: "bg-rose-500" }
                      ].map(category => {
                        const pct = pastMembers.length > 0 ? Math.round((category.count / pastMembers.length) * 100) : 0;
                        return (
                          <div key={category.status} className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                              <span className="flex items-center gap-2.5">
                                <span className={cn("w-2 h-2 rounded-full", category.color)} />
                                {category.label}
                              </span>
                              <span className="font-mono">{category.count} members ({pct}%)</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all", category.color)} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Operational recommendations */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2.5 font-mono">
                      <Award size={16} className="text-indigo-600" />Win-Back Funnel Diagnostics
                    </h3>

                    <div className="grid grid-cols-3 gap-4 h-36 mb-6 font-mono text-center">
                      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4.5 flex flex-col justify-between">
                        <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">High Probability</span>
                        <strong className="text-3xl font-black text-emerald-800 leading-none">{pastMembers.filter(m => m.inactiveDays <= 15).length}</strong>
                        <span className="text-[10px] font-bold text-slate-400">&lt;15 days out</span>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4.5 flex flex-col justify-between">
                        <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Medium Prob.</span>
                        <strong className="text-3xl font-black text-amber-800 leading-none">{pastMembers.filter(m => m.inactiveDays > 15 && m.inactiveDays <= 45).length}</strong>
                        <span className="text-[10px] font-bold text-slate-400">15-45 days out</span>
                      </div>
                      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4.5 flex flex-col justify-between">
                        <span className="text-[9px] font-black text-rose-700 uppercase tracking-widest">Low Probability</span>
                        <strong className="text-3xl font-black text-rose-800 leading-none">{pastMembers.filter(m => m.inactiveDays > 45).length}</strong>
                        <span className="text-[10px] font-bold text-slate-400">&gt;45 days out</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                      <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                        <strong className="text-slate-900">Reactivation logic recommendation:</strong> Priorities lie with contacting high-probability members (inactive &le; 30 days). Recovering these members yields an 85% average renewal conversion compared to older terminated accounts.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* PAGINATION PANEL */}
              {viewMode !== "analytics" && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none font-mono">
                    Ledger page {currentPage} of {totalPages || 1}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-black uppercase tracking-widest text-slate-600 hover:border-slate-400 hover:text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
                    >
                      <ArrowRight size={14} className="rotate-180" /> Previous
                    </button>
                    
                    <div className="flex items-center gap-1 font-mono">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-10 h-10 rounded-xl text-xs font-black transition-all",
                            currentPage === page 
                              ? "bg-slate-950 text-white shadow-md border border-slate-950" 
                              : "text-slate-500 hover:bg-slate-200 hover:text-slate-950"
                          )}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button 
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-black uppercase tracking-widest text-slate-600 hover:border-slate-400 hover:text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
                    >
                      Next <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </AnimatePresence>

      </main>

      {/* ─── SIDEBAR DETAILED PROFILE DETAILS DRAWER ─── */}
      {createPortal(
        <AnimatePresence>
          {selectedMember && (
            <div className="fixed inset-0 z-[10001] flex justify-end">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={() => setSelectedMember(null)} 
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-[6px]" 
                style={{ willChange: "opacity" }}
              />
              {/* Drawer layout */}
              <motion.div 
                initial={{ x: "100%" }} 
                animate={{ x: 0 }} 
                exit={{ x: "100%" }} 
                transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.32 }} 
                className="relative w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col z-10"
                style={{ willChange: "transform" }}
              >
                 <header className="p-6 border-b border-slate-200 flex items-center gap-4 bg-slate-950 text-white">
                  <button 
                    onClick={() => setSelectedMember(null)} 
                    className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-105 hover:bg-slate-800 hover:border-slate-700 active:scale-95 group shadow-inner shrink-0"
                    aria-label="Close drawer"
                  >
                    <X 
                      size={18} 
                      className="transition-transform duration-500 ease-out group-hover:rotate-180" 
                    />
                  </button>
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img src={selectedMember.image} className="w-12 h-12 rounded-full border-2 border-slate-800 object-cover shrink-0" alt="" />
                    <div className="min-w-0">
                      <h2 className="text-base font-black tracking-tight truncate">{selectedMember.name}</h2>
                      <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase font-mono mt-0.5 truncate">{selectedMember.member_code || selectedMember.id}</p>
                    </div>
                  </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {/* Exit details */}
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Archived Context</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2 font-mono">Archived Category</span>
                        <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border leading-none font-mono w-fit", statusBadgeStyles[selectedMember.status])}>
                          {selectedMember.status}
                        </span>
                      </div>
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/50 flex flex-col justify-between">
                        <span className="block text-[9px] font-black text-emerald-700 uppercase tracking-wider mb-2 font-mono">Recovery Value Potential</span>
                        <strong className="text-lg font-black text-emerald-800 font-mono leading-none">{currencyFormatter.format(selectedMember.recoveryValue)}</strong>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Archived Reason/Description</span>
                      <p className="text-xs font-semibold text-slate-700 italic leading-relaxed">
                        "{selectedMember.reason}"
                      </p>
                    </div>
                  </section>

                  {/* Contact information */}
                  <section className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Contact Information</h3>
                    
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-200 bg-slate-50/50">
                        <Phone size={15} className="text-slate-400 shrink-0" />
                        <div>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Primary Contact</span>
                          <a href={`tel:${selectedMember.phone}`} className="text-xs font-black text-slate-800 hover:text-indigo-600 font-mono">{selectedMember.phone}</a>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-200 bg-slate-50/50">
                        <Mail size={15} className="text-slate-400 shrink-0" />
                        <div>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase font-mono">E-Mail Address</span>
                          <a href={`mailto:${selectedMember.email}`} className="text-xs font-black text-slate-800 hover:text-indigo-600 font-mono truncate max-w-xs">{selectedMember.email}</a>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Recommendations */}
                  <section className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Reactivation Diagnostics</h3>
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                      <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                      <div>
                        <h4 className="text-xs font-black text-amber-700 uppercase tracking-wider font-mono">Inactive Period: {selectedMember.inactiveDays} Days</h4>
                        <p className="text-xs font-bold text-slate-600 mt-1 leading-relaxed">
                          This member record has been inactive for {selectedMember.inactiveDays} days. 
                          {selectedMember.inactiveDays <= 30 
                            ? " High recovery potential remains. Trigger standard reactivation sequence." 
                            : " Recovery likelihood has declined. Monitor during standard review windows."}
                        </p>
                      </div>
                    </div>
                  </section>

                </main>

                <footer className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3">
                  <button 
                    onClick={() => {
                      setSelectedMember(null);
                      setReactivateMember(selectedMember);
                      setSelectedPlan(plans[0].id);
                    }}
                    className="flex-1 h-11 rounded-xl bg-slate-950 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-850 transition-colors shadow-md"
                  >
                    Initiate Reactivate
                  </button>
                  <button 
                    onClick={() => handleDeleteMember(selectedMember)}
                    className="h-11 px-4 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 bg-white text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors shadow-sm"
                    title="Purge record"
                  >
                    <Trash2 size={16} />
                  </button>
                </footer>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── REACTIVATION WORKFLOW DIALOG MODAL ─── */}
      {createPortal(
        <AnimatePresence>
          {reactivateMember && (
            <div className="fixed inset-0 z-[10001] flex items-center justify-center px-4">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={() => { setReactivateMember(null); setSelectedPlan(""); }} 
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-[6px]" 
                style={{ willChange: "opacity" }}
              />
              {/* Modal Body */}
              <motion.div 
                initial={{ scale: 0.96, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.3 }} 
                className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl z-10 border border-slate-200 flex flex-col"
                style={{ willChange: "transform, opacity" }}
              >
                <header className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight truncate">Reactivate Workflow</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1 truncate">Select renewal plan for {reactivateMember.name}</p>
                  </div>
                  <button 
                    onClick={() => { setReactivateMember(null); setSelectedPlan(""); }}
                    className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 text-slate-450 hover:text-slate-900 flex items-center justify-center border border-slate-200 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 active:scale-95 group shrink-0 shadow-sm"
                    aria-label="Close modal"
                  >
                    <X 
                      size={16} 
                      className="transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-90" 
                    />
                  </button>
                </header>

                <main className="p-6 space-y-5">
                  <div className="flex items-center gap-3.5 p-3.5 bg-indigo-50 border border-indigo-100/50 rounded-2xl shadow-inner">
                    <img src={reactivateMember.image} className="w-10 h-10 rounded-xl bg-white border border-slate-200 shrink-0 object-cover" alt="" />
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{reactivateMember.name}</h4>
                      <p className="text-[9px] font-black text-indigo-700 tracking-wider uppercase font-mono mt-0.5">{reactivateMember.member_code || reactivateMember.id} · {reactivateMember.phone}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono block">SELECT ACTIVATION PLAN</label>
                    <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                      {plans.map(plan => (
                        <div 
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan.id)}
                          className={cn(
                            "p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all bg-white",
                            selectedPlan === plan.id 
                              ? "border-indigo-600 bg-indigo-50/20" 
                              : "border-slate-200 hover:border-slate-400"
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 truncate">{plan.name}</p>
                            <p className="text-xs font-bold text-slate-400 mt-1 font-mono">{plan.duration}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <strong className="text-sm font-black text-slate-900 font-mono">{currencyFormatter.format(plan.price)}</strong>
                            <div className={cn(
                              "w-4 h-4 rounded-full border flex items-center justify-center mt-1.5 ml-auto",
                              selectedPlan === plan.id ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-350"
                            )}>
                              {selectedPlan === plan.id && <Check size={8} className="stroke-[3]" />}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </main>

                <footer className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3">
                  <button 
                    onClick={() => { setReactivateMember(null); setSelectedPlan(""); }}
                    className="flex-1 h-11 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={!selectedPlan}
                    onClick={handleReactivateSubmit}
                    className="flex-1 h-11 bg-slate-950 hover:bg-slate-850 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Confirm Reactivation
                  </button>
                </footer>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── PERMANENT DELETION WARNING MODAL ─── */}
      {createPortal(
        <AnimatePresence>
          {deleteConfirmMember && (
            <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={() => setDeleteConfirmMember(null)}
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-[6px]"
                style={{ willChange: "opacity" }}
              />
              
              {/* Modal Box */}
              <motion.div 
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-rose-100/50 bg-white shadow-2xl z-10 flex flex-col"
                style={{ willChange: "transform, opacity" }}
              >
                {/* Visual Danger Indicator Header Line */}
                <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700 shrink-0" />

                {/* Modal Header */}
                <header className="p-6 pb-4 flex justify-between items-start border-b border-slate-100">
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">Permanent Deletion Alert</h3>
                    <p className="text-[9px] font-black text-rose-500 tracking-widest uppercase font-mono mt-0.5">Destructive action · irreversible</p>
                  </div>
                  <button 
                    onClick={() => setDeleteConfirmMember(null)}
                    className="w-10 h-10 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-450 hover:text-rose-600 flex items-center justify-center border border-slate-200 hover:border-rose-200 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 active:scale-95 group shrink-0 shadow-sm"
                    aria-label="Close modal"
                  >
                    <X 
                      size={16} 
                      className="transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-90" 
                    />
                  </button>
                </header>

                {/* Modal Body */}
                <main className="p-6 pb-5 space-y-4">
                  {/* Warning Info */}
                  <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100/60 flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                      <AlertTriangle size={18} />
                    </div>
                    <div className="text-xs text-slate-650 leading-relaxed font-semibold">
                      You are about to permanently purge <strong className="text-slate-900 font-bold">{deleteConfirmMember.name}</strong> from the database. This will immediately destroy all files and associations.
                    </div>
                  </div>

                  {/* Target Member Card details */}
                  <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl shadow-inner">
                    <img src={deleteConfirmMember.image} className="w-10 h-10 rounded-xl bg-white border border-slate-200 shrink-0 object-cover" alt="" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-slate-900 truncate leading-tight">{deleteConfirmMember.name}</h4>
                      <p className="text-[9px] font-black text-slate-405 tracking-wider uppercase font-mono mt-1.5 truncate">
                        ID: {deleteConfirmMember.member_code || deleteConfirmMember.id} · Phone: {deleteConfirmMember.phone}
                      </p>
                    </div>
                  </div>

                  {/* Loss breakdown warning banner */}
                  <div className="p-4 bg-slate-50/40 border border-slate-100 rounded-2xl text-[11px] font-semibold space-y-2">
                    <div className="font-black uppercase tracking-wider text-[9px] text-rose-600 font-mono">The following records will be permanently destroyed:</div>
                    <ul className="space-y-1.5 text-slate-600 font-medium pl-1">
                      <li className="flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span>Personal identity data and profile photo</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span>All uploaded residency/gov proof documents</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span>Complete membership plan logs and attendance history</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span>Fees history ledger and past receipts</span>
                      </li>
                    </ul>
                  </div>
                </main>

                {/* Modal Footer */}
                <footer className="p-6 pt-4 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end shrink-0">
                  <button 
                    onClick={() => setDeleteConfirmMember(null)}
                    className="h-10 px-4.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-[10px] font-black uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => confirmDeleteMember(deleteConfirmMember)}
                    className="h-10 px-5.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-rose-600/10 hover:scale-[1.02] active:scale-[0.98] shrink-0"
                  >
                    Permanently Delete
                  </button>
                </footer>
              </motion.div>
            </div>
          )}
          {/* 2. Bulk Deletion Modal */}
          {deleteConfirmBulk && (
            <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={() => setDeleteConfirmBulk(false)}
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-[6px]"
                style={{ willChange: "opacity" }}
              />
              
              {/* Modal Box */}
              <motion.div 
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-rose-100/50 bg-white shadow-2xl z-10 flex flex-col"
                style={{ willChange: "transform, opacity" }}
              >
                {/* Visual Danger Indicator Header Line */}
                <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700 shrink-0" />

                {/* Modal Header */}
                <header className="p-6 pb-4 flex justify-between items-start border-b border-slate-100">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">Bulk Deletion Alert</h3>
                    <p className="text-[9px] font-black text-rose-500 tracking-widest uppercase font-mono mt-0.5">Destructive action · irreversible</p>
                  </div>
                  <button 
                    onClick={() => setDeleteConfirmBulk(false)}
                    className="w-10 h-10 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-450 hover:text-rose-600 flex items-center justify-center border border-slate-200 hover:border-rose-200 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 active:scale-95 group shrink-0 shadow-sm"
                    aria-label="Close modal"
                  >
                    <X 
                      size={16} 
                      className="transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-90" 
                    />
                  </button>
                </header>

                {/* Modal Body */}
                <main className="p-6 pb-5 space-y-4">
                  {/* Warning Info */}
                  <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100/60 flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                      <AlertTriangle size={18} />
                    </div>
                    <div className="text-xs text-slate-650 leading-relaxed font-semibold">
                      You are about to permanently purge <strong className="text-slate-900 font-bold">{selectedMemberIds.length} selected members</strong> from the database. This action will immediately destroy all files and associations.
                    </div>
                  </div>

                  {/* Loss breakdown warning banner */}
                  <div className="p-4 bg-slate-50/40 border border-slate-100 rounded-2xl text-[11px] font-semibold space-y-2">
                    <div className="font-black uppercase tracking-wider text-[9px] text-rose-600 font-mono">The following records will be permanently destroyed:</div>
                    <ul className="space-y-1.5 text-slate-600 font-medium pl-1">
                      <li className="flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span>Personal identity data and profile photo</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span>All uploaded residency/gov proof documents</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span>Complete membership plan logs and attendance history</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span>Fees history ledger and past receipts</span>
                      </li>
                    </ul>
                  </div>
                </main>

                {/* Modal Footer */}
                <footer className="p-6 pt-4 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end shrink-0">
                  <button 
                    onClick={() => setDeleteConfirmBulk(false)}
                    className="h-10 px-4.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-[10px] font-black uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmBulkDeleteMembers}
                    className="h-10 px-5.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-rose-600/10 hover:scale-[1.02] active:scale-[0.98] shrink-0"
                  >
                    Permanently Delete {selectedMemberIds.length} Members
                  </button>
                </footer>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}

export const mountPastMembers = () => {
  const container = document.querySelector('[data-stage="past-members"]');
  if (!container) return null;
  const root = createRoot(container);
  root.render(<PastMembers />);
  return root;
};