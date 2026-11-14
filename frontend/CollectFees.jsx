import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useEffect, useCallback, useRef, Component } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building,
  Calendar,
  Camera,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  History,
  Info,
  Layers,
  Maximize2,
  Minus,
  Phone,
  Plus,
  Printer,
  QrCode,
  Radio,
  Receipt,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Smartphone,
  Tag,
  Timer,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { qrcode } from "./qr-lib.js";
import { paymentsV2Api } from "./paymentsV2Api.js";
import { ErrorBoundary } from "./ErrorHandlers.jsx";

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
        <div className="p-8 bg-rose-50/80 border border-rose-200 rounded-2xl text-center my-6">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Payments Module Render Error</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            An internal error occurred while rendering the fee collection view. You can reload safely.
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
          >
            Reload Module
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────
// FORMATTERS & AVATAR HELPERS
// ─────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

// Initials Avatar generator returning high-res inlined SVG
const getInitialsAvatar = (name, gender = "male") => {
  const initials = (name || "Member")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join("");
  const bgColor = "%234f46e5";
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="${bgColor}"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="%23ffffff" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="34" font-weight="900">${initials || "GD"}</text></svg>`;
};

// Authoritative Profile Photo Resolver
// Handles custom uploaded photos, data URIs, local Tauri file paths, and window.getDefaultAvatar
const resolveMemberPhoto = (member) => {
  if (!member) return getInitialsAvatar("Member");
  const photo = member.photo || member.profile_photo_path || member.image || member.photoUrl;
  
  if (photo && typeof photo === "string" && !photo.includes("dicebear.com") && photo.length > 5) {
    if (photo.startsWith("data:") || photo.startsWith("http://") || photo.startsWith("https://") || photo.startsWith("blob:")) {
      return photo;
    }
    if (typeof window !== "undefined" && window.__TAURI__?.core?.convertFileSrc) {
      try {
        return window.__TAURI__.core.convertFileSrc(photo);
      } catch (e) {
        return photo;
      }
    }
    return photo;
  }

  // Fallback to high-quality procedural SVG avatar if available in GymDeck window
  if (typeof window !== "undefined" && typeof window.getDefaultAvatar === "function") {
    try {
      const defaultSvg = window.getDefaultAvatar(member.gender || "male", member.name || "Member");
      if (defaultSvg) return defaultSvg;
    } catch (e) {}
  }

  return getInitialsAvatar(member.name || "Member", member.gender);
};

// ─────────────────────────────────────────
// DEFAULT EXPIRED MEMBERS (Fallback if DB empty)
// Strictly members whose memberships have expired already
// ─────────────────────────────────────────

const DEFAULT_EXPIRED_MEMBERS = [
  {
    id: "GD-1105",
    rawId: 1105,
    name: "Rohan Varma",
    gender: "male",
    phone: "+91 97110 33490",
    status: "EXPIRED",
    plan: "Monthly Pass",
    planPrice: 2200,
    expiry: "20 Oct 2026",
    daysRemaining: -23,
    daysExpiredAgo: 23,
    pendingDues: 1800,
    wallet: 450,
    tags: ["Expired", "Pending Dues", "Recently Expired"]
  },
  {
    id: "GD-1204",
    rawId: 1204,
    name: "Dev Patel",
    gender: "male",
    phone: "+91 91234 56789",
    status: "EXPIRED",
    plan: "Quarterly Cardio & Strength",
    planPrice: 5500,
    expiry: "02 Nov 2026",
    daysRemaining: -10,
    daysExpiredAgo: 10,
    pendingDues: 2500,
    wallet: 0,
    tags: ["Expired", "Pending Dues", "Recently Expired"]
  },
  {
    id: "GD-1088",
    rawId: 1088,
    name: "Pooja Sharma",
    gender: "female",
    phone: "+91 98221 55678",
    status: "EXPIRED",
    plan: "Quarterly Strength & Cardio",
    planPrice: 6500,
    expiry: "28 Oct 2026",
    daysRemaining: -15,
    daysExpiredAgo: 15,
    pendingDues: 3200,
    wallet: 0,
    tags: ["Expired", "Pending Dues", "Recently Expired"]
  },
  {
    id: "GD-1152",
    rawId: 1152,
    name: "Ananya Deshmukh",
    gender: "female",
    phone: "+91 98450 33211",
    status: "EXPIRED",
    plan: "Annual Pro Elite",
    planPrice: 18000,
    expiry: "14 Sep 2026",
    daysRemaining: -59,
    daysExpiredAgo: 59,
    pendingDues: 0,
    wallet: 500,
    tags: ["Expired", "Long Expired"]
  },
  {
    id: "GD-1033",
    rawId: 1033,
    name: "Karan Johar",
    gender: "male",
    phone: "+91 99882 44332",
    status: "EXPIRED",
    plan: "Half-Yearly Fitness",
    planPrice: 9500,
    expiry: "05 Oct 2026",
    daysRemaining: -38,
    daysExpiredAgo: 38,
    pendingDues: 1200,
    wallet: 0,
    tags: ["Expired", "Pending Dues", "Long Expired"]
  },
  {
    id: "GD-1095",
    rawId: 1095,
    name: "Meera Nair",
    gender: "female",
    phone: "+91 97441 22880",
    status: "EXPIRED",
    plan: "Monthly Yoga & Pilates",
    planPrice: 2800,
    expiry: "08 Nov 2026",
    daysRemaining: -4,
    daysExpiredAgo: 4,
    pendingDues: 0,
    wallet: 200,
    tags: ["Expired", "Recently Expired"]
  }
];

const DEFAULT_DB_PLANS = [
  { id: "db-1", name: "Monthly Standard Fitness", price: 2500, duration_days: 30, description: "Cardio & strength floor access with locker" },
  { id: "db-2", name: "Quarterly Strength & Cardio", price: 6500, duration_days: 90, description: "Strength + Cardio + steam bath & shower" },
  { id: "db-3", name: "Half-Yearly Fitness Pro", price: 9500, duration_days: 180, description: "All-access floor + 2 complimentary guest passes" },
  { id: "db-4", name: "Annual Pro Elite", price: 18000, duration_days: 365, description: "Full 365-day access + quarterly nutrition consultation" },
  { id: "db-5", name: "Personal Training (10 Sessions)", price: 8000, duration_days: 60, description: "1-on-1 certified trainer posture & workout guidance" },
  { id: "db-6", name: "Weekend Warrior Pass", price: 1800, duration_days: 30, description: "Saturday & Sunday full facility & spa access" }
];

const SEGMENT_CHIPS = [
  { id: "all", label: "All Expired" },
  { id: "dues", label: "With Dues" }
];

// ─────────────────────────────────────────
// MAIN COLLECT FEES COMPONENT
// ─────────────────────────────────────────

const CollectFeesPage = () => {
  const sentinelRef = useRef(null);
  const planDropdownRef = useRef(null);
  const walkInPlanDropdownRef = useRef(null);
  const photoInputRef = useRef(null);
  const [isHeaderStuck, setIsHeaderStuck] = useState(false);

  // Members & DB state
  const [membersList, setMembersList] = useState(DEFAULT_EXPIRED_MEMBERS);
  const [dbPlans, setDbPlans] = useState(DEFAULT_DB_PLANS);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [activeSegment, setActiveSegment] = useState("all");

  // Custom Gym Plan Dropdown State
  const [isPlanDropdownOpen, setIsPlanDropdownOpen] = useState(false);
  const [isWalkInPlanDropdownOpen, setIsWalkInPlanDropdownOpen] = useState(false);
  const [planSearchQuery, setPlanSearchQuery] = useState("");

  // Invoice & Pricing State
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [discountValue, setDiscountValue] = useState(0);
  const [applyGst, setApplyGst] = useState(false); // 18% GST toggle (default unchecked)
  const [includePastDues, setIncludePastDues] = useState(true); // Past dues clearance toggle
  const [paymentMethod, setPaymentMethod] = useState("UPI"); // UPI | Cash | Card | BankTransfer

  // Cash Desk specific state
  const [cashTendered, setCashTendered] = useState("");

  // Card / POS specific state
  const [posSlipRef, setPosSlipRef] = useState("");
  const [posCardBrand, setPosCardBrand] = useState("Visa");

  // Bank Transfer / NEFT state
  const [transferType, setTransferType] = useState("IMPS");
  const [enteredUtr, setEnteredUtr] = useState("");

  // Settlement & State Actions
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullscreenQr, setIsFullscreenQr] = useState(false);
  const [completedTxn, setCompletedTxn] = useState(null);

  // Receiving Bank Configuration State
  const [receivingAccount, setReceivingAccount] = useState(() => {
    const saved = localStorage.getItem("gymdeck_active_receiving_account");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.upiVpa) return parsed;
      } catch (e) {}
    }
    return {
      bankId: "hdfc",
      bankName: "HDFC Bank",
      accountHolder: "Indians Gym Fitness Studio",
      accountNumberMasked: "•••• •••• 8492",
      accountType: "Current Account",
      branch: "Capital Commercial Complex",
      ifsc: "HDFC0001042",
      upiVpa: "indiansgym@okhdfcbank",
      phone: "+91 98765 43210",
      isVerified: true
    };
  });

  // Fetch Authoritative Payment Account from Cloud & Expired Members from Tauri SQLite
  useEffect(() => {
    // 1. Fetch cloud accounts
    paymentsV2Api.listAccounts()
      .then((res) => {
        if (res?.data?.accounts && res.data.accounts.length > 0) {
          const primary = res.data.accounts.find(a => a.isPrimary && a.upiVpa) || res.data.accounts.find(a => a.upiVpa) || res.data.accounts[0];
          const mapped = {
            bankId: (primary.bankName || "bank").toLowerCase().replace(/\s+/g, ""),
            bankName: primary.bankName || "",
            accountHolder: primary.beneficiaryName || "",
            accountNumberMasked: primary.accountNumberMasked || "",
            accountType: primary.accountType || "Current Account",
            branch: primary.branchName || "",
            ifsc: primary.ifscCode || "",
            upiVpa: primary.upiVpa || "",
            phone: "",
            isVerified: primary.status === "VERIFIED"
          };
          setReceivingAccount(mapped);
          localStorage.setItem("gymdeck_active_receiving_account", JSON.stringify(mapped));
        }
      })
      .catch((err) => {
        console.warn("Could not fetch remote payment accounts, using local cache:", err);
      });

    // 2. Fetch native SQLite members and plans if available
    if (typeof window !== "undefined" && window.__TAURI__?.core?.invoke) {
      Promise.all([
        window.__TAURI__.core.invoke("get_members_command", { limit: 10000, offset: 0 }).catch(() => []),
        window.__TAURI__.core.invoke("get_plans_command").catch(() => [])
      ]).then(([rawMembers, rawPlans]) => {
        if (Array.isArray(rawPlans) && rawPlans.length > 0) {
          setDbPlans(rawPlans);
        }

        const plansMap = {};
        if (Array.isArray(rawPlans)) {
          rawPlans.forEach(p => { plansMap[p.id] = p; });
        }

        if (Array.isArray(rawMembers) && rawMembers.length > 0) {
          const now = new Date();
          const expiredMapped = rawMembers
            .filter(m => m && m.membership_status !== "CANCELLED" && m.membership_status !== "DELETED")
            .map((m, idx) => {
              const planObj = m.membership_plan_id ? plansMap[m.membership_plan_id] : null;
              const planName = planObj ? (planObj.name || planObj.plan_name || "General Membership") : "General Membership";
              const planPrice = planObj 
                ? (planObj.price !== undefined && planObj.price !== null ? planObj.price : (planObj.price_minor_units ? planObj.price_minor_units / 100 : 2500))
                : 2500;
              const planDurationDays = planObj 
                ? (planObj.duration_days || (planObj.duration_months ? planObj.duration_months * 30 : 30))
                : 30;

              let expiryDateObj = null;
              if (m.expires_at) {
                expiryDateObj = new Date(m.expires_at);
              } else if (m.joined_at || m.created_at) {
                const startDate = new Date(m.joined_at || m.created_at);
                expiryDateObj = new Date(startDate.getTime() + planDurationDays * 24 * 60 * 60 * 1000);
              }

              let daysRemaining = 0;
              let expiryFormatted = "Expired";
              if (expiryDateObj && !isNaN(expiryDateObj.getTime())) {
                const diffTime = expiryDateObj - now;
                daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                expiryFormatted = expiryDateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
              }

              // Only display members whose memberships have EXPIRED ALREADY
              const isAlreadyExpired = daysRemaining < 0 || m.membership_status === "EXPIRED" || m.membership_status === "INACTIVE";
              if (!isAlreadyExpired) {
                return null;
              }

              const daysExpiredAgo = Math.max(1, Math.abs(daysRemaining));
              const pendingDues = Number(m.pending_dues || m.due_amount || 0);

              const tags = ["Expired"];
              if (pendingDues > 0) tags.push("Pending Dues");
              if (daysExpiredAgo <= 30) tags.push("Recently Expired");
              else tags.push("Long Expired");

              return {
                id: m.member_code || `GD-${String(m.id || idx + 1).padStart(4, "0")}`,
                rawId: m.id,
                name: m.full_name || m.name || `Member ${idx + 1}`,
                gender: m.gender || "male",
                phone: m.phone || m.mobile || "+91 90000 00000",
                email: m.email || "",
                photo: m.profile_photo_path || m.photo_url || m.photoUrl || m.image || null,
                status: "EXPIRED",
                plan: planName,
                planPrice: planPrice,
                expiry: expiryFormatted,
                daysRemaining: daysRemaining,
                daysExpiredAgo: daysExpiredAgo,
                pendingDues: pendingDues,
                wallet: Number(m.wallet_balance || 0),
                tags: tags
              };
            })
            .filter(Boolean)
            .sort((a, b) => a.daysRemaining - b.daysRemaining);

          if (expiredMapped.length > 0) {
            setMembersList(expiredMapped);
          }
        }
      }).catch(err => {
        console.warn("Could not fetch Tauri SQLite members:", err);
      });
    }
  }, []);

  // Sticky header observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsHeaderStuck(!entry.isIntersecting),
      { root: null, threshold: [0], rootMargin: "-20px 0px 0px 0px" }
    );
    observer.observe(sentinel);
    return () => { if (sentinel) observer.unobserve(sentinel); };
  }, []);

  // Invoice calculations
  const subtotal = useMemo(() => {
    return invoiceItems.reduce((acc, item) => acc + (item.qty * item.price) - item.discount, 0);
  }, [invoiceItems]);

  // Past dues calculation if member has outstanding balance
  const duesToAdd = useMemo(() => {
    if (!selectedMember || !selectedMember.pendingDues || selectedMember.pendingDues <= 0) return 0;
    return includePastDues ? selectedMember.pendingDues : 0;
  }, [selectedMember, includePastDues]);

  const tax = useMemo(() => {
    if (!applyGst) return 0;
    return Math.max(0, (subtotal - discountValue) * 0.18);
  }, [subtotal, discountValue, applyGst]);

  const totalPayable = useMemo(() => {
    return Math.max(0, Math.round(subtotal - discountValue + tax + duesToAdd));
  }, [subtotal, discountValue, tax, duesToAdd]);

  // Dynamic Change calculation for Cash Desk
  const cashChangeDue = useMemo(() => {
    const rec = Number(cashTendered) || 0;
    if (rec < totalPayable) return 0;
    return rec - totalPayable;
  }, [cashTendered, totalPayable]);

  // NPCI Standard UPI Intent URI
  const upiUri = useMemo(() => {
    if (!receivingAccount.upiVpa) return "";
    const vpa = receivingAccount.upiVpa.trim();
    const name = encodeURIComponent(receivingAccount.accountHolder || "Gym Beneficiary");
    const amount = totalPayable.toFixed(2);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const note = encodeURIComponent(`Renewal ${selectedMember?.name || "Member"}`);
    return `upi://pay?pa=${vpa}&pn=${name}&am=${amount}&cu=INR&tn=${note}&tr=${invoiceNumber}`;
  }, [receivingAccount, totalPayable, selectedMember]);

  // Pure Vector SVG QR Code Engine
  const qrSvgString = useMemo(() => {
    if (!upiUri) return null;
    try {
      const qr = qrcode(0, "H");
      qr.addData(upiUri);
      qr.make();
      return qr.createSvgTag({
        cellSize: 6,
        margin: 2,
        scalable: true
      });
    } catch (err) {
      console.error("Failed to generate vector UPI QR code:", err);
      return null;
    }
  }, [upiUri]);

  // Filtered Expired Members list for Left Column
  const filteredMembers = useMemo(() => {
    return membersList.filter(m => {
      const isExpired = m.status === "EXPIRED" || m.daysRemaining < 0;
      if (!isExpired) return false;

      // Segment filter
      if (activeSegment === "dues" && m.pendingDues <= 0 && !m.tags.includes("Pending Dues")) return false;

      // Search query
      if (memberSearch.trim()) {
        const q = memberSearch.toLowerCase().trim();
        const matchesName = (m.name || "").toLowerCase().includes(q);
        const matchesId = (m.id || "").toLowerCase().includes(q);
        const matchesPhone = (m.phone || "").toLowerCase().includes(q);
        const matchesPlan = (m.plan || "").toLowerCase().includes(q);
        return matchesName || matchesId || matchesPhone || matchesPlan;
      }
      return true;
    });
  }, [membersList, activeSegment, memberSearch]);

  // Select an expired member & auto-refresh invoice default item
  const handleSelectMember = useCallback((member) => {
    setSelectedMember(member);
    setIncludePastDues(true);
    if (member.id?.startsWith("WK-")) {
      setInvoiceItems([
        { id: Date.now(), name: "Gym Day Pass & Locker Access", qty: 1, price: 500, discount: 0 }
      ]);
    } else {
      setInvoiceItems([
        { id: Date.now(), name: `${member.plan || "Membership"} Renewal`, qty: 1, price: member.planPrice || 3500, discount: 0 }
      ]);
    }
  }, []);

  // Quick Walk-in Guest Creator
  const handleCreateWalkIn = useCallback(() => {
    const walkInId = `WK-${Math.floor(1000 + Math.random() * 9000)}`;
    const walkInMember = {
      id: walkInId,
      rawId: Date.now(),
      name: "",
      gender: "male",
      phone: "",
      photo: null,
      isWalkIn: true,
      status: "ACTIVE",
      plan: "Walk-in Guest Day Pass",
      planPrice: 500,
      duration: "1 Day",
      timeLimit: "2 Hours",
      expiry: "Today",
      daysRemaining: 1,
      daysExpiredAgo: 0,
      pendingDues: 0,
      wallet: 0,
      tags: ["Walk-in"]
    };
    setSelectedMember(walkInMember);
    setIncludePastDues(false);
    setInvoiceItems([
      { id: Date.now(), name: "Walk-in Guest Day Pass", qty: 1, price: 500, discount: 0 }
    ]);
  }, []);

  // Desk plans for walk-in custom dropdown (only walk-in guest plans by default)
  const walkInPlansList = useMemo(() => {
    return [
      { id: "wp-1", name: "Walk-in Guest Day Pass", price: 500, duration: "1 Day", timeLimit: "2 Hours", description: "Full floor workout pass & locker access" },
      { id: "wp-2", name: "Walk-in Trial Session", price: 300, duration: "1 Day", timeLimit: "90 Mins", description: "Single entry session with gym trainer guide" },
      { id: "wp-3", name: "Walk-in Weekend Pass", price: 1000, duration: "2 Days", timeLimit: "Full Day", description: "Saturday & Sunday access with spa & sauna" },
      { id: "wp-4", name: "Walk-in Weekly Visitor Pass", price: 1500, duration: "7 Days", timeLimit: "Full Day", description: "7-day temporary visitor access pass" }
    ];
  }, []);

  // Select a plan from custom walk-in dropdown
  const handleWalkInPlanSelect = useCallback((plan) => {
    setSelectedMember(prev => prev ? {
      ...prev,
      plan: plan.name,
      planPrice: plan.price,
      duration: plan.duration || "1 Day",
      timeLimit: plan.timeLimit || "2 Hours"
    } : prev);

    setInvoiceItems([
      { id: Date.now(), name: plan.name, qty: 1, price: plan.price, discount: 0 }
    ]);
  }, []);

  // Walk-in photo upload handler
  const handleWalkInPhotoUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result;
      if (base64Url && typeof base64Url === "string") {
        setSelectedMember(prev => prev ? { ...prev, photo: base64Url } : prev);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // Update walk-in text fields
  const handleUpdateWalkInField = useCallback((field, value) => {
    setSelectedMember(prev => prev ? { ...prev, [field]: value } : prev);
  }, []);

  // Change walk-in membership plan
  const handleWalkInPlanChange = useCallback((chosenPlanName) => {
    let price = 500;
    if (chosenPlanName === "Day Pass / Single Visit") price = 500;
    else if (chosenPlanName === "Weekend Warrior Pass") price = 1000;
    else if (chosenPlanName === "Weekly Visitor Pass") price = 1500;
    else if (chosenPlanName === "Monthly Standard Fitness") price = 2500;
    else if (chosenPlanName === "Quarterly Strength & Cardio") price = 6500;
    else if (chosenPlanName === "Annual Pro Elite") price = 18000;
    else {
      const match = dbPlans.find(p => (p.name || p.plan_name) === chosenPlanName);
      if (match?.price !== undefined) price = match.price;
      else if (match?.price_minor_units) price = match.price_minor_units / 100;
    }

    setSelectedMember(prev => prev ? { ...prev, plan: chosenPlanName, planPrice: price } : prev);
    setInvoiceItems([
      { id: Date.now(), name: chosenPlanName, qty: 1, price: price, discount: 0 }
    ]);
  }, [dbPlans]);

  // Payment Confirmation Action
  const handleProcessPayment = useCallback(() => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const memberToRecord = selectedMember ? {
        ...selectedMember,
        name: selectedMember.name?.trim() || (selectedMember.isWalkIn ? "Walk-in Guest" : "Member"),
        phone: selectedMember.phone?.trim() || (selectedMember.isWalkIn ? "+91 90000 00000" : "—")
      } : null;

      const txnRecord = {
        txnId: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        invoiceNo: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        amount: totalPayable,
        method: paymentMethod,
        member: memberToRecord,
        timestamp: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
        settledTo: receivingAccount.bankName,
        utr: enteredUtr || (paymentMethod === "UPI" ? `UPI${Math.floor(100000000000 + Math.random() * 900000000000)}` : posSlipRef || "CASH-DESK-01"),
        items: [
          ...invoiceItems,
          ...(duesToAdd > 0 ? [{ id: `due-${Date.now()}`, name: `Past Outstanding Due Clearance (${memberToRecord?.name || "Member"})`, qty: 1, price: duesToAdd, discount: 0 }] : [])
        ]
      };
      setCompletedTxn(txnRecord);
      setIsSuccess(true);

      // Synchronize with GymDeck Master Payment History Ledger
      try {
        const existingLedger = JSON.parse(localStorage.getItem("gymdeck_transaction_ledger") || "[]");
        const newLedgerEntry = {
          id: txnRecord.txnId,
          invoiceId: txnRecord.invoiceNo,
          member: {
            name: memberToRecord?.name || "Walk-in Guest",
            id: memberToRecord?.id || "GD-WALKIN",
            phone: memberToRecord?.phone || "—",
            image: memberToRecord?.photo || ""
          },
          type: invoiceItems[0]?.name || (selectedMember?.isWalkIn ? "Walk-in Desk Pass" : "Membership Fee Collection"),
          amount: totalPayable,
          tax: Math.round(totalPayable * 0.18 / 1.18),
          method: paymentMethod === "Cash" ? "Cash Desk" : paymentMethod === "Card" ? "Credit Card (POS)" : paymentMethod === "BankTransfer" ? "Bank Transfer (IMPS)" : "UPI (Direct QR)",
          date: new Date().toISOString().replace("T", " ").substring(0, 16),
          displayDate: txnRecord.timestamp,
          branch: "Main Branch",
          status: "Successful",
          staff: "Front Desk Cashier",
          utr: txnRecord.utr,
          settledTo: txnRecord.settledTo
        };
        localStorage.setItem("gymdeck_transaction_ledger", JSON.stringify([newLedgerEntry, ...existingLedger]));
        window.dispatchEvent(new CustomEvent("gymdeck:ledger-updated", { detail: newLedgerEntry }));
      } catch (err) {
        console.warn("GymDeck: Failed to sync payment to master ledger", err);
      }
    }, 700);
  }, [totalPayable, paymentMethod, selectedMember, receivingAccount, enteredUtr, posSlipRef, invoiceItems, duesToAdd]);

  const resetBilling = useCallback(() => {
    setIsSuccess(false);
    setCompletedTxn(null);
    setEnteredUtr("");
    setPosSlipRef("");
    setCashTendered("");
    if (selectedMember) {
      setInvoiceItems([
        { id: Date.now(), name: `${selectedMember.plan || "Membership"} Renewal`, qty: 1, price: selectedMember.planPrice || 3500, discount: 0 }
      ]);
    } else {
      setInvoiceItems([]);
    }
  }, [selectedMember]);

  // Handle click outside to close the gym plan dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (planDropdownRef.current && !planDropdownRef.current.contains(event.target)) {
        setIsPlanDropdownOpen(false);
      }
      if (walkInPlanDropdownRef.current && !walkInPlanDropdownRef.current.contains(event.target)) {
        setIsWalkInPlanDropdownOpen(false);
      }
    };
    if (isPlanDropdownOpen || isWalkInPlanDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isPlanDropdownOpen, isWalkInPlanDropdownOpen]);

  // Filtered DB plans for search
  const filteredPlans = useMemo(() => {
    if (!planSearchQuery.trim()) return dbPlans;
    const q = planSearchQuery.toLowerCase().trim();
    return dbPlans.filter(p => {
      const name = (p.name || p.plan_name || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      const dur = String(p.duration_days || p.duration_months || "");
      return name.includes(q) || desc.includes(q) || dur.includes(q);
    });
  }, [dbPlans, planSearchQuery]);

  // Select gym plan from database
  const handleSelectPlanFromDb = useCallback((chosenPlan) => {
    const price = chosenPlan.price !== undefined && chosenPlan.price !== null
      ? chosenPlan.price
      : (chosenPlan.price_minor_units ? chosenPlan.price_minor_units / 100 : 2500);
    const planName = chosenPlan.name || chosenPlan.plan_name || "Gym Membership";

    setInvoiceItems(prev => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: `${planName} Renewal`,
        qty: 1,
        price: Number(price) || 0,
        discount: 0
      }
    ]);
    setIsPlanDropdownOpen(false);
    setPlanSearchQuery("");
  }, []);

  // Copy Link
  const handleCopyLink = () => {
    if (!upiUri) return;
    navigator.clipboard.writeText(upiUri);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Download QR SVG
  const handleDownloadQrSvg = () => {
    if (!qrSvgString) return;
    const blob = new Blob([qrSvgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GymDeck-UPI-${receivingAccount.upiVpa}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print Desk Standee (Official Acrylic Merchant Standee)
  const handlePrintStandee = () => {
    const printWindow = window.open("", "_blank", "width=600,height=800");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>GymDeck Official UPI Merchant Standee</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px; margin: 0; background: #fff; color: #0f172a; }
            .standee-card { max-width: 380px; margin: 0 auto; border: 4px solid #0f172a; border-radius: 32px; padding: 32px 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
            .header-pill { display: inline-block; padding: 6px 18px; background: #0f172a; color: #fff; font-size: 11px; font-weight: 900; border-radius: 999px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; }
            h1 { font-size: 24px; font-weight: 900; margin: 0 0 4px 0; color: #0f172a; }
            .subtitle { color: #64748b; font-size: 13px; margin: 0 0 24px 0; font-weight: 600; }
            .qr-frame { max-width: 260px; margin: 0 auto 20px auto; padding: 16px; border: 2px solid #e2e8f0; border-radius: 24px; background: #fff; }
            .qr-frame svg { width: 100%; height: auto; display: block; }
            .upi-vpa { font-family: monospace; font-size: 14px; font-weight: 800; color: #4338ca; background: #eef2ff; padding: 8px 16px; border-radius: 12px; display: inline-block; margin-bottom: 20px; }
            .rail-badges { display: flex; justify-content: center; align-items: center; gap: 16px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 11px; font-weight: 800; color: #64748b; }
            .footer-legal { margin-top: 24px; font-size: 10px; color: #94a3b8; font-weight: 700; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          <div class="standee-card">
            <div class="header-pill">OFFICIAL UPI PAYMENT STAND</div>
            <h1>${receivingAccount.accountHolder}</h1>
            <p class="subtitle">Scan to Pay via any UPI Application</p>
            <div class="qr-frame">${qrSvgString}</div>
            <div class="upi-vpa">${receivingAccount.upiVpa}</div>
            <div class="rail-badges">
              <span>BHIM UPI</span> • <span>GOOGLE PAY</span> • <span>PHONEPE</span> • <span>PAYTM</span>
            </div>
          </div>
          <div class="footer-legal">NPCI APPROVED UNIFIED PAYMENTS INTERFACE • 0% ZERO CHARGES</div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Print Official Thermal Receipt
  const handlePrintReceipt = () => {
    if (!completedTxn) return;
    const printWindow = window.open("", "_blank", "width=500,height=700");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>GymDeck Fee Receipt - ${completedTxn.invoiceNo}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; margin: 0; color: #0f172a; font-size: 12px; }
            .receipt-box { max-width: 380px; margin: 0 auto; border: 1px dashed #cbd5e1; padding: 24px; border-radius: 12px; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
            .gym-name { font-size: 18px; font-weight: 900; letter-spacing: 0.5px; }
            .gym-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
            .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; }
            .meta-lbl { color: #64748b; font-weight: 600; }
            .meta-val { font-weight: 800; }
            .items-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            .items-table th { border-bottom: 1px solid #0f172a; padding: 6px 0; text-align: left; font-size: 10px; text-transform: uppercase; }
            .items-table td { padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 11px; }
            .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; margin-top: 12px; padding-top: 10px; border-top: 2px solid #0f172a; }
            .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <div class="header">
              <div class="gym-name">GYMDECK FITNESS STUDIO</div>
              <div class="gym-sub">Official Payment Receipt & Tax Invoice</div>
            </div>
            <div class="meta-row"><span class="meta-lbl">Invoice No:</span><span class="meta-val">${completedTxn.invoiceNo}</span></div>
            <div class="meta-row"><span class="meta-lbl">Transaction ID:</span><span class="meta-val font-mono">${completedTxn.txnId}</span></div>
            <div class="meta-row"><span class="meta-lbl">Date & Time:</span><span class="meta-val">${completedTxn.timestamp}</span></div>
            <div class="meta-row"><span class="meta-lbl">Member:</span><span class="meta-val">${completedTxn.member?.name} (${completedTxn.member?.id})</span></div>
            <div class="meta-row"><span class="meta-lbl">Payment Mode:</span><span class="meta-val">${completedTxn.method}</span></div>
            <div class="meta-row"><span class="meta-lbl">UTR / Ref:</span><span class="meta-val font-mono">${completedTxn.utr}</span></div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align:center;">Qty</th>
                  <th style="text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${completedTxn.items.map(it => `
                  <tr>
                    <td>${it.name}</td>
                    <td style="text-align:center;">${it.qty}</td>
                    <td style="text-align:right;">₹${(it.qty * it.price) - it.discount}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>

            <div class="total-row">
              <span>TOTAL PAID</span>
              <span>₹${completedTxn.amount.toLocaleString("en-IN")}</span>
            </div>

            <div class="footer">
              Thank you for training with GymDeck!<br />Direct Merchant Settlement • Retain for records
            </div>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <LocalErrorBoundary>
      <div className="collect-fees-workspace min-h-screen bg-slate-50/50 pt-2 px-6 pb-6 space-y-4 font-sans text-slate-900 selection:bg-indigo-100">
        <div ref={sentinelRef} style={{ height: "1px", marginBottom: "-1px", pointerEvents: "none" }} />

        {/* ════════════════════════════════════════════════════════════
            1. TOP EXECUTIVE HEADER (CLEAN & PROPERLY POSITIONED)
        ════════════════════════════════════════════════════════════ */}
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-3 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              <span>Payments & Billing</span>
              <span>/</span>
              <span className="text-indigo-600 font-black">Collect Fees</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Collect Fees & Desk Billing
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Collect membership renewal fees, past dues, and desk walk-ins.
            </p>
          </div>

          {/* Top Right Positioned Walk-In Billing Action */}
          <div className="flex items-center shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleCreateWalkIn}
              className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Walk-In Billing</span>
            </button>
          </div>
        </header>

        {/* ════════════════════════════════════════════════════════════
            2. TWO-COLUMN COCKPIT (LIKE SEND NOTIFICATION PAGE)
            LEFT (COL-SPAN-5): EXPIRED MEMBERS DIRECTORY
            RIGHT (COL-SPAN-7): PAYMENT OPTIONS & BILLING STUDIO
        ════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* ────────────────────────────────────────────────────────────
              LEFT COLUMN (COL-SPAN-5): EXPIRED MEMBER DIRECTORY COCKPIT
          ──────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
            
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3.5">
              
              {/* Directory Header with Count */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/80">
                    <Clock size={16} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 leading-none">
                      Expired Members Directory
                    </h2>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                      Members requiring renewal & fee settlement
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black font-mono bg-slate-100 text-slate-700 border border-slate-200/80">
                    {filteredMembers.length} Expired
                  </span>
                </div>
              </div>

              {/* Instant Search Bar */}
              <div className="relative flex items-center w-full">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search size={14} strokeWidth={2.2} />
                </div>
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search expired members by name, ID (#GD-1105), phone..."
                  className="w-full h-10 pl-10 pr-9 bg-white hover:border-slate-300 focus:bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none transition-all shadow-2xs"
                />
                {memberSearch ? (
                  <button
                    type="button"
                    onClick={() => setMemberSearch("")}
                    className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                ) : (
                  <span className="absolute right-3 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-slate-400 border border-slate-200 bg-slate-50">
                    /
                  </span>
                )}
              </div>

              {/* Segment Filter Chips (Specific to Expired Members) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {SEGMENT_CHIPS.map(chip => {
                  const isActive = activeSegment === chip.id;
                  const count = membersList.filter(m => {
                    const isExpired = m.status === "EXPIRED" || m.daysRemaining < 0;
                    if (!isExpired) return false;
                    if (chip.id === "all") return true;
                    if (chip.id === "dues") return m.pendingDues > 0 || m.tags.includes("Pending Dues");
                    return true;
                  }).length;

                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setActiveSegment(chip.id)}
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

              {/* Scrollable Expired Member Directory List */}
              <div className="border border-slate-200/90 rounded-xl bg-white overflow-hidden shadow-2xs">
                <div className="bg-slate-50/90 border-b border-slate-100 px-3.5 py-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                  <span>Expired Member</span>
                  <span>Overdue & Dues</span>
                </div>

                <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                  {filteredMembers.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      <Clock size={22} className="mx-auto mb-1 opacity-40 text-slate-400" />
                      <p className="text-xs font-semibold text-slate-600">No expired members match search</p>
                      <button
                        type="button"
                        onClick={() => { setMemberSearch(""); setActiveSegment("all"); }}
                        className="mt-2 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    filteredMembers.map((m) => {
                      const isSelected = selectedMember?.id === m.id;
                      const photoSrc = resolveMemberPhoto(m);

                      return (
                        <div
                          key={m.id}
                          onClick={() => handleSelectMember(m)}
                          className={`p-3 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected 
                              ? "bg-indigo-50/70 border-l-4 border-l-indigo-600 shadow-2xs" 
                              : "hover:bg-slate-50/80 border-l-4 border-l-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Profile Image with Authentic Fallback */}
                            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-200/90 bg-slate-100 shadow-2xs relative">
                              <img
                                src={photoSrc}
                                alt={m.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = getInitialsAvatar(m.name, m.gender);
                                }}
                              />
                            </div>

                            {/* Name & Subtitle */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-extrabold truncate ${isSelected ? "text-indigo-950 font-black" : "text-slate-900"}`}>
                                  {m.name}
                                </span>
                                <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-100 px-1 py-0.2 rounded border border-slate-200/60">
                                  {m.id}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                <span>{m.phone}</span>
                                <span>•</span>
                                <span className="text-slate-500 font-semibold truncate">{m.plan}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right Side Status & Dues */}
                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                              Expired {m.daysExpiredAgo}d ago
                            </span>
                            {m.pendingDues > 0 ? (
                              <span className="text-[10px] font-extrabold text-amber-600 font-mono">
                                Due: {currencyFormatter.format(m.pendingDues)}
                              </span>
                            ) : (
                              <span className="text-[9px] text-emerald-600 font-bold">
                                Dues Clear
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Clean Walk-in Highlight Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Plus size={15} strokeWidth={2.4} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 leading-none">Walk-in Guest Billing</h3>
                  <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                    Day pass, drop-in visitor, or trial entry
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreateWalkIn}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
              >
                Bill Guest
              </button>
            </div>

          </div>

          {/* ────────────────────────────────────────────────────────────
              RIGHT COLUMN (COL-SPAN-7): PAYMENT OPTIONS & BILLING COCKPIT
          ──────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* CARD 1: MEMBER SELECTION & PROFILE BANNER */}
            {selectedMember ? (
              selectedMember.isWalkIn ? (
                /* ────────────────────────────────────────────────────────
                   INTERACTIVE WALK-IN GUEST REGISTRATION CARD
                ──────────────────────────────────────────────────────── */
                <div className="bg-white rounded-2xl border-2 border-indigo-200/90 shadow-2xs p-5 relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Photo Avatar with Real Upload Trigger */}
                      <input
                        type="file"
                        ref={photoInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleWalkInPhotoUpload}
                      />
                      <div
                        onClick={() => photoInputRef.current?.click()}
                        className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border-2 border-dashed border-indigo-300 hover:border-indigo-600 bg-indigo-50/70 shadow-xs relative cursor-pointer group transition-all flex items-center justify-center"
                        title="Click to upload guest photo"
                      >
                        {selectedMember.photo ? (
                          <img
                            src={selectedMember.photo}
                            alt="Guest Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-indigo-500 group-hover:text-indigo-700">
                            <Camera size={18} strokeWidth={2.2} />
                            <span className="text-[8px] font-black uppercase tracking-tight mt-0.5">Photo</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Camera size={16} />
                        </div>
                      </div>

                      {/* Guest Info: Badges & Paired Inputs (Name + Contact Number) */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Walk-In Guest
                          </span>
                          <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            ID: {selectedMember.id}
                          </span>
                        </div>
                        {/* Name and Contact Number Side-by-Side */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="relative flex items-center w-full">
                            <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
                              <User size={14} strokeWidth={2.2} />
                            </div>
                            <input
                              type="text"
                              value={selectedMember.name}
                              onChange={(e) => handleUpdateWalkInField("name", e.target.value)}
                              placeholder="Guest Full Name..."
                              className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none shadow-2xs transition-all font-sans"
                              autoFocus
                            />
                          </div>
                          <div className="relative flex items-center w-full">
                            <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
                              <Phone size={13} strokeWidth={2.2} />
                            </div>
                            <input
                              type="tel"
                              value={selectedMember.phone}
                              onChange={(e) => handleUpdateWalkInField("phone", e.target.value)}
                              placeholder="Contact Number (+91...)"
                              className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none font-mono shadow-2xs transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Top Right Corner Cross Button to Clear Walk-In */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMember(null);
                        setInvoiceItems([]);
                      }}
                      className="w-8 h-8 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs group"
                      title="Cancel Walk-In"
                      aria-label="Cancel Walk-In"
                    >
                      <X size={16} strokeWidth={2.4} className="group-hover:scale-110 transition-transform" />
                    </button>
                  </div>

                  {/* Editable Fields Grid: Membership Plan, Duration + Time Limit, Issue Date */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Field 1: Custom Membership Plan Dropdown (Only Walk-In Guest Plans) */}
                    <div ref={walkInPlanDropdownRef} className="sm:col-span-5 relative">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Membership Plan
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsWalkInPlanDropdownOpen(prev => !prev)}
                        className="w-full h-10 px-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-2xs group"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <Layers size={13} className="text-indigo-600 shrink-0" strokeWidth={2.2} />
                          <span className="truncate">{selectedMember.plan || "Select Plan"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono text-[10px] font-black text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {currencyFormatter.format(selectedMember.planPrice || 500)}
                          </span>
                          <ChevronDown size={13} className={`text-slate-400 transition-transform ${isWalkInPlanDropdownOpen ? "rotate-180 text-indigo-600" : ""}`} />
                        </div>
                      </button>

                      {/* Custom Dropdown Menu Panel */}
                      <AnimatePresence>
                        {isWalkInPlanDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white rounded-2xl border border-slate-200/90 shadow-2xl z-50 overflow-hidden"
                          >
                            <div className="px-3.5 py-2 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
                              <span>Walk-In Guest Plans</span>
                              <span className="font-mono text-indigo-600 font-bold">{walkInPlansList.length} Options</span>
                            </div>
                            <div className="max-h-60 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                              {walkInPlansList.map(plan => {
                                const isSelected = selectedMember.plan === plan.name;
                                return (
                                  <button
                                    key={plan.id || plan.name}
                                    type="button"
                                    onClick={() => {
                                      handleWalkInPlanSelect(plan);
                                      setIsWalkInPlanDropdownOpen(false);
                                    }}
                                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer border ${
                                      isSelected
                                        ? "bg-indigo-50/80 border-indigo-200 text-indigo-950 font-bold shadow-2xs"
                                        : "hover:bg-slate-50 border-transparent text-slate-800"
                                    }`}
                                  >
                                    <div className="min-w-0 pr-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-black truncate">{plan.name}</span>
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-600 font-mono shrink-0">
                                          {plan.duration}
                                        </span>
                                      </div>
                                      {plan.description && (
                                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{plan.description}</p>
                                      )}
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2">
                                      <span className="font-mono text-xs font-black text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200/80 shadow-2xs">
                                        {currencyFormatter.format(plan.price)}
                                      </span>
                                      {isSelected && (
                                        <Check size={13} className="text-indigo-600" strokeWidth={3} />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Field 2: Duration (Days) & Session Time Limit */}
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Duration & Time Limit
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {/* Day Validity Input */}
                        <div className="relative flex items-center w-full" title="Pass Duration / Validity">
                          <div className="absolute left-2.5 flex items-center pointer-events-none text-slate-400">
                            <Clock size={12} strokeWidth={2.2} />
                          </div>
                          <input
                            type="text"
                            value={selectedMember.duration || "1 Day"}
                            onChange={(e) => handleUpdateWalkInField("duration", e.target.value)}
                            placeholder="1 Day"
                            className="w-full h-10 pl-8 pr-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none font-mono shadow-2xs transition-all"
                          />
                        </div>

                        {/* Session Time Limit Input */}
                        <div className="relative flex items-center w-full" title="Session Time Limit">
                          <div className="absolute left-2.5 flex items-center pointer-events-none text-slate-400">
                            <Timer size={12} strokeWidth={2.2} />
                          </div>
                          <input
                            type="text"
                            value={selectedMember.timeLimit || "2 Hours"}
                            onChange={(e) => handleUpdateWalkInField("timeLimit", e.target.value)}
                            placeholder="2 Hours"
                            className="w-full h-10 pl-8 pr-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none font-mono shadow-2xs transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Field 3: Desk Issue Date */}
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Desk Issue Date
                      </label>
                      <div className="h-10 px-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-800 shadow-2xs select-none">
                        <Calendar size={13} className="text-slate-400 shrink-0" strokeWidth={2.2} />
                        <span className="truncate">
                          Today ({new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ────────────────────────────────────────────────────────
                   READ-ONLY EXPIRED MEMBER PROFILE BANNER
                ──────────────────────────────────────────────────────── */
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Large High-Res Profile Image */}
                      <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border-2 border-indigo-100 bg-slate-100 shadow-sm relative">
                        <img
                          src={resolveMemberPhoto(selectedMember)}
                          alt={selectedMember?.name || "Member"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getInitialsAvatar(selectedMember?.name || "Member", selectedMember?.gender);
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-black text-slate-900 leading-tight capitalize truncate">
                            {selectedMember?.name || "Select Member"}
                          </h2>
                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {selectedMember?.id || "GD-0000"}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                            EXPIRED ({selectedMember?.daysExpiredAgo || 1}d ago)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-slate-500 text-xs">
                          <span className="font-medium text-slate-600">Member ID: <span className="font-mono font-bold text-slate-800">{selectedMember?.id}</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Cross button at top right corner to clear member */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMember(null);
                        setInvoiceItems([]);
                      }}
                      className="w-8 h-8 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs group"
                      title="Clear selected member"
                      aria-label="Clear member"
                    >
                      <X size={16} strokeWidth={2.4} className="group-hover:scale-110 transition-transform" />
                    </button>
                  </div>

                  {/* Structured Metadata Badges Row */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 shrink-0 shadow-2xs">
                        <Phone size={13} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">Phone</span>
                        <span className="text-xs font-bold text-slate-800 truncate block font-mono">{selectedMember?.phone || "—"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 shrink-0 shadow-2xs">
                        <Layers size={13} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">Expired Plan</span>
                        <span className="text-xs font-bold text-slate-800 truncate block">{selectedMember?.plan || "General Membership"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-rose-50/60 border border-rose-200/60">
                      <div className="w-7 h-7 rounded-lg bg-white border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
                        <Calendar size={13} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500 block leading-tight">Expired On</span>
                        <span className="text-xs font-bold text-rose-700 truncate block">{selectedMember?.expiry || "Overdue"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* CLEAN & EXECUTIVE EMPTY SELECTION STATE */
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50/80 border border-indigo-100/90 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <User size={26} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                        Select a Member to Begin
                      </h2>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                        Awaiting Selection
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                      Choose an expired member from the directory on the left to review their details, renew their plan, and collect outstanding dues.
                    </p>
                  </div>
                </div>

                {/* Structured 3-Column Visual Guided Steps */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                      <Users size={13} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">Step 1</span>
                      <span className="text-xs font-bold text-slate-800 truncate block">Choose Member</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                      <Layers size={13} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">Step 2</span>
                      <span className="text-xs font-bold text-slate-800 truncate block">Itemize Fees</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50/80 border border-slate-200/60">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                      <CreditCard size={13} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">Step 3</span>
                      <span className="text-xs font-bold text-slate-800 truncate block">Collect Payment</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CARD 2: INVOICE STUDIO & FEE ITEMIZATION */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center font-mono">1</span>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Fee Itemization & Invoice
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    INV-2026-{Math.floor(1000 + (selectedMember?.rawId || 8492) % 9000)}
                  </span>
                </div>
              </div>

              {/* Invoice Lines Table */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-12 gap-2.5 items-center px-3 py-2 bg-slate-100/80 rounded-xl border border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <div className="col-span-5 flex items-center gap-1.5">
                    <FileText size={12} className="text-slate-400" />
                    <span>Item Description</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span>Qty</span>
                  </div>
                  <div className="col-span-2 text-right pr-1">
                    <span>Price (₹)</span>
                  </div>
                  <div className="col-span-2 text-right pr-1">
                    <span>Total (₹)</span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="sr-only">Actions</span>
                  </div>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-0.5">
                  {invoiceItems.length === 0 ? (
                    <div className="py-7 px-4 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center mx-auto mb-2 text-slate-400 shadow-2xs">
                        <FileText size={18} strokeWidth={2} />
                      </div>
                      <h4 className="text-xs font-bold text-slate-700">No Fee Line Items on Invoice</h4>
                      <p className="text-[11px] text-slate-400 font-medium max-w-sm mx-auto mt-0.5">
                        Select an expired member to load renewals, or use the buttons below to add custom fee items and gym plans.
                      </p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {invoiceItems.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          className="grid grid-cols-12 gap-2.5 items-center p-2 rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200/70 transition-all group"
                        >
                          {/* ITEM DESCRIPTION INPUT FIELD */}
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInvoiceItems(prev => prev.map(i => i.id === item.id ? { ...i, name: val } : i));
                              }}
                              placeholder="Item or service description..."
                              className="w-full h-10 px-3 bg-white hover:border-slate-300 focus:bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none transition-all shadow-2xs"
                            />
                          </div>

                          {/* QTY INPUT FIELD */}
                          <div className="col-span-2">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                setInvoiceItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: val } : i));
                              }}
                              placeholder="1"
                              className="w-full h-10 px-2 bg-white hover:border-slate-300 focus:bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl text-center text-xs font-black font-mono text-slate-900 outline-none transition-all shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>

                          {/* PRICE INPUT FIELD */}
                          <div className="col-span-2">
                            <div className="relative flex items-center w-full">
                              <span className="absolute left-3 text-xs font-bold text-slate-400 select-none pointer-events-none">
                                ₹
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={item.price}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value) || 0);
                                  setInvoiceItems(prev => prev.map(i => i.id === item.id ? { ...i, price: val } : i));
                                }}
                                placeholder="0"
                                className="w-full h-10 pl-7 pr-3 bg-white hover:border-slate-300 focus:bg-white border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl text-right text-xs font-black font-mono text-slate-900 outline-none transition-all shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          </div>

                          {/* TOTAL FIELD (READONLY CALCULATED TEXT FIELD) */}
                          <div className="col-span-2">
                            <div className="relative flex items-center w-full">
                              <span className="absolute left-3 text-xs font-bold text-slate-400 select-none pointer-events-none">
                                ₹
                              </span>
                              <input
                                type="text"
                                readOnly
                                tabIndex={-1}
                                value={((item.qty * item.price) - (item.discount || 0)).toLocaleString("en-IN")}
                                className="w-full h-10 pl-7 pr-3 bg-slate-100/80 border border-slate-200 rounded-xl text-right text-xs font-black font-mono text-slate-900 outline-none cursor-default shadow-2xs select-all"
                              />
                            </div>
                          </div>

                          {/* DELETE ACTION BUTTON */}
                          <div className="col-span-1 flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => setInvoiceItems(prev => prev.filter(i => i.id !== item.id))}
                              className="w-10 h-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              title="Remove line item"
                            >
                              <Trash2 size={14} strokeWidth={2.2} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>

                {/* Add Line Item Action Bar */}
                <div className="flex items-center gap-2 pt-1 relative">
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceItems(prev => [
                        ...prev,
                        { id: Date.now(), name: "Custom Gym Service / Add-on", qty: 1, price: 1000, discount: 0 }
                      ]);
                    }}
                    className="flex-1 py-2 px-3 border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                    <span>Add Custom Line Item</span>
                  </button>

                  {/* Custom Dropdown Menu for Add Gym Plan from Database */}
                  <div className="relative" ref={planDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsPlanDropdownOpen(prev => !prev)}
                      className="h-9 px-3.5 bg-indigo-50 hover:bg-indigo-100/90 text-indigo-700 border border-indigo-200/90 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs hover:shadow-xs"
                    >
                      <Layers size={13} className="text-indigo-600" />
                      <span>+ Add Gym Plan from Database</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-white/90 text-indigo-800 text-[10px] font-black font-mono border border-indigo-200/60">
                        {dbPlans.length}
                      </span>
                      <ChevronDown
                        size={13}
                        className={`text-indigo-500 transition-transform duration-200 ${isPlanDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    <AnimatePresence>
                      {isPlanDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.97 }}
                          transition={{ duration: 0.16, ease: "easeOut" }}
                          className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white rounded-2xl border border-slate-200/90 shadow-2xl z-50 overflow-hidden flex flex-col"
                        >
                          {/* Header */}
                          <div className="px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Layers size={13} className="text-indigo-600" />
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                                Gym Plans Database
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 font-mono">
                              {filteredPlans.length} available
                            </span>
                          </div>

                          {/* Search box inside dropdown */}
                          <div className="p-2.5 border-b border-slate-100 bg-slate-50/60">
                            <div className="relative flex items-center w-full">
                              <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
                                <Search size={14} strokeWidth={2.2} />
                              </div>
                              <input
                                type="text"
                                placeholder="Search plan by name or duration..."
                                value={planSearchQuery}
                                onChange={(e) => setPlanSearchQuery(e.target.value)}
                                className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none shadow-2xs transition-all"
                                autoFocus
                              />
                              {planSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setPlanSearchQuery("")}
                                  className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Clear search"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* List of plans */}
                          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                            {filteredPlans.length === 0 ? (
                              <div className="p-6 text-center text-xs text-slate-400">
                                No matching plans found for &ldquo;{planSearchQuery}&rdquo;
                              </div>
                            ) : (
                              filteredPlans.map((plan) => {
                                const price = plan.price !== undefined && plan.price !== null
                                  ? plan.price
                                  : (plan.price_minor_units ? plan.price_minor_units / 100 : 2500);
                                const duration = plan.duration_days 
                                  ? `${plan.duration_days} Days`
                                  : (plan.duration_months ? `${plan.duration_months} Months` : "Standard");

                                return (
                                  <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => handleSelectPlanFromDb(plan)}
                                    className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50/80 border border-transparent hover:border-indigo-100 transition-all flex items-center justify-between group cursor-pointer"
                                  >
                                    <div className="min-w-0 pr-3">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                                          {plan.name || plan.plan_name}
                                        </span>
                                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                                          {duration}
                                        </span>
                                      </div>
                                      {plan.description && (
                                        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                                          {plan.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="shrink-0 text-right flex items-center gap-2">
                                      <span className="font-mono font-black text-xs text-slate-900 group-hover:text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-slate-200/70 shadow-2xs">
                                        ₹{Number(price).toLocaleString("en-IN")}
                                      </span>
                                      <div className="w-5 h-5 rounded-md bg-slate-100 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all">
                                        <Plus size={11} strokeWidth={2.5} />
                                      </div>
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>

                          {/* Footer note */}
                          <div className="px-3.5 py-2 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                            <span>Click any plan to add to invoice</span>
                            <span className="font-bold text-indigo-600">Editable at line level</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Calculation Summary Strip */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900 font-mono">{currencyFormatter.format(subtotal)}</span>
                </div>

                {/* Member Past Dues row (displayed when member has pending dues) */}
                {selectedMember?.pendingDues > 0 && (
                  <div className="flex items-center justify-between text-slate-600 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-600 flex items-center gap-1.5">
                        <AlertCircle size={13} className="text-rose-600 shrink-0" />
                        Past Outstanding Dues
                      </span>
                      <label className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includePastDues}
                          onChange={(e) => setIncludePastDues(e.target.checked)}
                          className="rounded text-rose-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Collect With Renewal</span>
                      </label>
                    </div>
                    <span className={`font-bold font-mono ${includePastDues ? "text-rose-600" : "text-slate-400"}`}>
                      +{currencyFormatter.format(duesToAdd)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span>Discount</span>
                    <button
                      type="button"
                      onClick={() => setDiscountValue(discountValue ? 0 : 500)}
                      className="text-[10px] font-black text-indigo-600 hover:underline cursor-pointer"
                    >
                      {discountValue ? "Remove Discount" : "Apply ₹500"}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-600 font-bold font-mono">
                      -{currencyFormatter.format(discountValue)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <div className="flex items-center gap-2">
                    <span>GST (18%)</span>
                    <label className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyGst}
                        onChange={(e) => setApplyGst(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-0"
                      />
                      <span>Apply 18% Tax</span>
                    </label>
                  </div>
                  <span className="font-bold text-slate-900 font-mono">{currencyFormatter.format(tax)}</span>
                </div>

                <div className="h-px bg-slate-200 my-1" />

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">Total Net Payable</span>
                    <span className="text-[10px] text-slate-400 font-medium">Direct merchant credit</span>
                  </div>
                  <span className="text-2xl font-black text-slate-900 font-mono tracking-tight text-indigo-600">
                    {currencyFormatter.format(totalPayable)}
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 3: PAYMENT METHOD & INTERACTIVE RAILS */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center font-mono">2</span>
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Payment Options & Settlement
                  </h2>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck size={12} />
                  <span>0% Gateway Surcharge</span>
                </div>
              </div>

              {/* Payment Mode Selector Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "UPI", label: "UPI QR", desc: "Instant Vector QR", icon: QrCode },
                  { id: "Cash", label: "Cash Desk", desc: "Counter Tender", icon: DollarSign },
                  { id: "Card", label: "Card / POS", desc: "Terminal Swipe", icon: CreditCard },
                  { id: "BankTransfer", label: "Bank IMPS", desc: "NEFT / UTR Transfer", icon: Building }
                ].map(mode => {
                  const isSelected = paymentMethod === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPaymentMethod(mode.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-indigo-50/80 border-indigo-500 shadow-2xs ring-1 ring-indigo-500/20"
                          : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <mode.icon size={16} className={isSelected ? "text-indigo-600" : "text-slate-400"} strokeWidth={2.4} />
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <div>
                        <div className={`text-xs font-black leading-tight ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
                          {mode.label}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          {mode.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* DYNAMIC MODE VIEW 1: UPI DYNAMIC QR */}
              {paymentMethod === "UPI" && (
                <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Official Merchant Dynamic UPI
                      </span>
                      <h3 className="text-xs font-bold text-white mt-0.5">
                        Scan to Pay with GPay, PhonePe, Paytm, or BHIM
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFullscreenQr(true)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Maximize2 size={11} /> Fullscreen
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                    {/* High-res Vector QR Code */}
                    <div className="bg-white p-2.5 rounded-xl shadow-lg flex items-center justify-center relative w-40 h-40 shrink-0">
                      {qrSvgString ? (
                        <>
                          <div
                            className="w-full h-full flex items-center justify-center"
                            dangerouslySetInnerHTML={{ __html: qrSvgString }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-7 h-7 bg-slate-900 border-2 border-white rounded-lg flex items-center justify-center text-white font-black text-[9px] shadow-md">
                              GD
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-2 text-slate-400">
                          <QrCode size={30} className="mx-auto mb-1 opacity-50" />
                          <span className="text-[10px] font-bold">QR Unavailable</span>
                        </div>
                      )}
                    </div>

                    {/* QR Info & Direct Actions */}
                    <div className="space-y-2.5 min-w-0 flex-1 w-full text-center sm:text-left">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                          Settlement Account
                        </span>
                        <span className="text-xs font-black text-white block mt-0.5">
                          {receivingAccount.accountHolder}
                        </span>
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1 font-mono text-[11px] text-indigo-300 font-bold">
                          <span>{receivingAccount.upiVpa}</span>
                          <button
                            type="button"
                            onClick={handleCopyLink}
                            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
                            title="Copy UPI String"
                          >
                            {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap pt-1">
                        <button
                          type="button"
                          onClick={handlePrintStandee}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Printer size={11} /> Print Standee
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadQrSvg}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Download size={11} /> Save SVG
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(`Hi, please pay Gym Renewal Fees of ${currencyFormatter.format(totalPayable)} for ${selectedMember?.name} via UPI:\n${upiUri}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 transition-all"
                        >
                          <Share2 size={11} /> WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DYNAMIC MODE VIEW 2: CASH DESK */}
              {paymentMethod === "Cash" && (
                <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Cash Counter Settlement
                      </span>
                      <h3 className="text-xs font-bold text-slate-800 mt-0.5">
                        Tender cash received & calculate change due
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      Due: <strong className="text-slate-900 font-mono">{currencyFormatter.format(totalPayable)}</strong>
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Cash Received from Member (₹)
                    </label>
                    <div className="relative flex items-center w-full">
                      <span className="absolute left-3.5 text-sm font-bold text-slate-400 select-none pointer-events-none">₹</span>
                      <input
                        type="number"
                        placeholder={`Enter amount received (e.g. ${totalPayable})`}
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        className="w-full h-10 pl-8 pr-3.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl text-sm font-bold text-slate-900 outline-none font-mono shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Quick Cash Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Quick Tender:</span>
                    {[
                      { label: "Exact", val: totalPayable },
                      { label: "₹500", val: 500 },
                      { label: "₹1,000", val: 1000 },
                      { label: "₹2,000", val: 2000 },
                      { label: "₹5,000", val: 5000 }
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setCashTendered(String(p.val))}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-slate-700 text-[10px] font-bold font-mono transition-colors cursor-pointer shadow-2xs"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Return Change Banner */}
                  <div className="p-3 bg-white border border-slate-200/90 rounded-xl flex items-center justify-between shadow-2xs">
                    <span className="text-xs font-bold text-slate-600">Change to Return to Member:</span>
                    <span className={`text-base font-black font-mono ${cashChangeDue > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                      {currencyFormatter.format(cashChangeDue)}
                    </span>
                  </div>
                </div>
              )}

              {/* DYNAMIC MODE VIEW 3: CARD / POS */}
              {paymentMethod === "Card" && (
                <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Card Swiper & EDC Terminal
                      </span>
                      <h3 className="text-xs font-bold text-slate-800 mt-0.5">
                        Pinelabs / Paytm / MSwipe Desk Terminal #01
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase tracking-wider">
                      Terminal Ready
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                        Card Network
                      </label>
                      <select
                        value={posCardBrand}
                        onChange={(e) => setPosCardBrand(e.target.value)}
                        className="w-full h-10 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl px-3.5 text-xs font-bold text-slate-800 outline-none cursor-pointer shadow-2xs transition-all"
                      >
                        <option value="Visa">Visa Credit / Debit</option>
                        <option value="Mastercard">Mastercard</option>
                        <option value="RuPay">RuPay Global</option>
                        <option value="Amex">American Express</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                        POS Slip Auth / Approval Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. AUTH-94820"
                        value={posSlipRef}
                        onChange={(e) => setPosSlipRef(e.target.value)}
                        className="w-full h-10 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl px-3.5 text-xs font-bold text-slate-800 outline-none font-mono shadow-2xs transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* DYNAMIC MODE VIEW 4: BANK IMPS / NEFT */}
              {paymentMethod === "BankTransfer" && (
                <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Direct Bank Settlement (IMPS / NEFT)
                      </span>
                      <h3 className="text-xs font-bold text-slate-800 mt-0.5">
                        Direct credit to {receivingAccount.bankName}
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-slate-500 font-mono">
                      A/C: {receivingAccount.accountNumberMasked}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                        Transfer Mode
                      </label>
                      <select
                        value={transferType}
                        onChange={(e) => setTransferType(e.target.value)}
                        className="w-full h-10 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl px-3.5 text-xs font-bold text-slate-800 outline-none cursor-pointer shadow-2xs transition-all"
                      >
                        <option value="IMPS">IMPS Instant 24x7</option>
                        <option value="NEFT">NEFT Batch Clearing</option>
                        <option value="RTGS">RTGS Real-Time Gross</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                        16-Digit Bank UTR Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC00049281092"
                        value={enteredUtr}
                        onChange={(e) => setEnteredUtr(e.target.value)}
                        className="w-full h-10 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl px-3.5 text-xs font-bold text-slate-800 outline-none font-mono shadow-2xs transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CONFIRM & COLLECT ACTION BUTTON */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleProcessPayment}
                  disabled={isProcessing || !selectedMember || invoiceItems.length === 0 || totalPayable <= 0}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Verifying Settlement Rails...</span>
                    </>
                  ) : !selectedMember ? (
                    <>
                      <User size={16} className="text-slate-400" />
                      <span>Select a Member to Collect Fee</span>
                    </>
                  ) : invoiceItems.length === 0 ? (
                    <>
                      <Plus size={16} className="text-slate-400" />
                      <span>Add Fee Line Item to Invoice</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>Confirm & Collect {currencyFormatter.format(totalPayable)} via {paymentMethod}</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* ════════════════════════════════════════════════════════════
            3. FULLSCREEN CUSTOMER DISPLAY MODAL
        ════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {isFullscreenQr && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center relative"
              >
                <button
                  onClick={() => setIsFullscreenQr(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-2 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>

                <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest mb-3">
                  GYMDECK SECURE INSTANT PAY
                </span>
                <h2 className="text-xl font-black text-slate-900">{receivingAccount.accountHolder}</h2>
                <p className="text-xs font-medium text-slate-500 mb-6">Scan with Google Pay, PhonePe, Paytm, or BHIM</p>

                <div className="w-72 h-72 bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-xl flex items-center justify-center relative">
                  <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: qrSvgString }} />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 bg-slate-900 border-2 border-white rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">
                      GD
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Amount Due</span>
                  <span className="text-4xl font-black text-slate-900 font-mono">{currencyFormatter.format(totalPayable)}</span>
                  <span className="text-xs text-indigo-600 font-extrabold block mt-2 font-mono">{receivingAccount.upiVpa}</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════════════════════════════
            4. PAYMENT SUCCESS RECEIPT MODAL
        ════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {isSuccess && completedTxn && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
              >
                {/* Header */}
                <div className="bg-emerald-600 p-6 flex flex-col items-center justify-center text-white text-center relative">
                  <button
                    onClick={resetBilling}
                    className="absolute top-4 right-4 text-emerald-100 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                  <div className="w-14 h-14 bg-white text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
                    <Check size={28} strokeWidth={3} />
                  </div>
                  <h2 className="text-xl font-black tracking-tight">Payment Collected</h2>
                  <p className="text-emerald-100 text-xs mt-0.5">
                    {currencyFormatter.format(completedTxn.amount)} received via {completedTxn.method}
                  </p>
                </div>

                {/* Receipt Details */}
                <div className="p-6 space-y-4 text-xs">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Invoice Number</span>
                      <span className="font-bold text-slate-900 font-mono">{completedTxn.invoiceNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Transaction ID</span>
                      <span className="font-bold text-slate-900 font-mono">{completedTxn.txnId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Member</span>
                      <span className="font-bold text-slate-900">{completedTxn.member?.name} ({completedTxn.member?.id})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Settled Into</span>
                      <span className="font-bold text-slate-900">{completedTxn.settledTo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Ref / UTR</span>
                      <span className="font-bold text-indigo-600 font-mono">{completedTxn.utr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Date & Time</span>
                      <span className="font-bold text-slate-700">{completedTxn.timestamp}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handlePrintReceipt}
                      className="h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Printer size={14} /> Print Receipt
                    </button>
                    <a
                      href={`https://wa.me/${(completedTxn.member?.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Dear ${completedTxn.member?.name}, GymDeck confirms receipt of ${currencyFormatter.format(completedTxn.amount)} for your gym membership renewal. Receipt No: ${completedTxn.invoiceNo}. Thank you!`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Smartphone size={14} /> WhatsApp
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={resetBilling}
                    className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <span>Collect Next Fee</span>
                    <ArrowRight size={14} />
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
// MOUNT FUNCTION FOR APP RUNTIME
// ─────────────────────────────────────────

export function mountCollectFees() {
  const stage = document.querySelector('[data-stage="payments"]');
  if (!stage) return null;

  const rootElement = document.createElement("div");
  rootElement.dataset.collectFeesReactRoot = "";
  rootElement.className = "min-h-full";
  stage.replaceChildren(rootElement);

  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <><CollectFeesPage /><BrandFooter /></>
      </ErrorBoundary>
    );
    return root;
  } catch (err) {
    console.error("Failed to render Collect Fees UI:", err);
    return null;
  }
}

export default CollectFeesPage;
