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
        <div className="p-10 bg-rose-50 border border-rose-100 rounded-[32px] text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Bug size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">View Render Failed</h2>
          <p className="text-sm font-bold text-slate-500 mt-2 max-w-md mx-auto">
            An internal error occurred while rendering this section. Our team has been notified.
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            Try Refreshing View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────
// CONSTANTS & MOCK DATA
// ─────────────────────────────────────────

const KPIS = [
  { id: 1, label: "Sent Today", value: "1,248", trend: "+12.5%", isUp: true, icon: Send, color: "bg-indigo-600" },
  { id: 3, label: "Scheduled", value: "34", trend: "-2", isUp: false, icon: Calendar, color: "bg-amber-500" },
  { id: 4, label: "Active Campaigns", value: "3", trend: "Stable", isUp: true, icon: Megaphone, color: "bg-blue-500" }
];

const NOTIFICATION_TYPES = [
  { id: "announcement", label: "Announcement", icon: Megaphone },
  { id: "reminder", label: "Reminder", icon: Clock },
  { id: "payment", label: "Payment Alert", icon: CreditCard },
  { id: "pt", label: "PT Reminder", icon: CalendarCheck },
  { id: "promo", label: "Promo Campaign", icon: Zap },
  { id: "emergency", label: "Emergency Alert", icon: AlertTriangle }
];

