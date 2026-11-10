import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useEffect, useCallback, useRef, Component } from "react";
import {
  Send,
  Users,
  MessageSquare,
  Mail,
  Smartphone,
  Calendar,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Plus,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Zap,
  Star,
  Shield,
  History as HistoryIcon,
  Settings,
  X,
  ArrowRight,
  RefreshCcw,
  Target,
  BarChart3,
  Layers,
  Layout,
  Globe,
  Bell,
  MessageCircle,
  FileText,
  Save,
  Trash2,
  Copy,
  Info,
  Bug,
  Megaphone,
  CreditCard,
  CalendarCheck,
  AlertTriangle,
  Paperclip,
  Image as ImageIcon,
  TrendingUp,
  TrendingDown,
  PieChart,
  Activity,
  Check,
  CheckCheck,
  UserCheck,
  Phone,
  Download,
  UploadCloud,
  File,
  Type,
  Repeat,
  Eye,
  ArrowUpDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createRoot } from "react-dom/client";

// ─────────────────────────────────────────
// ERROR BOUNDARY
// ─────────────────────────────────────────

class LocalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-rose-50/80 border border-rose-200 rounded-2xl text-center">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Bug size={24} />
          </div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Notification Module Render Error</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            An internal error occurred while rendering this view. You can reload the section safely.
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
          >
            Refresh View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────
// CONSTANTS & UTILITIES
// ─────────────────────────────────────────

const getAvatarStyle = (name) => {
  const styles = [
    { bg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    { bg: "bg-blue-50 text-blue-700 border-blue-200" },
    { bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { bg: "bg-violet-50 text-violet-700 border-violet-200" },
    { bg: "bg-amber-50 text-amber-700 border-amber-200" },
    { bg: "bg-rose-50 text-rose-700 border-rose-200" },
    { bg: "bg-cyan-50 text-cyan-700 border-cyan-200" },
    { bg: "bg-teal-50 text-teal-700 border-teal-200" }
  ];
  let hash = 0;
  const str = name || "Member";
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return styles[Math.abs(hash) % styles.length];
};

const NOTIFICATION_TYPES = [
  { id: "announcement", label: "Announcement", desc: "General gym updates & facility news", icon: Megaphone, color: "text-indigo-600", activeBg: "bg-indigo-50/80", activeBorder: "border-indigo-500" },
  { id: "reminder", label: "Reminder", desc: "Session slots & class alerts", icon: Clock, color: "text-blue-600", activeBg: "bg-blue-50/80", activeBorder: "border-blue-500" },
  { id: "payment", label: "Payment Alert", desc: "Fee dues & renewal invoices", icon: CreditCard, color: "text-rose-600", activeBg: "bg-rose-50/80", activeBorder: "border-rose-500" },
  { id: "pt", label: "PT Reminder", desc: "Personal trainer 1-on-1 schedules", icon: CalendarCheck, color: "text-teal-600", activeBg: "bg-teal-50/80", activeBorder: "border-teal-500" },
  { id: "promo", label: "Promo Campaign", desc: "Offers, discounts & event passes", icon: Zap, color: "text-amber-600", activeBg: "bg-amber-50/80", activeBorder: "border-amber-500" },
  { id: "emergency", label: "Emergency Alert", desc: "Urgent closures or maintenance", icon: AlertTriangle, color: "text-red-600", activeBg: "bg-red-50/80", activeBorder: "border-red-500" }
];

const CHANNELS = [
  { 
    id: "whatsapp", 
    label: "WhatsApp", 
    desc: "Direct official WhatsApp API message",
    icon: MessageCircle, 
    color: "bg-emerald-500",
    accentColor: "#10b981",
    glow: "rgba(16, 185, 129, 0.20)"
  },
  { 
    id: "sms", 
    label: "SMS", 
    desc: "Telecom carrier DLT verified SMS",
    icon: Smartphone, 
    color: "bg-amber-500",
    accentColor: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.20)"
  },
  { 
    id: "email", 
    label: "Email", 
    desc: "HTML branded newsletter & receipt",
    icon: Mail, 
    color: "bg-blue-500",
    accentColor: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.20)"
  },
  { 
    id: "push", 
    label: "App Push", 
    desc: "GymDeck member mobile app push notification",
    icon: Bell, 
    color: "bg-indigo-600",
    accentColor: "#6366f1",
    glow: "rgba(99, 102, 241, 0.20)"
  }
];

const DEFAULT_MEMBERS = [
  { id: "MBR-0211", name: "Aarav Sharma", phone: "+91 98765 43210", email: "aarav.sharma@example.com", photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80", plan: "Annual Elite", status: "ACTIVE", tags: ["PT Clients"] },
  { id: "MBR-0521", name: "Priya Desai", phone: "+91 98123 45678", email: "priya.desai@example.com", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80", plan: "Quarterly Pro", status: "EXPIRING", tags: ["Expiring Memberships"] },
  { id: "MBR-0184", name: "Ankit Kumar", phone: "+91 97234 56789", email: "ankit.k@example.com", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80", plan: "Monthly Starter", status: "ACTIVE", tags: ["PT Clients"] },
  { id: "MBR-0932", name: "Kabir Singh", phone: "+91 99345 67890", email: "kabir.s@example.com", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80", plan: "Standard Access", status: "PENDING_DUES", tags: ["Pending Dues"] },
  { id: "MBR-0418", name: "Sneha Patel", phone: "+91 96456 78901", email: "sneha.p@example.com", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80", plan: "Annual Elite", status: "ACTIVE", tags: [] },
  { id: "MBR-0305", name: "Rahul Verma", phone: "+91 95567 89012", email: "rahul.v@example.com", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80", plan: "Student Basic", status: "ACTIVE", tags: [] },
  { id: "MBR-0789", name: "Meera Nair", phone: "+91 94678 90123", email: "meera.nair@example.com", photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80", plan: "Quarterly Pro", status: "EXPIRING", tags: ["Expiring Memberships", "PT Clients"] },
  { id: "MBR-0654", name: "Rohan Joshi", phone: "+91 93789 01234", email: "rohan.j@example.com", photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&q=80", plan: "Monthly Starter", status: "PENDING_DUES", tags: ["Pending Dues"] },
  { id: "MBR-0823", name: "Vikram Malhotra", phone: "+91 92890 12345", email: "vikram.m@example.com", photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80", plan: "Annual Elite", status: "ACTIVE", tags: ["PT Clients"] },
  { id: "MBR-0147", name: "Neha Kapoor", phone: "+91 91901 23456", email: "neha.k@example.com", photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80", plan: "Weekend VIP", status: "ACTIVE", tags: [] },
  { id: "MBR-0499", name: "Siddharth Rao", phone: "+91 90012 34567", email: "siddharth.r@example.com", photo: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80", plan: "Corporate Wellness", status: "EXPIRING", tags: ["Expiring Memberships"] },
  { id: "MBR-0731", name: "Tanvi Shah", phone: "+91 98901 45678", email: "tanvi.s@example.com", photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=80", plan: "Standard Access", status: "PENDING_DUES", tags: ["Pending Dues"] }
];

const SEGMENT_CHIPS = [
  { id: "all", label: "All Members" },
  { id: "expiring", label: "Expiring Soon" },
  { id: "pt", label: "PT Clients" },
  { id: "dues", label: "Pending Dues" }
];

const HISTORY_CHANNEL_OPTIONS = [
  { id: "all", label: "All Channels", icon: Globe, color: "text-slate-600", bg: "bg-slate-100" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  { id: "sms", label: "SMS", icon: Smartphone, color: "text-amber-600", bg: "bg-amber-50" },
  { id: "email", label: "Email", icon: Mail, color: "text-blue-600", bg: "bg-blue-50" },
  { id: "push", label: "App Push", icon: Bell, color: "text-indigo-600", bg: "bg-indigo-50" }
];

const HISTORY_SORT_OPTIONS = [
  { id: "newest", label: "Newest First", sub: "Most recent dispatch", icon: Clock },
  { id: "oldest", label: "Oldest First", sub: "Earlier broadcast dates", icon: HistoryIcon },
  { id: "audience", label: "Highest Audience", sub: "Largest member reach", icon: Users }
];

const MOCK_HISTORY = [];

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────

const SendNotification = () => {
  const [activeTab, setActiveTab] = useState("composer"); // "composer" | "history"
  const [selectedType, setSelectedType] = useState("announcement");
  const [selectedChannels, setSelectedChannels] = useState(["push"]);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [scheduleType, setScheduleType] = useState("now"); // 'now' | 'later' | 'recurring'
  const [scheduleDropdownOpen, setScheduleDropdownOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [selectedTimeHour, setSelectedTimeHour] = useState("07");
  const [selectedTimeMinute, setSelectedTimeMinute] = useState("00");
  const [selectedTimePeriod, setSelectedTimePeriod] = useState("PM");
  const [recurringFrequency, setRecurringFrequency] = useState("weekly");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  // Attachments State
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleFilesAdded = (filesList) => {
    if (!filesList || filesList.length === 0) return;
    const newItems = Array.from(filesList).map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      size: file.size,
      formattedSize: formatFileSize(file.size),
      type: file.type,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      file
    }));
    setAttachments(prev => [...prev, ...newItems].slice(0, 5));
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Calendar days generator
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
        isPast: true
      });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const isPast = d < today;
      days.push({
        day: i,
        date: d,
        isCurrentMonth: true,
        isToday: d.getTime() === today.getTime(),
        isPast
      });
    }
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        isPast: false
      });
    }
    return days;
  }, [calendarMonth]);
  
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Recipient Selection State
  const [membersList, setMembersList] = useState(DEFAULT_MEMBERS);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [activeSegment, setActiveSegment] = useState("all");
  const [historyList, setHistoryList] = useState(MOCK_HISTORY);

  // Sync with native backend if Tauri SQLite DB is available
  useEffect(() => {
    if (typeof window !== "undefined" && window.__TAURI__?.core?.invoke) {
      window.__TAURI__.core.invoke("get_members_command", { limit: 5000, offset: 0 })
        .then((dbMembers) => {
          if (Array.isArray(dbMembers) && dbMembers.length > 0) {
            const mapped = dbMembers.map((m, idx) => ({
              id: m.member_code || (m.id ? String(m.id) : `MBR-${String(idx + 1).padStart(4, "0")}`),
              rawId: m.id,
              name: m.full_name || m.name || `Member ${idx + 1}`,
              phone: m.phone || m.mobile || "+91 90000 00000",
              email: m.email || "",
              photo: m.profile_photo_path || m.photo_url || m.photoUrl || m.image || null,
              plan: m.plan_name || m.membership_plan || "Active Membership",
              status: m.membership_status || "ACTIVE",
              tags: [
                m.membership_status === "ACTIVE" ? "All Members" : null,
                m.membership_status === "EXPIRING" ? "Expiring Memberships" : null,
                m.has_dues || m.pending_dues ? "Pending Dues" : null,
                m.is_pt || m.trainer_id ? "PT Clients" : null,
              ].filter(Boolean)
            }));
            setMembersList(mapped);
          }
        })
        .catch((err) => {
          console.warn("GymDeck: Fallback to local default members list", err);
        });
    }
  }, []);

  const filteredMembers = useMemo(() => {
    return membersList.filter(m => {
      // Segment filter
      if (activeSegment === "expiring" && m.status !== "EXPIRING" && !m.tags.includes("Expiring Memberships")) return false;
      if (activeSegment === "pt" && !m.tags.includes("PT Clients")) return false;
      if (activeSegment === "dues" && m.status !== "PENDING_DUES" && !m.tags.includes("Pending Dues")) return false;

      // Search query
      if (recipientSearch.trim()) {
        const q = recipientSearch.toLowerCase().trim();
        const matchesName = (m.name || "").toLowerCase().includes(q);
        const matchesId = (m.id || "").toLowerCase().includes(q);
        const matchesPhone = (m.phone || "").toLowerCase().includes(q);
        const matchesPlan = (m.plan || "").toLowerCase().includes(q);
        return matchesName || matchesId || matchesPhone || matchesPlan;
      }
      return true;
    });
  }, [membersList, activeSegment, recipientSearch]);

  const toggleMemberSelection = useCallback((id) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  }, []);

  const isAllFilteredSelected = filteredMembers.length > 0 && filteredMembers.every(m => selectedMemberIds.includes(m.id));

  const toggleSelectAllFiltered = useCallback(() => {
    if (isAllFilteredSelected) {
      const filteredIds = new Set(filteredMembers.map(m => m.id));
      setSelectedMemberIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const newIds = new Set([...selectedMemberIds, ...filteredMembers.map(m => m.id)]);
      setSelectedMemberIds(Array.from(newIds));
    }
  }, [isAllFilteredSelected, filteredMembers, selectedMemberIds]);

  const handleSegmentClick = useCallback((segmentKey) => {
    setActiveSegment(prev => prev === segmentKey ? "all" : segmentKey);
  }, []);

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  // History Filter & Search State
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [historyChannelFilter, setHistoryChannelFilter] = useState("all");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("all");
  const [historySort, setHistorySort] = useState("newest");
  const [channelDropdownOpen, setChannelDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const channelDropdownRef = useRef(null);
  const sortDropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (channelDropdownRef.current && !channelDropdownRef.current.contains(event.target)) {
        setChannelDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Summary Metrics for Broadcast History
  const historyStats = useMemo(() => {
    const total = historyList.length;
    const sentCount = historyList.filter(h => h.status === "sent").length;
    const scheduledCount = historyList.filter(h => h.status === "scheduled").length;
    const totalAudience = historyList.reduce((sum, h) => sum + (h.recipients || 0), 0);
    const totalDelivered = historyList.reduce((sum, h) => sum + (h.delivered || 0), 0);
    const totalOpened = historyList.reduce((sum, h) => sum + (h.opened || 0), 0);

    const avgDeliveryRate = totalAudience > 0 ? Math.round((totalDelivered / totalAudience) * 100) : 0;
    const avgOpenRate = totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0;

    return {
      total,
      sentCount,
      scheduledCount,
      totalAudience,
      totalDelivered,
      avgDeliveryRate,
      avgOpenRate
    };
  }, [historyList]);

  // Filtered & Sorted Broadcast History
  const filteredHistoryList = useMemo(() => {
    const result = historyList.filter(item => {
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchPreview = (item.preview || "").toLowerCase().includes(q);
        const matchAudience = (item.audience || "").toLowerCase().includes(q);
        const matchType = (item.type || "").toLowerCase().includes(q);
        const matchId = (item.id || "").toLowerCase().includes(q);
        if (!matchTitle && !matchPreview && !matchAudience && !matchType && !matchId) {
          return false;
        }
      }

      if (historyStatusFilter !== "all") {
        if (item.status !== historyStatusFilter) return false;
      }

      if (historyChannelFilter !== "all") {
        if (!item.channels || !item.channels.includes(historyChannelFilter)) return false;
      }

      if (historyTypeFilter !== "all") {
        if ((item.type || "").toLowerCase() !== historyTypeFilter.toLowerCase()) return false;
      }

      return true;
    });

    if (historySort === "newest") {
      result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (historySort === "oldest") {
      result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else if (historySort === "audience") {
      result.sort((a, b) => (b.recipients || 0) - (a.recipients || 0));
    }

    return result;
  }, [historyList, historySearch, historyStatusFilter, historyChannelFilter, historyTypeFilter, historySort]);

  // Duplicate Broadcast: pre-populate Composer & navigate
  const handleDuplicateBroadcast = (item, e) => {
    if (e) e.stopPropagation();
    setMessageTitle(item.title ? `${item.title} (Copy)` : "");
    setMessageContent(item.preview || "");
    if (item.channels && Array.isArray(item.channels) && item.channels.length > 0) {
      setSelectedChannels(item.channels);
    }
    if (item.type) {
      const matchType = NOTIFICATION_TYPES.find(
        t => t.label.toLowerCase() === item.type.toLowerCase() || t.id.toLowerCase() === item.type.toLowerCase()
      );
      if (matchType) setSelectedType(matchType.id);
    }
    setDrawerOpen(false);
    setActiveTab("composer");
  };

  // Delete History Item
  const handleDeleteHistoryItem = (id, e) => {
    if (e) e.stopPropagation();
    setHistoryList(prev => prev.filter(item => item.id !== id));
    if (selectedHistoryItem?.id === id) {
      setDrawerOpen(false);
      setSelectedHistoryItem(null);
    }
  };

  const toggleChannel = (id) => {
    setSelectedChannels(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSend = () => {
    if (!messageTitle || !messageContent || selectedChannels.length === 0 || selectedMemberIds.length === 0) return;
    setIsSending(true);

    const newHistoryItem = {
      id: `MSG-${Date.now().toString().slice(-4)}`,
      title: messageTitle,
      type: NOTIFICATION_TYPES.find(t => t.id === selectedType)?.label || "Announcement",
      preview: messageContent,
      recipients: selectedMemberIds.length,
      delivered: selectedMemberIds.length,
      opened: 0,
      clicked: 0,
      channels: selectedChannels,
      status: scheduleType === "now" ? "sent" : "scheduled",
      timestamp: new Date().toISOString(),
      author: "Admin",
      audience: selectedMemberIds.length === membersList.length ? "All Members" : `${selectedMemberIds.length} Selected Members`
    };

    setTimeout(() => {
      setIsSending(false);
      setIsSuccess(true);
      setHistoryList(prev => [newHistoryItem, ...prev]);
      setTimeout(() => setIsSuccess(false), 3000);
      setMessageTitle("");
      setMessageContent("");
    }, 1200);
  };

  const openDrawer = (item) => {
    setSelectedHistoryItem(item);
    setDrawerOpen(true);
  };

  return (
    <LocalErrorBoundary>
      <div className="notify-members-shell min-h-full bg-[#f8fafc] font-sans text-slate-900 selection:bg-indigo-100 antialiased flex flex-col">
        
        {/* ─── TOP UTILITY & NAVIGATION HEADER (FIXED ON TOP) ─── */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
          <div className="max-w-[1600px] w-full mx-auto px-6 sm:px-8 h-14 flex items-center justify-between gap-4">
            
            {/* Left: Professional Brand & Navigation Hierarchy */}
            <div className="flex items-center gap-3 min-w-0">
              <div 
                className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0"
                style={{ width: "36px", height: "36px", minWidth: "36px", minHeight: "36px" }}
              >
                <Megaphone size={18} strokeWidth={2.2} className="text-white" />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-none whitespace-nowrap">
                  Notification Center
                </h1>
                <span className="hidden sm:inline-flex items-center gap-2 text-xs font-medium text-slate-400">
                  <span className="text-slate-300 font-light">/</span>
                  <span className="text-slate-500 font-semibold truncate">Broadcasts & Member Messaging</span>
                </span>
              </div>
            </div>

            {/* Right: Segmented Navigation Tabs */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
                <button 
                  type="button"
                  onClick={() => setActiveTab("composer")}
                  className={`h-8 px-3.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === "composer" 
                      ? "bg-white text-indigo-700 shadow-2xs font-black border border-slate-200/60" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  <Send size={12} strokeWidth={activeTab === "composer" ? 2.5 : 2} className={activeTab === "composer" ? "text-indigo-600" : "text-slate-400"} />
                  <span>Composer Studio</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`h-8 px-3.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === "history" 
                      ? "bg-white text-indigo-700 shadow-2xs font-black border border-slate-200/60" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  <HistoryIcon size={12} strokeWidth={activeTab === "history" ? 2.5 : 2} className={activeTab === "history" ? "text-indigo-600" : "text-slate-400"} />
                  <span>Broadcast History</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeTab === "history" ? "bg-indigo-50 text-indigo-700 font-black" : "bg-slate-200 text-slate-600 font-bold"
                  }`}>
                    {historyList.length}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </header>

        {/* ─── SCROLLABLE PAGE BODY (CONTENT PASSES UNDERNEATH HEADER) ─── */}
        <div className="flex-1 max-w-[1600px] w-full mx-auto px-6 sm:px-8 py-5 flex flex-col gap-5">
          {/* Main Content Workspace */}
          <div className="notify-members-workspace !p-0 !border-0 !bg-transparent !shadow-none">
          <AnimatePresence mode="wait">
            
            {/* ════════════════════════════════════════════════════════════
                1. COMPOSER STUDIO TAB (MODERN HIGH-EFFICIENCY 2-COLUMN COCKPIT)
            ════════════════════════════════════════════════════════════ */}
            {activeTab === "composer" ? (
              <motion.div
                key="composer"
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
              >
                {/* ──── LEFT COLUMN (COL-SPAN-7): CONTENT STUDIO & DISPATCH SETTINGS ──── */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* CARD 1: CAMPAIGN OBJECTIVE */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center font-mono">1</span>
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Notification Objective
                        </h2>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">Select campaign intent</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {NOTIFICATION_TYPES.map(type => {
                        const isSelected = selectedType === type.id;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setSelectedType(type.id)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[72px] ${
                              isSelected 
                                ? `${type.activeBg} ${type.activeBorder} shadow-2xs ring-1 ring-indigo-500/20` 
                                : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <type.icon size={16} className={isSelected ? type.color : "text-slate-400"} strokeWidth={2.4} />
                              {isSelected && (
                                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                                  <Check size={10} strokeWidth={3} />
                                </span>
                              )}
                            </div>
                            <div>
                              <div className={`text-xs font-black leading-tight ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
                                {type.label}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium leading-tight truncate mt-0.5">
                                {type.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CARD 2: MESSAGE CONTENT STUDIO */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center font-mono">2</span>
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Message Content Studio
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                        <span>{messageContent.length} chars</span>
                        <span className="text-slate-300">•</span>
                        <span>{Math.max(1, Math.ceil((messageContent.length || 1) / 160))} SMS part(s)</span>
                      </div>
                    </div>

                    {/* Title Input */}
                    <div className="relative flex items-center w-full">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Type size={14} strokeWidth={2.2} />
                      </div>
                      <input
                        type="text"
                        placeholder="Notification Title / Subject (e.g., Weekend CrossFit Challenge & Workshop)"
                        className="w-full h-10 pl-9 pr-16 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200/90 focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none transition-all"
                        value={messageTitle}
                        maxLength={100}
                        onChange={(e) => setMessageTitle(e.target.value)}
                      />
                      <span className="absolute right-3 text-[10px] font-mono font-bold text-slate-400 pointer-events-none">
                        {messageTitle.length}/100
                      </span>
                    </div>

                    {/* Message Body */}
                    <div className="border border-slate-200/90 rounded-xl bg-white overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                      <textarea
                        rows={5}
                        placeholder="Type notification message here..."
                        className="w-full p-3.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                      />
                      {messageContent && (
                        <div className="px-3 py-1.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setMessageContent("")}
                            className="px-2 py-0.5 rounded text-slate-400 hover:text-rose-600 text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            Clear Message
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CARD 3: DELIVERY GATEWAYS */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center font-mono">3</span>
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Delivery Gateways
                        </h2>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      {CHANNELS.map(ch => {
                        const isSelected = selectedChannels.includes(ch.id);
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => toggleChannel(ch.id)}
                            style={{
                              border: isSelected ? `1.5px solid ${ch.accentColor}` : "1px solid #e2e8f0",
                              backgroundColor: isSelected ? "#ffffff" : "#f8fafc",
                              boxShadow: isSelected ? `0 4px 12px -2px ${ch.glow}` : "none"
                            }}
                            className="p-3 rounded-xl flex flex-col justify-between text-left transition-all cursor-pointer group min-h-[82px]"
                          >
                            <div className="flex items-center justify-between w-full mb-2">
                              <div 
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                                style={{
                                  backgroundColor: isSelected ? ch.accentColor : "#ffffff",
                                  border: isSelected ? `1px solid ${ch.accentColor}` : "1px solid #e2e8f0"
                                }}
                              >
                                <ch.icon 
                                  size={13} 
                                  strokeWidth={isSelected ? 2.5 : 2} 
                                  style={{ stroke: isSelected ? "#ffffff" : "#64748b" }} 
                                />
                              </div>

                              <div 
                                className="w-4 h-4 rounded-md flex items-center justify-center transition-all"
                                style={{
                                  backgroundColor: isSelected ? ch.accentColor : "#ffffff",
                                  border: isSelected ? `1px solid ${ch.accentColor}` : "1.5px solid #cbd5e1"
                                }}
                              >
                                {isSelected && <Check size={10} strokeWidth={3.5} style={{ stroke: "#ffffff" }} />}
                              </div>
                            </div>

                            <div>
                              <div className={`text-xs font-bold leading-tight ${isSelected ? "text-slate-900 font-extrabold" : "text-slate-700"}`}>
                                {ch.label}
                              </div>
                              <div className="text-[9px] text-slate-400 font-medium leading-tight truncate mt-0.5">
                                {ch.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CARD 4: DISPATCH TIMING & MEDIA ATTACHMENTS (SIDE-BY-SIDE PANELS) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* PANEL A: SCHEDULING */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <Calendar size={13} strokeWidth={2.4} />
                            </div>
                            <span className="text-xs font-black uppercase tracking-wider text-slate-800">Dispatch Timing</span>
                          </div>
                          {scheduleType === "later" && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Scheduled
                            </span>
                          )}
                        </div>

                        {/* Dropdown Selector */}
                        <div className="relative mb-3">
                          <button
                            type="button"
                            onClick={() => setScheduleDropdownOpen(prev => !prev)}
                            className="w-full h-9 px-3 bg-slate-50 hover:bg-white border border-slate-200/90 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              {scheduleType === "now" && <Zap size={13} className="text-amber-500 shrink-0" />}
                              {scheduleType === "later" && <Clock size={13} className="text-indigo-600 shrink-0" />}
                              {scheduleType === "recurring" && <Repeat size={13} className="text-emerald-600 shrink-0" />}
                              <span className="truncate">
                                {scheduleType === "now" && "Send Immediately"}
                                {scheduleType === "later" && "Schedule for Later (Date & Time)"}
                                {scheduleType === "recurring" && "Recurring Broadcast"}
                              </span>
                            </div>
                            <ChevronDown size={13} className={`text-slate-400 transition-transform shrink-0 ${scheduleDropdownOpen ? "rotate-180" : ""}`} />
                          </button>

                          <AnimatePresence>
                            {scheduleDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                                className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 space-y-1"
                              >
                                {[
                                  { id: "now", label: "Send Immediately", desc: "Dispatch right after launch", icon: Zap, iconColor: "text-amber-500" },
                                  { id: "later", label: "Schedule for Later", desc: "Select custom date & time", icon: Clock, iconColor: "text-indigo-600" },
                                  { id: "recurring", label: "Recurring Broadcast", desc: "Automate daily, weekly, monthly", icon: Repeat, iconColor: "text-emerald-600" }
                                ].map(opt => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                      setScheduleType(opt.id);
                                      setScheduleDropdownOpen(false);
                                    }}
                                    className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                                      scheduleType === opt.id ? "bg-indigo-50/80 text-indigo-900" : "hover:bg-slate-50 text-slate-700"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <opt.icon size={13} className={opt.iconColor} />
                                      <div>
                                        <div className="text-xs font-bold leading-tight">{opt.label}</div>
                                        <div className="text-[10px] text-slate-400 font-normal">{opt.desc}</div>
                                      </div>
                                    </div>
                                    {scheduleType === opt.id && <Check size={12} strokeWidth={3} className="text-indigo-600" />}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Schedule Later Module */}
                        {scheduleType === "later" && (
                          <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                              <button
                                type="button"
                                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                                className="w-5 h-5 rounded hover:bg-slate-200/70 flex items-center justify-center text-slate-500 cursor-pointer"
                              >
                                <ChevronLeft size={12} />
                              </button>
                              <span className="text-xs font-bold text-slate-800">
                                {calendarMonth.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                              </span>
                              <button
                                type="button"
                                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                                className="w-5 h-5 rounded hover:bg-slate-200/70 flex items-center justify-center text-slate-500 cursor-pointer"
                              >
                                <ChevronRight size={12} />
                              </button>
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-slate-400">
                              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => <span key={i}>{w}</span>)}
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                              {calendarDays.map((item, idx) => {
                                const isCurrentSelected = selectedDate && 
                                  item.date.getFullYear() === selectedDate.getFullYear() &&
                                  item.date.getMonth() === selectedDate.getMonth() &&
                                  item.date.getDate() === selectedDate.getDate();

                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    disabled={item.isPast || !item.isCurrentMonth}
                                    onClick={() => setSelectedDate(item.date)}
                                    className={`h-5.5 rounded text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                                      !item.isCurrentMonth
                                        ? "text-slate-300 opacity-40 cursor-not-allowed"
                                        : item.isPast
                                          ? "text-slate-300 line-through cursor-not-allowed"
                                          : isCurrentSelected
                                            ? "bg-indigo-600 text-white font-black"
                                            : item.isToday
                                              ? "bg-indigo-50 text-indigo-700 font-extrabold"
                                              : "text-slate-700 hover:bg-slate-200/60"
                                    }`}
                                  >
                                    {item.day}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Time Picker */}
                            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                              <span className="text-[10px] font-bold text-slate-400">Dispatch:</span>
                              <div className="flex items-center gap-1">
                                <select
                                  value={selectedTimeHour}
                                  onChange={(e) => setSelectedTimeHour(e.target.value)}
                                  className="h-6 px-1 bg-white border border-slate-200 rounded text-[11px] font-bold text-slate-800"
                                >
                                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(h => (
                                    <option key={h} value={h}>{h}</option>
                                  ))}
                                </select>
                                <span className="text-slate-400 font-bold">:</span>
                                <select
                                  value={selectedTimeMinute}
                                  onChange={(e) => setSelectedTimeMinute(e.target.value)}
                                  className="h-6 px-1 bg-white border border-slate-200 rounded text-[11px] font-bold text-slate-800"
                                >
                                  {['00', '15', '30', '45'].map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => setSelectedTimePeriod(prev => prev === "AM" ? "PM" : "AM")}
                                  className="h-6 px-1.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold"
                                >
                                  {selectedTimePeriod}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {scheduleType === "recurring" && (
                          <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 block">Cadence:</span>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { id: "daily", label: "Daily (9 AM)" },
                                { id: "weekly", label: "Weekly (Mon)" },
                                { id: "monthly", label: "Monthly (1st)" },
                                { id: "expiry", label: "On Expiry Day" }
                              ].map(f => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => setRecurringFrequency(f.id)}
                                  className={`h-7 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-between ${
                                    recurringFrequency === f.id
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-black"
                                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  <span>{f.label}</span>
                                  {recurringFrequency === f.id && <Check size={10} strokeWidth={3} className="text-emerald-600" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {scheduleType === "now" && (
                          <div className="p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center gap-2">
                            <Zap size={13} className="text-emerald-600 shrink-0" />
                            <span className="text-[11px] text-emerald-800 font-medium leading-tight">
                              Broadcast launches live to all active recipients immediately.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PANEL B: MEDIA ATTACHMENTS */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <Paperclip size={13} strokeWidth={2.4} />
                            </div>
                            <span className="text-xs font-black uppercase tracking-wider text-slate-800">Media Attachments</span>
                          </div>
                          {attachments.length > 0 && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {attachments.length} attached
                            </span>
                          )}
                        </div>

                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx,.xlsx"
                          onChange={(e) => {
                            handleFilesAdded(e.target.files);
                            e.target.value = "";
                          }}
                          className="hidden"
                        />

                        {/* Drop Zone */}
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files);
                          }}
                          onClick={() => fileInputRef.current?.click()}
                          className={`p-3 rounded-xl border border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                            isDragging 
                              ? "border-indigo-500 bg-indigo-50/50" 
                              : "border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50"
                          }`}
                        >
                          <UploadCloud size={16} className="text-indigo-600 mb-1" />
                          <span className="text-xs font-bold text-slate-800">
                            Upload gym flyer, PDF, or schedule
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Max 5 files (PNG, JPG, PDF up to 10MB)
                          </span>
                        </div>

                        {/* File preview list */}
                        {attachments.length > 0 && (
                          <div className="mt-2.5 space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                            {attachments.map(att => (
                              <div
                                key={att.id}
                                className="p-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <FileText size={12} className="text-indigo-600 shrink-0" />
                                  <span className="text-[11px] font-bold text-slate-800 truncate">
                                    {att.name}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    {att.formattedSize}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeAttachment(att.id)}
                                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>

                {/* ──── RIGHT COLUMN (COL-SPAN-5): AUDIENCE COCKPIT & LAUNCH ACTION ──── */}
                <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
                  
                  {/* AUDIENCE SELECTION COCKPIT */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3.5">
                    
                    {/* Header with Selected Pill & Select All Toggle */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/80">
                          <Users size={15} strokeWidth={2.4} />
                        </div>
                        <div>
                          <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 leading-none">
                            Target Audience
                          </h2>
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                            Directory member selection
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono transition-all ${
                          selectedMemberIds.length > 0 
                            ? "bg-indigo-600 text-white shadow-2xs" 
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {selectedMemberIds.length} Selected
                        </span>

                        <button
                          type="button"
                          onClick={toggleSelectAllFiltered}
                          className={`h-7 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                            isAllFilteredSelected 
                              ? "bg-slate-900 text-white hover:bg-slate-800" 
                              : "bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
                          }`}
                        >
                          <CheckCheck size={12} strokeWidth={2.4} />
                          <span>{isAllFilteredSelected ? "Deselect" : "Select All"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Instant Search Bar */}
                    <div className="relative flex items-center w-full">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Search size={13} strokeWidth={2.2} />
                      </div>
                      <input
                        type="text"
                        value={recipientSearch}
                        onChange={(e) => setRecipientSearch(e.target.value)}
                        placeholder="Search by member name, ID code, phone, or plan..."
                        className="w-full h-9 pl-9 pr-8 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200/90 focus:border-indigo-500 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs"
                      />
                      {recipientSearch ? (
                        <button
                          type="button"
                          onClick={() => setRecipientSearch("")}
                          className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Clear search"
                        >
                          <X size={12} />
                        </button>
                      ) : (
                        <span className="absolute right-2.5 px-1 rounded text-[9px] font-mono text-slate-400 border border-slate-200 bg-white">
                          /
                        </span>
                      )}
                    </div>

                    {/* Segment Filter Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {SEGMENT_CHIPS.map(chip => {
                        const isActive = activeSegment === chip.id;
                        const count = membersList.filter(m => {
                          if (chip.id === "all") return true;
                          if (chip.id === "expiring") return m.status === "EXPIRING" || m.tags.includes("Expiring Memberships");
                          if (chip.id === "pt") return m.tags.includes("PT Clients");
                          if (chip.id === "dues") return m.status === "PENDING_DUES" || m.tags.includes("Pending Dues");
                          return true;
                        }).length;

                        return (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => handleSegmentClick(chip.id)}
                            className={`h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                              isActive
                                ? "bg-slate-900 text-white font-black shadow-2xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200/60"
                            }`}
                          >
                            <span>{chip.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                              isActive ? "bg-white/20 text-white" : "bg-white text-slate-500"
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Member Directory Scrollable List Container */}
                    <div className="border border-slate-200/90 rounded-xl bg-white overflow-hidden shadow-2xs">
                      {/* Directory Table Sub-header */}
                      <div className="bg-slate-50/90 border-b border-slate-100 px-3.5 py-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                        <span>Member Details ({filteredMembers.length})</span>
                        <span>Status</span>
                      </div>

                      <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                        {filteredMembers.length === 0 ? (
                          <div className="py-8 text-center text-slate-400">
                            <Users size={20} className="mx-auto mb-1 opacity-40" />
                            <p className="text-xs font-semibold text-slate-600">No members match search</p>
                            <button
                              type="button"
                              onClick={() => { setRecipientSearch(""); setActiveSegment("all"); }}
                              className="mt-2 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                            >
                              Reset Filters
                            </button>
                          </div>
                        ) : (
                          filteredMembers.map((m) => {
                            const isSelected = selectedMemberIds.includes(m.id);
                            const avatarStyle = getAvatarStyle(m.name);
                            const initials = (m.name || "M")
                              .split(" ")
                              .map(n => n[0])
                              .join("")
                              .substring(0, 2)
                              .toUpperCase();

                            return (
                              <div
                                key={m.id}
                                onClick={() => toggleMemberSelection(m.id)}
                                className={`px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none group ${
                                  isSelected ? "bg-indigo-50/60 hover:bg-indigo-50/80" : "hover:bg-slate-50/90"
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {/* Guaranteed visible blank checkbox on the left side of each member */}
                                  <div
                                    style={{
                                      border: isSelected ? "2px solid #4f46e5" : "2px solid #94a3b8",
                                      backgroundColor: isSelected ? "#4f46e5" : "#ffffff",
                                      width: "20px",
                                      height: "20px",
                                      minWidth: "20px",
                                      minHeight: "20px"
                                    }}
                                    className="rounded-md flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs group-hover:border-indigo-500"
                                    role="checkbox"
                                    aria-checked={isSelected}
                                    title={isSelected ? "Deselect member" : "Select member"}
                                  >
                                    {isSelected && (
                                      <svg 
                                        viewBox="0 0 24 24" 
                                        width="13" 
                                        height="13" 
                                        fill="none" 
                                        stroke="#ffffff" 
                                        strokeWidth="3.5" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round"
                                        className="shrink-0 text-white"
                                      >
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    )}
                                  </div>

                                  {/* Profile Photo Avatar (Strict 1:1 circle, guaranteed aspect ratio) */}
                                  <div className={`relative w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] aspect-square rounded-full border flex items-center justify-center shrink-0 overflow-hidden select-none shadow-2xs ${avatarStyle.bg}`}>
                                    <span className="text-[11px] font-black tracking-wider leading-none">
                                      {initials}
                                    </span>
                                    {m.photo ? (
                                      <img 
                                        src={m.photo} 
                                        alt={m.name} 
                                        className="absolute inset-0 w-full h-full object-cover object-center rounded-full aspect-square" 
                                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                                      />
                                    ) : null}
                                  </div>

                                  {/* Member Name, Code & Plan/Phone */}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-xs font-bold truncate transition-colors ${
                                        isSelected ? "text-indigo-950 font-extrabold" : "text-slate-900 group-hover:text-indigo-600"
                                      }`}>
                                        {m.name}
                                      </span>
                                      <span className="text-[9px] font-mono font-semibold text-slate-400 bg-slate-100 px-1 py-0.2 rounded border border-slate-200/60 shrink-0">
                                        {m.id}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                      <span className="truncate">{m.plan}</span>
                                      <span className="text-slate-300">•</span>
                                      <span className="font-mono truncate">{m.phone}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Status Pill Badge */}
                                <div className="shrink-0 pl-1">
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 border ${
                                    m.status === "EXPIRING" ? "bg-amber-50 text-amber-700 border-amber-200/80" :
                                    m.status === "PENDING_DUES" ? "bg-rose-50 text-rose-700 border-rose-200/80" :
                                    "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      m.status === "EXPIRING" ? "bg-amber-500" :
                                      m.status === "PENDING_DUES" ? "bg-rose-500" :
                                      "bg-emerald-500"
                                    }`} />
                                    {m.status.replace("_", " ")}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                  </div>

                  {/* LAUNCH BROADCAST ACTION CARD */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3.5">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-500 font-medium">
                        <span>Target Recipients:</span>
                        <strong className="text-slate-900 font-bold font-mono">
                          {selectedMemberIds.length} {selectedMemberIds.length === 1 ? "member" : "members"}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 font-medium">
                        <span>Active Rails:</span>
                        <strong className="text-slate-900 font-bold">{selectedChannels.map(c => c.toUpperCase()).join(", ") || "None selected"}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 font-medium">
                        <span>Dispatch Timing:</span>
                        <strong className="text-indigo-600 font-bold">
                          {scheduleType === "now" ? "Immediate Dispatch" : scheduleType === "later" ? "Scheduled Delivery" : "Automated Recurring"}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={isSending || !messageTitle || !messageContent || selectedChannels.length === 0 || selectedMemberIds.length === 0}
                      className={`w-full h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer ${
                        isSuccess ? "bg-emerald-600 text-white shadow-emerald-200" :
                        isSending ? "bg-slate-200 text-slate-400 cursor-wait shadow-none" :
                        "bg-slate-900 text-white hover:bg-indigo-600 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                      }`}
                    >
                      {isSuccess ? (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Broadcast Launched!</span>
                        </>
                      ) : isSending ? (
                        <>
                          <RefreshCcw size={16} className="animate-spin" />
                          <span>Dispatching Broadcast...</span>
                        </>
                      ) : (
                        <>
                          <Send size={15} />
                          <span>Launch Broadcast ({selectedMemberIds.length})</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                      <Shield size={11} className="text-emerald-600" />
                      <span>Compliant with TRAI DLT & Meta Anti-Spam Guidelines</span>
                    </div>
                  </div>

                </div>

              </motion.div>
            ) : (
              
              /* ════════════════════════════════════════════════════════════
                  2. BROADCAST HISTORY TAB (CLEAN AUDIT TRAIL & METRICS)
              ════════════════════════════════════════════════════════════ */
              <motion.div
                key="history"
                initial={{ opacity: 0, scale: 0.99 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.15 }}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
              >
                {/* 1. Header with Export CSV & New Broadcast CTA */}
                <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900 tracking-tight">
                        Broadcast Logs & Delivery Audit
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-mono">
                        {historyList.length} Total
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Review delivery metrics, open rates, and inspect dispatched campaigns.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={historyList.length === 0}
                      onClick={() => {
                        if (historyList.length === 0) return;
                        const csvHeader = ["ID", "Title", "Type", "Status", "Audience", "Recipients", "Delivered", "Opened", "Channels", "Dispatched At"];
                        const csvRows = historyList.map(h => [
                          h.id,
                          `"${(h.title || '').replace(/"/g, '""')}"`,
                          h.type,
                          h.status,
                          `"${(h.audience || '').replace(/"/g, '""')}"`,
                          h.recipients,
                          h.delivered,
                          h.opened,
                          `"${(h.channels || []).join(', ')}"`,
                          h.timestamp
                        ]);
                        const csvContent = "data:text/csv;charset=utf-8," + [csvHeader, ...csvRows].map(e => e.join(",")).join("\n");
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", `gymdeck_broadcast_history_${new Date().toISOString().slice(0, 10)}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className={`h-9 px-3.5 rounded-xl bg-white border text-xs font-bold shadow-2xs transition-all flex items-center gap-2 ${
                        historyList.length === 0 
                          ? "border-slate-200 text-slate-300 opacity-60 cursor-not-allowed" 
                          : "border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 cursor-pointer"
                      }`}
                      title={historyList.length === 0 ? "No broadcast logs to export" : "Export broadcast log as CSV"}
                    >
                      <Download size={13} className={historyList.length === 0 ? "text-slate-300" : "text-slate-400"} />
                      <span>Export Log</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("composer")}
                      className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      <span>New Broadcast</span>
                    </button>
                  </div>
                </div>

                {/* 2. KPI Summary Cards */}
                <div className="p-4 md:p-6 border-b border-slate-100 bg-white">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total Broadcasts</span>
                        <MessageSquare size={13} />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-slate-900">{historyStats.total}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">campaigns</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Audience Reached</span>
                        <Users size={13} />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-slate-900">{historyStats.totalAudience.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">members</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                      <div className="flex items-center justify-between text-emerald-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Delivery Rate</span>
                        <CheckCircle2 size={13} className="text-emerald-600" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-emerald-700">{historyStats.avgDeliveryRate}%</span>
                        <span className="text-[10px] text-emerald-600/80 font-semibold">avg delivered</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100">
                      <div className="flex items-center justify-between text-indigo-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Open Rate</span>
                        <Target size={13} className="text-indigo-600" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-indigo-700">{historyStats.avgOpenRate}%</span>
                        <span className="text-[10px] text-indigo-600/80 font-semibold">avg opened</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Search & Filter Bar */}
                <div className="p-4 md:px-6 border-b border-slate-100 bg-slate-50/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search size={13} strokeWidth={2.4} />
                    </div>
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search broadcasts by title, content, or cohort..."
                      className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:border-indigo-500"
                    />
                    {historySearch && (
                      <button
                        type="button"
                        onClick={() => setHistorySearch("")}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Tabs */}
                    <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                      {[
                        { id: "all", label: "All", count: historyList.length },
                        { id: "sent", label: "Delivered", count: historyStats.sentCount },
                        { id: "scheduled", label: "Scheduled", count: historyStats.scheduledCount }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setHistoryStatusFilter(tab.id)}
                          className={`h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            historyStatusFilter === tab.id
                              ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`text-[10px] px-1 rounded-full ${
                            historyStatusFilter === tab.id ? "bg-slate-100 text-slate-700" : "text-slate-400"
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Channel Filter Dropdown */}
                    <div className="relative" ref={channelDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setChannelDropdownOpen(prev => !prev);
                          setSortDropdownOpen(false);
                        }}
                        className="h-9 px-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                      >
                        {(() => {
                          const activeChan = HISTORY_CHANNEL_OPTIONS.find(c => c.id === historyChannelFilter) || HISTORY_CHANNEL_OPTIONS[0];
                          return (
                            <>
                              <div className="flex items-center gap-1.5">
                                <activeChan.icon size={13} className={activeChan.color} />
                                <span>{activeChan.label}</span>
                              </div>
                              <ChevronDown size={12} className={`text-slate-400 transition-transform ${channelDropdownOpen ? "rotate-180" : ""}`} />
                            </>
                          );
                        })()}
                      </button>

                      <AnimatePresence>
                        {channelDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            className="absolute z-50 top-full right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 space-y-0.5"
                          >
                            {HISTORY_CHANNEL_OPTIONS.map(opt => {
                              const isSelected = historyChannelFilter === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    setHistoryChannelFilter(opt.id);
                                    setChannelDropdownOpen(false);
                                  }}
                                  className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                                    isSelected ? "bg-indigo-50/80 text-indigo-950 font-black" : "hover:bg-slate-50 text-slate-700 font-semibold"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <opt.icon size={12} className={opt.color} />
                                    <span className="text-xs">{opt.label}</span>
                                  </div>
                                  {isSelected && <Check size={12} strokeWidth={3} className="text-indigo-600" />}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative" ref={sortDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setSortDropdownOpen(prev => !prev);
                          setChannelDropdownOpen(false);
                        }}
                        className="h-9 px-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                      >
                        {(() => {
                          const activeSortObj = HISTORY_SORT_OPTIONS.find(s => s.id === historySort) || HISTORY_SORT_OPTIONS[0];
                          return (
                            <>
                              <div className="flex items-center gap-1.5">
                                <activeSortObj.icon size={13} className="text-slate-500" />
                                <span>{activeSortObj.label}</span>
                              </div>
                              <ChevronDown size={12} className={`text-slate-400 transition-transform ${sortDropdownOpen ? "rotate-180" : ""}`} />
                            </>
                          );
                        })()}
                      </button>

                      <AnimatePresence>
                        {sortDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            className="absolute z-50 top-full right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 space-y-0.5"
                          >
                            {HISTORY_SORT_OPTIONS.map(opt => {
                              const isSelected = historySort === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    setHistorySort(opt.id);
                                    setSortDropdownOpen(false);
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                                    isSelected ? "bg-indigo-50/80 text-indigo-950 font-black" : "hover:bg-slate-50 text-slate-700 font-semibold"
                                  }`}
                                >
                                  <div>
                                    <div className="text-xs font-bold">{opt.label}</div>
                                    <div className="text-[10px] text-slate-400">{opt.sub}</div>
                                  </div>
                                  {isSelected && <Check size={12} strokeWidth={3} className="text-indigo-600" />}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                  </div>
                </div>

                {/* 4. History List Rows */}
                <div className="divide-y divide-slate-100">
                  {historyList.length === 0 ? (
                    <div className="p-16 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/90 text-slate-400 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
                        <HistoryIcon size={22} strokeWidth={1.8} />
                      </div>
                      <h3 className="text-sm font-black text-slate-900">No Broadcasts Dispatched Yet</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                        Campaign dispatches, fee reminder notifications, and scheduled alerts will appear here in real time once triggered.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("composer")}
                        className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Plus size={14} strokeWidth={2.5} />
                        <span>Create First Broadcast</span>
                      </button>
                    </div>
                  ) : filteredHistoryList.length === 0 ? (
                    <div className="p-12 text-center">
                      <Search size={22} className="mx-auto mb-2 text-slate-300" />
                      <h3 className="text-sm font-bold text-slate-800">No broadcasts match criteria</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Try searching with different terms or reset active filters</p>
                      <button
                        type="button"
                        onClick={() => {
                          setHistorySearch("");
                          setHistoryStatusFilter("all");
                          setHistoryChannelFilter("all");
                          setHistoryTypeFilter("all");
                        }}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : (
                    filteredHistoryList.map((msg) => {
                      const deliveryPercent = msg.recipients > 0 ? Math.round((msg.delivered / msg.recipients) * 100) : 0;
                      const openPercent = msg.delivered > 0 ? Math.round((msg.opened / msg.delivered) * 100) : 0;

                      return (
                        <div
                          key={msg.id}
                          onClick={() => openDrawer(msg)}
                          className="p-4 md:px-6 hover:bg-slate-50/80 transition-colors cursor-pointer group flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          {/* Left details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              {/* Channel pills */}
                              <div className="flex items-center gap-1">
                                {(msg.channels || []).map(chId => {
                                  const ch = CHANNELS.find(c => c.id === chId);
                                  if (!ch) return null;
                                  return (
                                    <span
                                      key={chId}
                                      style={{
                                        backgroundColor: `${ch.accentColor}12`,
                                        borderColor: `${ch.accentColor}30`,
                                        color: ch.accentColor
                                      }}
                                      className="h-5 px-1.5 rounded text-[10px] font-bold border flex items-center gap-1"
                                    >
                                      <ch.icon size={10} strokeWidth={2.4} />
                                      <span>{ch.label}</span>
                                    </span>
                                  );
                                })}
                              </div>

                              <span className="text-slate-300">•</span>

                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                                {msg.type}
                              </span>

                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                msg.status === "sent" 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}>
                                {msg.status === "sent" ? "Delivered" : "Scheduled"}
                              </span>

                              <span className="text-[10px] font-mono text-slate-400 font-bold ml-auto sm:ml-0">
                                {msg.id}
                              </span>
                            </div>

                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                              {msg.title}
                            </h3>

                            <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                              {msg.preview}
                            </p>

                            <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-medium">
                              <span>
                                {new Date(msg.timestamp).toLocaleString("en-IN", { 
                                  month: "short", 
                                  day: "numeric", 
                                  hour: "2-digit", 
                                  minute: "2-digit" 
                                })}
                              </span>
                              <span>•</span>
                              <span>Cohort: <strong className="text-slate-600">{msg.audience}</strong></span>
                              <span>•</span>
                              <span>By <strong className="text-slate-600">{msg.author}</strong></span>
                            </div>
                          </div>

                          {/* Right mini metrics & actions */}
                          <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                            {/* Audience */}
                            <div className="w-16 text-left hidden sm:block">
                              <span className="text-[9px] font-bold uppercase text-slate-400">Audience</span>
                              <div className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                                <Users size={11} className="text-slate-400" />
                                <span>{msg.recipients}</span>
                              </div>
                            </div>

                            {/* Delivery progress */}
                            <div className="w-24 text-left">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-slate-400">Delivery</span>
                                <span className="font-extrabold text-emerald-600">{deliveryPercent}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${deliveryPercent}%` }}
                                />
                              </div>
                            </div>

                            {/* Open progress */}
                            <div className="w-24 text-left">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-slate-400">Opened</span>
                                <span className="font-extrabold text-indigo-600">{openPercent}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                <div 
                                  className="h-full bg-indigo-500 rounded-full"
                                  style={{ width: `${openPercent}%` }}
                                />
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1 pl-1">
                              <button
                                type="button"
                                onClick={(e) => handleDuplicateBroadcast(msg, e)}
                                title="Duplicate in composer"
                                className="h-8 px-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-600 hover:text-indigo-600 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              >
                                <Copy size={11} />
                                <span className="hidden sm:inline">Duplicate</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleDeleteHistoryItem(msg.id, e)}
                                title="Delete record"
                                className="h-8 w-8 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              >
                                <Trash2 size={12} />
                              </button>

                              <button
                                type="button"
                                onClick={() => openDrawer(msg)}
                                title="Inspect details"
                                className="h-8 px-2.5 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              >
                                <Eye size={11} />
                                <span>Details</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ─── BRAND FOOTER (PINS AT BOTTOM OF SCROLLABLE BODY) ─── */}
        <BrandFooter />
      </div>

      {/* ─── SLIDE-OVER BROADCAST DETAILS DRAWER ─── */}
        <AnimatePresence>
          {drawerOpen && selectedHistoryItem && (
            <motion.div
              key="drawer-overlay"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex justify-end"
            >
              <div 
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" 
                onClick={() => setDrawerOpen(false)} 
              />
              <motion.div
                initial={{ x: "100%" }} 
                animate={{ x: 0 }} 
                exit={{ x: "100%" }} 
                transition={{ type: "spring", damping: 30, stiffness: 240 }}
                className="relative h-full w-full max-w-[540px] bg-white shadow-2xl flex flex-col overflow-hidden rounded-l-2xl z-10"
              >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/60 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
                        {selectedHistoryItem.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                        selectedHistoryItem.status === "sent" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {selectedHistoryItem.status === "sent" ? "Delivered" : "Scheduled"}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">
                        {selectedHistoryItem.id}
                      </span>
                    </div>

                    <h2 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                      {selectedHistoryItem.title}
                    </h2>

                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-medium">
                      <Calendar size={11} />
                      <span>{new Date(selectedHistoryItem.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                      <span>•</span>
                      <span>Author: <strong className="text-slate-700">{selectedHistoryItem.author}</strong></span>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => setDrawerOpen(false)} 
                    className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                  
                  {/* Metrics Grid */}
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                      Delivery Analytics
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                        <span className="text-[10px] font-bold uppercase text-emerald-800">Delivered</span>
                        <strong className="text-2xl font-black text-emerald-700 block mt-0.5">
                          {selectedHistoryItem.delivered}
                        </strong>
                        <span className="text-[10px] text-emerald-600 font-medium">
                          {selectedHistoryItem.recipients > 0 ? Math.round((selectedHistoryItem.delivered / selectedHistoryItem.recipients) * 100) : 0}% success rate
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
                        <span className="text-[10px] font-bold uppercase text-indigo-800">Opened</span>
                        <strong className="text-2xl font-black text-indigo-700 block mt-0.5">
                          {selectedHistoryItem.opened}
                        </strong>
                        <span className="text-[10px] text-indigo-600 font-medium">
                          {selectedHistoryItem.delivered > 0 ? Math.round((selectedHistoryItem.opened / selectedHistoryItem.delivered) * 100) : 0}% open rate
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Total Recipients</span>
                        <strong className="text-2xl font-black text-slate-800 block mt-0.5">
                          {selectedHistoryItem.recipients}
                        </strong>
                        <span className="text-[10px] text-slate-400 font-medium truncate block">
                          {selectedHistoryItem.audience}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Link Clicks</span>
                        <strong className="text-2xl font-black text-slate-800 block mt-0.5">
                          {selectedHistoryItem.clicked || 0}
                        </strong>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Direct CTA interactions
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Channels & Audience */}
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                      Dispatch Configuration
                    </span>
                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <span className="font-medium text-slate-500">Audience Cohort</span>
                        <span className="font-bold text-slate-800 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                          {selectedHistoryItem.audience}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <span className="font-medium text-slate-500">Dispatched Rails</span>
                        <div className="flex gap-1">
                          {(selectedHistoryItem.channels || []).map(chId => {
                            const ch = CHANNELS.find(c => c.id === chId);
                            if (!ch) return null;
                            return (
                              <span 
                                key={chId} 
                                style={{
                                  backgroundColor: `${ch.accentColor}15`,
                                  color: ch.accentColor,
                                  borderColor: `${ch.accentColor}30`
                                }}
                                className="px-2 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1"
                              >
                                <ch.icon size={11} strokeWidth={2.4} />
                                <span>{ch.label}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dispatched Content */}
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                      Dispatched Message Body
                    </span>
                    <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-2">
                      <div className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-200/60">
                        {selectedHistoryItem.title}
                      </div>
                      <p className="text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedHistoryItem.preview}
                      </p>
                    </div>
                  </div>

                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-slate-100 bg-white flex items-center gap-2.5">
                  <button 
                    type="button"
                    onClick={(e) => handleDuplicateBroadcast(selectedHistoryItem, e)}
                    className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98 transition-all"
                  >
                    <Copy size={13} /> 
                    <span>Duplicate in Composer</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteHistoryItem(selectedHistoryItem.id, e)}
                    className="h-10 px-3.5 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-bold transition-all cursor-pointer"
                    title="Delete record"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </LocalErrorBoundary>
  );
};

// ─────────────────────────────────────────
// MOUNTING
// ─────────────────────────────────────────

export const mountSendNotification = () => {
  const container = document.querySelector('[data-stage="notify-members"]');
  if (!container) return null;
  
  container.innerHTML = "";
  
  try {
    const root = createRoot(container);
    root.render(<SendNotification />);
    return root;
  } catch (err) {
    container.innerHTML = `<div style='color: red; padding: 20px;'>Render Error: ${err.message}</div>`;
    return null;
  }
};

export default SendNotification;