const CHANNELS = [
  { 
    id: "whatsapp", 
    label: "WhatsApp", 
    icon: MessageCircle, 
    color: "bg-emerald-500",
    accentColor: "#10b981",
    glow: "rgba(16, 185, 129, 0.20)"
  },
  { 
    id: "sms", 
    label: "SMS", 
    icon: Smartphone, 
    color: "bg-amber-500",
    accentColor: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.20)"
  },
  { 
    id: "email", 
    label: "Email", 
    icon: Mail, 
    color: "bg-blue-500",
    accentColor: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.20)"
  },
  { 
    id: "push", 
    label: "App Push", 
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
  { id: "expiring", label: "Expiring Memberships" },
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

const MOCK_HISTORY = [
  {
    id: "MSG-101",
    title: "Morning Yoga Session Update",
    type: "Announcement",
    preview: "Hi {member_name}, tomorrow's 7 AM yoga session will be held outdoors by the poolside. Please bring your yoga mat and water bottle. See you there!",
    recipients: 142,
    delivered: 138,
    opened: 92,
    clicked: 45,
    channels: ["push", "sms"],
    status: "sent",
    timestamp: "2026-05-20T08:30:00",
    author: "Admin",
    audience: "Morning Batch"
  },
  {
    id: "MSG-102",
    title: "Membership Renewal Reminder",
    type: "Payment Alert",
    preview: "Your GymDeck membership is expiring in 3 days. Renew now before the deadline to retain your current fee lock and avoid uninterrupted gym access.",
    recipients: 18,
    delivered: 18,
    opened: 15,
    clicked: 12,
    channels: ["whatsapp"],
    status: "sent",
    timestamp: "2026-05-19T10:15:00",
    author: "System Automation",
    audience: "Expiring Memberships"
  },
  {
    id: "MSG-103",
    title: "New HIIT Intensive Batch Launch",
    type: "Promo Campaign",
    preview: "We are excited to announce a new High-Intensity Interval Training batch starting next Monday with Coach Alex. Limited 20 slots available, claim yours today!",
    recipients: 428,
    delivered: 0,
    opened: 0,
    clicked: 0,
    channels: ["email", "push"],
    status: "scheduled",
    timestamp: "2026-05-22T09:00:00",
    author: "Owner",
    audience: "All Active Members"
  },
  {
    id: "MSG-104",
    title: "Facility Electrical Maintenance Notice",
    type: "Emergency Alert",
    preview: "Please note that the main gym weight training area will remain closed today from 2 PM to 5 PM for urgent power transformer servicing. Steam & cardio remain open.",
    recipients: 428,
    delivered: 425,
    opened: 310,
    clicked: 0,
    channels: ["sms", "push", "whatsapp"],
    status: "sent",
    timestamp: "2026-05-15T14:20:00",
    author: "Branch Manager",
    audience: "All Members"
  },
  {
    id: "MSG-105",
    title: "Weekend CrossFit Challenge & Nutrition Workshop",
    type: "Announcement",
    preview: "Join our masterclass this Saturday at 11 AM with certified sports nutritionists. Exclusive GymDeck starter kits for the top 3 challenge finishers!",
    recipients: 210,
    delivered: 206,
    opened: 144,
    clicked: 68,
    channels: ["whatsapp", "email"],
    status: "sent",
    timestamp: "2026-05-10T16:45:00",
    author: "Admin",
    audience: "Active Members"
  },
  {
    id: "MSG-106",
    title: "Pending Fee Clearance Notice",
    type: "Payment Alert",
    preview: "Dear {member_name}, your membership subscription invoice for this month is overdue. Please settle through UPI or visit the reception counter by Friday to avoid late fees.",
    recipients: 34,
    delivered: 34,
    opened: 29,
    clicked: 19,
    channels: ["whatsapp", "sms"],
    status: "sent",
    timestamp: "2026-05-04T11:00:00",
    author: "Accounts Desk",
    audience: "Pending Dues"
  }
];

// ─────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────

const KPICard = ({ title, value, trend, isUp, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white px-4 py-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between group hover:border-slate-300 transition-all cursor-default"
  >
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl ${color} bg-opacity-10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
        {Icon && <Icon size={16} className={color.replace("bg-", "text-")} />}
      </div>
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 block leading-tight">
          {title}
        </span>
        <strong className="text-xl font-black text-slate-900 leading-tight block mt-0.5">
          {value}
        </strong>
      </div>
    </div>
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
      trend.toLowerCase() === "stable" 
        ? "bg-slate-50 text-slate-600 border border-slate-200/60" 
        : isUp 
          ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
          : "bg-rose-50 text-rose-600 border border-rose-100"
    }`}>
      {trend.toLowerCase() === "stable" ? (
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      ) : isUp ? (
        <TrendingUp size={11} strokeWidth={2.5} />
      ) : (
        <TrendingDown size={11} strokeWidth={2.5} />
      )}
      <span>{trend}</span>
    </div>
  </motion.div>
);

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────

const SendNotification = () => {
  const [activeTab, setActiveTab] = useState("composer"); // composer | history
  const [selectedType, setSelectedType] = useState("announcement");
  const [selectedChannels, setSelectedChannels] = useState(["push"]);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [scheduleType, setScheduleType] = useState("now"); // 'now' | 'later' | 'recurring'
  const [scheduleDropdownOpen, setScheduleDropdownOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // default to tomorrow
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
  const fileInputRef = React.useRef(null);

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

  const insertVariable = (token) => {
    setMessageContent(prev => {
      if (!prev) return token;
      return prev.endsWith(" ") ? prev + token : prev + " " + token;
    });
  };

  // Calendar days generator for current calendarMonth
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

  // Recipient Selection State - default is empty (0 members selected by default)
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
              photo: m.profile_photo_path || m.photo_url || m.photoUrl || m.image || (window.getDefaultAvatar ? window.getDefaultAvatar(m.gender, m.full_name || m.name) : null),
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
    }, 1500);
  };

  const openDrawer = (item) => {
    setSelectedHistoryItem(item);
    setDrawerOpen(true);
  };

  return (
    <LocalErrorBoundary>
      <div className="notify-members-shell font-sans text-slate-900 selection:bg-indigo-100">
      {/* 5. TOP UTILITY HEADER */}
      <header className="relative z-50 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-slate-400" />
            <span>Communication</span>
          </div>
          <ChevronRight size={14} className="opacity-40" />
          <span className="text-slate-900 font-bold font-sans">Send Notification</span>
        </div>

        <div className="flex-1 max-w-md mx-6 relative group hidden md:block">
          <div className="relative flex items-center w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 group-focus-within:scale-120 group-focus-within:rotate-[-8deg] transition-all duration-300 ease-out z-10">
              <Search size={15} strokeWidth={2.4} />
            </div>
            <input
              type="text"
              placeholder="Search templates, campaigns, member groups..."
              className="search-field-animated w-full h-10 pl-10 pr-12 bg-slate-100/90 hover:bg-slate-100 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-medium"
            />
            <div className="absolute right-2.5 flex items-center pointer-events-none z-10">
              <kbd className="h-5 px-1.5 flex items-center justify-center text-[10px] font-mono font-bold rounded bg-white/90 text-slate-400 border border-slate-200/80 shadow-2xs group-focus-within:border-indigo-300 group-focus-within:text-indigo-600 group-focus-within:bg-indigo-50 group-focus-within:scale-105 transition-all duration-200">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <div className="flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
            <button 
              onClick={() => setActiveTab("composer")}
              className={`h-8 px-3.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "composer" 
                  ? "bg-white text-slate-900 shadow-xs font-black" 
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Send size={13} strokeWidth={activeTab === "composer" ? 2.2 : 1.75} className={activeTab === "composer" ? "text-indigo-600" : "text-slate-400"} />
              <span>Composer</span>
            </button>
            <button 
              onClick={() => setActiveTab("history")}
              className={`h-8 px-3.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "history" 
                  ? "bg-white text-slate-900 shadow-xs font-black" 
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <HistoryIcon size={13} strokeWidth={activeTab === "history" ? 2.2 : 1.75} className={activeTab === "history" ? "text-indigo-600" : "text-slate-400"} />
              <span>History</span>
            </button>
          </div>
        </div>
      </header>

      {/* 6. PAGE TITLE */}
      <div className="mb-6 relative z-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Communication Center</h1>
          <p className="text-slate-500 text-xs font-medium mt-2 max-w-[640px]">
            Broadcast announcements, reminders, alerts, campaigns, and operational communications across your fitness ecosystem.
          </p>
        </motion.div>
      </div>

      {/* 7. KPI ANALYTICS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5 relative z-10">
        {KPIS.map((kpi, idx) => (
          <KPICard key={kpi.id} title={kpi.label} value={kpi.value} trend={kpi.trend} isUp={kpi.isUp} icon={kpi.icon} color={kpi.color} delay={idx * 0.05} />
        ))}
      </div>

      <div className="notify-members-workspace">

        {/* 8. MASTER PAGE STRUCTURE */}
        <div className="w-full">
          <LocalErrorBoundary>
            <AnimatePresence mode="wait">
                {activeTab === "composer" ? (
                  <motion.div
                    key="composer"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden"
                  >
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight mb-1">Notification Composer</h2>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Create and Configure Broadcast</span>
                      </div>
                    </div>

                    <div className="p-8 space-y-10">
                      
                      {/* SECTION 1: NOTIFICATION TYPE */}
                      <section>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4">1. Notification Type</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                          {NOTIFICATION_TYPES.map(type => (
                            <button
                              key={type.id}
                              onClick={() => setSelectedType(type.id)}
                              className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                                selectedType === type.id 
                                  ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm" 
                                  : "bg-white border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-slate-50"
                              }`}
                            >
                              <type.icon size={20} className="mb-2" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-center">{type.label}</span>
                            </button>
                          ))}
                        </div>
                      </section>

                      {/* SECTION 2: RECIPIENT SELECTION */}
                      <section className="space-y-3">
                        {/* Header & Selection Stats */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">2. Recipient Selection</span>
                            <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono border border-slate-200/60">
                              {membersList.length} in directory
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* 0 Members Selected / N Selected Visual Badge */}
                            <div 
                              style={{
                                border: selectedMemberIds.length > 0 ? "1px solid #4f46e5" : "1px solid #e2e8f0",
                                backgroundColor: selectedMemberIds.length > 0 ? "#4f46e5" : "#f8fafc"
                              }}
                              className={`h-9 px-3.5 rounded-xl flex items-center gap-2 text-xs transition-all shadow-2xs ${
                                selectedMemberIds.length > 0 
                                  ? "text-white font-black shadow-xs" 
                                  : "text-slate-600 font-bold"
                              }`}
                            >
                              {selectedMemberIds.length > 0 ? (
                                <UserCheck size={15} className="text-white" strokeWidth={2.5} />
                              ) : (
                                <Users size={15} className="text-slate-400" strokeWidth={2} />
                              )}
                              <span>
                                {selectedMemberIds.length === 0
                                  ? "0 Members Selected"
                                  : selectedMemberIds.length === membersList.length && membersList.length > 0
                                    ? `All ${membersList.length} Selected`
                                    : `${selectedMemberIds.length} Members Selected`}
                              </span>
                            </div>

                            {/* Select All (N) / Deselect All Action Button */}
                            <button
                              type="button"
                              onClick={toggleSelectAllFiltered}
                              style={{
                                border: isAllFilteredSelected ? "1px solid #0f172a" : "1px solid #cbd5e1",
                                backgroundColor: isAllFilteredSelected ? "#0f172a" : "#ffffff"
                              }}
                              className={`h-9 px-4 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 group ${
                                isAllFilteredSelected
                                  ? "text-white hover:opacity-90"
                                  : "text-slate-800 hover:text-indigo-600 hover:border-indigo-400"
                              }`}
                            >
                              <CheckCheck size={15} strokeWidth={2.4} className={isAllFilteredSelected ? "text-indigo-400" : "text-slate-400 group-hover:text-indigo-600"} />
                              <span>{isAllFilteredSelected ? "Deselect All" : `Select All (${filteredMembers.length})`}</span>
                            </button>
                          </div>
                        </div>

                        {/* Search Input Bar */}
                        <div className="relative flex items-center w-full group">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 group-focus-within:scale-120 group-focus-within:rotate-[-8deg] transition-all duration-300 ease-out z-10">
                            <Search size={16} strokeWidth={2.4} />
                          </div>
                          <input
                            type="text"
                            value={recipientSearch}
                            onChange={(e) => setRecipientSearch(e.target.value)}
                            placeholder="Search member name, ID (e.g. MBR-0211), phone, or plan..."
                            className="search-field-animated w-full h-11 pl-10 pr-12 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400"
                          />
                          {recipientSearch ? (
                            <button
                              type="button"
                              onClick={() => setRecipientSearch("")}
                              className="absolute right-3 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer z-10"
                              title="Clear search"
                            >
                              <X size={14} />
                            </button>
                          ) : (
                            <span className="absolute right-3 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-slate-400 bg-white border border-slate-200/80 shadow-2xs pointer-events-none group-focus-within:border-indigo-300 group-focus-within:text-indigo-600 group-focus-within:bg-indigo-50 group-focus-within:scale-105 transition-all duration-200 z-10">
                              /
                            </span>
                          )}
                        </div>

                        {/* Segment Filter Preset Chips (Morning Batch removed, height increased) */}
                        <div className="flex flex-wrap items-center gap-2">
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
                                style={{
                                  border: isActive ? "1.5px solid #0f172a" : "1px solid #cbd5e1",
                                  backgroundColor: isActive ? "#0f172a" : "#ffffff"
                                }}
                                className={`h-9.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98 ${
                                  isActive
                                    ? "text-white shadow-xs font-black"
                                    : "text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300"
                                }`}
                              >
                                <span>{chip.label}</span>
                                <span 
                                  style={{
                                    backgroundColor: isActive ? "rgba(255, 255, 255, 0.2)" : "#f1f5f9",
                                    color: isActive ? "#ffffff" : "#475569",
                                    border: isActive ? "none" : "1px solid #e2e8f0"
                                  }}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono"
                                >
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Elevated Member Directory List with Table-like Alignment */}
                        <div className="border border-slate-200/90 rounded-2xl bg-white shadow-2xs overflow-hidden">
                          {/* List Sub-header with column alignment */}
                          <div className="bg-slate-50/90 border-b border-slate-100 px-4 py-2.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span>Member Details</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 font-mono font-bold">{filteredMembers.length} listed</span>
                            </div>
                            <div className="w-36 hidden md:block text-left text-slate-400">Phone</div>
                            <div className="w-32 hidden md:block text-left text-slate-400">Plan</div>
                            <div className="w-28 text-center text-slate-400">Status</div>
                            <div className="w-24 text-right font-mono text-slate-500">
                              {filteredMembers.filter(m => selectedMemberIds.includes(m.id)).length}/{filteredMembers.length} Sel
                            </div>
                          </div>

                          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                            {filteredMembers.length === 0 ? (
                              <div className="py-10 text-center text-slate-400">
                                <Users size={26} className="mx-auto mb-2 opacity-30" />
                                <p className="text-xs font-semibold text-slate-600">No members match your search or filter</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Try searching with a different name, phone, or clear filters</p>
                                <button
                                  type="button"
                                  onClick={() => { setRecipientSearch(""); setActiveSegment("all"); }}
                                  className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                                >
                                  Reset Search Filters
                                </button>
                              </div>
                            ) : (
                              filteredMembers.map((m) => {
                                const isSelected = selectedMemberIds.includes(m.id);
                                const initials = (m.name || "M").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

                                return (
                                  <div
                                    key={m.id}
                                    onClick={() => toggleMemberSelection(m.id)}
                                    className={`px-4 py-3 flex items-center justify-between transition-all cursor-pointer select-none group ${
                                      isSelected
                                        ? "bg-indigo-50/40 hover:bg-indigo-50/70"
                                        : "bg-white hover:bg-slate-50/80"
                                    }`}
                                  >
                                    {/* Left Column: Check Button + Profile Pic + Name + ID */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                                      {/* Check Button beside each member with guaranteed pure white tick mark */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleMemberSelection(m.id);
                                        }}
                                        style={{
                                          border: isSelected ? "2px solid #4f46e5" : "2px solid #94a3b8",
                                          backgroundColor: isSelected ? "#4f46e5" : "#ffffff",
                                          color: "#ffffff"
                                        }}
                                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs hover:scale-110 active:scale-95"
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
                                            style={{ stroke: "#ffffff", color: "#ffffff" }}
                                            stroke="#ffffff" 
                                            strokeWidth="3.5" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round"
                                            className="shrink-0 text-white"
                                          >
                                            <polyline points="20 6 9 17 4 12" style={{ stroke: "#ffffff" }} />
                                          </svg>
                                        )}
                                      </button>

                                      {/* Member Profile Photo (fallback to initials if unavailable) */}
                                      <div 
                                        style={{
                                          border: isSelected ? "1.5px solid #4f46e5" : "1px solid #cbd5e1",
                                          backgroundColor: isSelected ? "#eef2ff" : "#f1f5f9"
                                        }}
                                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-2xs overflow-hidden relative"
                                      >
                                        {m.photo ? (
                                          <img 
                                            src={m.photo} 
                                            alt={m.name} 
                                            className="w-full h-full object-cover" 
                                            onError={(e) => {
                                              e.currentTarget.style.display = "none";
                                              const fallback = e.currentTarget.parentElement?.querySelector(".avatar-fallback");
                                              if (fallback) fallback.classList.remove("hidden");
                                            }}
                                          />
                                        ) : null}
                                        <span className={`avatar-fallback text-[11px] font-black ${m.photo ? "hidden" : "block"} ${isSelected ? "text-indigo-600" : "text-slate-700"}`}>
                                          {initials}
                                        </span>
                                      </div>

                                      {/* Member Name and Monospace ID */}
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className={`text-xs font-black truncate transition-colors ${
                                            isSelected ? "text-indigo-950" : "text-slate-900 group-hover:text-indigo-600"
                                          }`}>
                                            {m.name}
                                          </span>
                                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                            {m.id}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium md:hidden mt-0.5">
                                          <span>{m.phone}</span>
                                          <span className="text-slate-300">•</span>
                                          <span>{m.plan}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Phone Column (desktop) */}
                                    <div className="w-36 hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-600 font-mono shrink-0">
                                      <Phone size={12} className="text-slate-400 shrink-0" />
                                      <span className="truncate">{m.phone}</span>
                                    </div>

                                    {/* Plan Column (desktop) */}
                                    <div className="w-32 hidden md:flex items-center shrink-0 pr-2">
                                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/60 truncate max-w-full">
                                        {m.plan}
                                      </span>
                                    </div>

                                    {/* Status Column */}
                                    <div className="w-28 flex items-center justify-center shrink-0">
                                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border ${
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

                                    {/* Action Column */}
                                    <div className="w-24 flex items-center justify-end shrink-0 pl-2">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleMemberSelection(m.id);
                                        }}
                                        style={{
                                          border: isSelected ? "1px solid #4f46e5" : "1px solid #cbd5e1",
                                          backgroundColor: isSelected ? "#4f46e5" : "#ffffff"
                                        }}
                                        className={`h-7 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                                          isSelected
                                            ? "text-white hover:opacity-90"
                                            : "text-slate-600 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/40"
                                        }`}
                                      >
                                        {isSelected ? (
                                          <>
                                            <Check size={11} strokeWidth={3} className="text-white" />
                                            <span>Selected</span>
                                          </>
                                        ) : (
                                          <>
                                            <Plus size={11} strokeWidth={2.5} className="text-slate-400" />
                                            <span>Select</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </section>

                      {/* SECTION 4: DELIVERY CHANNELS */}
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            3. Delivery Channels
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {selectedChannels.length} active
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {CHANNELS.map(ch => {
                            const isSelected = selectedChannels.includes(ch.id);
                            return (
                              <motion.button
                                key={ch.id}
                                type="button"
                                onClick={() => toggleChannel(ch.id)}
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ duration: 0.12 }}
                                style={{
                                  border: isSelected ? `1.5px solid ${ch.accentColor}` : "1px solid #e2e8f0",
                                  backgroundColor: isSelected ? "#ffffff" : "#f8fafc",
                                  boxShadow: isSelected 
                                    ? `0 4px 12px -2px ${ch.glow}, 0 1px 2px rgba(0, 0, 0, 0.04)` 
                                    : "none"
                                }}
                                className="h-12 px-3.5 rounded-xl flex items-center justify-between gap-2.5 transition-all duration-150 cursor-pointer group select-none"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div 
                                    className="w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                                    style={{
                                      backgroundColor: isSelected ? ch.accentColor : "#ffffff",
                                      border: isSelected ? `1px solid ${ch.accentColor}` : "1px solid #e2e8f0"
                                    }}
                                  >
                                    <ch.icon 
                                      size={14} 
                                      strokeWidth={isSelected ? 2.5 : 2} 
                                      style={{ stroke: isSelected ? "#ffffff" : "#64748b" }} 
                                    />
                                  </div>
                                  <span className={`text-xs font-bold truncate transition-colors ${
                                    isSelected ? "text-slate-900 font-extrabold" : "text-slate-700 group-hover:text-slate-900"
                                  }`}>
                                    {ch.label}
                                  </span>
                                </div>

                                <div 
                                  className="w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 transition-all"
                                  style={{
                                    backgroundColor: isSelected ? ch.accentColor : "#ffffff",
                                    border: isSelected ? `1px solid ${ch.accentColor}` : "1.5px solid #cbd5e1"
                                  }}
                                >
                                  {isSelected ? (
                                    <Check size={10} strokeWidth={3.5} style={{ stroke: "#ffffff" }} />
                                  ) : null}
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </section>

                      {/* SECTION 4: MESSAGE COMPOSER */}
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            4. Message Composer
                          </span>
                          <div className="flex items-center gap-2.5 text-[10px] font-semibold text-slate-400">
                            <span>{messageContent.length} characters</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span>{Math.max(1, Math.ceil((messageContent.length || 1) / 160))} SMS part(s)</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {/* Title Input */}
                          <div className="relative flex items-center w-full group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10">
                              <Type size={15} strokeWidth={2.2} />
                            </div>
                            <input
                              type="text"
                              placeholder="Notification Title / Subject (e.g. Schedule Update, Fee Due Alert)"
                              className="search-field-animated w-full h-11 pl-10 pr-20 bg-slate-50 hover:bg-slate-100/60 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                              value={messageTitle}
                              maxLength={100}
                              onChange={(e) => setMessageTitle(e.target.value)}
                            />
                            <div className="absolute right-3 text-[10px] font-bold text-slate-400 pointer-events-none z-10">
                              {messageTitle.length}/100
                            </div>
                          </div>

                          {/* Message Body with Variable Tag Toolbar */}
                          <div className="border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden focus-within:border-indigo-500 focus-within:ring-3 focus-within:ring-indigo-500/10 transition-all">
                            <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                                  Insert Tag:
                                </span>
                                {[
                                  { token: "{member_name}", label: "Member Name" },
                                  { token: "{membership_expiry}", label: "Expiry Date" },
                                  { token: "{pending_amount}", label: "Pending Due" },
                                  { token: "{trainer_name}", label: "Trainer Name" },
                                  { token: "{gym_name}", label: "Gym Name" }
                               ].map(item => (
                                  <button
                                    key={item.token}
                                    type="button"
                                    onClick={() => insertVariable(item.token)}
                                    className="h-6 px-2 rounded-md bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-[10px] font-bold text-slate-600 hover:text-indigo-600 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                                    title={`Insert ${item.token}`}
                                  >
                                    <Plus size={9} strokeWidth={2.5} className="text-indigo-500" />
                                    <span>{item.label}</span>
                                  </button>
                                ))}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setMessageContent(prev => prev ? prev + " *bold text*" : "*bold text*")}
                                  className="h-6 px-2 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-[10px] font-black transition-colors cursor-pointer shadow-2xs"
                                  title="Add Bold format"
                                >
                                  B
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMessageContent(prev => prev ? prev + "\n• " : "• ")}
                                  className="h-6 px-2 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                                  title="Add Bullet list"
                                >
                                  • list
                                </button>
                                {messageContent && (
                                  <button
                                    type="button"
                                    onClick={() => setMessageContent("")}
                                    className="h-6 px-2 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-[10px] font-bold transition-colors cursor-pointer ml-1"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            </div>

                            <textarea
                              rows={4}
                              placeholder="Type broadcast message here... Use variable tags above to personalize for each recipient automatically."
                              className="w-full p-3.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
                              value={messageContent}
                              onChange={(e) => setMessageContent(e.target.value)}
                            />
                          </div>
                        </div>
                      </section>

                      {/* SECTION 5 & 6: SCHEDULING & ATTACHMENTS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* SCHEDULING CARD */}
                        <section className="p-4.5 bg-slate-50/70 rounded-2xl border border-slate-200 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                  <Calendar size={14} strokeWidth={2.4} />
                                </div>
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 block leading-none">Scheduling</span>
                                  <span className="text-[9px] font-medium text-slate-400">Dispatch timing & automation</span>
                                </div>
                              </div>
                              {scheduleType === "later" && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                                  Scheduled
                                </span>
                              )}
                            </div>

                            {/* Custom Dropdown */}
                            <div className="relative mb-3">
                              <button
                                type="button"
                                onClick={() => setScheduleDropdownOpen(prev => !prev)}
                                className="w-full h-10 px-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                              >
                                <div className="flex items-center gap-2">
                                  {scheduleType === "now" && <Zap size={13} className="text-amber-500" />}
                                  {scheduleType === "later" && <Clock size={13} className="text-indigo-600" />}
                                  {scheduleType === "recurring" && <Repeat size={13} className="text-emerald-600" />}
                                  <span>
                                    {scheduleType === "now" && "Send Immediately"}
                                    {scheduleType === "later" && "Schedule for Later (Date & Time)"}
                                    {scheduleType === "recurring" && "Recurring Broadcast"}
                                  </span>
                                </div>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${scheduleDropdownOpen ? "rotate-180" : ""}`} />
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
                                      { id: "now", label: "Send Immediately", desc: "Broadcast live right after launching", icon: Zap, iconColor: "text-amber-500" },
                                      { id: "later", label: "Schedule for Later", desc: "Pick calendar date & delivery time", icon: Clock, iconColor: "text-indigo-600" },
                                      { id: "recurring", label: "Recurring Broadcast", desc: "Automate daily, weekly, or monthly", icon: Repeat, iconColor: "text-emerald-600" }
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
                                        <div className="flex items-center gap-2.5">
                                          <opt.icon size={14} className={opt.iconColor} />
                                          <div>
                                            <div className="text-xs font-bold leading-tight">{opt.label}</div>
                                            <div className="text-[10px] text-slate-400 font-normal">{opt.desc}</div>
                                          </div>
                                        </div>
                                        {scheduleType === opt.id && <Check size={13} strokeWidth={3} className="text-indigo-600" />}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Conditional Display: Calendar Module when scheduleType === 'later' */}
                            {scheduleType === "later" && (
                              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5">
                                {/* Month Header */}
                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                                    className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                                    title="Previous Month"
                                  >
                                    <ChevronLeft size={13} />
                                  </button>

                                  <span className="text-xs font-extrabold text-slate-800">
                                    {calendarMonth.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                                    className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                                    title="Next Month"
                                  >
                                    <ChevronRight size={13} />
                                  </button>
                                </div>

                                {/* Weekday names */}
                                <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase text-slate-400">
                                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => (
                                    <span key={w}>{w}</span>
                                  ))}
                                </div>

                                {/* Days 7-col grid */}
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
                                        className={`h-6 rounded-md text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                                          !item.isCurrentMonth
                                            ? "text-slate-300 opacity-40 cursor-not-allowed"
                                            : item.isPast
                                              ? "text-slate-300 line-through cursor-not-allowed"
                                              : isCurrentSelected
                                                ? "bg-indigo-600 text-white font-black shadow-xs"
                                                : item.isToday
                                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                                                  : "text-slate-700 hover:bg-slate-100"
                                        }`}
                                      >
                                        {item.day}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Time Selection */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                    <Clock size={12} className="text-slate-400" />
                                    <span>Time:</span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <select
                                      value={selectedTimeHour}
                                      onChange={(e) => setSelectedTimeHour(e.target.value)}
                                      className="h-6 px-1.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-bold text-slate-800 cursor-pointer focus:outline-none"
                                    >
                                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(h => (
                                        <option key={h} value={h}>{h}</option>
                                      ))}
                                    </select>
                                    <span className="text-slate-400 text-xs font-bold">:</span>
                                    <select
                                      value={selectedTimeMinute}
                                      onChange={(e) => setSelectedTimeMinute(e.target.value)}
                                      className="h-6 px-1.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-bold text-slate-800 cursor-pointer focus:outline-none"
                                    >
                                      {['00', '15', '30', '45'].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTimePeriod(prev => prev === "AM" ? "PM" : "AM")}
                                      className="h-6 px-1.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-extrabold cursor-pointer hover:bg-indigo-100 transition-colors"
                                    >
                                      {selectedTimePeriod}
                                    </button>
                                  </div>
                                </div>

                                {/* Confirmation pill */}
                                <div className="p-1.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-[10px] text-indigo-800 font-semibold flex items-center gap-1.5">
                                  <CalendarCheck size={11} className="text-indigo-600 shrink-0" />
                                  <span className="truncate">
                                    {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {selectedTimeHour}:{selectedTimeMinute} {selectedTimePeriod} IST
                                  </span>
                                </div>
                              </div>
                            )}

                            {scheduleType === "recurring" && (
                              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 text-xs">
                                <span className="text-[10px] font-bold text-slate-500 block">Frequency:</span>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {[
                                    { id: "daily", label: "Daily 9 AM" },
                                    { id: "weekly", label: "Weekly Mon" },
                                    { id: "monthly", label: "Monthly 1st" },
                                    { id: "expiry", label: "On Expiry Day" }
                                  ].map(f => (
                                    <button
                                      key={f.id}
                                      type="button"
                                      onClick={() => setRecurringFrequency(f.id)}
                                      className={`h-8 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-between ${
                                        recurringFrequency === f.id
                                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white"
                                      }`}
                                    >
                                      <span>{f.label}</span>
                                      {recurringFrequency === f.id && <Check size={11} strokeWidth={3} className="text-emerald-600" />}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {scheduleType === "now" && (
                              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                  <Zap size={14} />
                                </div>
                                <div className="text-[11px] text-slate-600 font-medium">
                                  Broadcast will dispatch immediately to all selected recipients upon launch.
                                </div>
                              </div>
                            )}
                          </div>
                        </section>

                        {/* ATTACHMENTS CARD */}
                        <section className="p-4.5 bg-slate-50/70 rounded-2xl border border-slate-200 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                  <Paperclip size={14} strokeWidth={2.4} />
                                </div>
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 block leading-none">Media & Attachments</span>
                                  <span className="text-[9px] font-medium text-slate-400">PDFs, images, gym brochures</span>
                                </div>
                              </div>
                              {attachments.length > 0 && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                  {attachments.length} attached
                                </span>
                              )}
                            </div>

                            {/* Hidden File Input */}
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
                              className={`p-3.5 rounded-xl border border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center group ${
                                isDragging 
                                  ? "border-indigo-500 bg-indigo-50/40 scale-[1.01]" 
                                  : "border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/80 shadow-2xs"
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors mb-1">
                                <UploadCloud size={16} strokeWidth={2.2} />
                              </div>
                              <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                Click to upload or drag files here
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                PNG, JPG, PDF up to 10MB each (max 5 files)
                              </div>
                            </div>

                            {/* Attached Files List */}
                            {attachments.length > 0 && (
                              <div className="mt-2.5 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                                {attachments.map(att => (
                                  <div
                                    key={att.id}
                                    className="p-1.5 px-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2 shadow-2xs"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {att.previewUrl ? (
                                        <img src={att.previewUrl} alt={att.name} className="w-7 h-7 rounded object-cover shrink-0 border border-slate-100" />
                                      ) : (
                                        <div className="w-7 h-7 rounded bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                          <FileText size={14} />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                                          {att.name}
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-medium">
                                          {att.formattedSize}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                        Ready
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeAttachment(att.id);
                                        }}
                                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Remove file"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </section>
                      </div>

                    </div>

                    <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                       <p className="text-[10px] font-bold text-slate-400 max-w-xs leading-relaxed">
                         By sending this broadcast, you confirm it complies with anti-spam regulations and gym policies.
                       </p>
                       <button
                         onClick={handleSend}
                         disabled={isSending || !messageTitle || !messageContent || selectedChannels.length === 0 || selectedMemberIds.length === 0}
                         className={`h-14 px-10 rounded-2xl flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl ${
                           isSuccess ? "bg-emerald-500 text-white shadow-emerald-200" :
                           isSending ? "bg-slate-200 text-slate-400 cursor-wait shadow-none" :
                           "bg-[#0F172A] text-white hover:bg-indigo-600 hover:shadow-indigo-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                         }`}
                       >
                         {isSuccess ? <CheckCircle2 size={18} /> : isSending ? <RefreshCcw size={18} className="animate-spin" /> : <Send size={18} />}
                         {isSuccess ? "Broadcasted" : isSending ? "Sending..." : `Launch Broadcast (${selectedMemberIds.length})`}
                       </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden min-h-[700px]"
                  >
                    {/* 1. BROADCAST HISTORY HEADER */}
                    <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5 mb-1">
                          <h2 className="text-xl font-black text-slate-900 tracking-tight">Broadcast History</h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-mono">
                            {historyList.length} Total
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          Audit delivery performance, track member engagement, and review dispatched or scheduled campaigns.
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {/* Export Log CSV Button */}
                        <button
                          type="button"
                          onClick={() => {
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
                          className="h-9 px-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-600 hover:text-slate-900 shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
                          title="Export broadcast log as CSV"
                        >
                          <Download size={14} className="text-slate-400" />
                          <span>Export Log</span>
                        </button>

                        {/* Compose New Broadcast Button */}
                        <button
                          type="button"
                          onClick={() => setActiveTab("composer")}
                          className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
                        >
                          <Plus size={14} strokeWidth={2.5} />
                          <span>New Broadcast</span>
                        </button>
                      </div>
                    </div>

                    {/* 2. SUMMARY METRIC STRIP */}
                    <div className="p-6 border-b border-slate-100 bg-white">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                        <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Broadcasts</span>
                            <MessageSquare size={13} className="text-slate-400" />
                          </div>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-black text-slate-900">{historyStats.total}</span>
                            <span className="text-[10px] font-bold text-slate-400">campaigns</span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Audience Reached</span>
                            <Users size={13} className="text-slate-400" />
                          </div>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-black text-slate-900">{historyStats.totalAudience.toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-slate-400">members</span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Avg. Delivery Rate</span>
                            <CheckCircle2 size={13} className="text-emerald-600" />
                          </div>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-black text-emerald-700">{historyStats.avgDeliveryRate}%</span>
                            <span className="text-[10px] font-bold text-emerald-600/80">delivered</span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800">Avg. Open Rate</span>
                            <Target size={13} className="text-indigo-600" />
                          </div>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-black text-indigo-700">{historyStats.avgOpenRate}%</span>
                            <span className="text-[10px] font-bold text-indigo-600/80">opened</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. SEARCH & FILTER CONTROLS */}
                    <div className="p-5 md:px-8 border-b border-slate-100 bg-slate-50/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                      {/* Search Bar */}
                      <div className="relative flex-1 max-w-md group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                          <Search size={14} strokeWidth={2.4} />
                        </div>
                        <input
                          type="text"
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          placeholder="Search broadcasts by title, content, audience..."
                          className="search-field-animated w-full h-10 pl-10 pr-8 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-medium shadow-2xs"
                        />
                        {historySearch && (
                          <button
                            type="button"
                            onClick={() => setHistorySearch("")}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {/* Filter Chips & Dropdowns */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Tabs */}
                        <div className="flex bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 shadow-2xs">
                          {[
                            { id: "all", label: "All", count: historyList.length },
                            { id: "sent", label: "Delivered", count: historyStats.sentCount },
                            { id: "scheduled", label: "Scheduled", count: historyStats.scheduledCount }
                          ].map(tab => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setHistoryStatusFilter(tab.id)}
                              className={`h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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

                        {/* Custom Channel Filter Dropdown */}
                        <div className="relative" ref={channelDropdownRef}>
                          <button
                            type="button"
                            onClick={() => {
                              setChannelDropdownOpen(prev => !prev);
                              setSortDropdownOpen(false);
                            }}
                            style={{
                              border: channelDropdownOpen ? "1px solid #6366f1" : "1px solid #e2e8f0",
                              backgroundColor: "#ffffff",
                              boxShadow: channelDropdownOpen ? "0 0 0 3px rgba(99, 102, 241, 0.15)" : "none"
                            }}
                            className="h-9 px-3 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer select-none group hover:border-slate-300 shadow-2xs"
                          >
                            {(() => {
                              const activeChan = HISTORY_CHANNEL_OPTIONS.find(c => c.id === historyChannelFilter) || HISTORY_CHANNEL_OPTIONS[0];
                              return (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <activeChan.icon size={13} className={activeChan.color} />
                                    <span>{activeChan.label}</span>
                                  </div>
                                  <ChevronDown 
                                    size={13} 
                                    className={`text-slate-400 transition-transform duration-200 group-hover:text-slate-600 ${
                                      channelDropdownOpen ? "rotate-180 text-indigo-600" : ""
                                    }`} 
                                  />
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
                                transition={{ duration: 0.12 }}
                                style={{
                                  border: "1px solid #e2e8f0",
                                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)"
                                }}
                                className="absolute z-50 top-full right-0 mt-1.5 w-44 bg-white rounded-xl p-1.5 space-y-0.5"
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
                                      className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                                        isSelected 
                                          ? "bg-indigo-50/80 text-indigo-950 font-black" 
                                          : "hover:bg-slate-50 text-slate-700 font-semibold"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className={`w-5 h-5 rounded-md ${opt.bg} flex items-center justify-center shrink-0`}>
                                          <opt.icon size={12} className={opt.color} />
                                        </div>
                                        <span className="text-xs truncate">{opt.label}</span>
                                      </div>
                                      {isSelected && (
                                        <Check size={12} strokeWidth={3} className="text-indigo-600 shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Custom Sort Dropdown */}
                        <div className="relative" ref={sortDropdownRef}>
                          <button
                            type="button"
                            onClick={() => {
                              setSortDropdownOpen(prev => !prev);
                              setChannelDropdownOpen(false);
                            }}
                            style={{
                              border: sortDropdownOpen ? "1px solid #6366f1" : "1px solid #e2e8f0",
                              backgroundColor: "#ffffff",
                              boxShadow: sortDropdownOpen ? "0 0 0 3px rgba(99, 102, 241, 0.15)" : "none"
                            }}
                            className="h-9 px-3 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer select-none group hover:border-slate-300 shadow-2xs"
                          >
                            {(() => {
                              const activeSortObj = HISTORY_SORT_OPTIONS.find(s => s.id === historySort) || HISTORY_SORT_OPTIONS[0];
                              return (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <activeSortObj.icon size={13} className="text-slate-500" />
                                    <span>{activeSortObj.label}</span>
                                  </div>
                                  <ChevronDown 
                                    size={13} 
                                    className={`text-slate-400 transition-transform duration-200 group-hover:text-slate-600 ${
                                      sortDropdownOpen ? "rotate-180 text-indigo-600" : ""
                                    }`} 
                                  />
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
                                transition={{ duration: 0.12 }}
                                style={{
                                  border: "1px solid #e2e8f0",
                                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)"
                                }}
                                className="absolute z-50 top-full right-0 mt-1.5 w-52 bg-white rounded-xl p-1.5 space-y-0.5"
                              >
                                <div className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                  Sort Order
                                </div>
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
                                        isSelected 
                                          ? "bg-indigo-50/80 text-indigo-950 font-black" 
                                          : "hover:bg-slate-50 text-slate-700 font-semibold"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-5 h-5 rounded-md ${isSelected ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"} flex items-center justify-center shrink-0`}>
                                          <opt.icon size={12} />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-xs leading-tight truncate">{opt.label}</div>
                                          <div className="text-[10px] text-slate-400 font-normal leading-tight truncate">{opt.sub}</div>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <Check size={12} strokeWidth={3} className="text-indigo-600 shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* 4. BROADCAST HISTORY LIST */}
                    <div className="divide-y divide-slate-100">
                      {filteredHistoryList.length === 0 ? (
                        <div className="p-16 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <Search size={22} strokeWidth={2} />
                          </div>
                          <h3 className="text-sm font-black text-slate-900">No broadcasts found</h3>
                          <p className="text-xs text-slate-500 font-medium mt-1 max-w-sm mx-auto">
                            No broadcast records matched your filter criteria. Try adjusting your search term or reset active filters.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setHistorySearch("");
                              setHistoryStatusFilter("all");
                              setHistoryChannelFilter("all");
                              setHistoryTypeFilter("all");
                            }}
                            className="mt-4 h-8 px-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
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
                              className="p-5 md:px-8 hover:bg-slate-50/80 transition-all cursor-pointer group flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative"
                            >
                              {/* Left Column: Channels, Type, Title, Preview, Metadata */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  {/* Channel badges */}
                                  <div className="flex items-center gap-1">
                                    {(msg.channels || []).map(chId => {
                                      const ch = CHANNELS.find(c => c.id === chId);
                                      if (!ch) return null;
                                      return (
                                        <span
                                          key={chId}
                                          title={ch.label}
                                          style={{
                                            backgroundColor: `${ch.accentColor}12`,
                                            border: `1px solid ${ch.accentColor}30`,
                                            color: ch.accentColor
                                          }}
                                          className="h-5 px-2 rounded-md text-[10px] font-extrabold flex items-center gap-1 shadow-2xs"
                                        >
                                          <ch.icon size={11} strokeWidth={2.4} />
                                          <span>{ch.label}</span>
                                        </span>
                                      );
                                    })}
                                  </div>

                                  <span className="text-slate-300">•</span>

                                  {/* Type Tag */}
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/60">
                                    {msg.type}
                                  </span>

                                  {/* Status Pill */}
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                                    msg.status === "sent" 
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80" 
                                      : "bg-amber-50 text-amber-700 border-amber-200/80"
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${msg.status === "sent" ? "bg-emerald-500" : "bg-amber-500"}`} />
                                    {msg.status === "sent" ? "Delivered" : "Scheduled"}
                                  </span>

                                  <span className="text-[10px] font-mono text-slate-400 font-bold ml-auto sm:ml-0">
                                    {msg.id}
                                  </span>
                                </div>

                                {/* Title */}
                                <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                  {msg.title}
                                </h3>

                                {/* Message Snippet */}
                                <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-1">
                                  {msg.preview}
                                </p>

                                {/* Metadata Row */}
                                <div className="flex items-center gap-3 mt-2.5 text-[10px] font-semibold text-slate-400 flex-wrap">
                                  <span className="flex items-center gap-1 text-slate-500">
                                    <Calendar size={11} className="text-slate-400" />
                                    {new Date(msg.timestamp).toLocaleString("en-IN", { 
                                      month: "short", 
                                      day: "numeric", 
                                      year: "numeric", 
                                      hour: "2-digit", 
                                      minute: "2-digit" 
                                    })}
                                  </span>
                                  <span>•</span>
                                  <span>Author: <strong className="text-slate-700 font-bold">{msg.author}</strong></span>
                                  <span>•</span>
                                  <span>Target: <strong className="text-slate-700 font-bold">{msg.audience}</strong></span>
                                </div>
                              </div>

                              {/* Right Column: Performance Mini-Bars & Actions */}
                              <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                                {/* Audience */}
                                <div className="w-18 text-left hidden sm:block">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Audience</div>
                                  <div className="text-xs font-black text-slate-800 flex items-center gap-1 mt-0.5">
                                    <Users size={12} className="text-slate-400" />
                                    <span>{msg.recipients}</span>
                                  </div>
                                </div>

                                {/* Delivered Progress */}
                                <div className="w-24 text-left">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="font-bold text-slate-400 uppercase tracking-wider">Delivery</span>
                                    <span className="font-extrabold text-emerald-600">{deliveryPercent}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                    <div 
                                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                      style={{ width: `${deliveryPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                                    {msg.delivered} / {msg.recipients}
                                  </span>
                                </div>

                                {/* Opened Progress */}
                                <div className="w-24 text-left">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="font-bold text-slate-400 uppercase tracking-wider">Opened</span>
                                    <span className="font-extrabold text-indigo-600">{openPercent}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                    <div 
                                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                      style={{ width: `${openPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                                    {msg.opened} opened
                                  </span>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1.5 pl-2">
                                  <button
                                    type="button"
                                    onClick={(e) => handleDuplicateBroadcast(msg, e)}
                                    title="Duplicate as new broadcast in composer"
                                    className="h-8 px-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-500 hover:text-indigo-600 text-[10px] font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                                  >
                                    <Copy size={12} />
                                    <span className="hidden sm:inline">Duplicate</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteHistoryItem(msg.id, e)}
                                    title="Delete broadcast record"
                                    className="h-8 w-8 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openDrawer(msg)}
                                    title="Inspect broadcast analytics"
                                    className="h-8 px-2.5 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-2xs cursor-pointer ml-1"
                                  >
                                    <Eye size={12} />
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
            </LocalErrorBoundary>
          </div>
        </div>

      {/* 12. NOTIFICATION HISTORY DRAWER (SLIDE-OVER) */}
      <AnimatePresence>
        {drawerOpen && selectedHistoryItem && (
          <motion.div
            key="drawer-overlay"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex justify-end"
          >
            <motion.div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" 
              onClick={() => setDrawerOpen(false)} 
            />
            <motion.div
              initial={{ x: "100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "100%" }} 
              transition={{ type: "spring", damping: 30, stiffness: 220 }}
              className="relative h-full w-full max-w-[580px] bg-white shadow-2xl flex flex-col overflow-hidden rounded-l-[32px] z-10"
            >
              {/* Drawer Header */}
              <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/60 flex justify-between items-start">
                 <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                        {selectedHistoryItem.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border ${
                        selectedHistoryItem.status === "sent" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedHistoryItem.status === "sent" ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {selectedHistoryItem.status === "sent" ? "Delivered" : "Scheduled"}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">
                        {selectedHistoryItem.id}
                      </span>
                    </div>

                    <h2 className="text-xl font-black text-slate-900 tracking-tight leading-snug pr-6">
                      {selectedHistoryItem.title}
                    </h2>

                    <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-slate-400">
                       <Calendar size={12} className="text-slate-400" />
                       <span>{new Date(selectedHistoryItem.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                       <span>•</span>
                       <span>By <strong className="text-slate-700">{selectedHistoryItem.author}</strong></span>
                    </div>
                 </div>

                 <button 
                   onClick={() => setDrawerOpen(false)} 
                   className="p-2.5 bg-white rounded-xl shadow-2xs border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all cursor-pointer"
                   title="Close drawer"
                 >
                    <X size={18} />
                 </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
                 {/* Section 1: Performance Grid */}
                 <section>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">
                      Performance Metrics
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                          <div className="flex items-center justify-between text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                            <span>Delivered</span>
                            <CheckCircle2 size={13} />
                          </div>
                          <strong className="text-2xl font-black text-emerald-700 block mt-1">
                            {selectedHistoryItem.delivered}
                          </strong>
                          <span className="text-[10px] font-semibold text-emerald-700/80 block mt-0.5">
                            {selectedHistoryItem.recipients > 0 ? Math.round((selectedHistoryItem.delivered / selectedHistoryItem.recipients) * 100) : 0}% Delivery Rate
                          </span>
                       </div>

                       <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                          <div className="flex items-center justify-between text-indigo-800 text-[10px] font-black uppercase tracking-wider">
                            <span>Opened</span>
                            <Target size={13} />
                          </div>
                          <strong className="text-2xl font-black text-indigo-700 block mt-1">
                            {selectedHistoryItem.opened}
                          </strong>
                          <span className="text-[10px] font-semibold text-indigo-700/80 block mt-0.5">
                            {selectedHistoryItem.delivered > 0 ? Math.round((selectedHistoryItem.opened / selectedHistoryItem.delivered) * 100) : 0}% Open Rate
                          </span>
                       </div>

                       <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                          <div className="flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-wider">
                            <span>Total Audience</span>
                            <Users size={13} />
                          </div>
                          <strong className="text-2xl font-black text-slate-800 block mt-1">
                            {selectedHistoryItem.recipients}
                          </strong>
                          <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                            {selectedHistoryItem.audience}
                          </span>
                       </div>

                       <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                          <div className="flex items-center justify-between text-slate-500 text-[10px] font-black uppercase tracking-wider">
                            <span>Interactions</span>
                            <Zap size={13} className="text-amber-500" />
                          </div>
                          <strong className="text-2xl font-black text-slate-800 block mt-1">
                            {selectedHistoryItem.clicked || 0}
                          </strong>
                          <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                            Clicked CTA links
                          </span>
                       </div>
                    </div>
                 </section>

                 {/* Section 2: Gateways & Audience */}
                 <section>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">
                      Dispatch Gateways
                    </span>
                    <div className="space-y-2">
                       <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-xs font-bold text-slate-500">Target Cohort</span>
                          <span className="text-xs font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200/70 shadow-2xs">
                            {selectedHistoryItem.audience}
                          </span>
                       </div>

                       <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-xs font-bold text-slate-500">Active Gateways</span>
                          <div className="flex gap-1.5">
                             {(selectedHistoryItem.channels || []).map(chId => {
                               const ch = CHANNELS.find(c => c.id === chId);
                               if (!ch) return null;
                               return (
                                 <div 
                                   key={chId} 
                                   style={{
                                     backgroundColor: `${ch.accentColor}15`,
                                     borderColor: `${ch.accentColor}40`,
                                     color: ch.accentColor
                                   }}
                                   className="px-2 py-1 rounded-lg border flex items-center gap-1.5 text-[11px] font-extrabold shadow-2xs"
                                 >
                                   <ch.icon size={13} strokeWidth={2.5} />
                                   <span>{ch.label}</span>
                                 </div>
                               );
                             })}
                          </div>
                       </div>
                    </div>
                 </section>

                 {/* Section 3: Message Content Preview */}
                 <section>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">
                      Dispatched Message Content
                    </span>
                    <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
                       <div className="text-xs font-black text-slate-900 pb-2 border-b border-slate-200/60">
                         {selectedHistoryItem.title}
                       </div>
                       <p className="text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {selectedHistoryItem.preview}
                       </p>
                    </div>
                 </section>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 md:p-8 border-t border-slate-100 bg-white flex items-center gap-3">
                 <button 
                   type="button"
                   onClick={(e) => handleDuplicateBroadcast(selectedHistoryItem, e)}
                   className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                 >
                    <Copy size={15} /> 
                    <span>Duplicate in Composer</span>
                 </button>

                 <button
                   type="button"
                   onClick={(e) => handleDeleteHistoryItem(selectedHistoryItem.id, e)}
                   className="h-12 px-4 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-bold transition-all cursor-pointer"
                   title="Delete this record"
                 >
                   <Trash2 size={16} />
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
    root.render(<><SendNotification /><BrandFooter /></>);
    return root;
  } catch (err) {
    container.innerHTML = `<div style='color: red; padding: 20px;'>Render Error: ${err.message}</div>`;
    return null;
  }
};

export default SendNotification;
